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
    pub free_gift_variant_ids: Option<Vec<String>>,
}

#[derive(Deserialize, Default, PartialEq)]
#[shopify_function(rename_all = "camelCase")]
pub struct TierConfig {
    pub count: i32,
    pub discount: f64,
    pub free_gift_variant_ids: Option<Vec<String>>,
}

/// Extract the numeric suffix from a Shopify GID or return the string as-is.
fn normalize_variant_id(id: &str) -> String {
    if id.starts_with("gid://") {
        id.rsplit('/').next().unwrap_or(id).to_string()
    } else {
        id.to_string()
    }
}

/// Extract the variant ID from a cart line's merchandise.
fn get_variant_id(
    line: &schema::cart_lines_discounts_generate_run::input::cart::Lines,
) -> Option<String> {
    match line.merchandise() {
        schema::cart_lines_discounts_generate_run::input::cart::lines::Merchandise::ProductVariant(variant) => {
            Some(normalize_variant_id(variant.id()))
        }
        _ => None,
    }
}

/// Entry point for the bundle discount function.
///
/// Groups cart lines by `_bundle_id` attribute, determines the active tier
/// based on qualifying item count, and applies the appropriate discount.
/// Free gift lines (`_bundle_free_gift == "true"`) receive a 100% discount
/// only if:
/// 1. The parent bundle qualifies for a tier that unlocks the gift variant
/// 2. Only 1 unit is discounted (quantity capped at 1)
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
        // Count qualifying items (exclude free gifts) — needed for both paths
        let qualifying_count: i32 = lines
            .iter()
            .filter(|line| !is_free_gift(line))
            .map(|line| *line.quantity())
            .sum();

        // Find the config for this bundle
        let bundle_config = config.bundles.iter().find(|b| b.bundle_id == *bundle_id);

        match bundle_config {
            None => {
                // Bundle not in config — still discount free gifts if qualifying items exist
                for line in lines.iter() {
                    if !is_free_gift(line) {
                        continue;
                    }
                    // Use _bundle_gift_min_items for validation (default 1)
                    let min_items = get_gift_min_items(line).unwrap_or(1);
                    if qualifying_count >= min_items {
                        all_candidates.push(schema::ProductDiscountCandidate {
                            targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                                schema::CartLineTarget {
                                    id: line.id().clone(),
                                    quantity: Some(1),
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
                continue;
            }
            Some(bundle_config) => {
                // Find the highest qualifying tier INDEX for cumulative gift logic
                let active_tier_index = bundle_config
                    .tiers
                    .iter()
                    .enumerate()
                    .filter(|(_, t)| qualifying_count >= t.count)
                    .max_by(|(_, a), (_, b)| a.count.cmp(&b.count))
                    .map(|(i, _)| i);

                // Collect unlocked gift variant IDs (cumulative from tiers 0..=active)
                let unlocked_gift_ids: std::collections::HashSet<String> = match active_tier_index {
                    Some(idx) => {
                        let mut ids = std::collections::HashSet::new();
                        let mut has_tier_level_gifts = false;
                        for i in 0..=idx {
                            if let Some(ref tier_gifts) = bundle_config.tiers[i].free_gift_variant_ids {
                                if !tier_gifts.is_empty() {
                                    has_tier_level_gifts = true;
                                    for gid in tier_gifts {
                                        ids.insert(normalize_variant_id(gid));
                                    }
                                }
                            }
                        }
                        // Backwards compat: if no tier-level gifts, use bundle-level gifts
                        if !has_tier_level_gifts {
                            if let Some(ref bundle_gifts) = bundle_config.free_gift_variant_ids {
                                for gid in bundle_gifts {
                                    ids.insert(normalize_variant_id(gid));
                                }
                            }
                        }
                        ids
                    }
                    None => std::collections::HashSet::new(),
                };

                // Process free gift lines: only discount if variant is unlocked by current tier
                // and cap at quantity 1 per gift line
                for line in lines.iter() {
                    if !is_free_gift(line) {
                        continue;
                    }
                    let variant_id = get_variant_id(line);
                    let is_unlocked = match variant_id {
                        Some(ref vid) => unlocked_gift_ids.contains(vid),
                        None => false,
                    };
                    // Legacy fallback: if no gift IDs configured at all, allow any gift
                    // when there's an active tier
                    let should_discount = if unlocked_gift_ids.is_empty() && active_tier_index.is_some() {
                        true
                    } else {
                        is_unlocked
                    };

                    if should_discount {
                        all_candidates.push(schema::ProductDiscountCandidate {
                            targets: vec![schema::ProductDiscountCandidateTarget::CartLine(
                                schema::CartLineTarget {
                                    id: line.id().clone(),
                                    quantity: Some(1), // Cap: only 1 unit is free
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

                // Apply bundle discount to qualifying lines (only if tier discount > 0)
                let active_tier = active_tier_index.map(|i| &bundle_config.tiers[i]);
                let active_tier = match active_tier {
                    Some(t) if t.discount > 0.0 => t,
                    _ => continue,
                };

                let is_percentage = bundle_config.discount_type == "percentage";

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

/// Reads the `_bundle_gift_min_items` attribute from a cart line.
fn get_gift_min_items(
    line: &schema::cart_lines_discounts_generate_run::input::cart::Lines,
) -> Option<i32> {
    line.gift_min_items()
        .and_then(|attr| attr.value())
        .and_then(|v| v.parse::<i32>().ok())
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
        // Should have 4 candidates: 3 qualifying lines + 1 free gift
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            assert_eq!(op.candidates.len(), 4);
            // The free gift candidate should have quantity capped at 1
            let gift_candidate = op.candidates.iter().find(|c| c.message.as_deref() == Some("Free gift"));
            assert!(gift_candidate.is_some(), "Should have a free gift candidate");
            if let Some(gc) = gift_candidate {
                if let schema::ProductDiscountCandidateTarget::CartLine(ref target) = gc.targets[0] {
                    assert_eq!(target.quantity, Some(1), "Free gift quantity should be capped at 1");
                }
            }
        }
        Ok(())
    }

    #[test]
    fn test_gift_below_threshold_gets_no_discount() -> Result<()> {
        // Only 1 qualifying item — below the minimum tier (count: 2)
        // The free gift should NOT get a 100% discount
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-gift-below-threshold.json"),
        )?;
        assert!(result.operations.is_empty(), "Below threshold: no discounts at all");
        Ok(())
    }

    #[test]
    fn test_gift_tier_aware_only_unlocked_gifts() -> Result<()> {
        // 2 qualifying items → tier 0 (count: 2, discount: 10%) is active
        // Tier 0 unlocks variant 400, tier 1 unlocks variant 500
        // Only variant 400 should get 100% off; variant 500 should NOT
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-gift-tier-aware.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            let gift_candidates: Vec<_> = op.candidates.iter()
                .filter(|c| c.message.as_deref() == Some("Free gift"))
                .collect();
            // Only 1 free gift should be discounted (variant 400), not variant 500
            assert_eq!(gift_candidates.len(), 1, "Only tier-0 gift (variant 400) should be discounted");
        }
        Ok(())
    }

    #[test]
    fn test_gift_quantity_capped_at_1() -> Result<()> {
        // Free gift has quantity 3, but should only get 100% off on 1 unit
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-gift-quantity-cap.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            let gift_candidate = op.candidates.iter()
                .find(|c| c.message.as_deref() == Some("Free gift"));
            assert!(gift_candidate.is_some());
            if let Some(gc) = gift_candidate {
                if let schema::ProductDiscountCandidateTarget::CartLine(ref target) = gc.targets[0] {
                    assert_eq!(target.quantity, Some(1), "Only 1 unit should be free, got {:?}", target.quantity);
                }
            }
        }
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
    fn test_unconfigured_bundle_still_discounts_gift() -> Result<()> {
        // Bundle ID "shopify-block-xyz789" doesn't match any config entry ("block-abc123")
        // The free gift should still get 100% discount via the unconfigured-bundle fallback
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-unconfigured-gift.json"),
        )?;
        assert_eq!(result.operations.len(), 1);
        if let schema::CartOperation::ProductDiscountsAdd(ref op) = result.operations[0] {
            assert_eq!(op.candidates.len(), 1, "Only the free gift should be discounted");
            let gift = &op.candidates[0];
            assert_eq!(gift.message.as_deref(), Some("Free gift"));
            if let schema::ProductDiscountCandidateTarget::CartLine(ref target) = gift.targets[0] {
                assert_eq!(target.quantity, Some(1));
            }
        } else {
            panic!("Expected ProductDiscountsAdd operation");
        }
        Ok(())
    }

    #[test]
    fn test_gift_min_items_below_threshold() -> Result<()> {
        // 1 qualifying item, but free gift requires min 2 items (_bundle_gift_min_items: "2")
        // Gift should NOT get a discount
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            include_str!("../tests/bundle-gift-min-items.json"),
        )?;
        assert!(result.operations.is_empty(), "Below min_items threshold: no discount");
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
