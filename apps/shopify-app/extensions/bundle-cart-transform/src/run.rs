use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

/// Checks if a cart line is a free gift based on the `_bundle_free_gift` attribute.
fn is_free_gift(line: &schema::run::input::cart::Lines) -> bool {
    line.is_free_gift()
        .and_then(|attr| attr.value())
        .map(|v| v == "true")
        .unwrap_or(false)
}

/// Entry point for the cart transform function.
///
/// Groups cart lines by `_bundle_id` attribute and creates merge operations
/// for bundles with 2+ items. Free gift lines are excluded from merges so
/// the order discount function can apply a 100% discount to them separately.
#[shopify_function]
fn run(input: schema::run::Input) -> Result<schema::CartTransformRunResult> {
    let no_changes = schema::CartTransformRunResult { operations: vec![] };

    // Group cart lines by _bundle_id
    let mut bundle_groups: std::collections::HashMap<
        String,
        Vec<&schema::run::input::cart::Lines>,
    > = std::collections::HashMap::new();

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

    if bundle_groups.is_empty() {
        return Ok(no_changes);
    }

    let mut operations: Vec<schema::Operation> = Vec::new();

    for (_bundle_id, lines) in &bundle_groups {
        // Separate qualifying lines from free gifts
        let qualifying_lines: Vec<_> = lines.iter().filter(|l| !is_free_gift(l)).collect();

        // Only merge bundles with 2+ qualifying (non-gift) lines
        if qualifying_lines.len() < 2 {
            continue;
        }

        // Get bundle name from the first qualifying line's attribute
        let bundle_name = qualifying_lines
            .first()
            .and_then(|l| l.bundle_name())
            .and_then(|a| a.value())
            .map(|v| v.as_str())
            .unwrap_or("Bundle");

        // Get the first variant ID from qualifying lines for parent_variant_id (required by merge)
        let first_variant_id = qualifying_lines.iter().find_map(|line| {
            if let schema::run::input::cart::lines::Merchandise::ProductVariant(variant) =
                &line.merchandise()
            {
                Some(variant.id().clone())
            } else {
                None
            }
        });

        let first_variant_id = match first_variant_id {
            Some(id) => id,
            None => continue,
        };

        // Parse discount value from the _bundle_discount attribute (numeric only, e.g. "15")
        let discount_value = qualifying_lines
            .first()
            .and_then(|l| l.bundle_discount())
            .and_then(|a| a.value())
            .and_then(|v| v.parse::<f64>().ok());

        // Read discount type from _bundle_discount_type attribute ("percentage" or "fixed")
        let discount_type = qualifying_lines
            .first()
            .and_then(|l| l.bundle_discount_type())
            .and_then(|a| a.value().map(|v| v.to_string()))
            .unwrap_or_else(|| "percentage".to_string());

        // Build cart line refs for the merge — only qualifying lines, NOT free gifts
        let cart_lines: Vec<schema::CartLineInput> = qualifying_lines
            .iter()
            .map(|line| schema::CartLineInput {
                cart_line_id: line.id().clone(),
                quantity: *line.quantity(),
            })
            .collect();

        // Count qualifying items for title (exclude gifts)
        let total_items: i32 = qualifying_lines.iter().map(|l| *l.quantity()).sum();
        let title = format!("{} ({} items)", bundle_name, total_items);

        // Build price adjustment if discount exists
        let price = if discount_type == "fixed" {
            // Fixed-amount discounts are handled by the order discount function,
            // not the cart transform. Only apply percentage adjustments here.
            None
        } else {
            discount_value.map(|pct| {
                let capped = if pct > 100.0 { 100.0 } else { pct };
                schema::PriceAdjustment {
                    percentage_decrease: Some(schema::PriceAdjustmentValue {
                        value: Decimal(capped),
                    }),
                }
            })
        };

        operations.push(schema::Operation::LinesMerge(schema::LinesMergeOperation {
            cart_lines,
            parent_variant_id: first_variant_id,
            title: Some(title),
            price,
            image: None,
            attributes: None,
        }));
    }

    if operations.is_empty() {
        return Ok(no_changes);
    }

    Ok(schema::CartTransformRunResult { operations })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::{run_function_with_input, Result};

    #[test]
    fn test_no_bundle_returns_no_changes() -> Result<()> {
        let result = run_function_with_input(run, include_str!("../tests/no-bundle.json"))?;
        assert!(result.operations.is_empty());
        Ok(())
    }

    #[test]
    fn test_bundle_merge() -> Result<()> {
        let result = run_function_with_input(run, include_str!("../tests/bundle-merge.json"))?;
        assert_eq!(result.operations.len(), 1);
        Ok(())
    }

    #[test]
    fn test_bundle_with_gift() -> Result<()> {
        let result =
            run_function_with_input(run, include_str!("../tests/bundle-with-gift.json"))?;
        assert_eq!(result.operations.len(), 1);
        // Gift line should be excluded from the merge
        if let schema::Operation::LinesMerge(ref merge) = result.operations[0] {
            // 3 qualifying lines, gift excluded
            assert_eq!(
                merge.cart_lines.len(),
                3,
                "Gift line should not be in the merge, expected 3 qualifying lines"
            );
            // Title should reflect 3 items, not 4
            assert!(
                merge.title.as_ref().unwrap().contains("3 items"),
                "Title should show 3 items (excluding gift), got: {}",
                merge.title.as_ref().unwrap()
            );
        }
        Ok(())
    }

    #[test]
    fn test_percentage_capped_at_100() -> Result<()> {
        let result =
            run_function_with_input(run, include_str!("../tests/bundle-merge-over-100.json"))?;
        assert_eq!(result.operations.len(), 1);
        if let schema::Operation::LinesMerge(ref merge) = result.operations[0] {
            if let Some(ref price) = merge.price {
                if let Some(ref pct) = price.percentage_decrease {
                    assert!(
                        pct.value.0 <= 100.0,
                        "Percentage should be capped at 100, got {}",
                        pct.value.0
                    );
                }
            }
        }
        Ok(())
    }
}
