use std::process;
use shopify_function::prelude::*;

pub mod cart_lines_discounts_generate_run;

#[typegen("./schema.graphql")]
pub mod schema {
    #[query(
        "src/cart_lines_discounts_generate_run.graphql",
        custom_scalar_overrides = {
            "Input.discount.metafield.jsonValue" => super::cart_lines_discounts_generate_run::Configuration
        }
    )]
    pub mod cart_lines_discounts_generate_run {}
}

#[allow(dead_code)]
fn main() {
    eprintln!("Please invoke a named export.");
    process::exit(1);
}
