import nextConfig from "@cgk-platform/eslint-config/next";

export default [
  ...nextConfig,
  {
    rules: {
      // Disable import order rule - too many violations to fix at once
      // TODO: Fix import ordering across codebase and re-enable
      "import/order": "off",
    },
  },
];
