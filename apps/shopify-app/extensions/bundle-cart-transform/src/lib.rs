use std::process;
use shopify_function::prelude::*;

pub mod run;

#[typegen("./schema.graphql")]
pub mod schema {
    #[query("src/run.graphql")]
    pub mod run {}
}

fn main() {
    eprintln!("Please invoke a named export.");
    process::exit(1);
}
