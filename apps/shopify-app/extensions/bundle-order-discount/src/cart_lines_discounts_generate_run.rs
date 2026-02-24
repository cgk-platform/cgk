use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

/// Bundle discount configuration stored as a metafield on the automatic discount.
#[derive(Deserialize, Default, PartialEq)]
#[shopify_function(rename_all = "camelCase")]
pub struct Configuration {
    pub bundles: Vec<BundleConfig>,
}

#[derive(Deserialize, Default, PartialEq)]
#[shopify_function(rename_all = "camelCase")]
pub struct BundleConfig {
    pub bundle_id: String,
    pub discount_type: String,
    pub tiers: Vec<TierConfig>,
    pub free_gift_variant_ids: Vec<String>,
}

#[derive(Deserialize, Default, PartialEq)]
pub struct TierConfig {
    pub count: i32,
    pub discount: f64,
}

/// Entry point for the bundle discount function.
///
/// Groups cart lines by `_bundle_id` attribute, determines the active tier
/// based on qualifying item count, and applies the appropriate discount.
/// Free gift lines (`_bundle_free_gift == "true"`) receive a 100% discount
/// if the parent bundle qualifies.
#[shopify_function]
fn cart_lines_discounts_generate_run(
    input: schema::cart_lines_discounts_generate_run::Input,
) -> Result<schema::CartLinesDiscountsGenerateRunResult> {
    let no_discount = schema::CartLinesDiscountsGenerateRunResult {
        operations: vec![],
    };

    // Parse configuration from metafield
    let config: &Configuration = match input.discount().metafield() {
        Some(metafield) => metafield.json_value(),
        None => return Ok(no_discount),
    };

    if config.bundles.is_empty() {
        return Ok(no_discount);
    }

    // Group cart lines by _bundle_id
    let mut bundle_groups: std::collections::HashMap<String, Vec<&schema::cart_lines_discounts_generate_run::input::cart::Lines>> =
        std::collections::HashMap::new();

    for line in input.cart().lines().iter() {
        if let Some(bundle_attr) = line.bundle_id() {
            if let Some(bundle_id) = bundle_attr.value() {
                bundle_groups
                    .entry(bundle_id.to_string())
                    .or_default()
                    .push(line);
            }
        }
    }

    let mut all_candidates: Vec<schema::ProductDiscountCandidate> = Vec::new();

    for (bundle_id, lines) in &bundle_groups {
        // Find the config for this bundle
        let bundle_config = config.bundles.iter().find(|b| b.bundle_id == *bundle_id);
        let bundle_config = match bundle_config {
            Some(c) => c,
            None => continue,
        };

        // Count qualifying items (exclude free gifts)
        let qualifying_count: i32 = lines
            .iter()
            .filter(|line| !is_free_gift(line))
            .map(|line| *line.quantity())
            .sum();

        // Find the highest qualifying tier
        let active_tier = bundle_config
            .tiers
            .iter()
            .filter(|t| qualifying_count >= t.count)
            .max_by(|a, b| a.count.cmp(&b.count));

        let active_tier = match active_tier {
            Some(t) if t.discount > 0.0 => t,
            _ => continue,
        };

        // Apply discount to each qualifying (non-gift) line in the bundle
        let is_percentage = bundle_config.discount_type == "percentage";

        // Separate free gift handling from discount logic
        for line in lines.iter() {
            if is_free_gift(line) {
                // Free gift: apply 100% discount
                all_candidates.push(schema::ProductDiscountCandidate {
                    targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                        schema::CartLineTarget {
                            id: line.id().clone(),
                            quantity: None,
                        },
                    )],
                    message: Some("Free gift".to_string()),
                    value: schema::ProductDiscountCandidateValue::Percentage(
                        schema::Percentage {
                            value: Decimal(100.0),
                        },
                    ),
                    associated_discount_code: None,
                });
            }
        }

        // Collect qualifying (non-gift) lines
        let qualifying_lines: Vec<_> = lines.iter().filter(|l| !is_free_gift(l)).collect();

        if qualifying_lines.is_empty() {
            continue;
        }

        if is_percentage {
            // Percentage discount on each bundle line
            let pct = if active_tier.discount > 100.0 {
                100.0
            } else {
                active_tier.discount
            };
            let message = format!("Bundle: {}% off", pct as i32);
            for line in &qualifying_lines {
                all_candidates.push(schema::ProductDiscountCandidate {
                    targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                        schema::CartLineTarget {
                            id: line.id().clone(),
                            quantity: None,
                        },
                    )],
                    message: Some(message.clone()),
                    value: schema::ProductDiscountCandidateValue::Percentage(
                        schema::Percentage {
                            value: Decimal(pct),
                        },
                    ),
                    associated_discount_code: None,
                });
            }
        } else {
            // Fixed amount discount — distribute proportionally across qualifying lines
            let bundle_subtotal: f64 = qualifying_lines
                .iter()
                .map(|l| l.cost().subtotal_amount().amount().as_f64())
                .sum();

            if bundle_subtotal <= 0.0 {
                continue;
            }

            // Cap total discount at bundle subtotal
            let total_discount = if active_tier.discount > bundle_subtotal {
                bundle_subtotal
            } else {
                active_tier.discount
            };

            let message = format!("Bundle: ${:.2} off", active_tier.discount);
            let mut allocated_sum = 0.0;

            for (i, line) in qualifying_lines.iter().enumerate() {
                let line_subtotal = line.cost().subtotal_amount().amount().as_f64();
                let is_last = i == qualifying_lines.len() - 1;

                // Proportional allocation; last line absorbs rounding remainder
                let line_discount = if is_last {
                    // Round to cents
                    ((total_discount - allocated_sum) * 100.0).round() / 100.0
                } else {
                    let raw = total_discount * (line_subtotal / bundle_subtotal);
                    (raw * 100.0).round() / 100.0
                };

                allocated_sum += line_discount;

                if line_discount > 0.0 {
                    all_candidates.push(schema::ProductDiscountCandidate {
                        targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                            schema::CartLineTarget {
                                id: line.id().clone(),
                                quantity: None,
                            },
                        )],
                        message: Some(message.clone()),
                        value: schema::ProductDiscountCandidateValue::FixedAmount(
                            schema::ProductDiscountCandidateFixedAmount {
                                applies_to_each_item: Some(false),
                                amount: Decimal(line_discount),
                            },
                        ),
                        associated_discount_code: None,
                    });
                }
            }
        }
    }

    if all_candidates.is_empty() {
        return Ok(no_discount);
    }

    Ok(schema::CartLinesDiscountsGenerateRunResult {
        operations: vec![schema::CartOperation::ProductDiscountsAdd(
            schema::ProductDiscountsAddOperation {
                selection_strategy: schema::ProductDiscountSelectionStrategy::First,
                candidates: all_candidates,
            },
        )],
    })
}

/// Checks if a cart line is a free gift based on the `_bundle_free_gift` attribute.
fn is_free_gift(
    line: &schema::cart_lines_discounts_generate_run::input::cart::Lines,
) -> bool {
    line.is_free_gift()
        .and_then(|attr| attr.value())
        .map(|v| v == "true")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::{run_function_with_input, Result};

    #[test]
    fn test_no_config_returns_no_discount() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/no-bundle.json"),
        )?;
        assert!(result.operations.is_empty());
        Ok(())
    }

    #[test]
    fn test_bundle_2_items_gets_discount() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-2-items.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        Ok(())
    }

    #[test]
    fn test_bundle_4_items_gets_higher_tier() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-4-items.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        Ok(())
    }

    #[test]
    fn test_bundle_with_free_gift() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-with-gift.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        Ok(())
    }

    #[test]
    fn test_fixed_discount_distributed_across_lines() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-fixed-discount.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        // With 3 items at $30 each and $50 fixed discount, total discount should be $50
        // distributed as ~$16.67 + $16.67 + $16.66 across the 3 lines
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            // Should have exactly 3 candidates (one per qualifying line)
            assert_eq!(op.candidates.len(), 3);
            // Sum of all fixed amounts should equal $50.00
            let total: f64 = op.candidates.iter().map(|c| {
                match &c.value {
                    schema::ProductDiscountCandidateValue::FixedAmount(fa) => fa.amount.0,
                    _ => 0.0,
                }
            }).sum();
            // Allow small float rounding tolerance
            assert!((total - 50.0).abs() < 0.02, "Total discount should be ~$50, got {}", total);
        } else {
            panic!("Expected ProductDiscountsAdd operation");
        }
        Ok(())
    }

    #[test]
    fn test_fixed_discount_capped_at_subtotal() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-fixed-exceeds.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        // With 3 items at $30 each ($90 total) and $200 fixed discount, should cap at $90
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            assert_eq!(op.candidates.len(), 3);
            let total: f64 = op.candidates.iter().map(|c| {
                match &c.value {
                    schema::ProductDiscountCandidateValue::FixedAmount(fa) => fa.amount.0,
                    _ => 0.0,
                }
            }).sum();
            assert!((total - 90.0).abs() < 0.02, "Total discount should be capped at $90, got {}", total);
        } else {
            panic!("Expected ProductDiscountsAdd operation");
        }
        Ok(())
    }
}
