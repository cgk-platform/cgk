# 12 — Rate Limits & Error Handling

## Token Bucket Algorithm

Amazon SP-API uses a **token bucket** rate limiting mechanism:

1. Each API has a **bucket** with a maximum number of tokens (burst limit)
2. Tokens are consumed by each request (1 token per request)
3. Tokens are restored at a fixed rate (restore rate)
4. If the bucket is empty, requests are throttled (429 Too Many Requests)

### How It Works

```
Bucket starts full: [####] (4 tokens = burst of 4)

Request 1: [###]  (3 tokens left)
Request 2: [##]   (2 tokens left)
Request 3: [#]    (1 token left)
Request 4: []     (0 tokens — next request will be throttled)

After 1 second at 2/sec restore: [##] (2 tokens restored)
```

---

## Complete Rate Limit Table

### Inventory APIs

| API / Operation                       | Burst | Restore Rate |
| ------------------------------------- | ----- | ------------ |
| FBA Inventory `getInventorySummaries` | 2     | 2/sec        |

### Reports APIs

| API / Operation        | Burst | Restore Rate            |
| ---------------------- | ----- | ----------------------- |
| `createReport`         | 15    | 1/min (per report type) |
| `getReport`            | 15    | 2/sec                   |
| `getReports` (list)    | 15    | 2/sec                   |
| `getReportDocument`    | 15    | 2/sec                   |
| `cancelReport`         | 15    | 2/sec                   |
| `getReportSchedules`   | 15    | 2/sec                   |
| `createReportSchedule` | 15    | 2/sec                   |

### Orders APIs (v2026-01-01)

| API / Operation | Burst | Restore Rate |
| --------------- | ----- | ------------ |
| `searchOrders`  | 20    | 2/sec        |
| `getOrder`      | 20    | 2/sec        |

### Orders APIs (v0 — deprecated, still used for confirmShipment)

| API / Operation   | Burst | Restore Rate |
| ----------------- | ----- | ------------ |
| `getOrderItems`   | 20    | 2/sec        |
| `confirmShipment` | 2     | 1/60sec      |

### Catalog APIs (v2022-04-01)

| API / Operation      | Burst | Restore Rate |
| -------------------- | ----- | ------------ |
| `searchCatalogItems` | 2     | 2/sec        |
| `getCatalogItem`     | 2     | 2/sec        |

### Product Pricing APIs (v2022-05-01)

| API / Operation                 | Burst | Restore Rate |
| ------------------------------- | ----- | ------------ |
| `getCompetitiveSummary`         | 10    | 5/sec        |
| `getFeaturedOfferExpectedPrice` | 2     | 2/sec        |

### Product Fees APIs (v0)

| API / Operation              | Burst | Restore Rate |
| ---------------------------- | ----- | ------------ |
| `getMyFeesEstimateForASIN`   | 20    | 10/sec       |
| `getMyFeesEstimateForSKU`    | 20    | 10/sec       |
| `getMyFeesEstimates` (batch) | 1     | 1/sec        |

### Listings APIs (v2021-08-01)

| API / Operation      | Burst | Restore Rate |
| -------------------- | ----- | ------------ |
| `getListingsItem`    | 5     | 5/sec        |
| `putListingsItem`    | 5     | 5/sec        |
| `patchListingsItem`  | 5     | 5/sec        |
| `deleteListingsItem` | 5     | 5/sec        |

### Feeds APIs (v2021-06-30)

| API / Operation      | Burst | Restore Rate |
| -------------------- | ----- | ------------ |
| `createFeedDocument` | 15    | 1/min        |
| `createFeed`         | 15    | 1/min        |
| `getFeed`            | 15    | 2/sec        |
| `getFeeds` (list)    | 15    | 2/sec        |
| `cancelFeed`         | 15    | 2/sec        |

### Finances APIs (v2024-06-19)

| API / Operation    | Burst | Restore Rate |
| ------------------ | ----- | ------------ |
| `listTransactions` | 6     | 0.5/sec      |

### Fulfillment Inbound (v2024-03-20)

| API / Operation            | Burst | Restore Rate |
| -------------------------- | ----- | ------------ |
| `createInboundPlan`        | 2     | 1/sec        |
| `listInboundPlans`         | 2     | 2/sec        |
| `getInboundPlan`           | 2     | 2/sec        |
| `setPackingInformation`    | 2     | 1/sec        |
| `generatePlacementOptions` | 2     | 1/sec        |
| `confirmPlacementOption`   | 2     | 1/sec        |
| `getLabels`                | 2     | 1/sec        |

### Fulfillment Outbound (v2020-07-01)

| API / Operation            | Burst | Restore Rate |
| -------------------------- | ----- | ------------ |
| `createFulfillmentOrder`   | 30    | 2/sec        |
| `getFulfillmentOrder`      | 30    | 2/sec        |
| `listAllFulfillmentOrders` | 30    | 2/sec        |
| `cancelFulfillmentOrder`   | 30    | 2/sec        |
| `getFulfillmentPreview`    | 30    | 2/sec        |

### Notifications (v1)

| API / Operation      | Burst | Restore Rate |
| -------------------- | ----- | ------------ |
| `createSubscription` | 5     | 1/sec        |
| `getSubscription`    | 5     | 1/sec        |
| `deleteSubscription` | 5     | 1/sec        |
| `createDestination`  | 5     | 1/sec        |

### Sales (v1)

| API / Operation   | Burst | Restore Rate |
| ----------------- | ----- | ------------ |
| `getOrderMetrics` | 15    | 1/sec        |

### Sellers (v1)

| API / Operation                | Burst | Restore Rate |
| ------------------------------ | ----- | ------------ |
| `getMarketplaceParticipations` | 15    | 1/sec        |

### Tokens (v2021-03-01)

| API / Operation             | Burst | Restore Rate       |
| --------------------------- | ----- | ------------------ |
| `createRestrictedDataToken` | 1     | 0.0167/sec (1/min) |

### Shipping (v2)

| API / Operation    | Burst | Restore Rate |
| ------------------ | ----- | ------------ |
| `purchaseShipment` | 5     | 1/sec        |
| `getRates`         | 5     | 1/sec        |
| `getTracking`      | 10    | 1/sec        |
| `cancelShipment`   | 5     | 1/sec        |

---

## Response Header

The `x-amzn-RateLimit-Limit` response header indicates the current restore rate:

```
x-amzn-RateLimit-Limit: 2.0
```

This means tokens are being restored at 2 per second. If this value drops, you're approaching the limit.

**Note:** This header is NOT always present. Some endpoints don't return it.

---

## Error Codes

### HTTP Status Codes

| Code | Meaning                  | Action                             |
| ---- | ------------------------ | ---------------------------------- |
| 400  | Bad Request              | Fix request parameters             |
| 403  | Forbidden                | Refresh token or check permissions |
| 404  | Not Found                | Check resource ID                  |
| 413  | Request Entity Too Large | Reduce request size                |
| 415  | Unsupported Media Type   | Check Content-Type header          |
| 429  | Too Many Requests        | Backoff and retry                  |
| 500  | Internal Server Error    | Retry with backoff                 |
| 503  | Service Unavailable      | Retry with backoff                 |

### SP-API Error Response Format

```json
{
  "errors": [
    {
      "code": "InvalidInput",
      "message": "The marketplace ID INVALID is not valid.",
      "details": "MarketplaceId"
    }
  ]
}
```

### Common Error Codes

| Code                    | HTTP | Description                     |
| ----------------------- | ---- | ------------------------------- |
| `InvalidInput`          | 400  | Invalid parameter value         |
| `InvalidParameterValue` | 400  | Parameter value out of range    |
| `MissingParameter`      | 400  | Required parameter not provided |
| `Unauthorized`          | 403  | Invalid or expired access token |
| `AccessDenied`          | 403  | App doesn't have permission     |
| `NotFound`              | 404  | Resource doesn't exist          |
| `QuotaExceeded`         | 429  | Rate limit exceeded             |
| `InternalFailure`       | 500  | Amazon server error             |
| `ServiceUnavailable`    | 503  | Temporary service outage        |

---

## Retry Strategy

### Exponential Backoff Implementation

```python
import time
import random

def sp_api_request_with_retry(method, path, max_retries=3, **kwargs):
    for attempt in range(max_retries):
        try:
            return sp_api_request(method, path, **kwargs)
        except HTTPError as e:
            if e.code == 429:  # Rate limited
                # Exponential backoff with jitter
                base_wait = 2 ** attempt  # 1, 2, 4 seconds
                jitter = random.uniform(0, 0.5)
                wait = base_wait + jitter
                time.sleep(wait)
                continue
            elif e.code >= 500:  # Server error
                wait = 2 ** attempt + random.uniform(0, 0.5)
                time.sleep(wait)
                continue
            elif e.code == 403:  # Auth error
                if attempt == 0:
                    refresh_token()  # Try refreshing once
                    continue
                raise
            else:
                raise  # Client errors — don't retry
    raise Exception(f"Failed after {max_retries} retries")
```

### Retry Decision Matrix

| Error                     | Retry? | Strategy                            |
| ------------------------- | ------ | ----------------------------------- |
| 429 Too Many Requests     | Yes    | Exponential backoff: 1s, 2s, 4s, 8s |
| 500 Internal Server Error | Yes    | Exponential backoff: 1s, 2s, 4s     |
| 503 Service Unavailable   | Yes    | Exponential backoff: 1s, 2s, 4s     |
| 403 Forbidden             | Once   | Refresh token, retry once           |
| 400 Bad Request           | No     | Fix the request                     |
| 404 Not Found             | No     | Check resource ID                   |
| 413 Too Large             | No     | Reduce request size                 |

---

## Best Practices

1. **Monitor the rate limit header** — Log `x-amzn-RateLimit-Limit` to detect approaching limits
2. **Implement exponential backoff** — Don't hammer the API after a 429
3. **Add jitter to backoff** — Prevents thundering herd when multiple processes retry simultaneously
4. **Respect per-API limits** — Different APIs have very different limits (e.g., Finances 0.5/sec vs Fees 10/sec)
5. **Batch when possible** — Use batch endpoints (e.g., competitive pricing for 20 ASINs at once)
6. **Cache responses** — Don't re-fetch data that hasn't changed
7. **Use reports for bulk data** — Reports don't have per-request rate limits
8. **Log rate limit events** — Track 429s to optimize your request patterns
9. **Circuit breaker pattern** — After repeated failures, back off for longer periods
10. **Different retry for different errors** — 429 needs backoff; 400 needs fixing
