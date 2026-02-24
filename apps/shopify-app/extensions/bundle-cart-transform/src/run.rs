use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

/// Entry point for the cart transform function.
///
/// Groups cart lines by `_bundle_id` attribute and creates merge operations
/// for bundles with 2+ items. The merged line shows the bundle name and a
/// price adjustment matching the bundle discount.
#[shopify_function]
fn run(input: schema::run::Input) -> Result<schema::FunctionRunResult> {
    let no_changes = schema::FunctionRunResult { operations: vec![] };

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

    let mut operations: Vec<schema::CartOperation> = Vec::new();

    for (_bundle_id, lines) in &bundle_groups {
        // Only merge bundles with 2+ lines
        if lines.len() < 2 {
            continue;
        }

        // Get bundle name from the first line's attribute
        let bundle_name = lines
            .first()
            .and_then(|l| l.bundle_name())
            .and_then(|a| a.value())
            .map(|v| v.as_str())
            .unwrap_or("Bundle");

        // Get the first variant ID for parent_variant_id (required by merge)
        let first_variant_id = lines.iter().find_map(|line| {
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
        let discount_value = lines
            .first()
            .and_then(|l| l.bundle_discount())
            .and_then(|a| a.value())
            .and_then(|v| v.parse::<f64>().ok());

        // Read discount type from _bundle_discount_type attribute ("percentage" or "fixed")
        let discount_type = lines
            .first()
            .and_then(|l| l.bundle_discount_type())
            .and_then(|a| a.value().map(|v| v.to_string()))
            .unwrap_or_else(|| "percentage".to_string());

        // Build cart line refs for the merge (quantity is required)
        let cart_lines: Vec<schema::CartLineInput> = lines
            .iter()
            .map(|line| schema::CartLineInput {
                cart_line_id: line.id().clone(),
                quantity: *line.quantity(),
            })
            .collect();

        // Count total items for title
        let total_items: i32 = lines.iter().map(|l| *l.quantity()).sum();
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

        operations.push(schema::CartOperation::Merge(schema::MergeOperation {
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

    Ok(schema::FunctionRunResult { operations })
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
        Ok(())
    }

    #[test]
    fn test_percentage_capped_at_100() -> Result<()> {
        let result =
            run_function_with_input(run, include_str!("../tests/bundle-merge-over-100.json"))?;
        assert_eq!(result.operations.len(), 1);
        if let schema::CartOperation::Merge(ref merge) = result.operations[0] {
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
