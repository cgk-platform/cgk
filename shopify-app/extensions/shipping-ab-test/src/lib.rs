//! Shipping A/B Test - Shopify Delivery Customization Function
//!
//! This function filters shipping rates based on the visitor's A/B test variant
//! assignment. The variant is passed via cart attributes.
//!
//! How it works:
//! 1. Visitor is assigned to a variant (A, B, C, or D) by the storefront
//! 2. Variant suffix is stored in cart attribute `_ab_shipping_suffix`
//! 3. When checkout loads, Shopify queries this function
//! 4. Function hides shipping rates that don't match the assigned variant
//! 5. Visitor only sees their variant's shipping rate

pub mod run;

pub use run::*;
