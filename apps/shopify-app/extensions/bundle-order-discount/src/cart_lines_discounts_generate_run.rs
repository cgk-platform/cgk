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
            Some(t) => t,
            None => continue,
        };

        // Apply discount to each qualifying (non-gift) line in the bundle
        let is_percentage = bundle_config.discount_type == "percentage";

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
            } else if is_percentage {
                // Percentage discount on bundle line
                let pct = if active_tier.discount > 100.0 {
                    100.0
                } else {
                    active_tier.discount
                };
                let message = format!("Bundle: {}% off", pct as i32);
                all_candidates.push(schema::ProductDiscountCandidate {
                    targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                        schema::CartLineTarget {
                            id: line.id().clone(),
                            quantity: None,
                        },
                    )],
                    message: Some(message),
                    value: schema::ProductDiscountCandidateValue::Percentage(
                        schema::Percentage {
                            value: Decimal(pct),
                        },
                    ),
                    associated_discount_code: None,
                });
            } else {
                // Fixed amount discount — distributed per unit
                let line_subtotal = line.cost().subtotal_amount().amount().as_f64();
                let fixed_discount = active_tier.discount;
                let capped = if fixed_discount > line_subtotal {
                    line_subtotal
                } else {
                    fixed_discount
                };
                if capped > 0.0 {
                    let message = format!("Bundle: ${:.2} off", fixed_discount);
                    all_candidates.push(schema::ProductDiscountCandidate {
                        targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                            schema::CartLineTarget {
                                id: line.id().clone(),
                                quantity: None,
                            },
                        )],
                        message: Some(message),
                        value: schema::ProductDiscountCandidateValue::FixedAmount(
                            schema::ProductDiscountCandidateFixedAmount {
                                applies_to_each_item: Some(false),
                                amount: Decimal(capped),
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
}
