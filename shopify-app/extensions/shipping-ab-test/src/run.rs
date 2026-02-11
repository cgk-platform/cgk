//! Main function logic for the Shipping A/B Test Delivery Customization
//!
//! This function receives cart data and filters shipping options based on
//! the visitor's assigned variant suffix stored in cart attributes.

use shopify_function::prelude::*;
use shopify_function::Result;

// Generated from run.graphql
generate_types!(
    query_path = "./src/run.graphql",
    schema_path = "./schema.graphql"
);

/// Main function entry point
///
/// Called by Shopify during checkout to customize delivery options.
/// Returns operations to hide shipping rates that don't match the
/// visitor's assigned A/B test variant.
#[shopify_function]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    // Get the shipping variant suffix from cart attributes
    let variant_suffix = input
        .cart
        .attribute
        .as_ref()
        .and_then(|attr| attr.value.as_ref())
        .map(|v| v.as_str())
        .unwrap_or("");

    // If no variant assigned, return all rates unchanged
    if variant_suffix.is_empty() {
        return Ok(output::FunctionRunResult { operations: vec![] });
    }

    // Build list of operations to hide non-matching rates
    let mut operations = vec![];

    for delivery_group in &input.cart.delivery_groups {
        for option in &delivery_group.delivery_options {
            // Check if this rate matches the assigned variant
            let rate_suffix = extract_suffix(&option.title);

            // Only hide rates that have a suffix and don't match
            // Rates without a suffix (e.g., "Express Shipping") are always shown
            if !rate_suffix.is_empty() && rate_suffix != variant_suffix {
                // Hide this rate - it's for a different variant
                operations.push(output::Operation {
                    hide: Some(output::HideOperation {
                        delivery_option_handle: option.handle.clone(),
                    }),
                    move_: None,
                    rename: None,
                });
            }
        }
    }

    Ok(output::FunctionRunResult { operations })
}

/// Extract suffix from rate name like "Standard Shipping (A)" -> "A"
///
/// Returns empty string if no suffix found.
///
/// # Examples
/// ```
/// assert_eq!(extract_suffix("Standard Shipping (A)"), "A");
/// assert_eq!(extract_suffix("Free Shipping (B)"), "B");
/// assert_eq!(extract_suffix("Express Shipping"), "");
/// ```
fn extract_suffix(title: &str) -> &str {
    // Look for pattern "(X)" at the end of the title
    if let Some(start) = title.rfind('(') {
        if let Some(end) = title.rfind(')') {
            if start < end && end == title.len() - 1 {
                let suffix = &title[start + 1..end];
                // Only return valid single-letter suffixes (A, B, C, D)
                if suffix.len() == 1 && matches!(suffix, "A" | "B" | "C" | "D") {
                    return suffix;
                }
            }
        }
    }
    ""
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_suffix_valid() {
        assert_eq!(extract_suffix("Standard Shipping (A)"), "A");
        assert_eq!(extract_suffix("Free Shipping (B)"), "B");
        assert_eq!(extract_suffix("Express (C)"), "C");
        assert_eq!(extract_suffix("Overnight (D)"), "D");
    }

    #[test]
    fn test_extract_suffix_invalid() {
        assert_eq!(extract_suffix("Standard Shipping"), "");
        assert_eq!(extract_suffix("Free Shipping ()"), "");
        assert_eq!(extract_suffix("Express (AB)"), "");
        assert_eq!(extract_suffix("Overnight (E)"), "");
        assert_eq!(extract_suffix("Test (1)"), "");
    }

    #[test]
    fn test_extract_suffix_edge_cases() {
        assert_eq!(extract_suffix(""), "");
        assert_eq!(extract_suffix("(A)"), "A");
        assert_eq!(extract_suffix("Multiple (X) parts (A)"), "A");
    }
}
