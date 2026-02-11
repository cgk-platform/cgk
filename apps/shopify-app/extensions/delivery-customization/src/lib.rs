//! Delivery Customization Function for A/B Testing
//!
//! This Shopify Function hides or shows shipping rates based on A/B test variant
//! assignment. Used for shipping price/option testing in the CGK platform.

use shopify_function::prelude::*;
use shopify_function::Result;

/// Entry point for the delivery customization function
///
/// # Arguments
/// * `input` - The input data from Shopify containing cart and delivery information
///
/// # Returns
/// * `FunctionRunResult` containing operations to hide delivery options based on variant
#[shopify_function_target(query_path = "src/run.graphql", schema_path = "schema.graphql")]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    let cart = &input.cart;

    // Get A/B test variant from cart attributes
    let shipping_variant = cart
        .shipping_variant
        .as_ref()
        .and_then(|a| a.value.as_ref());

    // If no variant assigned, show all options (control behavior)
    let Some(variant) = shipping_variant else {
        return Ok(output::FunctionRunResult { operations: vec![] });
    };

    // Check if cart has subscription items (always free shipping for subscriptions)
    let has_subscription = cart.lines.iter().any(|line| {
        line.selling_plan_allocation.is_some()
    });

    // Subscription orders skip shipping customization - show all options
    if has_subscription {
        return Ok(output::FunctionRunResult { operations: vec![] });
    }

    // Build hide operations based on variant assignment
    let mut operations = Vec::new();

    for group in &cart.delivery_groups {
        for option in &group.delivery_options {
            // Check if this option should be hidden for the current variant
            let should_hide = should_hide_option(&option.title, variant);

            if should_hide {
                // NOTE: The Rust SDK uses DeprecatedOperation not Operation
                // This is the working pattern from RAWDOG implementation
                operations.push(output::DeprecatedOperation::Hide(output::HideOperation {
                    delivery_option_handle: option.handle.clone(),
                }));
            }
        }
    }

    Ok(output::FunctionRunResult { operations })
}

/// Determines whether a delivery option should be hidden for a given variant
///
/// # Pattern
/// Options tagged with a variant suffix (e.g., "Standard Shipping (A)") will only
/// be shown to customers assigned to that variant. Options without a suffix are
/// shown to all variants.
///
/// # Arguments
/// * `title` - The delivery option title
/// * `variant` - The assigned A/B test variant (e.g., "A", "B")
///
/// # Returns
/// * `true` if the option should be hidden from this variant
fn should_hide_option(title: &str, variant: &str) -> bool {
    // Check if the title contains a variant suffix
    if let Some(suffix) = extract_variant_suffix(title) {
        // Hide if suffix doesn't match the assigned variant
        return suffix != variant;
    }

    // Options without suffix are shown to all variants
    false
}

/// Extracts the variant suffix from a delivery option title
///
/// # Pattern
/// Looks for " (X)" at the end of the title where X is a single alphanumeric character.
/// Examples:
/// - "Standard Shipping (A)" -> Some("A")
/// - "Express Shipping (B)" -> Some("B")
/// - "Free Shipping" -> None
/// - "Standard Shipping (Control)" -> None (too long)
///
/// # Arguments
/// * `title` - The delivery option title
///
/// # Returns
/// * `Some(&str)` containing the variant character if found
/// * `None` if no valid variant suffix
fn extract_variant_suffix(title: &str) -> Option<&str> {
    // Minimum length check: need at least " (X)" = 4 chars
    if title.len() < 4 {
        return None;
    }

    let bytes = title.as_bytes();
    let len = bytes.len();

    // Check for pattern: space, open paren, single char, close paren at end
    if bytes[len - 1] == b')' && bytes[len - 3] == b'(' && bytes[len - 4] == b' ' {
        let variant_byte = bytes[len - 2];
        // Only accept single alphanumeric characters as variants
        if variant_byte.is_ascii_alphanumeric() {
            return Some(&title[len - 2..len - 1]);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_variant_suffix_valid() {
        assert_eq!(extract_variant_suffix("Standard Shipping (A)"), Some("A"));
        assert_eq!(extract_variant_suffix("Express (B)"), Some("B"));
        assert_eq!(extract_variant_suffix("Test (1)"), Some("1"));
    }

    #[test]
    fn test_extract_variant_suffix_invalid() {
        assert_eq!(extract_variant_suffix("Standard Shipping"), None);
        assert_eq!(extract_variant_suffix("Free Shipping"), None);
        assert_eq!(extract_variant_suffix("Standard (AB)"), None); // Too long
        assert_eq!(extract_variant_suffix("(A)"), None); // Too short
    }

    #[test]
    fn test_should_hide_option() {
        // Variant A should see option A, hide option B
        assert!(!should_hide_option("Standard Shipping (A)", "A"));
        assert!(should_hide_option("Standard Shipping (B)", "A"));

        // Variant B should see option B, hide option A
        assert!(should_hide_option("Standard Shipping (A)", "B"));
        assert!(!should_hide_option("Standard Shipping (B)", "B"));

        // Untagged options shown to all
        assert!(!should_hide_option("Express Shipping", "A"));
        assert!(!should_hide_option("Express Shipping", "B"));
    }
}
