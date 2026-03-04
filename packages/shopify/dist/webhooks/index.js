import {
  createAdminClient
} from "../chunk-X2N4PNZC.js";
import {
  tasks
} from "../chunk-R57NZEDK.js";
import "../chunk-H4N422JF.js";
import "../chunk-4VNS5WPM.js";

// src/webhooks/handler.ts
import { withTenant as withTenant8 } from "@cgk-platform/db";

// src/webhooks/handlers/app.ts
import { withTenant, sql } from "@cgk-platform/db";
import { createLogger } from "@cgk-platform/logging";
var logger = createLogger({ meta: { service: "shopify" } });
async function handleAppUninstalled(tenantId, payload, _eventId) {
  const shop = payload;
  const shopDomain = shop.myshopify_domain || shop.domain || "";
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE shopify_connections
      SET
        status = 'disconnected',
        access_token_encrypted = NULL,
        webhook_secret_encrypted = NULL
      WHERE shop = ${shopDomain}
    `;
    await sql`
      UPDATE webhook_registrations
      SET
        status = 'deleted',
        updated_at = NOW()
      WHERE shop = ${shopDomain}
    `;
  });
  logger.info(`[Webhook] App uninstalled for shop ${shopDomain}, tenant ${tenantId}`);
}

// src/webhooks/handlers/customers.ts
import { withTenant as withTenant2, sql as sql2 } from "@cgk-platform/db";
import { createLogger as createLogger2 } from "@cgk-platform/logging";
var logger2 = createLogger2({ meta: { service: "shopify" } });
async function handleCustomerCreate(tenantId, payload, _eventId) {
  const customer = payload;
  const shopifyCustomerId = customer.id.toString();
  await withTenant2(tenantId, async () => {
    await upsertCustomer(customer);
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses);
    }
  });
  await tasks.trigger("commerce-customer-sync", {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false
  });
  logger2.info(`[Webhook] Customer ${shopifyCustomerId} created for tenant ${tenantId}`);
}
async function handleCustomerUpdate(tenantId, payload, _eventId) {
  const customer = payload;
  const shopifyCustomerId = customer.id.toString();
  await withTenant2(tenantId, async () => {
    await upsertCustomer(customer);
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses);
    }
  });
  await tasks.trigger("commerce-customer-sync", {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false
  });
  logger2.info(`[Webhook] Customer ${shopifyCustomerId} updated for tenant ${tenantId}`);
}
async function upsertCustomer(customer) {
  const shopifyCustomerId = customer.id.toString();
  const tags = customer.tags ? customer.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  await sql2`
    INSERT INTO customers (
      shopify_id,
      email,
      first_name,
      last_name,
      phone,
      orders_count,
      total_spent_cents,
      tags,
      shopify_created_at,
      synced_at
    ) VALUES (
      ${shopifyCustomerId},
      ${customer.email || null},
      ${customer.first_name || null},
      ${customer.last_name || null},
      ${customer.phone || null},
      ${customer.orders_count},
      ${Math.round(parseFloat(customer.total_spent || "0") * 100)},
      ${JSON.stringify(tags)},
      ${customer.created_at},
      NOW()
    )
    ON CONFLICT (shopify_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      orders_count = EXCLUDED.orders_count,
      total_spent_cents = EXCLUDED.total_spent_cents,
      tags = EXCLUDED.tags,
      synced_at = NOW()
  `;
  if (customer.default_address) {
    await sql2`
      UPDATE customers
      SET
        default_address_line1 = ${customer.default_address.address1 || null},
        default_address_line2 = ${customer.default_address.address2 || null},
        default_address_city = ${customer.default_address.city || null},
        default_address_province = ${customer.default_address.province || null},
        default_address_province_code = ${customer.default_address.province_code || null},
        default_address_country = ${customer.default_address.country || null},
        default_address_country_code = ${customer.default_address.country_code || null},
        default_address_zip = ${customer.default_address.zip || null}
      WHERE shopify_id = ${shopifyCustomerId}
    `;
  }
}
async function syncCustomerAddresses(customerId, addresses) {
  if (!addresses || addresses.length === 0) {
    return;
  }
  await sql2`DELETE FROM customer_addresses WHERE customer_shopify_id = ${customerId}`;
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    if (!address) continue;
    await sql2`
      INSERT INTO customer_addresses (
        customer_shopify_id,
        address_index,
        first_name,
        last_name,
        address1,
        address2,
        city,
        province,
        province_code,
        country,
        country_code,
        zip,
        phone
      ) VALUES (
        ${customerId},
        ${i},
        ${address.first_name || null},
        ${address.last_name || null},
        ${address.address1 || null},
        ${address.address2 || null},
        ${address.city || null},
        ${address.province || null},
        ${address.province_code || null},
        ${address.country || null},
        ${address.country_code || null},
        ${address.zip || null},
        ${address.phone || null}
      )
    `;
  }
}

// src/webhooks/handlers/fulfillments.ts
import { withTenant as withTenant3, sql as sql3 } from "@cgk-platform/db";
import { createLogger as createLogger3 } from "@cgk-platform/logging";
var logger3 = createLogger3({ meta: { service: "shopify" } });
async function handleFulfillmentCreate(tenantId, payload, _eventId) {
  const fulfillment = payload;
  const shopifyFulfillmentId = fulfillment.id.toString();
  const orderId = fulfillment.order_id.toString();
  await withTenant3(tenantId, async () => {
    await sql3`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `;
    await sql3`
      UPDATE orders
      SET
        fulfillment_status = 'fulfilled',
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `;
  });
  await Promise.all([
    // Queue review request email processing
    tasks.trigger("commerce-process-review-email-queue", {
      tenantId,
      limit: 50,
      dryRun: false
    }),
    // Handle order fulfilled for project linking and other processing
    tasks.trigger("commerce-handle-order-fulfilled", {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null
    })
  ]);
  logger3.info(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} created for order ${orderId}, tenant ${tenantId}`
  );
}
async function handleFulfillmentUpdate(tenantId, payload, _eventId) {
  const fulfillment = payload;
  const shopifyFulfillmentId = fulfillment.id.toString();
  const orderId = fulfillment.order_id.toString();
  let trackingChanged = false;
  await withTenant3(tenantId, async () => {
    const existing = await sql3`
      SELECT tracking_number, status
      FROM fulfillments
      WHERE shopify_fulfillment_id = ${shopifyFulfillmentId}
    `;
    const newTrackingNumber = fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null;
    if (existing.rows.length > 0 && existing.rows[0]) {
      const oldTracking = existing.rows[0].tracking_number;
      trackingChanged = oldTracking !== newTrackingNumber;
    }
    await sql3`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${newTrackingNumber},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `;
  });
  if (trackingChanged) {
    await tasks.trigger("commerce-handle-order-fulfilled", {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null
    });
  }
  logger3.info(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} updated for order ${orderId}, tenant ${tenantId}`
  );
}

// src/webhooks/handlers/gdpr.ts
import { withTenant as withTenant4, sql as sql4 } from "@cgk-platform/db";
import { createLogger as createLogger4 } from "@cgk-platform/logging";
var logger4 = createLogger4({ meta: { service: "shopify" } });
async function handleCustomerRedact(tenantId, payload, _eventId) {
  const data = payload;
  const customerId = String(data.customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      UPDATE customers
      SET
        email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
        first_name = 'Redacted',
        last_name = 'Customer',
        phone = NULL,
        default_address_line1 = NULL,
        default_address_line2 = NULL,
        default_address_city = NULL,
        default_address_province = NULL,
        default_address_zip = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `;
    if (data.orders_to_redact.length > 0) {
      const orderIds = `{${data.orders_to_redact.join(",")}}`;
      await sql4`
        UPDATE orders
        SET
          customer_email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
          updated_at = NOW()
        WHERE customer_id = ${customerId}
          AND shopify_id = ANY(${orderIds}::text[])
      `;
    }
    await sql4`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `;
  });
  logger4.info(`[GDPR] Customer ${customerId} PII redacted for tenant ${tenantId} (shop: ${data.shop_domain})`);
}
async function handleShopRedact(tenantId, payload, _eventId) {
  const data = payload;
  await sql4`
    UPDATE shopify_connections
    SET
      status = 'deleted',
      access_token_encrypted = NULL,
      webhook_secret_encrypted = NULL,
      storefront_api_token_encrypted = NULL,
      updated_at = NOW()
    WHERE shop = ${data.shop_domain}
  `;
  logger4.info(`[GDPR] Shop ${data.shop_domain} credentials cleared for tenant ${tenantId}`);
}
async function handleCustomerDataRequest(tenantId, payload, _eventId) {
  const data = payload;
  const customerId = String(data.customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      INSERT INTO webhook_events (
        shop,
        topic,
        shopify_webhook_id,
        payload,
        hmac_verified,
        idempotency_key,
        headers,
        status
      ) VALUES (
        ${data.shop_domain},
        'customers/data_request',
        NULL,
        ${JSON.stringify(data)},
        TRUE,
        ${`gdpr-data-request:${customerId}:${data.shop_domain}`},
        '{}',
        'completed'
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `;
  });
  logger4.info(`[GDPR] Data request logged for customer ${customerId} at shop ${data.shop_domain}, tenant ${tenantId}`);
}
async function handleCustomerDelete(tenantId, payload, _eventId) {
  const customer = payload;
  const customerId = String(customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      UPDATE customers
      SET
        email = CONCAT('deleted-', shopify_id, '@deleted.invalid'),
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `;
    await sql4`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `;
  });
  logger4.info(`[Webhook] Customer ${customerId} deleted for tenant ${tenantId}`);
}

// src/webhooks/handlers/orders.ts
import { withTenant as withTenant5, sql as sql6 } from "@cgk-platform/db";

// src/webhooks/utils.ts
import crypto from "crypto";
import { sql as sql5 } from "@cgk-platform/db";
function verifyShopifyWebhook(body, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}
async function getTenantForShop(shop) {
  const shopifyResult = await sql5`
    SELECT tenant_id
    FROM shopify_connections
    WHERE shop = ${shop}
    AND status = 'active'
    LIMIT 1
  `;
  const shopifyRow = shopifyResult.rows[0];
  if (shopifyRow) {
    return shopifyRow.tenant_id;
  }
  const orgResult = await sql5`
    SELECT id as tenant_id
    FROM public.organizations
    WHERE (
      shopify_store_domain = ${shop}
      OR shopify_config->>'checkoutDomain' = ${shop}
    )
    AND status = 'active'
    LIMIT 1
  `;
  const orgRow = orgResult.rows[0];
  if (!orgRow) {
    return null;
  }
  return orgRow.tenant_id;
}
async function getShopifyCredentials(_tenantId, shop) {
  const result = await sql5`
    SELECT
      shop,
      access_token_encrypted,
      webhook_secret_encrypted
    FROM shopify_connections
    WHERE shop = ${shop}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    shop: row.shop,
    accessToken: row.access_token_encrypted,
    webhookSecret: row.webhook_secret_encrypted || null
  };
}
async function checkDuplicateWebhook(idempotencyKey) {
  const result = await sql5`
    SELECT id FROM webhook_events
    WHERE idempotency_key = ${idempotencyKey}
    AND status IN ('completed', 'processing')
    LIMIT 1
  `;
  return result.rows.length > 0;
}
async function logWebhookEvent(params) {
  const result = await sql5`
    INSERT INTO webhook_events (
      shop,
      topic,
      shopify_webhook_id,
      payload,
      hmac_verified,
      idempotency_key,
      headers,
      status
    ) VALUES (
      ${params.shop},
      ${params.topic},
      ${params.shopifyWebhookId},
      ${JSON.stringify(params.payload)},
      ${params.hmacVerified},
      ${params.idempotencyKey},
      ${JSON.stringify(params.headers)},
      'pending'
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      retry_count = webhook_events.retry_count + 1,
      status = 'pending'
    RETURNING id
  `;
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to log webhook event");
  }
  return row.id;
}
async function updateWebhookStatus(eventId, status, errorMessage) {
  if (status === "completed") {
    await sql5`
      UPDATE webhook_events
      SET
        status = ${status},
        processed_at = NOW(),
        error_message = NULL
      WHERE id = ${eventId}
    `;
  } else if (status === "failed") {
    await sql5`
      UPDATE webhook_events
      SET
        status = ${status},
        error_message = ${errorMessage || null},
        retry_count = retry_count + 1
      WHERE id = ${eventId}
    `;
  } else {
    await sql5`
      UPDATE webhook_events
      SET status = ${status}
      WHERE id = ${eventId}
    `;
  }
}
async function getWebhookEvent(eventId) {
  const result = await sql5`
    SELECT
      id,
      shop,
      topic,
      shopify_webhook_id as "shopifyWebhookId",
      payload,
      hmac_verified as "hmacVerified",
      status,
      processed_at as "processedAt",
      error_message as "errorMessage",
      retry_count as "retryCount",
      idempotency_key as "idempotencyKey",
      received_at as "receivedAt",
      headers
    FROM webhook_events
    WHERE id = ${eventId}
  `;
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return row;
}
function parseCents(priceString) {
  if (priceString === void 0 || priceString === null) {
    return 0;
  }
  const price = typeof priceString === "string" ? parseFloat(priceString) : priceString;
  return Math.round(price * 100);
}
function mapFinancialStatus(status) {
  if (!status) return "pending";
  const statusMap = {
    pending: "pending",
    authorized: "authorized",
    partially_paid: "partially_paid",
    paid: "paid",
    partially_refunded: "partially_refunded",
    refunded: "refunded",
    voided: "voided"
  };
  return statusMap[status] || "pending";
}
function mapFulfillmentStatus(status) {
  if (!status) return "unfulfilled";
  const statusMap = {
    fulfilled: "fulfilled",
    partial: "partial",
    unfulfilled: "unfulfilled",
    restocked: "restocked"
  };
  return statusMap[status] || "unfulfilled";
}
function extractResourceId(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const p = payload;
  if ("id" in p && (typeof p.id === "string" || typeof p.id === "number")) {
    return String(p.id);
  }
  if ("order_id" in p && (typeof p.order_id === "string" || typeof p.order_id === "number")) {
    return String(p.order_id);
  }
  return null;
}
function generateIdempotencyKey(topic, resourceId, webhookId) {
  const id = resourceId || webhookId || Date.now().toString();
  return `${topic}:${id}`;
}
function headersToObject(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// src/webhooks/handlers/orders.ts
import { createLogger as createLogger5 } from "@cgk-platform/logging";
var logger5 = createLogger5({ meta: { service: "shopify" } });
async function handleOrderCreate(tenantId, payload, _eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  const orderName = order.name;
  await withTenant5(tenantId, async () => {
    const discountCodes = order.discount_codes?.map((d) => d.code) || [];
    const tags = order.tags ? order.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const shippingCents = order.total_shipping_price_set?.shop_money?.amount ? parseCents(order.total_shipping_price_set.shop_money.amount) : 0;
    await sql6`
      INSERT INTO orders (
        shopify_id,
        shopify_order_number,
        created_at,
        customer_email,
        customer_id,
        gross_sales_cents,
        discounts_cents,
        net_sales_cents,
        taxes_cents,
        shipping_cents,
        total_price_cents,
        financial_status,
        fulfillment_status,
        discount_codes,
        tags,
        currency,
        synced_at
      ) VALUES (
        ${shopifyId},
        ${orderName},
        ${order.created_at},
        ${order.email || order.customer?.email || null},
        ${order.customer?.id?.toString() || null},
        ${parseCents(order.subtotal_price)},
        ${parseCents(order.total_discounts)},
        ${parseCents(order.subtotal_price) - parseCents(order.total_discounts)},
        ${parseCents(order.total_tax)},
        ${shippingCents},
        ${parseCents(order.total_price)},
        ${mapFinancialStatus(order.financial_status)},
        ${mapFulfillmentStatus(order.fulfillment_status)},
        ${JSON.stringify(discountCodes)},
        ${JSON.stringify(tags)},
        ${order.currency || "USD"},
        NOW()
      )
      ON CONFLICT (shopify_id) DO UPDATE SET
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        discounts_cents = EXCLUDED.discounts_cents,
        net_sales_cents = EXCLUDED.net_sales_cents,
        total_price_cents = EXCLUDED.total_price_cents,
        tags = EXCLUDED.tags,
        synced_at = NOW()
    `;
    await syncOrderLineItems(shopifyId, order.line_items);
  });
  const netSalesCents = parseCents(order.subtotal_price) - parseCents(order.total_discounts);
  await Promise.all([
    // Attribution processing
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      sessionId: null
      // Session ID should be extracted from note attributes if available
    }),
    // Creator commission check
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId: shopifyId,
      discountCode: order.discount_codes?.[0]?.code || null,
      orderTotal: netSalesCents / 100,
      // Convert cents to dollars
      currency: order.currency || "USD"
    }),
    // Handle order created for additional processing (A/B attribution, pixel events)
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    })
  ]);
  logger5.info(`[Webhook] Order ${orderName} created for tenant ${tenantId}`);
}
async function handleOrderPaid(tenantId, payload, eventId) {
  const order = payload;
  await handleOrderUpdate(tenantId, payload, eventId);
  await Promise.all([
    // Handle order created for gift card rewards processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: order.id.toString(),
      shopifyOrderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    }),
    // Send pixel events and additional processing
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      sessionId: null
      // Session ID should be extracted from note attributes if available
    })
  ]);
  logger5.info(`[Webhook] Order ${order.name} paid for tenant ${tenantId}`);
}
async function handleOrderUpdate(tenantId, payload, _eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  await withTenant5(tenantId, async () => {
    await sql6`
      UPDATE orders
      SET
        financial_status = ${mapFinancialStatus(order.financial_status)},
        fulfillment_status = ${mapFulfillmentStatus(order.fulfillment_status)},
        cancelled_at = ${order.cancelled_at || null},
        synced_at = NOW()
      WHERE shopify_id = ${shopifyId}
    `;
  });
  logger5.info(`[Webhook] Order ${order.name} updated for tenant ${tenantId}`);
}
async function handleOrderCancelled(tenantId, payload, eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  await handleOrderUpdate(tenantId, payload, eventId);
  await Promise.all([
    // Handle order created for A/B test exclusion and other processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    }),
    // Reverse commissions using order commission task
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId: shopifyId,
      discountCode: null,
      orderTotal: 0,
      // Zero out commission
      currency: order.currency || "USD"
    })
  ]);
  logger5.info(`[Webhook] Order ${order.name} cancelled for tenant ${tenantId}`);
}
async function syncOrderLineItems(orderId, lineItems) {
  await sql6`DELETE FROM order_line_items WHERE order_shopify_id = ${orderId}`;
  for (const item of lineItems) {
    await sql6`
      INSERT INTO order_line_items (
        order_shopify_id,
        shopify_line_item_id,
        product_id,
        variant_id,
        title,
        quantity,
        price_cents,
        sku,
        variant_title
      ) VALUES (
        ${orderId},
        ${item.id.toString()},
        ${item.product_id?.toString() || null},
        ${item.variant_id?.toString() || null},
        ${item.title},
        ${item.quantity},
        ${parseCents(item.price)},
        ${item.sku || null},
        ${item.variant_title || null}
      )
    `;
  }
}

// src/webhooks/handlers/products.ts
import { withTenant as withTenant6, sql as sql7 } from "@cgk-platform/db";
import { createLogger as createLogger6 } from "@cgk-platform/logging";
var logger6 = createLogger6({ meta: { service: "shopify" } });
async function handleProductCreate(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await tasks.trigger("commerce-product-sync", {
    tenantId,
    shopifyProductId,
    action: "create"
  });
  logger6.info(`[Webhook] Product ${shopifyProductId} created for tenant ${tenantId}`);
}
async function handleProductUpdate(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await tasks.trigger("commerce-product-sync", {
    tenantId,
    shopifyProductId,
    action: "update"
  });
  logger6.info(`[Webhook] Product ${shopifyProductId} updated for tenant ${tenantId}`);
}
async function handleProductDelete(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await withTenant6(tenantId, async () => {
    await sql7`
      UPDATE products
      SET
        status = 'archived',
        updated_at = NOW()
      WHERE shopify_product_id = ${shopifyProductId}
    `;
  });
  logger6.info(`[Webhook] Product ${shopifyProductId} deleted/archived for tenant ${tenantId}`);
}

// src/webhooks/handlers/refunds.ts
import { withTenant as withTenant7, sql as sql8 } from "@cgk-platform/db";
import { createLogger as createLogger7 } from "@cgk-platform/logging";
var logger7 = createLogger7({ meta: { service: "shopify" } });
async function handleRefundCreate(tenantId, payload, _eventId) {
  const refund = payload;
  const shopifyRefundId = refund.id.toString();
  const orderId = refund.order_id.toString();
  const totalRefundCents = refund.transactions.reduce((sum, txn) => {
    if (txn.status === "success" && txn.kind === "refund") {
      return sum + parseCents(txn.amount);
    }
    return sum;
  }, 0);
  await withTenant7(tenantId, async () => {
    const refundResult = await sql8`
      INSERT INTO refunds (
        shopify_refund_id,
        order_shopify_id,
        amount_cents,
        reason,
        processed_at,
        created_at
      ) VALUES (
        ${shopifyRefundId},
        ${orderId},
        ${totalRefundCents},
        ${refund.note || null},
        ${refund.processed_at || null},
        ${refund.created_at}
      )
      ON CONFLICT (shopify_refund_id) DO UPDATE SET
        amount_cents = EXCLUDED.amount_cents,
        reason = EXCLUDED.reason,
        processed_at = EXCLUDED.processed_at
      RETURNING id
    `;
    const refundId = refundResult.rows[0]?.id;
    await sql8`
      UPDATE orders
      SET
        financial_status = 'partially_refunded',
        refunded_cents = COALESCE(refunded_cents, 0) + ${totalRefundCents},
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `;
    if (refundId) {
      await sql8`DELETE FROM refund_line_items WHERE refund_id = ${refundId}`;
      for (const item of refund.refund_line_items) {
        await sql8`
          INSERT INTO refund_line_items (
            refund_id,
            shopify_line_item_id,
            quantity,
            amount_cents
          ) VALUES (
            ${refundId},
            ${item.line_item_id.toString()},
            ${item.quantity},
            ${parseCents(item.subtotal) + parseCents(item.total_tax)}
          )
        `;
      }
    }
  });
  await Promise.all([
    // Adjust creator commissions using order commission task
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId,
      discountCode: null,
      orderTotal: -(totalRefundCents / 100),
      // Negative for refund
      currency: "USD"
    }),
    // Handle order created for pixel events and additional processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId,
      shopifyOrderId: orderId,
      customerId: null,
      totalAmount: -(totalRefundCents / 100),
      // Negative for refund
      currency: "USD"
    }),
    // Update analytics using order attribution task
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId,
      customerId: null,
      sessionId: null
    })
  ]);
  logger7.info(
    `[Webhook] Refund ${shopifyRefundId} created for order ${orderId}, amount: ${totalRefundCents} cents, tenant ${tenantId}`
  );
}

// src/webhooks/router.ts
import { createLogger as createLogger8 } from "@cgk-platform/logging";
var logger8 = createLogger8({ meta: { service: "shopify" } });
var HANDLERS = {
  // Orders
  "orders/create": handleOrderCreate,
  "orders/updated": handleOrderUpdate,
  "orders/paid": handleOrderPaid,
  "orders/cancelled": handleOrderCancelled,
  "orders/fulfilled": handleOrderUpdate,
  // Refunds & fulfillments
  "refunds/create": handleRefundCreate,
  "fulfillments/create": handleFulfillmentCreate,
  "fulfillments/update": handleFulfillmentUpdate,
  // Customers
  "customers/create": handleCustomerCreate,
  "customers/update": handleCustomerUpdate,
  "customers/delete": handleCustomerDelete,
  // Products
  "products/create": handleProductCreate,
  "products/update": handleProductUpdate,
  "products/delete": handleProductDelete,
  // Inventory (no-op stub — handled by product-sync job)
  "inventory_levels/update": async (_tenantId, _payload, _eventId) => {
  },
  // App lifecycle
  "app/uninstalled": handleAppUninstalled,
  // GDPR mandatory (registered via Partner Dashboard, not REST API)
  "customers/redact": handleCustomerRedact,
  "shop/redact": handleShopRedact,
  "customers/data_request": handleCustomerDataRequest
};
async function routeToHandler(tenantId, topic, payload, eventId) {
  const handler = HANDLERS[topic];
  if (!handler) {
    logger8.info(`[Webhook] No handler registered for topic: ${topic}`);
    return;
  }
  await handler(tenantId, payload, eventId);
}
function hasHandler(topic) {
  return topic in HANDLERS;
}
function getRegisteredTopics() {
  return Object.keys(HANDLERS);
}
function registerHandler(topic, handler) {
  HANDLERS[topic] = handler;
}

// src/webhooks/handler.ts
import { createLogger as createLogger9 } from "@cgk-platform/logging";
var logger9 = createLogger9({ meta: { service: "shopify" } });
async function handleShopifyWebhook(request) {
  const startTime = Date.now();
  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!shop || !topic || !hmac) {
    logger9.warn("[Webhook] Missing required headers", { shop, topic, hasHmac: !!hmac });
    return new Response("Missing required headers", { status: 400 });
  }
  const tenantId = await getTenantForShop(shop);
  if (!tenantId) {
    logger9.warn(`[Webhook] Unknown shop: ${shop}, topic: ${topic}`);
    return new Response("Shop not registered", { status: 200 });
  }
  const body = await request.text();
  const credentials = await withTenant8(tenantId, async () => {
    return getShopifyCredentials(tenantId, shop);
  });
  if (!credentials || !credentials.webhookSecret) {
    logger9.error(`[Webhook] No webhook secret for shop ${shop}, tenant ${tenantId}`);
    return new Response("Configuration error", { status: 500 });
  }
  const isValid = verifyShopifyWebhook(body, hmac, credentials.webhookSecret);
  if (!isValid) {
    logger9.error(`[Webhook] Invalid HMAC signature for ${shop}, topic: ${topic}`);
    return new Response("Invalid signature", { status: 401 });
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    logger9.error(`[Webhook] Invalid JSON for ${shop}, topic: ${topic}`);
    return new Response("Invalid JSON", { status: 400 });
  }
  const resourceId = extractResourceId(payload);
  const idempotencyKey = generateIdempotencyKey(topic, resourceId, webhookId);
  const isDuplicate = await withTenant8(tenantId, async () => {
    return checkDuplicateWebhook(idempotencyKey);
  });
  if (isDuplicate) {
    logger9.info(`[Webhook] Duplicate ignored: ${idempotencyKey} for ${shop}`);
    return new Response("Already processed", { status: 200 });
  }
  const eventId = await withTenant8(tenantId, async () => {
    return logWebhookEvent({
      shop,
      topic,
      shopifyWebhookId: webhookId,
      payload,
      hmacVerified: true,
      idempotencyKey,
      headers: headersToObject(request.headers)
    });
  });
  try {
    await withTenant8(tenantId, async () => {
      await routeToHandler(tenantId, topic, payload, eventId);
    });
    await withTenant8(tenantId, async () => {
      await updateWebhookStatus(eventId, "completed");
    });
    const duration = Date.now() - startTime;
    logger9.info(`[Webhook] ${topic} processed in ${duration}ms for ${shop}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await withTenant8(tenantId, async () => {
      await updateWebhookStatus(eventId, "failed", errorMessage);
    });
    logger9.error(`[Webhook] ${topic} failed for ${shop}:`, error instanceof Error ? error : void 0);
    logger9.info(`[Webhook] Event ${eventId} marked as failed \u2014 scheduled retry job will pick it up`);
    return new Response("Processing error", { status: 200 });
  }
}
function createWebhookRoute() {
  return async function POST(request) {
    return handleShopifyWebhook(request);
  };
}

// src/webhooks/register.ts
import { withTenant as withTenant9, sql as sql9 } from "@cgk-platform/db";
import { createLogger as createLogger10 } from "@cgk-platform/logging";
var logger10 = createLogger10({ meta: { service: "shopify" } });
var REQUIRED_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "orders/cancelled",
  "orders/fulfilled",
  "refunds/create",
  "fulfillments/create",
  "fulfillments/update",
  "customers/create",
  "customers/update",
  "app/uninstalled"
];
var OPTIONAL_TOPICS = {
  "commerce.product_sync": ["products/create", "products/update"],
  "commerce.inventory_sync": ["inventory_levels/update"],
  "commerce.abandoned_cart": ["checkouts/create", "checkouts/update"],
  "commerce.draft_orders": ["draft_orders/create"],
  "subscriptions.enabled": ["subscription_contracts/create", "subscription_contracts/update"]
};
var CREATE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
var LIST_WEBHOOKS_QUERY = `
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`;
var DELETE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`;
function topicToEnum(topic) {
  return topic.replace("/", "_").toUpperCase();
}
async function registerWebhooks(tenantId, shop, accessToken, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  const errors = [];
  for (const topic of REQUIRED_TOPICS) {
    try {
      const result = await client.query(CREATE_WEBHOOK_MUTATION, {
        topic: topicToEnum(topic),
        webhookSubscription: {
          callbackUrl: webhookUrl,
          format: "JSON"
        }
      });
      const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate;
      if (userErrors && userErrors.length > 0) {
        const firstError = userErrors[0];
        const error = firstError ? firstError.message : "Unknown error";
        logger10.error(`[Webhook] Failed to register ${topic} for ${shop}: ${error}`);
        errors.push({ topic, error });
        continue;
      }
      if (webhookSubscription) {
        await withTenant9(tenantId, async () => {
          await sql9`
            INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
            VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
            ON CONFLICT (shop, topic) DO UPDATE SET
              shopify_webhook_id = EXCLUDED.shopify_webhook_id,
              address = EXCLUDED.address,
              status = 'active',
              failure_count = 0,
              updated_at = NOW()
          `;
        });
        logger10.info(`[Webhook] Registered ${topic} for ${shop}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger10.error(`[Webhook] Failed to register ${topic} for ${shop}:`, error instanceof Error ? error : void 0);
      errors.push({ topic, error: message });
    }
  }
  if (errors.length > 0) {
    logger10.error(`[Webhook] ${errors.length} webhooks failed to register for ${shop}`);
  }
}
async function registerSingleWebhook(tenantId, shop, accessToken, topic, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  try {
    const result = await client.query(CREATE_WEBHOOK_MUTATION, {
      topic: topicToEnum(topic),
      webhookSubscription: {
        callbackUrl: webhookUrl,
        format: "JSON"
      }
    });
    const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate;
    if (userErrors && userErrors.length > 0) {
      const firstError = userErrors[0];
      return { success: false, error: firstError ? firstError.message : "Unknown error" };
    }
    if (webhookSubscription) {
      await withTenant9(tenantId, async () => {
        await sql9`
          INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
          VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
          ON CONFLICT (shop, topic) DO UPDATE SET
            shopify_webhook_id = EXCLUDED.shopify_webhook_id,
            address = EXCLUDED.address,
            status = 'active',
            failure_count = 0,
            updated_at = NOW()
        `;
      });
      return { success: true };
    }
    return { success: false, error: "No webhook subscription returned" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
async function syncWebhookRegistrations(tenantId, shop, credentials, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: credentials.accessToken
  });
  const result = {
    added: [],
    removed: [],
    unchanged: [],
    errors: []
  };
  try {
    const shopifyResponse = await client.query(LIST_WEBHOOKS_QUERY);
    const shopifyWebhooks = shopifyResponse.webhookSubscriptions.edges.map((e) => ({
      id: e.node.id,
      topic: e.node.topic.toLowerCase().replace("_", "/"),
      url: e.node.endpoint.callbackUrl
    }));
    const ourRegistrations = await withTenant9(tenantId, async () => {
      const res = await sql9`
        SELECT topic, shopify_webhook_id, status
        FROM webhook_registrations
        WHERE shop = ${shop}
      `;
      return res.rows;
    });
    for (const topic of REQUIRED_TOPICS) {
      const existsInShopify = shopifyWebhooks.some(
        (w) => w.topic === topic && w.url === webhookUrl
      );
      if (!existsInShopify) {
        const registerResult = await registerSingleWebhook(
          tenantId,
          shop,
          credentials.accessToken,
          topic,
          webhookUrl
        );
        if (registerResult.success) {
          result.added.push(topic);
        } else {
          result.errors.push({ topic, error: registerResult.error || "Failed to register" });
        }
      } else {
        result.unchanged.push(topic);
      }
    }
    for (const reg of ourRegistrations) {
      const existsInShopify = shopifyWebhooks.some(
        (w) => w.id === reg.shopify_webhook_id
      );
      if (!existsInShopify && reg.status !== "deleted") {
        await withTenant9(tenantId, async () => {
          await sql9`
            UPDATE webhook_registrations
            SET status = 'deleted', updated_at = NOW()
            WHERE shop = ${shop} AND topic = ${reg.topic}
          `;
        });
        result.removed.push(reg.topic);
      }
    }
    return result;
  } catch (error) {
    logger10.error(`[Webhook] Sync failed for ${shop}:`, error instanceof Error ? error : void 0);
    throw error;
  }
}
async function unregisterWebhook(tenantId, shop, accessToken, topic) {
  const registration = await withTenant9(tenantId, async () => {
    const res = await sql9`
      SELECT shopify_webhook_id
      FROM webhook_registrations
      WHERE shop = ${shop} AND topic = ${topic}
    `;
    return res.rows[0];
  });
  if (!registration?.shopify_webhook_id) {
    logger10.info(`[Webhook] No registration found for ${topic} on ${shop}`);
    return;
  }
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  try {
    await client.query(DELETE_WEBHOOK_MUTATION, {
      id: registration.shopify_webhook_id
    });
    await withTenant9(tenantId, async () => {
      await sql9`
        UPDATE webhook_registrations
        SET status = 'deleted', updated_at = NOW()
        WHERE shop = ${shop} AND topic = ${topic}
      `;
    });
    logger10.info(`[Webhook] Unregistered ${topic} for ${shop}`);
  } catch (error) {
    logger10.error(`[Webhook] Failed to unregister ${topic} for ${shop}:`, error instanceof Error ? error : void 0);
    throw error;
  }
}

// src/webhooks/health.ts
import { withTenant as withTenant10, sql as sql10 } from "@cgk-platform/db";
async function getWebhookHealth(tenantId, shop) {
  return withTenant10(tenantId, async () => {
    const registrations = await sql10`
      SELECT
        topic,
        status,
        last_success_at as "lastSuccessAt",
        failure_count as "failureCount"
      FROM webhook_registrations
      WHERE shop = ${shop}
      ORDER BY topic
    `;
    const eventStats = await sql10`
      SELECT
        COUNT(*) FILTER (WHERE true) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > NOW() - INTERVAL '24 hours'
    `;
    const stats = eventStats.rows[0];
    return {
      shop,
      registrations: registrations.rows,
      recentEvents: {
        total: parseInt(stats.total, 10),
        completed: parseInt(stats.completed, 10),
        failed: parseInt(stats.failed, 10),
        pending: parseInt(stats.pending, 10)
      }
    };
  });
}
async function getRecentWebhookEvents(tenantId, shop, options = {}) {
  const { limit = 50, offset = 0, status, topic } = options;
  return withTenant10(tenantId, async () => {
    let countResult;
    let events;
    if (status && topic) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (topic) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events WHERE shop = ${shop}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events WHERE shop = ${shop}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
    const countRow = countResult.rows[0];
    return {
      events: events.rows,
      total: countRow ? parseInt(countRow.count, 10) : 0
    };
  });
}
async function getFailedWebhooksForRetry(tenantId, options = {}) {
  const { maxRetries = 3, hoursAgo = 24, limit = 50 } = options;
  return withTenant10(tenantId, async () => {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
    const result = await sql10`
      SELECT
        id,
        shop,
        topic,
        shopify_webhook_id as "shopifyWebhookId",
        payload,
        hmac_verified as "hmacVerified",
        status,
        processed_at as "processedAt",
        error_message as "errorMessage",
        retry_count as "retryCount",
        idempotency_key as "idempotencyKey",
        received_at as "receivedAt",
        headers
      FROM webhook_events
      WHERE status = 'failed'
      AND retry_count < ${maxRetries}
      AND received_at > ${cutoffDate.toISOString()}
      ORDER BY received_at ASC
      LIMIT ${limit}
    `;
    return result.rows;
  });
}
async function recordWebhookSuccess(tenantId, shop, topic) {
  await withTenant10(tenantId, async () => {
    await sql10`
      UPDATE webhook_registrations
      SET
        last_success_at = NOW(),
        failure_count = 0,
        status = 'active',
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `;
  });
}
async function recordWebhookFailure(tenantId, shop, topic) {
  await withTenant10(tenantId, async () => {
    await sql10`
      UPDATE webhook_registrations
      SET
        last_failure_at = NOW(),
        failure_count = failure_count + 1,
        status = CASE
          WHEN failure_count >= 5 THEN 'failed'
          ELSE status
        END,
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `;
  });
}
async function getWebhookEventsByTopic(tenantId, shop, days = 7) {
  return withTenant10(tenantId, async () => {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const result = await sql10`
      SELECT
        topic,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'failed') as "failedCount"
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > ${cutoffDate.toISOString()}
      GROUP BY topic
      ORDER BY count DESC
    `;
    return result.rows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count, 10),
      failedCount: parseInt(row.failedCount, 10)
    }));
  });
}
export {
  OPTIONAL_TOPICS,
  REQUIRED_TOPICS,
  checkDuplicateWebhook,
  createWebhookRoute,
  extractResourceId,
  generateIdempotencyKey,
  getFailedWebhooksForRetry,
  getRecentWebhookEvents,
  getRegisteredTopics,
  getShopifyCredentials,
  getTenantForShop,
  getWebhookEvent,
  getWebhookEventsByTopic,
  getWebhookHealth,
  handleAppUninstalled,
  handleCustomerCreate,
  handleCustomerUpdate,
  handleFulfillmentCreate,
  handleFulfillmentUpdate,
  handleOrderCancelled,
  handleOrderCreate,
  handleOrderPaid,
  handleOrderUpdate,
  handleRefundCreate,
  handleShopifyWebhook,
  hasHandler,
  headersToObject,
  logWebhookEvent,
  mapFinancialStatus,
  mapFulfillmentStatus,
  parseCents,
  recordWebhookFailure,
  recordWebhookSuccess,
  registerHandler,
  registerSingleWebhook,
  registerWebhooks,
  routeToHandler,
  syncWebhookRegistrations,
  unregisterWebhook,
  updateWebhookStatus,
  verifyShopifyWebhook
};
