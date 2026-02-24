use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

/// Delivery customization function for A/B testing shipping options.
///
/// Hides or shows shipping rates based on A/B test variant assignment.
/// Options tagged with a variant suffix (e.g., "Standard Shipping (A)") are
/// only shown to customers assigned to that variant.
#[shopify_function]
fn run(input: schema::run::Input) -> Result<schema::FunctionRunResult> {
    let no_changes = schema::FunctionRunResult { operations: vec![] };

    // Get A/B test variant from cart attributes
    let shipping_variant = input
        .cart()
        .shipping_variant()
        .and_then(|a| a.value());

    let variant = match shipping_variant {
        Some(v) => v,
        None => return Ok(no_changes),
    };

    // Check for subscription items (always free shipping for subscriptions)
    let has_subscription = input.cart().lines().iter().any(|line| {
        line.selling_plan_allocation().is_some()
    });

    if has_subscription {
        return Ok(no_changes);
    }

    // Build hide operations based on variant assignment
    let mut operations: Vec<schema::DeprecatedOperation> = Vec::new();

    for group in input.cart().delivery_groups().iter() {
        for option in group.delivery_options().iter() {
            let title = match option.title() {
                Some(t) => t.as_str(),
                None => continue,
            };
            if should_hide_option(title, variant) {
                operations.push(schema::DeprecatedOperation::Hide(schema::HideOperation {
                    delivery_option_handle: option.handle().clone(),
                }));
            }
        }
    }

    Ok(schema::FunctionRunResult { operations })
}

/// Determines whether a delivery option should be hidden for a given variant.
fn should_hide_option(title: &str, variant: &str) -> bool {
    if let Some(suffix) = extract_variant_suffix(title) {
        return suffix != variant;
    }
    false
}

/// Extracts the variant suffix from a delivery option title.
/// "Standard Shipping (A)" -> Some("A")
/// "Free Shipping" -> None
fn extract_variant_suffix(title: &str) -> Option<&str> {
    if title.len() < 4 {
        return None;
    }

    let bytes = title.as_bytes();
    let len = bytes.len();

    if bytes[len - 1] == b')' && bytes[len - 3] == b'(' && bytes[len - 4] == b' ' {
        let variant_byte = bytes[len - 2];
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
        assert_eq!(extract_variant_suffix("Standard (AB)"), None);
        assert_eq!(extract_variant_suffix("(A)"), None);
    }

    #[test]
    fn test_should_hide_option() {
        assert!(!should_hide_option("Standard Shipping (A)", "A"));
        assert!(should_hide_option("Standard Shipping (B)", "A"));
        assert!(should_hide_option("Standard Shipping (A)", "B"));
        assert!(!should_hide_option("Standard Shipping (B)", "B"));
        assert!(!should_hide_option("Express Shipping", "A"));
        assert!(!should_hide_option("Express Shipping", "B"));
    }
}
