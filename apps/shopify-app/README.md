# CGK Platform Shopify App

This directory contains the Shopify App for the CGK multi-tenant platform, including all Shopify extensions.

## Extensions

### 1. Delivery Customization Function (Rust/WASM)

**Purpose**: Hides or shows shipping rates based on A/B test variant assignment for shipping price testing.

**Location**: `extensions/delivery-customization/`

**How it works**:
- Reads `_ab_shipping_variant` from cart attributes
- Filters delivery options based on variant suffix (e.g., "Standard Shipping (A)")
- Subscription orders bypass filtering (always show all options)

**Test fixtures**: `extensions/delivery-customization/tests/`

### 2. Session Stitching Pixel (Web Pixel)

**Purpose**: Captures session identifiers from cart attributes and sends server-side events to GA4 and Meta CAPI.

**Location**: `extensions/session-stitching-pixel/`

**Configuration** (in Shopify Admin):
- GA4 Measurement ID
- GA4 API Secret
- Meta Pixel ID (optional)
- Meta Access Token (optional)
- Platform API URL (optional)

**Events tracked**:
- `checkout_started`
- `checkout_shipping_info_submitted`
- `payment_info_submitted`
- `checkout_completed` (purchase)

### 3. Post-Purchase Survey (Checkout UI)

**Purpose**: Renders a configurable survey on the order confirmation page for attribution and feedback.

**Location**: `extensions/post-purchase-survey/`

**Configuration** (in Shopify Admin):
- Survey Configuration URL
- API Key

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Rust toolchain with `wasm32-wasip1` target
- Shopify CLI (`npm install -g @shopify/cli @shopify/app`)

### Setup

```bash
# Install dependencies
pnpm install

# Link to your Shopify Partners app
shopify app config link

# Install Rust WASM target
rustup target add wasm32-wasip1
```

### Local Development

```bash
# Start development server (runs ngrok tunnel)
pnpm dev

# Build all extensions
pnpm build

# Build Rust function manually
cd extensions/delivery-customization
cargo build --target=wasm32-wasip1 --release
```

### Testing

```bash
# Test Rust function with fixture
shopify app function run --path extensions/delivery-customization

# Run Rust unit tests
cd extensions/delivery-customization
cargo test
```

## Deployment

### Via CLI

```bash
# Deploy to production
pnpm deploy

# Force deploy (skip confirmation)
pnpm deploy:force
```

### Via CI/CD

Deployments are automated via GitHub Actions when changes are pushed to the `main` branch.

Required secret: `SHOPIFY_CLI_PARTNERS_TOKEN`

## Adding New Extensions

### 1. Shopify Function (Rust)

```bash
# Generate from template
shopify app generate extension --template rust

# Or create manually:
mkdir extensions/my-function
# Add: Cargo.toml, shopify.extension.toml, src/lib.rs, src/run.graphql
```

### 2. Web Pixel Extension

```bash
shopify app generate extension --template web_pixel_extension
```

### 3. Checkout UI Extension

```bash
shopify app generate extension --template checkout_ui_extension
```

## Extension Configuration

Extensions are configured in Shopify Admin:

1. Go to Settings > Apps and sales channels
2. Click on "CGK Platform"
3. Configure extension settings

## Architecture

```
shopify-app/
├── shopify.app.toml        # App configuration
├── package.json            # Dependencies
├── extensions/
│   ├── delivery-customization/
│   │   ├── Cargo.toml      # Rust dependencies
│   │   ├── shopify.extension.toml
│   │   ├── src/
│   │   │   ├── lib.rs      # Function logic
│   │   │   └── run.graphql # Input query
│   │   └── tests/          # Test fixtures
│   │
│   ├── session-stitching-pixel/
│   │   ├── package.json
│   │   ├── shopify.extension.toml
│   │   └── src/
│   │       └── index.ts    # Pixel logic
│   │
│   └── post-purchase-survey/
│       ├── package.json
│       ├── shopify.extension.toml
│       └── src/
│           ├── types.ts    # Type definitions
│           └── Checkout.tsx # React component
│
└── .github/
    └── workflows/
        └── shopify-app-deploy.yml
```

## Tenant Isolation

Extensions respect tenant isolation through:

1. **Cart Attributes**: A/B test variants are tenant-scoped
2. **Extension Settings**: Each tenant configures their own API keys/URLs
3. **Platform API**: All events include shop domain for tenant identification

## Troubleshooting

### Function not hiding options

1. Check cart attributes are being set correctly
2. Verify variant suffix format: " (A)", " (B)", etc.
3. Check for subscription items (they bypass filtering)

### Pixel not sending events

1. Verify GA4/Meta credentials in extension settings
2. Check browser console for errors
3. Ensure cart attributes are populated before checkout

### Survey not appearing

1. Verify survey configuration URL is accessible
2. Check API key is configured
3. Ensure the extension is active in Shopify admin
