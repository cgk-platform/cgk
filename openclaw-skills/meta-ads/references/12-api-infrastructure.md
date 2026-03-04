<\!-- Source: META-ADS-API-GUIDE.md, Lines 12619-16224 -->

# Paginated Results

We cover the basics of Graph API terminology and structure in the [Graph API overview](https://developers.facebook.com/docs/graph-api/overview). This document goes into more detail about the results from your API requests.

## Traversing Paged Results

When making an API request to a node or edge, you usually don't receive all of the results of that request in a single response. This is because some responses could contain thousands of objects so most responses are paginated by default.

## Cursor-based Pagination

Cursor-based pagination is the most efficient method of paging and should always be used when possible. A cursor refers to a random string of characters which marks a specific item in a list of data. The cursor will always point to the item, however it will be invalidated if the item is deleted or removed. Therefore, your app shouldn't store cursors or assume that they will be valid in the future.

When reading an edge that supports cursor pagination, you see the following JSON response:

```json
{
  "data": [
     ... Endpoint data is here
  ],
  "paging": {
    "cursors": {
      "after": "MTAxNTExOTQ1MjAwNzI5NDE=",
      "before": "NDMyNzQyODI3OTQw"
    },
    "previous": "https://graph.facebook.com/{your-user-id}/albums?limit=25&before=NDMyNzQyODI3OTQw"
    "next": "https://graph.facebook.com/{your-user-id}/albums?limit=25&after=MTAxNTExOTQ1MjAwNzI5NDE="
  }}
```

A cursor-paginated edge supports the following parameters:

- **before**: This is the cursor that points to the start of the page of data that has been returned.
- **after**: This is the cursor that points to the end of the page of data that has been returned.
- **limit**: This is the maximum number of objects that may be returned. A query may return fewer than the value of `limit` due to filtering. Do not depend on the number of results being fewer than the `limit` value to indicate that your query reached the end of the list of data, use the absence of `next` instead as described below. For example, if you set `limit` to 10 and 9 results are returned, there may be more data available, but one item was removed due to privacy filtering. Some edges may also have a maximum on the `limit` value for performance reasons. In all cases, the API returns the correct pagination links.
- **next**: The Graph API endpoint that will return the next page of data. If not included, this is the last page of data. Due to how pagination works with visibility and privacy, it is possible that a page may be empty but contain a `next` paging link. Stop paging when the `next` link no longer appears.
- **previous**: The Graph API endpoint that will return the previous page of data. If not included, this is the first page of data.

**Don't store cursors**. Cursors can quickly become invalid if items are added or deleted.

## Time-based Pagination

Time pagination is used to navigate through results data using Unix timestamps which point to specific times in a list of data.

When using an endpoint that uses time-based pagination, you see the following JSON response:

```json
{
  "data": [
     ... Endpoint data is here
  ],
  "paging": {
    "previous": "https://graph.facebook.com/{your-user-id}/feed?limit=25&since=1364849754",
    "next": "https://graph.facebook.com/{your-user-id}/feed?limit=25&until=1364587774"
  }}
```

A time-paginated edge supports the following parameters:

- **until**: A Unix timestamp or `strtotime` data value that points to the end of the range of time-based data.
- **since**: A Unix timestamp or `strtotime` data value that points to the start of the range of time-based data.
- **limit**: This is the maximum number of objects that may be returned. A query may return fewer than the value of `limit` due to filtering. Do not depend on the number of results being fewer than the `limit` value to indicate your query reached the end of the list of data, use the absence of `next` instead as described below. For example, if you set `limit` to 10 and 9 results are returned, there may be more data available, but one item was removed due to privacy filtering. Some edges may also have a maximum on the `limit` value for performance reasons. In all cases, the API returns the correct pagination links.
- **next**: The Graph API endpoint that will return the next page of data.
- **previous**: The Graph API endpoint that will return the previous page of data.

For consistent results, specify both `since` and `until` parameters. Also, it is recommended that the time difference is a maximum of 6 months.

## Offset-based Pagination

Offset pagination can be used when you do not care about chronology and just want a specific number of objects returned. Only use this if the edge does not support cursor or time-based pagination.

An offset-paginated edge supports the following parameters:

- **offset**: This offsets the start of each page by the number specified.
- **limit**: This is the maximum number of objects that may be returned. A query may return fewer than the value of `limit` due to filtering. Do not depend on the number of results being fewer than the `limit` value to indicate that your query reached the end of the list of data, use the absence of `next` instead as described below. For example, if you set `limit` to 10 and 9 results are returned, there may be more data available, but one item was removed due to privacy filtering. Some edges may also have a maximum on the `limit` value for performance reasons. In all cases, the API returns the correct pagination links.
- **next**: The Graph API endpoint that will return the next page of data. If not included, this is the last page of data. Due to how pagination works with visibility and privacy, it is possible that a page may be empty but contain a `next` paging link. Stop paging when the `next` link no longer appears.
- **previous**: The Graph API endpoint that will return the previous page of data. If not included, this is the first page of data.

Note that if new objects are added to the list of items being paged, the contents of each offset-based page will
change.

Offset based pagination is not supported for all API calls. To get consistent results, we recommend you to paginate using the `previous/next` links we return in the response.

For objects that have many items returned, such as comments which can number in the tens of thousands, you may encounter limits while paging. The API will return an error when your app has reached the cursor limit:

```json
{
  "error": {
    "message": "(#100) The After Cursor specified exceeds the max limit supported by this endpoint",
    "type": "OAuthException",
    "code": 100
  }
}
```

## Next Steps

Now that you are more familiar with the Graph API visit our [Graph Explorer Tool Guide](https://developers.facebook.com/docs/graph-api/explorer) to explore the Graph without writing code, [Common Uses](https://developers.facebook.com/docs/graph-api/guides/common-uses) to view the most common tasks performed, and the [SDKs](https://developers.facebook.com/docs/sdks) available.

# Rate Limits

A rate limit is the number of API calls an app or user can make within a given time period. If this limit is exceeded or if CPU or total time limits are exceeded, the app or user may be throttled. API requests made by a throttled user or app will fail.

All API requests are subject to rate limits. Graph API requests are subject to Platform Rate Limits, while Marketing API and Instagram Platform requests are subject to Business Use Case (BUC) Rate Limits.

Pages API requests are subject to either Platform or BUC Rate Limits, depending on the token used in the request; requests made with application or user access tokens are subject to Platform Rate Limits, while requests made with system user or page access tokens are subject to Business Use Case Rate Limits.

Real time rate limit usage statistics are described in headers that are included with most API responses once enough calls have been made to an endpoint. Platform Rate Limit usage statistics are also displayed in the App Dashboard. Once a rate limit is reached, any subsequent requests made by your app will fail and the API will return an error code until enough time has passed for the call count to drop below the limit.

If both Platform and Business Use Case rate limits can be applied to a request, BUC rate limits will be applied.

## Platform Rate Limits

Platform Rate Limits are tracked on an individual application or user level, depending on the type of token used in the request.

**Applications**

Graph API requests made with an application access token are counted against that app’s rate limit. An app’s call count is the number of calls it can make during a rolling one hour window and is calculated as follows:

$$
\text{Calls within one hour} = 200 \times \text{Number of Users}
$$

The **Number of Users** is based on the number of unique daily active users an app has. In cases where there are slow periods of daily usage, such as if your app has high activity on weekends but low activity over weekdays, the weekly and monthly active Users are used to calculate the number of Users for your app. Apps with high daily engagement will have higher rate limits than apps with low daily engagement, regardless of the actual number of app installs.

Note that this is not a per User limit but a limit on calls made by your app. Any individual User can make more than 200 calls per hour using your app, as long as the total calls from your app does not exceed the app maximum. For example, if your app has 100 Users, your app can make 20,000 calls per hour. However, your top ten most engaged Users could make 19,000 of those calls.

**Users**

Graph API requests made with a user access token are counted against that user’s call count. A user’s call count is the number of calls a user can make during a rolling one hour window. Due to privacy concerns, we do not reveal actual call count values for users.

Note that a user’s call count can be spread over multiple apps. For example, a user could make X calls through App1 and Y calls through App2. If X+Y exceeds the user’s call count that user will be rate limited. This does not necessarily mean that any app is doing something wrong; it could be that the user is using multiple apps or is misusing the API.

**Headers**

Endpoints that receive enough requests from your app will include a `X-App-Usage` or `X-Ad-Account-Usage` (for v3.3 and older Ads API calls) HTTP header in their responses. The header will contain a JSON-formatted string that describes current application rate limit usage.

| Header Contents |                                                                                                    |
| :-------------- | :------------------------------------------------------------------------------------------------- |
| **Key**         | **Value Description**                                                                              |
| `call_count`    | A whole number expressing the percentage of calls made by your app over a rolling one hour period. |
| `total_cputime` | A whole number expressing the percentage of CPU time allotted for query processing.                |
| `total_time`    | A whole number expressing the percentage of total time allotted for query processing.              |

| X-Ad-Account-Usage Header Contents |                                                                                                                                                                                                                                                                                                                                              |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Key**                            | **Value Description**                                                                                                                                                                                                                                                                                                                        |
| `acc_id_util_pct`                  | The percentage of calls made for this ad account before the rate limit is reached.                                                                                                                                                                                                                                                           |
| `reset_time_duration`              | Time duration (in seconds) it takes to reset the current rate limit to 0.                                                                                                                                                                                                                                                                    |
| `ads_api_access_tier`              | Tiers allows your app to access the Marketing API. By default, apps are in the `development_access` tier. `Standard_access` enables lower rate limiting. To get a higher rate limit and get to the standard tier, you can apply for the "[Advanced Access](#authorization)" to the [Ads Management Standard Access feature](#authorization). |

- **Total CPU Time**

  The amount of CPU time the request takes to process. When `total_cputime` reaches 100, calls may be throttled.

- **Total Time**

  The length of time the request takes to process. When `total_time` reaches 100, calls may be throttled.

- **Sample X-App-Usage Header Value**

  ```
  x-app-usage: {
      "call_count": 28,         //Percentage of calls made 
      "total_time": 25,         //Percentage of total time
      "total_cputime": 25       //Percentage of total CPU time}
  ```

- **Sample X-Ad-Account-Usage Header Value**

  ```
  x-ad-account-usage: {
      "acc_id_util_pct": 9.67,   //Percentage of calls made for this ad account.
      "reset_time_duration": 100,   //Time duration (in seconds) it takes to reset the current rate limit score.
      "ads_api_access_tier": 'standard_access'   //Tiers allows your app to access the Marketing API. standard_access enables lower rate limiting.}
  ```

**Dashboard**

The app dashboard displays the number of rate limited app users, the app’s current Application Rate Limits usage percentage, and displays average activity for the past 7 days. In the **Application Rate Limit** card, click **View Details** and hover over any point on the graph to see more details about usage for that particular moment. Because usage depends on call volume, this graph may not show a full 7 days. Apps with a higher volume of calls will show more days.

**Error Codes**

When an app or user has reached their rate limit, requests made by that app or user will fill and the API will respond with an error code.

| Throttle Error Codes    |                                                                                                                                                                                                             |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error Code**          | **Description**                                                                                                                                                                                             |
| 4                       | Indicates that the app whose token is being used in the request has reached its rate limit.                                                                                                                 |
| 17                      | Indicates that the User whose token is being used in the request has reached their rate limit.                                                                                                              |
| 17 with subcode 2446079 | Indicates that the token being used in the Ads API v3.3 or older request has reached its rate limit.                                                                                                        |
| 32                      | Indicates that the User or app whose token is being used in the Pages API request has reached its rate limit.                                                                                               |
| 613                     | Indicates that a custom rate limit has been reached. To help resolving this issue, visit the supporting docs for the specific API you are calling for custom rate limits that may be applied.               |
| 613 with subcode 1996   | Indicates that we have noticed inconsistent behavior in the API request volume of your app. If you have made any recent changes that affect the number of API requests, you may be encountering this error. |

- **Sample Response**

  ```json
  {
    "error": {
      "message": "(#32) Page request limit reached",
      "type": "OAuthException",
      "code": 32,
      "fbtrace_id": "Fz54k3GZrio"
    }
  }
  ```

| Facebook Stability Throttle Codes |                                                                                                                                                                                                                                                                                                        |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error Code**                    | **Description**                                                                                                                                                                                                                                                                                        |
| `throttled`                       | Whether the query is throttled or not. Values: `True`, `False`                                                                                                                                                                                                                                         |
| `backend_qps`                     | First throttling factor `backend_qps`. Supported values:                                                                                                                                                                                                                                               |
|                                   | `actual_score`—Actual `backend_qps` of this app. Value: 8                                                                                                                                                                                                                                              |
|                                   | `limit`—`backend_qps` limit of this app. Value: 5                                                                                                                                                                                                                                                      |
|                                   | `more_info`—Queries need a large number of backend requests to handle. We suggest to send fewer queries or simplify queries with narrower time ranges, fewer object IDs, and so on.                                                                                                                    |
| `complexity_score`                | Second throttling factor `complexity_score`. Supported values:                                                                                                                                                                                                                                         |
|                                   | `actual_score`—Actual `complexity_score` of this app. Value: 0.1                                                                                                                                                                                                                                       |
|                                   | `limit`—`complexity_score` limit of this app. Value: 0.01                                                                                                                                                                                                                                              |
|                                   | `more_info`—High `complexity_score` means your queries are very complex and request large amounts of data. We suggest to simplify queries with shorter time ranges, fewer object IDs, metrics or breakdowns, and so on. Split large, complex queries into multiple smaller queries and space them out. |

**Best Practices**

- When the limit has been reached, stop making API calls. Continuing to make calls will continue to increase your call count, which will increase the time before calls will be successful again.
- Spread out queries evenly to avoid traffic spikes.
- Use filters to limit the data response size and avoid calls that request overlapping data.
- Check the `X-App-Usage` HTTP header to see how close your app is to its limit and when you can resume making calls when the limit has been reached.
- If Users are being throttled, be sure your app is not the cause. Reduce the user’s calls or spread the user’s calls more evenly over time.

## Business Use Case Rate Limits

All Marketing API requests, and Pages API requests made with a system or page access token, are subject to Business Use Case (BUC) Rate Limits, and depend on the endpoints you are querying.

For Marketing API, the rate limit is applied to the ad account across the same Business Use Case. For example, all endpoints with the Ads Management business use case will share the total quota within the same ad account. If a certain endpoint makes a lot of API requests and causes throttling, other endpoints configured with the same business use case will also receive rate limiting errors. The quota depends on the app's Marketing API Access Tier. The standard access Marketing API tier will have more quotas than the development access Marketing API tier. By default, an new app should be on the development tier. If you need to upgrade to get more rate limiting quota, upgrade to [Advanced Access of Ads Management Standard Access](#authorization) in [App Review](https://developers.facebook.com/docs/apps/review).

| Business Use Cases                                                          |     |
| :-------------------------------------------------------------------------- | :-- |
| [Ad Insights](#ad-insights)                                                 |     |
| [Ads Management](#ads-management)                                           |     |
| [Catalog](#catalog)                                                         |     |
| [Custom Audience](#custom-audience)                                         |     |
| [Instagram Platform](#instagram-platform)                                   |     |
| [Lead Generation](#lead-generation)                                         |     |
| [Messenger](#messenger)                                                     |     |
| [Pages](#pages)                                                             |     |
| [Spark AR Commerce Effect Management](#spark-ar-commerce-effect-management) |     |
| [WhatsApp Business Management API](#whatsapp-business-management-api)       |     |

**Ads Insights**

Requests made by your app to the Ads Insights API are counted against the app's rate limit metrics such as call count, total CPU time and total time. An app's call count is the number of calls it can make during a rolling one hour window and is calculated as follows:

- For apps with **Standard Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 600 + 400 \times \text{Number of Active ads} - 0.001 \times \text{User Errors}
$$

- For apps with **Advanced Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 190000 + 400 \times \text{Number of Active ads} - 0.001 \times \text{User Errors}
$$

The **Number of Active ads** is the number of ads currently running per ad account. **User Errors** is the number of errors received when calling the API. To get a higher rate limit, you can apply for the [Ads Management Standard Access feature](#authorization).

Rate limiting may also be subject to the total CPU time and total wall time during a rolling one hour window. For more details, check the HTTP X-Business-Use-Case header `total_cputime` and `total_time`.

If you are receiving rate limiting errors, you can also refer to `estimated_time_to_regain_access` in the X-Business-Use-Case header for the estimated blocking time.

**Ads Management**

Requests made by your app to the Ads Management API are counted against the app's rate limit metrics such as call count, total CPU time and total time. An app's call count is the number of calls it can make during a rolling one hour window and is calculated as follows:

- For apps with **Standard Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 300 + 40 \times \text{Number of Active ads}
$$

- For apps with **Advanced Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 100000 + 40 \times \text{Number of Active ads}
$$

The **Number of Active Ads** is the number of ads for each ad account.

Rate limiting may also be subject to the total CPU time and total wall time during a rolling one hour window. For more details, check the HTTP X-Business-Use-Case header `total_cputime` and `total_time`.

If you are receiving rate limiting errors, you can also refer to `estimated_time_to_regain_access` in the X-Business-Use-Case header for the estimated blocking time.

**Catalog**

- **Catalog Batch**

  Requests made by your app are counted against the rate limit metrics such as call count, total CPU time and total time your app can make in a rolling one minute period per each catalog ID and is calculated as follows:

$$
\text{Calls within one minute} = 8 + 8 \times \log_{2}(\text{DA impressions} + \text{PDP visits})
$$

The **DA impressions** and **PDP visits** are a number of dynamic ads impressions and product detail page visits of the individual catalog with intent in the last 28 days. The more users see products from your catalogs, the more call quota is allocated.

| Type of Call | Endpoint                              |
| :----------- | :------------------------------------ |
| `POST`       | `/{catalog_id}/items_batch`           |
| `POST`       | `/{catalog_id}/localized_items_batch` |
| `POST`       | `/{catalog_id}/batch`                 |

- **Catalog Management**

  Requests made by your app are counted against the number of calls your app can make in a rolling one hour period per each catalog ID and is calculated as follows:

$$
\text{Calls within one hour} = 20,000 + 20,000 \times \log_{2}(\text{DA impressions} + \text{PDP visits})
$$

The **DA impressions** and **PDP visits** are a number of dynamic ads impressions and product detail page visits of the business (on all catalogs) with intent in the last 28d. The more users see products from your catalogs, the more call quota is allocated.

This formula is applied on various catalog endpoints.

For more information on how to get your current rate usage, see [Headers](#headers).

Rate limiting may also be subject to the total CPU time and total wall time during a rolling one hour window. For more details, check the HTTP X-Business-Use-Case header `total_cputime` and `total_time`.

If you are receiving rate limiting errors, you can also refer to `estimated_time_to_regain_access` in the X-Business-Use-Case header for the estimated blocking time.

**Custom Audience**

Requests made by your app to the Custom Audience API are counted against the app's rate limit metrics such as call count, total CPU time and total time. An app's call count is the number of calls it can make during a rolling one hour window and is calculated as follows but will never exceed 700000:

- For apps with **Standard Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 5000 + 40 \times \text{Number of Active Custom Audiences}
$$

- For apps with **Advanced Access** to the [Ads Management Standard Access feature](#authorization):

$$
\text{Calls within one hour} = 190000 + 40 \times \text{Number of Active Custom Audiences}
$$

The **Number of Active Custom Audiences** is the number of active custom audiences for each ad account.

Rate limiting may also be subject to the total CPU time and total wall time during a rolling one hour window. For more details, check the HTTP X-Business-Use-Case header `total_cputime` and `total_time`.

If you are receiving rate limiting errors, you can also refer to `estimated_time_to_regain_access` in the X-Business-Use-Case header for the estimated blocking time.

**Instagram Platform**

Calls to the Instagram Platform endpoints, excluding messaging, are counted against the calling app's call count. An app's call count is unique for each app and app user pair, and is the number of calls the app has made in a rolling 24 hour window. It is calculated as follows:

$$
\text{Calls within 24 hours} = 4800 \times \text{Number of Impressions}
$$

The **Number of Impressions** is the number of times any content from the app user's Instagram professional account has entered a person's screen within the last 24 hours.

**Notes**

- [Business Discovery](https://developers.facebook.com/docs/instagram-api/reference/ig-user/business_discovery) and [Hashtag Search API](https://developers.facebook.com/docs/instagram-api/guides/hashtag-search-api) are subject to [Platform Rate Limits](#platform-rate-limits).

- **Messaging Rate Limits**

  Calls to the Instagram messaging endpoints are counted against the number of calls your app can make per Instagram professional account and the API used.

  | Conversations API                                                                                                                        |     |
  | :--------------------------------------------------------------------------------------------------------------------------------------- | :-- |
  | Your app can make 2 calls per second per Instagram professional account.                                                                 |     |
  | Private Replies API                                                                                                                      |     |
  | Your app can make 100 calls per second per Instagram professional account for private replies to Instagram Live comments                 |     |
  | Your app can make 750 calls per hour per Instagram professional account for private replies to comments on Instagram posts and reels     |     |
  | Send API                                                                                                                                 |     |
  | Your app can make 100 calls per second per Instagram professional account for messages that contain text, links, reactions, and stickers |     |
  | Your app can make 10 calls per second per Instagram professional account for messages that contain audio or video content                |     |

**Lead Generation**

Requests made by your app to the LeadGen API are counted against the app’s call count. An app’s call count is the number of calls it can make during a rolling 24 hour window and is calculated as follows:

$$
\text{Calls within 24 hours} = 4800 \times \text{Leads Generated}
$$

The **Number of Leads Generated** is the number of leads generated per Page for this Ad Account over the past 90 days.

**Messenger Platform**

Rate limits for the Messenger Platform are dependent on the API used and, in some instances, the message content.

- **Messenger API**

  Requests made by your app are counted against the number of calls your app can make in a rolling 24 hour period and is calculated as follows:

$$
\text{Calls within 24 hours} = 200 \times \text{Number of Engaged Users}
$$

The **Number of Engaged Users** is the number of people the business can message via Messenger.

- **Conversations API**

  Your app can make 2 calls per second per Facebook Page

- **Send API**
  - Your app can make 300 calls per second per Facebook Page for messages that contain text, links, reactions, and stickers
  - Your app can make 10 calls per second per Facebook Page account for messages that contain audio or video content
  - Your app may be rate limited if too many messages are being sent to a single thread

- **Private Replies API**
  - Your app can make 750 calls per hour per Facebook Page for private replies to comments on Instagram posts and reels

- **Messenger API for Instagram**

  Requests made by your app are counted against the number of calls your app can make per Instagram professional account and the API used.
  - **Conversations API**

    Your app can make 2 calls per second per Instagram professional account

  - **Send API**
    - Your app can make 300 calls per second per Instagram professional account for messages that contain text, links, reactions, and stickers
    - Your app can make 10 calls per second per Instagram professional account for messages that contain audio or video content
    - Your app may be rate limited if too many messages are being sent to a single thread

  - **Private Replies API**
    - Your app can make 100 calls per second per Instagram professional account for private replies to Instagram Live comments
    - Your app can make 750 calls per hour per Instagram professional account for private replies to comments on Instagram posts and reels

**Pages**

The Page Rate Limits may use either the Platform or BUC rate limit logic depending on the type of token used. Any Pages API calls that are made using a Page or system user access token use the rate limit calculation below. Any calls made with application or user access tokens are subject to application or User rate limits.

Requests made by your app to the Pages API using a Page access token or system User access token are counted against the app’s call count. An app’s call count is the number of calls it can make during a rolling 24 hour window and is calculated as follows:

$$
\text{Calls within 24 hours} = 4800 \times \text{Number of Engaged Users}
$$

The **Number of Engaged Users** is the number of Users who engaged with the Page per 24 hours.

Requests made by your app to the Pages API using a User access token or App access token follow the [Platform Rate Limit](#platform-rate-limits) logic.

To avoid rate limiting issues when using the Page Public Access Content feature, using a system user access token is recommended.

**Spark AR Commerce Effect Management**

Requests made by your app to any Commerce endpoints are counted against the app’s call count. An app’s call count is the number of calls it can make during a rolling one hour window and is calculated as follows:

$$
\text{Calls within one hour} = 200 + 40 \times \text{Number of Catalogs}
$$

The **Number of Catalogs** is the total number of catalogs across all commerce accounts managed by your app.

**Threads**

Calls to the Threads API are counted against the calling app's call count. An app's call count is unique for each app and app user pair and is the number of calls the app has made in a rolling 24-hour window. It is calculated as follows:

$$
\text{Calls within 24 hours} = 4800 \times \text{Number of Impressions}
$$

The **Number of Impressions** is the number of times any content from the app user's Threads account has entered a person's screen within the last 24 hours. Rate limiting may also be subject to total CPU time per day:

- $720000 \times \text{number\_of\_impressions}$ for `total_cputime`
- $2880000 \times \text{Number of Impressions}$ for `total_time`

**Note:** The minimum value for impressions is 10 (so if the impressions is less than 10 we default to 10).

**WhatsApp Business Management API**

Requests made by your app on your WhatsApp Business Account (WABA) are counted against your app's request count. An app's request count is the number of requests it can make during a rolling one hour.

For the following endpoints, your app can make 200 requests per hour, per app, per WABA, by default. For active WABAs with at least one registered phone number, your app can make 5000 requests per hour, per app, per active WABA.

| Type of request             | Endpoint                                                   |
| :-------------------------- | :--------------------------------------------------------- |
| `GET`                       | `/<WHATSAPP_BUSINESS_ACCOUNT_ID>`                          |
| `GET`, `POST`, and `DELETE` | `/<WHATSAPP_BUSINESS_ACCOUNT_ID>/assigned_users`           |
| `GET`                       | `/<WHATSAPP_BUSINESS_ACCOUNT_ID>/phone_numbers`            |
| `GET`, `POST`, and `DELETE` | `/<WHATSAPP_BUSINESS_ACCOUNT_ID>/message_templates`        |
| `GET`, `POST`, and `DELETE` | `/<WHATSAPP_BUSINESS_ACCOUNT_ID>/subscribed_apps`          |
| `GET`                       | `/<WHATSAPP_BUSINESS_ACCOUNT_TO_NUMBER_CURRENT_STATUS_ID>` |

For the following Credit Line API requests, your app can make 5000 requests per hour.

| Type of request    | Endpoint                                                   |
| :----------------- | :--------------------------------------------------------- |
| `GET`              | `/<BUSINESS_ID>/extendedcredits`                           |
| `POST`             | `/<EXTENDED_CREDIT_ID>/whatsapp_credit_sharing_and_attach` |
| `GET` and `DELETE` | `/<ALLOCATION_CONFIG_ID>`                                  |
| `GET`              | `/<EXTENDED_CREDIT_ID>/owning_credit_allocation_configs`   |

For more information on how to get your current rate usage, see [Headers](#headers).

**Headers**

All API responses made by your app that are rate limited using the BUC logic include an `X-Business-Use-Case-Usage` (for v3.3 and older Ads API calls) HTTP header with a JSON-formatted string that describes current application rate limit usage. This header can return up to 32 objects in one call.

| X-Business-Use-Case Usage Header Contents |                                                                                                                                                                                                                                                                                                                                                                                                  |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error Code**                            | **Value Description**                                                                                                                                                                                                                                                                                                                                                                            |
| `business-id`                             | The ID of the business associated with the token making the API calls.                                                                                                                                                                                                                                                                                                                           |
| `call_count`                              | A whole number expressing the percentage of allowed calls made by your app over a rolling one hour period.                                                                                                                                                                                                                                                                                       |
| `estimated_time_to_regain_access`         | Time, in minutes, until calls will not longer be throttled.                                                                                                                                                                                                                                                                                                                                      |
| `total_cputime`                           | A whole number expressing the percentage of CPU time allotted for query processing.                                                                                                                                                                                                                                                                                                              |
| `total_time`                              | A whole number expressing the percentage of total time allotted for query processing.                                                                                                                                                                                                                                                                                                            |
| `type`                                    | Type of rate limit applied. Value can be one of the following: `ads_insights`, `ads_management`, `custom_audience`, `instagram`, `leadgen`, `messenger`, or `pages`.                                                                                                                                                                                                                             |
| `ads_api_access_tier`                     | For `ads_insights` and `ads_management` types only. Tiers allows your app to access the Marketing API. By default, apps are in the `development_access` tier. `Standard_access` enables lower rate limiting. To get a higher rate limit and get to the standard tier, you can apply for the "[Advanced Access](#authorization)" to the [Ads Management Standard Access feature](#authorization). |
| **Total CPU Time**                        | The amount of CPU time the request takes to process. When `total_cputime` reaches 100, calls may be throttled.                                                                                                                                                                                                                                                                                   |
| **Total Time**                            | The length of time the request takes to process. When `total_time` reaches 100, calls may be throttled.                                                                                                                                                                                                                                                                                          |
| **Ads API Access Tier**                   | For `ads_insights` and `ads_management` types only. Tiers allows your app to access the Marketing API. By default, apps are in the `development_access` tier. `Standard_access` enables lower rate limiting. To get a higher rate limit and get to the standard tier, you can apply for the "[Advanced Access](#authorization)" to the [Ads Management Standard Access feature](#authorization). |

- **Sample X-Business-Use-Case-Usage Header Value**

  ```json
  x-business-use-case-usage: {
      "{business-object-id}": [
          {
              "type": "{rate-limit-type}",           //Type of BUC rate limit logic being applied.
              "call_count": 100,                     //Percentage of calls made. 
              "total_cputime": 25,                   //Percentage of the total CPU time that has been used.
              "total_time": 25,                      //Percentage of the total time that has been used.   
              "estimated_time_to_regain_access": 19,  //Time in minutes to regain access.
              "ads_api_access_tier": "standard_access"  //Tiers allows your app to access the Marketing API. standard_access enables lower rate limiting.
          }
      ],      
      "66782684": [
          {
              "type": "ads_management",
              "call_count": 95,
              "total_cputime": 20,
              "total_time": 20,
              "estimated_time_to_regain_access": 0,
              "ads_api_access_tier": "development_access" 
          }
      ],
      "10153848260347724": [
          {
              "type": "ads_insights",
              "call_count": 97,
              "total_cputime": 23,
              "total_time": 23,
              "estimated_time_to_regain_access": 0,
              "ads_api_access_tier": "development_access"
          }
      ],
      "10153848260347724": [
          {
              "type": "pages",
              "call_count": 97,
              "total_cputime": 23,
              "total_time": 23,
              "estimated_time_to_regain_access": 0
          }
      ],...}
  ```

**Error Codes**

When your app reaches its Business Use Case rate limit, subsequent requests made by your app will fail and the API will respond with an error code.

| Error Code                                  | BUC Rate Limit Type                                     |
| :------------------------------------------ | :------------------------------------------------------ |
| `error code 80000`, `error subcode 2446079` | Ads Insights                                            |
| `error code 80004`, `error subcode 2446079` | Ads Management                                          |
| `error code 80003`, `error subcode 2446079` | Custom Audience                                         |
| `error code 80002`                          | Instagram                                               |
| `error code 80005`                          | LeadGen                                                 |
| `error code 80006`                          | Messenger                                               |
| `error code 32`                             | Page calls made with a User access token                |
| `error code 80001`                          | Page calls made with a Page or System User access token |
| `error code 17`, `error subcode 2446079`    | V3.3 and Older Ads API excluding Ads Insights           |
| `error code 80008`                          | WhatsApp Business Management API                        |
| `error code 80014`                          | Catalog Batch                                           |
| `error code 80009`                          | Catalog Management                                      |

- **Sample Error Code Message**

  ```json
  {
    "error": {
      "message": "(#80001) There have been too many calls to this Page account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting.",
      "type": "OAuthException",
      "code": 80001,
      "fbtrace_id": "AmFGcW_3hwDB7qFbl_QdebZ"
    }
  }
  ```

**Best Practices**

- When the limit has been reached, stop making API calls. Continuing to make calls will continue to increase your call count, which will increase the time before calls will be successful again.
- Check the `X-Business-Use-Case-Usage` HTTP header to see how close your ad account is to its limit and when you can resume making calls.
- Verify the error code and API endpoint to confirm the throttling type.
- Switch to other ad accounts and come back to this account later.
- It is better to create a new ad than to change existing ones.
- Spread out queries evenly between two time intervals to avoid sending traffic in spikes.
- Use filters to limit the data response size and avoid calls that request overlapping data.

## FAQ

**What do we consider an API call?**

All calls count towards the rate limits, not just individual API requests. For example, you can make a single API request specifying multiple IDs, but each ID counts as one API call.

The following table illustrates this concept.

| Example Request(s)                                | Number of API Calls |
| :------------------------------------------------ | :------------------ |
| `GET https://graph.facebook.com/photos?ids=4`     | 3                   |
| `GET https://graph.facebook.com/photos?ids=5`     |                     |
| `GET https://graph.facebook.com/photos?ids=6`     |                     |
| `GET https://graph.facebook.com/photos?ids=4,5,6` | 3                   |

We strongly recommend specifying multiple IDs in one API request when possible, as this improves performance of your API responses.

**I'm building a scraper, is there anything else I should worry about?**

If you are building a service that scrapes data, please read our [scraping terms](https://www.facebook.com/legal/commerce_product_seller_terms/scraper_terms).

# Platform Versioning

Facebook's Platform supports versioning so that app builders can roll out changes over time. This document explains how SDKs and APIs affected by versions and how to use those versions in your requests.

## Versioning

Not all APIs and SDKs share the same versioning system. For example, the Graph API is versioned with a different pace and numbering compared to the Facebook SDK for iOS. All Facebook SDKs support the ability to interact with different versions of our APIs. Multiple versions of APIs or SDKs can exist at the same time with different functionality in each version.

**What is the latest Graph API Version?**

The latest Graph API version is **v24.0**

**Why do we have versions?**

The goal for having versioning is for developers building apps to be able to understand in advance when an API or SDK might change. They help with web development, but are critical with mobile development because a person using your app on their phone may take a long time to upgrade (or may never upgrade).

Each version will remain for at least 2 years from release giving you a solid timeline for how long your app will remain working, and how long you have to update it to newer versions.

**Version Schedules**

Each version is guaranteed to operate for at least two years. A version will no longer be usable two years after the date that the subsequent version is released. For example, if API version v2.3 is released on March 25th, 2015 and API version v2.4 is released August 7th, 2015 then v2.3 would expire on August 7th, 2017, two years after the release of v2.4.

For APIs, once a version is no longer usable, any calls made to it will be defaulted to the next oldest, usable version. Here is a timeline example:

| Version | Release Date     | End of Life      |
| :------ | :--------------- | :--------------- |
| v2.3    | March 25, 2015   | August 7, 2017   |
| v2.4    | August 7, 2015   | October 10, 2017 |
| v2.5    | October 10, 2015 | May 1, 2018      |
| v2.6    | April 12, 2016   | July 2, 2018     |

For SDKs, a version will always remain available as it is a downloadable package. However, the SDK may rely upon APIs or methods which no longer work, so you should assume an end-of-life SDK is no longer functional.

You can find specific information about our version timelines, changes, and release dates on our [changelog page](https://developers.facebook.com/docs/graph-api/changelog).

**Will everything remain completely unchanged in a version?**

Facebook does reserve the right to make changes in any API in a short period of time for issues related to security or privacy. These changes don't happen often, but they do happen.

**What happens if I don't specify a version for an API?**

We refer to an API call made without specifying a version as an **unversioned call**. For example, let's say the current version is v4.0. The call is as follows:

`curl -i -X "https://graph.facebook.com/v4.0/{my-user-id}&access_token={access-token}"`

The same unversioned call is as follows:

`curl -i -X "https://graph.facebook.com/{my-user-id}&access_token={access-token}"`

An unversioned call uses the version set in the app dashboard **Upgrade API Version** card under **Settings > Advanced**. In following example, the version set in the app dashboard is v2.10 and the unversioned call is equivalent to:

`curl -i -X "https://graph.facebook.com/v2.10/{my-user-id}&access_token={access-token}"`

We recommend you always specify the version where possible.

**Limitations**

You can not make unversioned API calls to the Facebook JavaScript SDK.

**Can my app make calls to versions older than the current version?**

You can specify older versions in your API calls as long as they are available and your app has made calls to that version. For example, if your app was created after v2.0 was released and makes calls using v2.0, it will be able to make calls to v2.0 until the version expires even after newer versions have been released. If you created your app after v2.0 but did not make any calls until v2.2, your app will not be able to make calls using v2.0 or to v2.1. It will only be able to make calls using v2.2 and newer versions.

**Marketing API Versioning**

The Marketing API has its own versioning scheme. Both version numbers and their schedules are different from the Graph API's state of things.

[Learn more about Marketing API Versioning](https://developers.facebook.com/docs/marketing-api/versioning)

## Making Versioned Requests

**Graph API**

Whether core or extended, almost all Graph API endpoints are available through a versioned path. We've a full guide to using versions with the Graph API in our [Graph API quickstart guide](https://developers.facebook.com/docs/graph-api/quickstart).

**Dialogs**

Versioned paths aren't just true for API endpoints, they're also true for dialogs and social plugins. For example, if you want to generate the Facebook Login dialog for a web app, you can prepend a version number to the endpoint that generates the dialog:

```
https://www.facebook.com/v24.0/dialog/oauth?
  client_id={app-id}
  &redirect_uri={redirect-uri}
```

**Social Plugins**

If you're using the HTML5 or xfbml versions of our social plugins, the version rendered will be determined by the version specified when you're initialising the JavaScript SDK.

If you're inserting an iframe or plain link version of one of our plugins, you'd prepend the version number to the source path of the plugin:

```html
<iframe
  src="//www.facebook.com/v24.0/plugins/like.php?href=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&amp;width&amp;layout=standard&amp;action=like&amp;show_faces=true&amp;share=true&amp;height=80&amp;appId=634262946633418"
  scrolling="no"
  frameborder="0"
  style="border:none; overflow:hidden; height:80px;"
  allowTransparency="true"
></iframe>
```

## Making Versioned Requests from SDKs

If you're using the Facebook SDK for iOS, Android or JavaScript, making versioning calls is largely automatic. Note that this is distinct from each SDKs own versioning system.

**JavaScript**

The JavaScript SDK can only use different API versions if you're using the `sdk.js` path.

If you're using `FB.init()` from the JavaScript SDK, you need to use the `version` parameter, like this:

```javascript
FB.init({
  appId: '{app-id}',
  version: 'v24.0',
})
```

If you set the version flag in the `init`, then any calls to `FB.api()` will automatically have the version prepended to the path that's called. The same is true for any dialogs for Facebook Login that happen to get called. You will get the Facebook Login dialog for that version of the API.

If you need to, you can override a version by just prepending the version to the path of the endpoint in the `FB.api()` call.

**iOS**

Each version of the Facebook SDK for iOS that's released is tied to the version that's available on the date of release. This means that if you're upgrading to a new SDK you're also upgrading to the latest API version as well (although you can manually specify any earlier, available API version with `[FBSDKGraphRequest initWithGraphPath]`). The API version is listed with the release of each version of the Facebook SDK for iOS.

Much like the JavaScript SDK, the version is prepended to any calls you make to the graph API through the Facebook SDK for iOS. For example, if v2.7 was the most recent version of the API, the call `/me/friends` - used in the following code sample - will actually call `/v2.7/me/friends`:

```objective-c
[[[FBSDKGraphRequest alloc] initWithGraphPath:@"me/friends"
  parameters:@{@"fields": @"cover,name,start_time"}]
    startWithCompletionHandler:^(FBSDKGraphRequestConnection *connection, id result, NSError *error) {
        (...)
    }];
```

You can override the version of the call with `[FBSDKGraphRequestConnection overrideVersionPartWith]`.

**Android**

Each version of the Facebook SDK for Android that's released is tied to the version that's available on the date of release. This means that if you're upgrading to a new SDK you're also upgrading to the latest API version as well (although you can manually specify any earlier, available API version with `GraphRequest.setVersion()`). The API version is listed with the release of each version of the Facebook SDK for Android.

Much like the JavaScript SDK, the version is prepended to any calls you make to the graph API through the Facebook SDK for Android. For example, if v2.7 was the most recent version of the API, the call `/me` - used in the following code sample - will actually call `/v2.7/me`:

```java
GraphRequest request = GraphRequest.newGraphPathRequest (
        accessToken,
        "/me/friends",
        new GraphRequest.GraphJSONObjectCallback() {
            @Override
            public void onCompleted(
                   JSONObject object,
                   GraphResponse response) {
                // Application code
            }
        });Bundle parameters = new Bundle();
parameters.putString("fields", "id,name,link");
request.setParameters(parameters); 
request.executeAsync();
```

You can override the version of the call with `GraphRequest.setVersion()`.

# Batch Requests

Send a single HTTP request that contains multiple Facebook Graph API calls. Independent operations are processed in parallel while dependent operations are processed sequentially. Once all operations are complete, a consolidated response is passed back to you and the HTTP connection is closed.

The ordering of responses correspond with the ordering of operations in the request. You should process responses accordingly to determine which operations were successful and which should be retried in a subsequent operation.

## Limitations

Batch requests are limited to 50 requests per batch. Each call within the batch is counted separately for the purposes of calculating API call limits and resource limits. For example, a batch of 10 API calls will count as 10 calls and each call within the batch contributes to CPU resource limits in the same manner. Please see our [Rate Limiting Guide](#rate-limits) for more information.

Batch requests cannot include multiple Adsets under the same Campaign. [Learn more about batching Marketing API requests](#asynchronous-and-batch-requests).

## Batch Request

A batch request takes a JSON object consisting of an array of your requests. It returns an array of logical HTTP responses represented as JSON arrays. Each response has a status code, an optional `headers` array, and an optional `body` (which is a JSON encoded string).

To make a batched request, send a `POST` request to an endpoint where the `batch` parameter is your JSON object.

`POST /ENDPOINT?batch=[JSON-OBJECT]`

- **Sample Batch Request**

  In this example, we are getting information about two Pages that our app manages.

  Formatted for readability.

  ```curl
  curl -i -X POST 'https://graph.facebook.com/me?batch=  
    [
      {
        "method":"GET",
        "relative_url":"PAGE-A-ID"
      },  
      {
        "method":"GET",
        "relative_url":"PAGE-B-ID"
      }
    ]
    &include_headers=false             // Included to remove header information
    &access_token=ACCESS-TOKEN'
  ```

  Once all operations are complete, a response is sent with the result of each operation. Because the headers returned can sometimes be much larger than the actual API response, you might want to remove them for efficiency. To include header information, remove the `include_headers` parameter or set it to `true`.

- **Sample Response**

  The `body` field contains a string encoded JSON object:

  ```json
  [
    {
      "code": 200,
      "body": "{
        \"name\": \"Page A Name\",
        \"id\": \"PAGE-A-ID\"
        }"
    },
    {
      "code": 200,
      "body": "{
        \"name\": \"Page B Name\",
        \"id\": \"PAGE-B-ID\"
        }"
    }]
  ```

## Complex Batch Requests

It is possible to combine operations that would normally use different HTTP methods into a single batch request. While `GET` and `DELETE` operations can only have a `relative_url` and a `method` field, `POST` and `PUT` operations may contain an optional `body` field. The `body` should be formatted as a raw HTTP POST string, similar to a URL query string.

- **Sample Request**

  The following example publishes a post to a Page we manage and have publish permissions and then the Page's feed in a single operation:

  ```curl
  curl "https://graph.facebook.com/PAGE-ID?batch=
    [
      { 
        "method":"POST",
        "relative_url":"PAGE-ID/feed",
        "body":"message=Test status update"
      },
      { 
        "method":"GET",
        "relative_url":"PAGE-ID/feed"
      }
    ]
    &access_token=ACCESS-TOKEN"
  ```

  The output of this call would be:

  ```json
  [
      { "code": 200,
        "headers": [
            { "name":"Content-Type", 
              "value":"text/javascript; charset=UTF-8"}
         ],
        "body":"{\"id\":\"…\"}"
      },
      { "code": 200,
        "headers": [
            { "name":"Content-Type", 
              "value":"text/javascript; charset=UTF-8"
            },
            { "name":"ETag", 
              "value": "…"
            }
        ],
        "body": "{\"data\": [{…}]}
      }
  ]
  ```

  The following example creates a new ad for a campaign, and then gets the details of the newly created object. Note the URLEncoding for the body param:

  ```curl
  curl \-F 'access_token=...' \-F 'batch=[
    {
      "method":"POST",
      "name":"create-ad",
      "relative_url":"11077200629332/ads",
      "body":"ads=%5B%7B%22name%22%3A%22test_ad%22%2C%22billing_entity_id%22%3A111200774273%7D%5D"
    }, 
    {
      "method":"GET",
      "relative_url":"?ids={result=create-ad:$.data.*.id}"
    }
  ]' \
  https://graph.facebook.com
  ```

  The following example adds multiple pages to a Business Manager:

  ```curl
  curl \-F 'access_token=<ACCESS_TOKEN>' \-F 'batch=[
    {
      "method":"POST",
      "name":"test1",
      "relative_url":"<BUSINESS_ID>/owned_pages",
      "body":"page_id=<PAGE_ID_1>"
    }, 
    {
      "method":"POST",
      "name":"test2",
      "relative_url":"<BUSINESS_ID>/owned_pages",
      "body":"page_id=<PAGE_ID_2>"
    }, 
    {
      "method":"POST",
      "name":"test3",
      "relative_url":"<BUSINESS_ID>/owned_pages",
      "body":"page_id=<PAGE_ID_3>"
    }, 
  ]' \"https://graph.facebook.com/v12.0"
  ```

  Where:
  - `<ACCESS_TOKEN>` is an access token with the `business_management` permission.
  - `<BUSINESS_ID>` is the ID of the Business Manager to which the pages should be claimed.
  - `<PAGE_ID_n>` are the Page IDs to be claimed.

## Errors

Its possible that one of your requested operations may throw an error. This could be because, for example, you don't have permission to perform the requested operation. The response is similiar to the standard Graph API, but encapsulated in the batch response syntax:

```json
[
  {
    "code": 403,
    "headers": [
      { "name": "WWW-Authenticate", "value": "OAuth…" },
      { "name": "Content-Type", "value": "text/javascript; charset=UTF-8" }
    ],
    "body": "{\"error\":{\"type\":\"OAuthException\", … }}"
  }
]
```

Other requests within the batch should still complete successfully and will be returned, as normal, with a 200 status code.

## Timeouts

Large or complex batches may timeout if it takes too long to complete all the requests within the batch. In such a circumstance, the result is a partially-completed batch. In a partially-completed batch, requests that are completed successful will return the normal output with the 200 status code. Responses for requests that are not successful will be null. You can retry any unsuccessful request.

## Batch calls with JSONP

The Batch API supports JSONP, just like the rest of the Graph API - the JSONP callback function is specified using the `callback` query string or form post parameter.

## Using Multiple Access Tokens

Individual requests of a single batch request can specify its own access tokens as a query string or form post parameter. In that case the top level access token is considered a fallback token and is used if an individual request has not explicitly specified an access token.

This may be useful when you want to query the API using several different User or Page access tokens, or if some of your calls need to be made using an app access token.

You must include an access token as a top level parameter, even when all individual requests contain their own tokens.

## Upload Binary Data

You can upload multiple binary items as part of a batch call. In order to do this, you need to add all the binary items as `multipart/mime` attachments to your request, and need each operation to reference its binary items using the `attached_files` property in the operation. The `attached_files` property can take a comma separated list of attachment names in its value.

The following example shows how to upload 2 photos in a single batch call:

```curl
curl 
     -F 'access_token=…' \
     -F 'batch=[{"method":"POST","relative_url":"me/photos","body":"message=My cat photo","attached_files":"file1"},{"method":"POST","relative_url":"me/photos","body":"message=My dog photo","attached_files":"file2"},]' \
     -F 'file1=@cat.gif' \
     -F 'file2=@dog.jpg' \
    https://graph.facebook.com
```

# Debug Requests

## Graph API Debug Mode

When **Debug Mode** is enabled, Graph API response may contain additional fields that explain potential issues with the request.

To enable debug mode, use the `debug` query string parameter. For example:

| cURL | Android SDK | Objective-C | Java SDK | PHP SDK |
| :--- | :---------- | :---------- | :------- | :------ |

| `curl -i -X GET \
  "https://graph.facebook.com/{user-id}
    ?fields=friends
    &debug=all
    &access_token={your-access-token}"` | `request.setParameter("debug", "all");` | `[request setParameters:@{@"debug" : @"all"}];` | `request.setParameters(parameters);` | `$request->setParams(array('debug' => 'all'));` |

If `user_friends` permission was not granted, this produces the following response:

```json
{
  "data": [],
  "__debug__": {
    "messages": [
      {
        "message": "Field friends is only accessible on User object, if user_friends permission is granted by the user",
        "type": "warning"
      },
      {
        "link": "https://developers.facebook.com/docs/apps/changelog#v2_0",
        "message": "Only friends who have installed the app are returned in versions greater or equal to v2.0.",
        "type": "info"
      }
    ]
  }
}
```

The `debug` parameter value can be set to `"all"` or to a minimal requested severity level that corresponds to `type` of the message:

| Debug Param Value | What Will Be Returned                          |
| :---------------- | :--------------------------------------------- |
| `all`             | All available debug messages.                  |
| `info`            | Debug messages with type `info` and `warning`. |
| `warning`         | Only debug messages with type `warning`.       |

Debug information, when available, is returned as a JSON object under the `__debug__` key in the `messages` array. Every element of this array is a JSON object that contains the following fields:

| Field     | Datatype | Description                                       |
| :-------- | :------- | :------------------------------------------------ |
| `message` | `String` | The message.                                      |
| `type`    | `String` | The message severity.                             |
| `link`    | `String` | [Optional] A URL pointing to related information. |

You can also use Debug Mode with [Graph API Explorer](https://developers.facebook.com/tools/explorer).

## Determining Version used by API Requests

When you're building an app and making Graph API requests, you might find it useful to determine what API version you're getting a response from. For example, if you're making calls without a version specified, the API version that responds may not be known to you.

The Graph API supplies a request header with any response called `facebook-api-version` that indicates the exact version of the API that generated the response. For example, a Graph API call that generates a request with v2.0 produces the following HTTP header:

`facebook-api-version:v2.0`

This `facebook-api-version` header allows you to determine whether API calls are being returned from the version that you expect.

## Debug Info for Reporting Bugs

When reporting a bug in the Graph API, we include some additional request headers to send with your bug report to help us pinpoint and reproduce your issue. These request headers are `X-FB-Debug`, `x-fb-rev`, and `X-FB-Trace-ID`.

# Handling Errors

Requests made to our APIs can result in several different error responses. The following document describes the recovery tactics and provides a list of error values with a map to the most common recovery tactic to use.

## Error Responses

The following represents a common error response resulting from a failed API request:

```json
{
  "error": {
    "message": "Message describing the error",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 460,
    "error_user_title": "A title",
    "error_user_msg": "A message",
    "fbtrace_id": "EJplcsCHuLu"
  }
}
```

- `message`: A human-readable description of the error.
- `code`: An error code. Common values are listed below, along with common recovery tactics.
- `error_subcode`: Additional information about the error. Common values are listed below.
- `error_user_msg`: The message to display to the user. The language of the message is based on the locale of the API request.
- `error_user_title`: The title of the dialog, if shown. The language of the message is based on the locale of the API request.
- `fbtrace_id`: Internal support identifier. When reporting a bug related to a Graph API call, include the `fbtrace_id` to help us find log data for debugging. However, this ID will expire shortly. To help the support team reproduce your issue, please attach a saved graph explorer session.

## Error Codes

| Code or Type         | Name                                                                                                                                              | What To Do                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OAuthException`     |                                                                                                                                                   | If no subcode is present, the login status or access token has expired, been revoked, or is otherwise invalid. Get a [new access token](#get-an-access-token-for-ad-accounts-you-manage). If a subcode is present, see the subcode.                                                                                                                                                                                           |
| 102                  | API Session                                                                                                                                       | If no subcode is present, the login status or access token has expired, been revoked, or is otherwise invalid. Get a [new access token](#get-an-access-token-for-ad-accounts-you-manage). If a subcode is present, see the subcode.                                                                                                                                                                                           |
| 1                    | API Unknown                                                                                                                                       | Possibly a temporary issue due to downtime. Wait and retry the operation. If it occurs again, check that you are requesting an existing API.                                                                                                                                                                                                                                                                                  |
| 2                    | API Service                                                                                                                                       | Temporary issue due to downtime. Wait and retry the operation.                                                                                                                                                                                                                                                                                                                                                                |
| 3                    | API Method                                                                                                                                        | Capability or permissions issue. Make sure your app has the necessary capability or permissions to make this call.                                                                                                                                                                                                                                                                                                            |
| 4                    | API Too Many Calls                                                                                                                                | Temporary issue due to throttling. Wait and retry the operation, or examine your [API request volume](#rate-limits).                                                                                                                                                                                                                                                                                                          |
| 17                   | API User Too Many Calls                                                                                                                           | Temporary issue due to throttling. Wait and retry the operation, or examine your [API request volume](#rate-limits).                                                                                                                                                                                                                                                                                                          |
| 10                   | API Permission Denied                                                                                                                             | Permission is either not granted or has been removed. [Handle the missing permissions](https://developers.facebook.com/docs/apps/allowing-people-to-log-in/#handle-errors).                                                                                                                                                                                                                                                   |
| 190                  | Access token has expired                                                                                                                          | Get a [new access token](#get-an-access-token-for-ad-accounts-you-manage).                                                                                                                                                                                                                                                                                                                                                    |
| 200-299              | API Permission (Multiple values depending on permission)                                                                                          | Permission is either not granted or has been removed. [Handle the missing permissions](https://developers.facebook.com/docs/apps/allowing-people-to-log-in/#handle-errors).                                                                                                                                                                                                                                                   |
| 341                  | Application limit reached                                                                                                                         | Temporary issue due to downtime or throttling. Wait and retry the operation, or examine your [API request volume](#rate-limits).                                                                                                                                                                                                                                                                                              |
| 368                  | Temporarily blocked for policies violations                                                                                                       | Wait and retry the operation.                                                                                                                                                                                                                                                                                                                                                                                                 |
| 506                  | Duplicate Post                                                                                                                                    | Duplicate posts cannot be published consecutively. Change the content of the post and try again.                                                                                                                                                                                                                                                                                                                              |
| 1609005              | Error Posting Link                                                                                                                                | There was a problem scraping data from the provided link. Check the URL and try again.                                                                                                                                                                                                                                                                                                                                        |
| 100, subcode 1487694 | Invalid parameter.                                                                                                                                | The category you selected is no longer available. Several behavior-based targeting categories are deprecated. If you try to use them to create ads, your requests fails and returns this error. Use [Targeting Search](https://developers.facebook.com/docs/marketing-api/targeting-search) to see categories available for targeting.                                                                                        |
| 100, subcode 1752129 | Invalid parameter.                                                                                                                                | This Task Combination Is Not Supported. To assign a user for this ad account valid capabilities, you should pass in a combination of tasks defined in the [mapping](https://developers.facebook.com/docs/marketing-api/business-management/business-assets#tasks-mapping). See [Business Manager API, Permitted Roles](https://developers.facebook.com/docs/marketing-api/business-management/business-assets#tasks-mapping). |
| 1870034              | Custom Audience Terms Not Accepted                                                                                                                | You'll need to agree to the Custom Audience terms before you can create or edit an audience or an ad set. See [Facebook, Custom Audience Terms](https://www.facebook.com/business/help/985551378129759)                                                                                                                                                                                                                       |
| 1870047              | Audience Size too Low                                                                                                                             | You cannot remove users from this audience because it will result in a low audience size and may result in under-delivery or non-delivery of your ads.                                                                                                                                                                                                                                                                        |
| 1870065              | This can't be used because it contains at least one audience that was disabled.                                                                   | Disabled audiences were shared by accounts that are no longer active. To fix this issue, remove the affected audiences                                                                                                                                                                                                                                                                                                        |
| 1870088              | Connection targeting is being deprecated.                                                                                                         | Please remove connections from your campaign to publish your campaign.                                                                                                                                                                                                                                                                                                                                                        |
| 1870090              | To create or edit audience or ad set, please agree to the Custom Audience terms.                                                                  |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1870092              | To create or edit audience or ad set, please agree to the Meta Business Tools terms                                                               |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1870165              | Your audience contains targeting options that can no longer be used to target ads to people under 18 globally, 20 in Thailand or 21 in Indonesia. | Increase the minimum age of your audience or remove all targeting options apart from location, age and gender.                                                                                                                                                                                                                                                                                                                |
| 1870199              | All location targeting will now reach people living in or recently in the locations you selected.                                                 | Please remove all values from the location_types field.                                                                                                                                                                                                                                                                                                                                                                       |
| 1870219              | Only employer exclusions are allowed to be saved in account control.                                                                              | If you are trying to save anything other than employer exclusions then this error will be thrown.                                                                                                                                                                                                                                                                                                                             |
| 1870220              | If you are trying to save more than the allowed number of employer exclusions then this error will be thrown.                                     |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1885029              | The Page selected for your ad doesn't match the Page associated with the object you're promoting, like a Page post or app.                        | Please make sure the Pages are the same.                                                                                                                                                                                                                                                                                                                                                                                      |
| 1885088              | This ad has been archived and can not be edited.                                                                                                  | Only name is allowed to be edited for this ad. If you want to edit other fields, you can duplicate this ad, which will create a new ad with the same settings that you can then edit.                                                                                                                                                                                                                                         |
| 1885183              | Ads creative post was created by an app that is in development mode.                                                                              | It must be in public to create this ad.ate this ad, which will create a new ad with the same settings that you can then edit.                                                                                                                                                                                                                                                                                                 |
| 1885204              | You need to set your bid to automatic for the chosen optimization.                                                                                | Remove any billing or bid info or change your optimization.                                                                                                                                                                                                                                                                                                                                                                   |
| 1885272              | Budget is too low.                                                                                                                                |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1885557              | Your ad is promoting an unavilable post.                                                                                                          | It is either deleted, unpublished, not owned by the ad's page or you do not have permissions to see or promote it.                                                                                                                                                                                                                                                                                                            |
| 1885621              | You can only set an ad set budget or a campaign budget.                                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1885650              | Your budget is too low.                                                                                                                           | This minimum amount is required to account for any spending that occurs while your budget is updated, which may take up to 15 minutes.                                                                                                                                                                                                                                                                                        |
| 2238055              | You can not pass both `instagram_user_id` and `instagram_actor_id` or `instagram_story_id` and `source_instagram_media_id` in creative spec       |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2446149              | You can not pass both `instagram_user_id` and `instagram_actor_id` or `instagram_story_id` and `source_instagram_media_id` in creative spec       |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2446307              | Campaign group spend cap is less than minimum                                                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2446173              | Target rule label with name {label} doesn't refer to any of the asset labels.                                                                     | Please fix it by removing all ad creatives.                                                                                                                                                                                                                                                                                                                                                                                   |
| 2446289              | The {post_type} you selected for your ad is not available.                                                                                        | It could be deleted or you might not have permissions to see it. Please check your ad creative and try again.                                                                                                                                                                                                                                                                                                                 |
| 2446347              | The ad of an existing post should have the flag `use_existing_post` (default rule in "asset_feed_spec:target_rules") set to true.                 | This is part of the POST request to the server, not something that can be done through the UI.                                                                                                                                                                                                                                                                                                                                |
| 2446383              | Your campaign objective requires an external website URL.                                                                                         | Select a call to action and enter a website URL in the ad creative section.                                                                                                                                                                                                                                                                                                                                                   |
| 2446394              | This ad set includes detailed targeting options that are either no longer available or aren't available when excluding people from an audience.   | You may need to remove items from your detailed targeting or confirm the changes to turn it back on.                                                                                                                                                                                                                                                                                                                          |
| 2446509              | The ad campaign destination type is not valid                                                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2446580              | Cannot specify both `components` and `child_attachments` field when providing `interactive_components_spec` params                                |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2446712              | The ability to create or run an ad set with store visits optimization is no longer available.                                                     | Choose the reach or store sales optimization instead.                                                                                                                                                                                                                                                                                                                                                                         |
| 2446867              | You've already reached the limit of {campaigns_per_country_cap} Advantage+ Shopping Campaigns for the following countries: {country_names}.       | If you'd like to create additional campaigns for these countries, use a standard conversions campaign.                                                                                                                                                                                                                                                                                                                        |
| 2446880              | The WhatsApp number connected to your Facebook page or Instagram profile was disconnected.                                                        | You can run this ad again when you reconnect your WhatsApp account.                                                                                                                                                                                                                                                                                                                                                           |
| 2490085              | The 191x100 crop key will no longer be available in the newest Ads API version.                                                                   | The recommended crop key will be 100x100.                                                                                                                                                                                                                                                                                                                                                                                     |
| 2490155              | The post associated with your ad is not available.                                                                                                | It may have been removed, or you might not have permission to view it.                                                                                                                                                                                                                                                                                                                                                        |
| 2490372              | You need to choose a shop destination in order to continue.                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2490427              | Your ad has been rejected in its latest review and is currently disabled.                                                                         | In order to enable the ad, you will need to make updates to it and create a new ad.                                                                                                                                                                                                                                                                                                                                           |
| 2490468              | Your ad has been rejected in its latest review and is currently disabled.                                                                         | In order to enable the ad, you will need to make updates to it and create a new ad.                                                                                                                                                                                                                                                                                                                                           |
| 2708008              | You haven't been authorized to run ads about social issues, elections or politics.                                                                | Please have an authorized ad account user place this ad, or complete the ID confirmation process yourself at `https://www.facebook.com/id`                                                                                                                                                                                                                                                                                    |
| 2859015              | You have been temporarily blocked from performing this action.                                                                                    |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3858064              | This campaign contains options that can no longer be used in campaigns with audiences under age 18 globally, 20 in Thailand or 21 in Indonesia.   | Increase the minimum age of your audience or remove all targeting options except for age and locations that are cities or larger (excluding postal codes).                                                                                                                                                                                                                                                                    |
| 3858082              | This creative is eligible for Standard Enhancements, but `enroll_status` was not provided.                                                        | Please choose whether you want to turn on standard enhancements or not. [Learn more here](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative)                                                                                                                                                                                                                                                       |
| 3858152              | This ad belongs to an ad set that must be published with beneficiary and payer information.                                                       | Go to the ad set to add or review this information, and then click "Publish".                                                                                                                                                                                                                                                                                                                                                 |
| 3867105              | This content can’t be used for your partnership ad.                                                                                               | Select different content.                                                                                                                                                                                                                                                                                                                                                                                                     |
| 3910001              | We're facing some trouble with your account.                                                                                                      | Please try again later.                                                                                                                                                                                                                                                                                                                                                                                                       |

Error handling should be done using only the Error Codes. The Description string is subject to change without prior notice.

**blame_field_specs**

This is a property included in the `error_data` blob of any API call that results in a validation error, which indicates which field(s) is at fault for the validation error. This can be used to provide contextual errors, e.g. displaying an error right next to the field(s) at fault in the GUI of an ad creation tool.

`blame_field_specs` is an array, where each element of the array is a `blame_field_spec` which indicates a single field from the API spec that is at fault.

A `blame_field_spec` itself is an array also, which indicates the name of the field that is at fault and the location of this field within the overall API spec provided.

- **Examples:**

  **Single field at fault**

  ```json
  {
    "error": {
      "type": "Exception",
      "message": "The budget for your Ad-Set is too low.  It must be at least $1.00 per day.",
      "code": 1487901,
      "is_transient": false,
      "error_data": {
        "blame_field_specs": [["daily_budget"]]
      }
    }
  }
  ```

  Indicates that the `daily_budget` field of the API spec is at fault and in this case it was too low.

  **Multiple fields at fault**

  `"blame_field_specs":[  
  ["targeting_spec", "interested_in"], 
  ["bid_info", "impressions"]]`

  Indicates that there is an error related to the `interested_in` subfield within the `targeting_spec` field of the API spec, and the error is also related to field `impressions` within the `bid_info` field of the API spec.

## Frequently Asked Questions

| General                                                           |                                                                                                                                    |
| :---------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Can I use the API in a production environment without app review? | **Answer:** No, all apps that access live data must complete [App Review](https://developers.facebook.com/docs/apps/review).       |
| Authorization and Authentication                                  |                                                                                                                                    |
| How do I create an access token for the Marketing API?            | **Answer:** You can use the [Graph API Explorer](#graph-api-explorer) to generate an access token with the necessary permissions.  |
| Ad Campaigns                                                      |                                                                                                                                    |
| How do I create a new campaign?                                   | **Answer:** Send a `POST` request to the `/act_<AD_ACCOUNT_ID>/campaigns` endpoint.                                                |
| Ad Sets                                                           |                                                                                                                                    |
| Can I change my ad set's budget after it's created?               | **Answer:** Yes, you can modify the budget using a `POST` request to the `/<AD_SET_ID>` endpoint.                                  |
| Insights                                                          |                                                                                                                                    |
| What is the best way to analyze my campaign performance?          | **Answer:** Use the [Insights API](#insights-api) to retrieve detailed metrics, applying breakdowns as needed.                     |
| Troubleshooting                                                   |                                                                                                                                    |
| What should I do if my ads are not being approved?                | **Answer:** Check the [Advertising Policies](https://www.facebook.com/policies/ads) and revise your ad creative or targeting.      |
| How can I help improve the performance of my ads?                 | **Answer:** Implement [Optimization Tips](#optimization-tips) like refining audience targeting or testing creatives.               |
| What should I do if my API call returns an error code?            | **Answer:** Refer to the [Error Codes](#error-codes) section for troubleshooting and recovery tactics.                             |
| How can I get developer support?                                  | **Answer:** Join the [Facebook Marketing Developer Community Group](#facebook-marketing-developer-community-group) for assistance. |

# Marketing API Reference

## Marketing API Root Nodes

This is a full list of root nodes for the Facebook Marketing API with links to reference docs for each. For background on the API's architecture how to call root nodes and their edges, see [Using the Graph API](https://developers.facebook.com/docs/graph-api/overview).

To access all reference information you will need to be logged in to Facebook.

| Node                    | Description                                                                               |
| :---------------------- | :---------------------------------------------------------------------------------------- |
| `/{AD_ACCOUNT_USER_ID}` | Someone on Facebook who creates ads. Each ad user can have a role on several ad accounts. |
| `/act_{AD_ACCOUNT_ID}`  | Represents the business entity managing ads.                                              |
| `/{AD_ID}`              | Contains information for an ad, such as creative elements and measurement information.    |
| `/{AD_CREATIVE_ID}`     | Format for your image, carousel, collection, or video ad.                                 |
| `/{AD_SET_ID}`          | Contains all ads that share the same budget, schedule, bid, and targeting.                |
| `/{AD_CAMPAIGN_ID}`     | Defines your ad campaigns' objective. Contains one or more ad set.                        |

## User

| Edges                |                                                                                                       |
| :------------------- | :---------------------------------------------------------------------------------------------------- |
| **Edge**             | **Description**                                                                                       |
| `/adaccounts`        | All ad accounts associated with this person                                                           |
| `/accounts`          | All pages and places that someone is an admin of                                                      |
| `/promotable_events` | All promotable events you created or promotable page events that belong to pages you are an admin for |

## Ad Account

Represents the business entity managing ads. All collections of ad objects in Marketing APIs belong to an ad account.

| Edges              |                                                                                                     |
| :----------------- | :-------------------------------------------------------------------------------------------------- |
| **Edge**           | **Description**                                                                                     |
| `/adcreatives`     | Defines your ad's appearance and content                                                            |
| `/adimages`        | Library of images to use in ad creatives. Can be uploaded and managed independently                 |
| `/ads`             | Data for an ad, such as creative elements and measurement information                               |
| `/adsets`          | Contain all ads that share the same budget, schedule, bid, and targeting                            |
| `/advideos`        | Library of videos for use in ad creatives. Can be uploaded and managed independently                |
| `/campaigns`       | Define your campaigns' objective and contain one or more ad sets                                    |
| `/customaudiences` | The custom audiences owned by/shared with this ad account                                           |
| `/insights`        | Interface for insights. De-dupes results across child objects, provides sorting, and async reports. |
| `/users`           | List of people assocated with an ad account                                                         |

## Ad

An individual ad associated with an ad set.

| Edges          |                                           |
| :------------- | :---------------------------------------- |
| **Edge**       | **Description**                           |
| `/adcreatives` | Defines your ad's appearance and content  |
| `/insights`    | Insights on your advertising performance. |
| `/leads`       | Any leads associated with with a Lead Ad. |
| `/previews`    | Generate ad previews from an existing ad  |

## Ad Set

An ad set is a group of ads that share the same daily or lifetime budget, schedule, bid type, bid info, and targeting data.

| Edges          |                                                                                 |
| :------------- | :------------------------------------------------------------------------------ |
| **Edge**       | **Description**                                                                 |
| `/activities`  | Log of actions taken on the ad set                                              |
| `/adcreatives` | Defines your ad's content and appearance                                        |
| `/ads`         | Data necessary for an ad, such as creative elements and measurement information |
| `/insights`    | Insights on your advertising performance.                                       |

## Ad Campaign

A campaign is the highest level organizational structure within an ad account and should represent a single objective for an advertiser.

| Edges       |                                                                                 |
| :---------- | :------------------------------------------------------------------------------ |
| **Edge**    | **Description**                                                                 |
| `/ads`      | Data necessary for an ad, such as creative elements and measurement information |
| `/adsets`   | Contain all ads that share the same budget, schedule, bid, and targeting.       |
| `/insights` | Insights on your advertising performance.                                       |

## Ad Creative

The format which provides layout and contains content for the ad.

| Edges       |                                                           |
| :---------- | :-------------------------------------------------------- |
| **Edge**    | **Description**                                           |
| `/previews` | Generate ad previews from the existing ad creative object |

## Ad Account

Represents a business, person or other entity who creates and manages ads on Facebook

In response to Apple’s new policy, we are announcing breaking changes that will affect `SDKAdNetwork`, Marketing API and Ads Insights API endpoints.
To learn more about how Apple’s iOS 14.5 requirements will impact Facebook advertising, visit our [Business Help Center aricles](https://www.facebook.com/business/help/316380618483864) and [changelog](https://developers.facebook.com/docs/graph-api/changelog):

- [Facebook SDK for iOS, App Events API and Mobile Measurement Partners Updates for Apple's iOS 14 Requirements](https://developers.facebook.com/docs/app-events/ios14-updates)
- [Facebook Pixel Updates for Apple's iOS 14 Requirements](https://developers.facebook.com/docs/facebook-pixel/pixel-updates-for-ios14)
- **January 19, 2021** - Breaking Changes
  - The `agency_client_declaration` field requires Admin privileges for all operations starting with v10.0 and will be required for all versions on May 25, 2021.

**Ad Volume**

You can view the volume of ads running or in review for your ad accounts. These ads will count against the ads limit per page that we will enact in early 2021. Query the number of ads running or in review for a given ad account.

- Ad Limit Per Page enforcement begins for when a Page reaches its ad limit enforcement date. Enforcement date can be queried [here](https://developers.facebook.com/docs/marketing-api/reference/page/ad_limit_page_setting).
- When a Page is at its ad limit:
  - New ads (or ads scheduled to begin at that time) do not publish successfully.
  - Actions on existing ads are limited to pausing and archiving until the number of ads running or in review is below the ad limit.

To see the ads volume for your ad account:

```curl
curl -G 
  -d "access_token=<access_token>" 
  "https://graph.facebook.com/<API_VERSION>/act_<ad_account_ID>/ads_volume"
```

The response looks like this:

`{"data":[{"ads_running_or_in_review_count":2}]}`

For information on managing ads volume, see [About Managing Ad Volume](https://www.facebook.com/business/help/113164948792015).

**Running Or In Review**

To see if an ad is running or in review, we check `effective_status`, `configured_status`, and the ad account's status:

- If an ad has `effective_status` of 1 - `active`, we consider it a running or in review.
- If an ad has `configured_status` of `active` and `effective_status` of 9 - `pending review`, or 17 - `pending processing` we consider it a running or in review.
- The ad can be running or in review only if the ad account status is in 1 - `active`, 8 - `pending settlement`, 9 - `in grace period`.

We also determine if an ad is running or in review based on the ad set's schedule.

- If start time is before current time, and current time is before end time, then we consider the ad running or in review.
- If start time is before current time and the ad set has no end time, we also consider it running or in review.

For example, if the ad set is scheduled to run in the future, the ads are not running or in review. However if the ad set is scheduled to run from now until three months from now, we consider the ads running or in review.

If you are using special ads scheduling features, such as day-parting, we consider the ad running or in review the whole day, not just for the part of the day when the ad starts running.

**Breakdown By Actors**

We’ve added the `show_breakdown_by_actor` parameter to the `act_123/ads_volume` endpoint so you can query ad volume and ad limits-related information for each page. For more details, see [Breakdown by Actors](#breakdown-by-actors).

**Limits**

| Limit                                                      | Value                                        |
| :--------------------------------------------------------- | :------------------------------------------- |
| **Maximum number of ad accounts per person**               | 25                                           |
| **Maximum number of people with access, per ad account**   | 25                                           |
| **Maximum number of ads per regular ad account**           | 6,000 non-archived non-deleted ads           |
| **Maximum number of ads per bulk ad account**              | 50,000 non-archived non-deleted ads          |
| **Maximum number of archived ads per ad account**          | 100,000 archived ads                         |
| **Maximum number of ad sets per regular ad account**       | 6,000 non-archived non-deleted ad sets       |
| **Maximum number of ad sets per bulk ad account**          | 10,000 non-archived non-deleted ad sets      |
| **Maximum number of archived ad sets per ad account**      | 100,000 archived ad sets                     |
| **Maximum number of ad campaigns per regular ad account**  | 6,000 non-archived non-deleted ad campaigns  |
| **Maximum number of ad campaigns per bulk ad account**     | 10,000 non-archived non-deleted ad campaigns |
| **Maximum number of archived ad campaigns per ad account** | 100,000 archived ad campaigns                |
| **Maximum number of images per ad account**                | Unlimited                                    |

**Reading**

An ad account is an account used for managing ads on Facebook

**Digital Services Act Saved Beneficiary/Payor Information**

Use the following code examples to download the beneficiary and payor information.

| Android SDK |
| :---------- |

| ```java
      GraphRequest request = GraphRequest.newGraphPathRequest(
 accessToken,
 "/act\_<AD_ACCOUNT_ID>",
 new GraphRequest.Callback() {
   @Override
   public void onCompleted(GraphResponse response) {
     // Insert your code here
   }});Bundle parameters = new Bundle();
parameters.putString("fields", "default_dsa_payor,default_dsa_beneficiary");
request.setParameters(parameters);
request.executeAsync();

````|

| iOS SDK |
| :--- |
| ```objective-c
FBSDKGraphRequest *request = [[FBSDKGraphRequest alloc]
    initWithGraphPath:@"/act_<AD_ACCOUNT_ID>"
           parameters:@{ @"fields": @"default_dsa_payor,default_dsa_beneficiary",}
           HTTPMethod:@"GET"];[request startWithCompletionHandler:^(FBSDKGraphRequestConnection *connection, id result, NSError *error) {
    // Insert your code here}];
``` |

| Javascript SDK: |
| :--- |
| ```javascript
FB.api(
  '/act_<AD_ACCOUNT_ID>',
  'GET',
  {"fields":"default_dsa_payor,default_dsa_beneficiary"},
  function(response) {
      // Insert your code here
  });
``` |

| cURL |
| :--- |
| ```curl -X GET \"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>?fields=default_dsa_payor%2Cdefault_dsa_beneficiary&access_token=<ACCESS_TOKEN>"
      
``` |

The return value is in JSON format. For example:

`{"default_dsa_payor":"payor2","default_dsa_beneficiary":"bene2","id":"act_426197654150180"}`

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| **Field** | **Description** |
| `id` | `string` | The string `act_{ad_account_id}`. |
| | **Default** | |
| `account_id` | `numeric string` | The ID of the Ad Account. |
| | **Default** | |
| `account_status` | `unsigned int32` | Status of the account: |
| | 1 = ACTIVE | |
| | 2 = DISABLED | |
| | 3 = UNSETTLED | |
| | 7 = PENDING\_RISK\_REVIEW | |
| | 8 = PENDING\_SETTLEMENT | |
| | 9 = IN\_GRACE\_PERIOD | |
| | 100 = PENDING\_CLOSURE | |
| | 101 = CLOSED | |
| | 201 = ANY\_ACTIVE | |
| | 202 = ANY\_CLOSED | |
| `ad_account_promotable_objects` | `AdAccountPromotableObjects` | Ad Account creation request purchase order fields associated with this Ad Account. |
| `age` | `float` | Amount of time the ad account has been open, in days. |
| `agency_client_declaration` | `AgencyClientDeclaration` | Details of the agency advertising on behalf of this client account, if applicable. Requires Business Manager Admin privileges. |
| `amount_spent` | `numeric string` | Current amount spent by the account with respect to `spend_cap`. Or total amount in the absence of `spend_cap`. See [why amount spent is different in ad account spending limit](https://www.facebook.com/business/help/323385731189912) for more info. |
| `attribution_spec` | `list<AttributionSpec>` | Deprecated due to iOS 14 changes. Please visit the [changelog](https://developers.facebook.com/docs/graph-api/changelog) for more information. |
| `balance` | `numeric string` | Bill amount due for this Ad Account. |
| `brand_safety_content_filter_levels` | `list<string>` | Brand safety content filter levels set for in-content ads (Facebook in-stream videos and Ads on Facebook Reels) and Audience Network along with feed ads (Facebook Feed, Instagram feed, Facebook Reels feed and Instagram Reels feed) if applicable. |
| | Refer to [Placement Targeting](https://developers.facebook.com/docs/marketing-api/guides/placement-targeting) for a list of supported values. | |
| `business` | `Business` | The Business Manager, if this ad account is owned by one |
| `business_city` | `string` | City for business address |
| `business_country_code` | `string` | Country code for the business address |
| `business_name` | `string` | The business name for the account |
| `business_state` | `string` | State abbreviation for business address |
| `business_street` | `string` | First line of the business street address for the account |
| `business_street2` | `string` | Second line of the business street address for the account |
| `business_zip` | `string` | Zip code for business address |
| `can_create_brand_lift_study` | `bool` | If we can create a new automated brand lift study under the Ad Account. |
| `capabilities` | `list<string>` | List of capabilities an Ad Account can have. See [capabilities](https://developers.facebook.com/docs/marketing-api/reference/ad-account-capability) |
| `created_time` | `datetime` | The time the account was created in ISO 8601 format. |
| `currency` | `string` | The currency used for the account, based on the corresponding value in the account settings. See [supported currencies](https://developers.facebook.com/docs/marketing-api/reference/ad-account/supported-currencies) |
| `default_dsa_beneficiary` | `string` | This is the default value for creating L2 object of dsa\_beneficiary |
| `default_dsa_payor` | `string` | This is the default value for creating L2 object of dsa\_payor |
| `direct_deals_tos_accepted` | `bool` | Whether DirectDeals ToS are accepted. |
| `disable_reason` | `unsigned int32` | The reason why the account was disabled. Possible reasons are: |
| | 0 = NONE | |
| | 1 = ADS\_INTEGRITY\_POLICY | |
| | 2 = ADS\_IP\_REVIEW | |
| | 3 = RISK\_PAYMENT | |
| | 4 = GRAY\_ACCOUNT\_SHUT\_DOWN | |
| | 5 = ADS\_AFC\_REVIEW | |
| | 6 = BUSINESS\_INTEGRITY\_RAR | |
| | 7 = PERMANENT\_CLOSE | |
| | 8 = UNUSED\_RESELLER\_ACCOUNT | |
| | 9 = UNUSED\_ACCOUNT | |
| | 10 = UMBRELLA\_AD\_ACCOUNT | |
| | 11 = BUSINESS\_MANAGER\_INTEGRITY\_POLICY | |
| | 12 = MISREPRESENTED\_AD\_ACCOUNT | |
| | 13 = AOAB\_DESHARE\_LEGAL\_ENTITY | |
| | 14 = CTX\_THREAD\_REVIEW | |
| | 15 = COMPROMISED\_AD\_ACCOUNT | |
| `end_advertiser` | `numeric string` | The entity the ads will target. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. |
| `end_advertiser_name` | `string` | The name of the entity the ads will target. |
| `existing_customers` | `list<string>` | The custom audience ids that are used by advertisers to define their existing customers. This definition is primarily used by Automated Shopping Ads. |
| `expired_funding_source_details` | `FundingSourceDetails` | ID = ID of the payment method |
| | COUPON = Details of the Facebook Ads Coupon from the payment method | |
| | COUPONS = List of active Facebook Ads Coupon from the ad account | |
| | COUPON\_ID = ID of the Facebook Ads Coupon | |
| | AMOUNT = Amount of Facebook Ads Coupon | |
| | CURRENCY = Currency of the Facebook Ads Coupon | |
| | DISPLAY\_AMOUNT = How the amount of Facebook Ads Coupon is displayed | |
| | EXPIRATION = When the coupon expired | |
| | START\_DATE = When the coupon started | |
| | DISPLAY\_STRING = How the payment method is shown | |
| | CAMPAIGN\_IDS = List of campaigns the coupon can be applied to, empty if the coupon is applied on the ad account level. | |
| | ORIGINAL\_AMOUNT = Amount of Facebook Ads Coupon When Issued | |
| | ORIGINAL\_DISPLAY\_AMOUNT = How the Facebook Ads Coupon displayed When Issued | |
| | TYPE = Type of the funding source | |
| | 0 = UNSET | |
| | 1 = CREDIT\_CARD | |
| | 2 = FACEBOOK\_WALLET | |
| | 3 = FACEBOOK\_PAID\_CREDIT | |
| | 4 = FACEBOOK\_EXTENDED\_CREDIT | |
| | 5 = ORDER | |
| | 6 = INVOICE | |
| | 7 = FACEBOOK\_TOKEN | |
| | 8 = EXTERNAL\_FUNDING | |
| | 9 = FEE | |
| | 10 = FX | |
| | 11 = DISCOUNT | |
| | 12 = PAYPAL\_TOKEN | |
| | 13 = PAYPAL\_BILLING\_AGREEMENT | |
| | 14 = FS\_NULL | |
| | 15 = EXTERNAL\_DEPOSIT | |
| | 16 = TAX | |
| | 17 = DIRECT\_DEBIT | |
| | 18 = DUMMY | |
| | 19 = ALTPAY | |
| | 20 = STORED\_BALANCE | |
| | To access this field, the user making the API call must have a `MANAGE` task permission for that specific ad account. See [Ad Account, Assigned Users](https://developers.facebook.com/docs/marketing-api/reference/ad-account/assigned-users) for more information. | |
| `extended_credit_invoice_group` | `ExtendedCreditInvoiceGroup` | The extended credit invoice group that the ad account belongs to |
| `failed_delivery_checks` | `list<DeliveryCheck>` | Failed delivery checks |
| `fb_entity` | `unsigned int32` | `fb_entity` |
| `funding_source` | `numeric string` | ID of the payment method. If the account does not have a payment method it will still be possible to create ads but these ads will get no delivery. Not available if the account is disabled |
| `funding_source_details` | `FundingSourceDetails` | ID = ID of the payment method |
| | COUPON = Details of the Facebook Ads Coupon from the payment method | |
| | COUPONS = List of active Facebook Ads Coupon from the ad account | |
| | COUPON\_ID = ID of the Facebook Ads Coupon | |
| | AMOUNT = Amount of Facebook Ads Coupon | |
| | CURRENCY = Currency of the Facebook Ads Coupon |
| | DISPLAY\_AMOUNT = How the amount of Facebook Ads Coupon is displayed | |
| | EXPIRATION = When the coupon will expire | |
| | START\_DATE = When the coupon starts | |
| | DISPLAY\_STRING = How the payment method is shown | |
| | CAMPAIGN\_IDS = List of campaigns the coupon can be applied to, empty if the coupon is applied on the ad account level. | |
| | ORIGINAL\_AMOUNT = Amount of Facebook Ads Coupon When Issued | |
| | ORIGINAL\_DISPLAY\_AMOUNT = How the Facebook Ads Coupon displayed When Issued | |
| | TYPE = Type of the funding source | |
| | 0 = UNSET | |
| | 1 = CREDIT\_CARD | |
| | 2 = FACEBOOK\_WALLET | |
| | 3 = FACEBOOK\_PAID\_CREDIT | |
| | 4 = FACEBOOK\_EXTENDED\_CREDIT | |
| | 5 = ORDER | |
| | 6 = INVOICE | |
| | 7 = FACEBOOK\_TOKEN | |
| | 8 = EXTERNAL\_FUNDING | |
| | 9 = FEE | |
| | 10 = FX | |
| | 11 = DISCOUNT | |
| | 12 = PAYPAL\_TOKEN | |
| | 13 = PAYPAL\_BILLING\_AGREEMENT | |
| | 14 = FS\_NULL | |
| | 15 = EXTERNAL\_DEPOSIT | |
| | 16 = TAX | |
| | 17 = DIRECT\_DEBIT | |
| | 18 = DUMMY | |
| | 19 = ALTPAY | |
| | 20 = STORED\_BALANCE | |
| | To access this field, the user making the API call must have a `MANAGE` task permission for that specific ad account. See [Ad Account, Assigned Users](https://developers.facebook.com/docs/marketing-api/reference/ad-account/assigned-users) for more information. | |
| `has_migrated_permissions` | `bool` | Whether this account has migrated permissions |
| `has_page_authorized_adaccount` | `bool` | Indicates whether a Facebook page has authorized this ad account to place ads with political content. If you try to place an ad with political content using this ad account for this page, and this page has not authorized this ad account for ads with political content, your ad will be disapproved. See [Breaking Changes, Marketing API, Ads with Political Content](https://developers.facebook.com/docs/marketing-api/changelog#v2_9_ads_political_content) and [Facebook Advertising Policies](https://www.facebook.com/policies/ads) |
| `io_number` | `numeric string` | The Insertion Order (IO) number. |
| `is_attribution_spec_system_default` | `bool` | If the attribution specification of ad account is generated from system default values |
| `is_direct_deals_enabled` | `bool` | Whether the account is enabled to run Direct Deals |
| `is_in_3ds_authorization_enabled_market` | `bool` | If the account is in a market requiring to go through payment process going through 3DS authorization |
| `is_notifications_enabled` | `bool` | Get the notifications status of the user for this ad account. This will return true or false depending if notifications are enabled or not |
| `is_personal` | `unsigned int32` | Indicates if this ad account is being used for private, non-business purposes. This affects how value-added tax (VAT) is assessed. Note: This is not related to whether an ad account is attached to a business. |
| `is_prepay_account` | `bool` | If this ad account is a prepay. Other option would be a postpay account. |
| | To access this field, the user making the API call must have a `ADVERTISE` or `MANAGE` task permission for that specific ad account. See [Ad Account, Assigned Users](https://developers.facebook.com/docs/marketing-api/reference/ad-account/assigned-users) for more information. | |
| `is_tax_id_required` | `bool` | If tax id for this ad account is required or not. |
| | To access this field, the user making the API call must have a `ADVERTISE` or `MANAGE` task permission for that specific ad account. See [Ad Account, Assigned Users](https://developers.facebook.com/docs/marketing-api/reference/ad-account/assigned-users) for more information. | |
| `line_numbers` | `list<integer>` | The line numbers |
| `media_agency` | `numeric string` | The agency, this could be your own business. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. In absence of one, you can use NONE or UNFOUND. |
| `min_campaign_group_spend_cap` | `numeric string` | The minimum required spend cap of Ad Campaign. |
| `min_daily_budget` | `unsigned int32` | The minimum daily budget for this Ad Account |
| `name` | `string` | Name of the account. If not set, the name of the first admin visible to the user will be returned. |
| `offsite_pixels_tos_accepted` | `bool` | Indicates whether the offsite pixel Terms Of Service contract was signed. This feature can be accessible before v2.9 |
| `opportunity_score` | `float` | On a 0-100 point scale, this score represents how optimized the ad account's campaigns, ad sets and ads are overall. |
| | See [Opportunity Score](#opportunity-score-and-recommendations) to learn more. | |
| `owner` | `numeric string` | The ID of the account owner |
| `partner` | `numeric string` | This could be Facebook Marketing Partner, if there is one. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. In absence of one, you can use NONE or UNFOUND. |
| `rf_spec` | `ReachFrequencySpec` | Reach and Frequency limits configuration. See [Reach and Frequency](https://developers.facebook.com/docs/marketing-api/guides/reach-and-frequency) |
| `show_checkout_experience` | `bool` | Whether or not to show the pre-paid checkout experience to an advertiser. If true, the advertiser is eligible for checkout, or they are already locked in to checkout and haven't graduated to postpay. |
| `spend_cap` | `numeric string` | The maximum amount that can be spent by this Ad Account. When the amount is reached, all delivery stops. A value of 0 means no spending-cap. Setting a new spend cap only applies to spend AFTER the time at which you set it. Value specified in basic unit of the currency, for example 'cents' for USD. |
| `tax_id` | `string` | Tax ID |
| `tax_id_status` | `unsigned int32` | VAT status code for the account. |
| | 0: Unknown | |
| | 1: VAT not required- US/CA | |
| | 2: VAT information required | |
| | 3: VAT information submitted | |
| | 4: Offline VAT validation failed | |
| | 5: Account is a personal account | |
| `tax_id_type` | `string` | Type of Tax ID |
| `timezone_id` | `unsigned int32` | The timezone ID of this ad account |
| `timezone_name` | `string` | Name for the time zone |
| `timezone_offset_hours_utc` | `float` | Time zone difference from UTC (Coordinated Universal Time). |
| `tos_accepted` | `map<string, int32>` | Checks if this specific ad account has signed the Terms of Service contracts. Returns 1, if terms were accepted. |
| `user_tasks` | `list<string>` | `user_tasks` |
| `user_tos_accepted` | `map<string, int32>` | Checks if a user has signed the Terms of Service contracts related to the Business that contains a specific ad account. Must include user's access token to get information. This verification is not valid for system users. |

| Edges | |
| :--- | :--- |
| **Edge** | **Description** |
| `account_controls` | `Edge<AdAccountBusinessConstraints>` | Account Controls is for Advantage+ shopping campaigns where advertisers can set audience controls for minimum age and excluded geo location. |
| `activities` | `Edge<AdActivity>` | The activities of this ad account |
| `adcreatives` | `Edge<AdCreative>` | The ad creatives of this ad account |
| `ads_reporting_mmm_reports` | `Edge<AdsReportBuilderMMMReport>` | Marketing mix modeling (MMM) reports generated for this ad account. |
| `ads_reporting_mmm_schedulers` | `Edge<AdsReportBuilderMMMReportScheduler>` | Get all MMM report schedulers by this ad account |
| `advertisable_applications` | `Edge<Application>` | All advertisable apps associated with this account |
| `advideos` | `Edge<Video>` | The videos associated with this account |
| `applications` | `Edge<Application>` | Applications connected to the ad accounts |
| `asyncadcreatives` | `Edge<AdAsyncRequestSet>` | The async ad creative creation requests associated with this ad account. |
| `broadtargetingcategories` | `Edge<BroadTargetingCategories>` | Broad targeting categories (BCTs) can be used for targeting |
| `customaudiencestos` | `Edge<CustomAudiencesTOS>` | The custom audiences term of services available to the ad account |
| `customconversions` | `Edge<CustomConversion>` | The custom conversions owned by/shared with this ad account |
| `delivery_estimate` | `Edge<AdAccountDeliveryEstimate>` | The delivery estimate for a given ad set configuration for this ad account |
| `deprecatedtargetingadsets` | `Edge<AdCampaign>` | Ad sets with deprecating targeting options for this ad account |
| `dsa_recommendations` | `Edge<AdAccountDsaRecommendations>` | `dsa_recommendations` |
| `generatepreviews` | `Edge<AdPreview>` | Generate previews for a creative specification |
| `impacting_ad_studies` | `Edge<AdStudy>` | The ad studies that contain this ad account or any of its descendant ad objects |
| `instagram_accounts` | `Edge<ShadowIGUser>` | Instagram accounts connected to the ad accounts |
| `mcmeconversions` | `Edge<AdsMcmeConversion>` | `mcmeconversions` |
| `minimum_budgets` | `Edge<MinimumBudget>` | Returns minimum daily budget values by currency |
| `promote_pages` | `Edge<Page>` | All pages that have been promoted under the ad account |
| `reachestimate` | `Edge<AdAccountReachEstimate>` | The reach estimate of a given targeting spec for this ad account |
| `saved_audiences` | `Edge<SavedAudience>` | Saved audiences in the account |
| `targetingbrowse` | `Edge<AdAccountTargetingUnified>` | Unified browse |
| `targetingsearch` | `Edge<AdAccountTargetingUnified>` | Unified search |
| `targetingsuggestions` | `Edge<AdAccountTargetingUnified>` | Unified suggestions |
| `targetingvalidation` | `Edge<AdAccountTargetingUnified>` | Unified validation |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 613 | Calls to this api have exceeded the rate limit. |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 2500 | Error parsing graph query |
| 1150 | An unknown error occurred. |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |

**Creating**

To create a new ad account for your business you must specify `name`, `currency`, `timezone_id`, `end_advertiser`, `media_agency`, and `partner`. Provide `end_advertiser`, `media_agency`, and `partner`:
*   They must be Facebook Page Aliases, Facebook Page ID or an Facebook app ID. For example, to provide your company as an end advertiser you specify `my company` or `20531316728`.
*   The End Advertiser ID is the Facebook primary Page ID or Facebook app ID. Further reference to this field (for formatting and acceptable values) may be found [here](https://developers.facebook.com/docs/marketing-api/reference/ad-account#fields).
*   If your ad account has no End Advertiser, Media Agency, or Partner, specify `NONE`.
*   If your ad account has an End Advertiser, Media Agency, or Partner, that are not represented on Facebook by Page or app, specify `UNFOUND`.

Once you set `end_advertiser` to a value other than `NONE` or `UNFOUND` you cannot change it.

*   **Create an ad account:**

    ```curl
    curl \-F "name=MyAdAccount" \-F "currency=USD" \-F "timezone_id=1" \-F "end_advertiser=<END_ADVERTISER_ID>" \-F "media_agency=<MEDIA_AGENCY_ID>" \-F "partner=NONE" \-F "access_token=<ACCESS_TOKEN>" \"https://graph.facebook.com/<API_VERSION>/<BUSINESS_ID>/adaccount"
    ```

    If you have an extended credity line with Facebook, you can set `invoice` to `true` and we associate your new ad account to this credit line.

*   **The response:**

    ```json
    {
      "id": "act_<ADACCOUNT_ID>",
      "account_id": "<ADACCOUNT_ID>",
      "business_id": "<BUSINESS_ID>",
      "end_advertiser_id": "<END_ADVERTISER_ID>",
      "media_agency_id": "<MEDIA_AGENCY_ID>",
      "partner_id": "NONE"}
    ```

You can make a `POST` request to `product_audiences` edge from the following paths:
*   `/act_{ad_account_id}/product_audiences`

When posting to this edge, an AdAccount will be created.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/product_audiences HTTP/1.1
Host: graph.facebook.com

name=Test+Iphone+Product+Audience&product_set_id=%3CPRODUCT_SET_ID%3E&inclusions=%5B%7B%22retention_seconds%22%3A86400%2C%22rule%22%3A%7B%22and%22%3A%5B%7B%22event%22%3A%7B%22eq%22%3A%22AddToCart%22%7D%7D%2C%2B%7B%22userAgent%22%3A%7B%22i_contains%22%3A%22iPhone%22%7D%7D%5D%7D%7D%5D&exclusions=%5B%7B%22retention_seconds%22%3A172800%2C%22rule%22%3A%7B%22event%22%3A%7B%22eq%22%3A%22Purchase%22%7D%7D%7D%5D` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `associated_audience_id` | `int64` | `SELF_EXPLANATORY` |
| `creation_params` | `dictionary { string : <string> }` | `SELF_EXPLANATORY` |
| `description` | `string` | `SELF_EXPLANATORY` |
| `enable_fetch_or_create` | `boolean` | `enable_fetch_or_create` |
| `event_sources` | `array<JSON object>` | `event_sources` |
| `exclusions` | `list<Object>` | `SELF_EXPLANATORY` |
| `inclusions` | `list<Object>` | `SELF_EXPLANATORY` |
| `name` | `string` | `SELF_EXPLANATORY` |
| | **Required** | |
| `opt_out_link` | `string` | `SELF_EXPLANATORY` |
| `parent_audience_id` | `int64` | `SELF_EXPLANATORY` |
| `product_set_id` | `numeric string` or `integer` | `SELF_EXPLANATORY` |
| | **Required** | |
| `subtype` | `enum {CUSTOM, PRIMARY, WEBSITE, APP, OFFLINE_CONVERSION, CLAIM, MANAGED, PARTNER, VIDEO, LOOKALIKE, ENGAGEMENT, BAG_OF_ACCOUNTS, STUDY_RULE_AUDIENCE, FOX, MEASUREMENT, REGULATED_CATEGORIES_AUDIENCE, BIDDING, EXCLUSION, MESSENGER_SUBSCRIBER_LIST}` | `SELF_EXPLANATORY` |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, message: string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 2654 | Failed to create custom audience |

You can make a `POST` request to `ad_accounts` edge from the following paths:
*   `/{custom_audience_id}/ad_accounts`

When posting to this edge, an AdAccount will be created.

| Parameters | |
| :--- | :--- |
| `adaccounts` | `list<numeric string>` | Array of new ad account IDs to receive access to the custom audience |
| `permissions` | `string` | `targeting` or `targeting_and_insights`. If `targeting` the recipient ad account can target the audience in ads. `targeting_and_insights` also allows recipient account to view the audience in Audience Insights tool |
| `relationship_type` | `array<string>` | `relationship_type` |
| `replace` | `boolean` | `true` or `false`. If `true` the list of adaccounts provided in the call will replace the existing set of ad accounts this audience is shared with. |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node to which you POSTed. | |
| `Struct {success: bool, sharing_data: List [Struct {ad_acct_id: string, business_id: numeric string, audience_share_status: string, errors: List [string ], } ], }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |

You can make a `POST` request to `owned_ad_accounts` edge from the following paths:
*   `/{business_id}/owned_ad_accounts`

When posting to this edge, an AdAccount will be created.

| Parameters | |
| :--- | :--- |
| `adaccount_id` | `string` | Ad account ID. |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node to which you POSTed. | |
| `Struct {access_status: string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 3979 | You have exceeded the number of allowed ad accounts for your Business Manager at this time. |
| 3994 | Personal accounts that do not have any history of activity are not eligible for migration to a business manager. Instead create an ad account inside your business manager. |
| 100 | Invalid parameter |
| 3980 | One or more of the ad accounts in your Business Manager are currently in bad standing or in review. All of your accounts must be in good standing in order to create new ad accounts. |
| 415 | Two factor authentication required. User have to enter a code from SMS or TOTP code generator to pass 2fac. This could happen when accessing a 2fac-protected asset like a page that is owned by a 2fac-protected business manager. |
| 3936 | You've already tried to claim this ad account. You'll see a notification if your request is accepted. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 3944 | Your Business Manager already has access to this object. |

You can make a `POST` request to `adaccount` edge from the following paths:
*   `/{business_id}/adaccount`

When posting to this edge, an AdAccount will be created.

| Parameters | |
| :--- | :--- |
| `ad_account_created_from_bm_flag` | `boolean` | `ad_account_created_from_bm_flag` |
| `currency` | `ISO 4217 Currency Code` | The currency used for the account |
| | **Required** | |
| `end_advertiser` | | The entity the ads will target. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. In absence of one, you can use NONE or UNFOUND. Note that once a value other than NONE or UNFOUND is set, it cannot be modified any more. |
| | **Required** | |
| `funding_id` | `numeric string` or `integer` | ID of the payment method. If the account does not have a payment method it will still be possible to create ads but these ads will get no delivery. |
| `invoice` | `boolean` | If business manager has Business Manager Owned Normal Credit Line on file on the FB CRM, it will attach the ad account to that credit line. |
| `invoice_group_id` | `numeric string` | The ID of the invoice group this adaccount should be enrolled in |
| `invoicing_emails` | `array<string>` | Emails addressed where invoices will be sent. |
| `io` | `boolean` | If corporate channel is direct sales. |
| `media_agency` | `string` | The agency, this could be your own business. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. In absence of one, you can use NONE or UNFOUND |
| | **Required** | |
| `name` | `string` | The name of the ad account |
| | **Required** | |
| `partner` | `string` | The advertising partner for this account, if there is one. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. In absence of one, you can use NONE or UNFOUND. |
| | **Required** | |
| `po_number` | `string` | Purchase order number |
| `timezone_id` | `unsigned int32` | ID for the timezone. See [here](https://developers.facebook.com/docs/marketing-api/reference/ad-account/supported-timezones). |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: token with structure: AdAccount ID, account_id: numeric string, business_id: numeric string, end_advertiser_id: string, media_agency_id: string, partner_id: string, seer_ad_account_restricted_by_soft_desc_challenge: bool, soft_desc_challenge_credential_id: string, soft_desc_challenge_localized_auth_amount: int32, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 3979 | You have exceeded the number of allowed ad accounts for your Business Manager at this time. |
| 3980 | One or more of the ad accounts in your Business Manager are currently in bad standing or in review. All of your accounts must be in good standing in order to create new ad accounts. |
| 415 | Two factor authentication required. User have to enter a code from SMS or TOTP code generator to pass 2fac. This could happen when accessing a 2fac-protected asset like a page that is owned by a 2fac-protected business manager. |
| 3902 | There was a technical issue and your new ad account wasn't created. Please try again. |
| 457 | The session has an invalid origin |
| 190 | Invalid OAuth 2.0 Access Token |
| 23007 | This credit card can't be set as your account's primary payment method, because your account is set up to be billed after your ads have delivered. This setup can't be changed. Please try a different card or payment method. |

**Updating**

**Notice:**
*   The `default_dsa_payor` and `default_dsa_beneficiary` values can be set to both of them or none of them. The API does not allow only one of them to exist in the data storage.
*   To unset the values: pass two empty strings at the same time, the values will be unset in the data storage. It does not allow you to unset only one of them.

You can update an AdAccount by making a `POST` request to `/act_{ad_account_id}`.

| Parameters | |
| :--- | :--- |
| `agency_client_declaration` | `dictionary { string : <string> }` | Details of the agency advertising on behalf of this client account, if applicable. Requires Business Manager Admin privileges. |
| `attribution_spec` | `list<Object>` | Deprecated due to iOS 14 changes. Please visit the [changelog](https://developers.facebook.com/docs/graph-api/changelog) for more information. |
| `business_info` | `dictionary { string : <string> }` | Business Info |
| `custom_audience_info` | `JSON object` | Custom audience info for Automated Shopping Ads. |
| `default_dsa_beneficiary` | `string` | This is the default value for creating L2 targeting EU's beneficiary. |
| `default_dsa_payor` | `string` | This is the default value for creating L2 targeting EU's payor. |
| `end_advertiser` | `string` | The entity the ads will target. Must be a Facebook Page Alias, Facebook Page ID or an Facebook App ID. |
| `is_notifications_enabled` | `boolean` | If notifications are enabled or not for this account |
| `media_agency` | `string` | The ID of a Facebook Page or Facebook App. Once it is set to any values other than NONE or UNFOUND, it cannot be modified any more |
| `name` | `string` | The name of the ad account |
| `partner` | `string` | The ID of a Facebook Page or Facebook App. Once it is set to any values other than NONE or UNFOUND, it cannot be modified any more |
| `spend_cap` | `float` | The total amount that this account can spend, after which all campaigns will be paused, based on `amount_spent`. A value of 0 signifies no spending-cap and setting a new spend cap only applies to spend AFTER the time at which you set it. Value specified in standard denomination of the currency, e.g. 23.50 for USD $23.50. |
| `spend_cap_action` | `string` | Setting this parameter to `reset` sets the `amount_spent` back to 0. Setting it to `delete` removes the `spend_cap` from the account. |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node to which you POSTed. | |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |

You can update an AdAccount by making a `POST` request to `/act_{ad_account_id}/assigned_users`.

| Parameters | |
| :--- | :--- |
| `tasks` | `array<enum {MANAGE, ADVERTISE, ANALYZE, DRAFT, AA_ANALYZE}>` | AdAccount permission tasks to assign this user |
| `user` | `UID` | Business user id or system user id |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node to which you POSTed. | |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 2620 | Invalid call to update account permissions |

**Deleting**

You can dissociate an AdAccount from an AdsPixel by making a `DELETE` request to `/{ads_pixel_id}/shared_accounts`.

| Parameters | |
| :--- | :--- |
| `account_id` | `numeric string` | `SELF_EXPLANATORY` |
| | **Required** | |
| `business` | `numeric string` or `integer` | `SELF_EXPLANATORY` |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

You can dissociate an AdAccount from a CustomAudience by making a `DELETE` request to `/{custom_audience_id}/ad_accounts`.

| Parameters | |
| :--- | :--- |
| `adaccounts` | `list<numeric string>` | Array of ad account IDs to revoke access to the custom audience |

| Return Type | |
| :--- | :--- |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

# Ad Account Account Controls

**Reading**

Get default fields on an `AdAccountBusinessConstraints` node associated with this AdAccount. Refer to the [AdAccountBusinessConstraints reference](https://developers.facebook.com/docs/marketing-api/reference/ad-account-business-constraints) for a list of these fields and their descriptions.

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/{ad-account-id}/account_controls HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {} }` | |
| `data` | A list of `AdAccountBusinessConstraints` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |

**Creating**

You can make a `POST` request to `account_controls` edge from the following paths:
*   `/act_{ad_account_id}/account_controls`

When posting to this edge, an `AdAccountBusinessConstraints` will be created.

| Parameters | |
| :--- | :--- |
| `audience_controls` | `JSON` or `object-like arrays` | `audience_controls` |
| | **Required** | |
| `placement_controls` | `JSON` or `object-like arrays` | This field contains another field called `placement_exclusion` that provides information on which placements need to be excluded while targeting. All the other placements will be included. Each placement is denoted by a string that concatenates the publisher platform of the placement and a position inside the publisher platform, separated by an underscore. What is provided as parameter is a list of placements. For e.g. If we want to exclude the rewarded videos position from the audience network publisher platform, we provide the field as follows: `{ "placement_controls": { "placement_exclusions": ["audience_network_rewarded_video"] } }` Only a few placements are allowed to be excluded: `audience_network_classic` (native, banner & interstitial positions of audience network) `audience_network_rewarded_video` (rewarded videos of audience network) `audience_network_instream_video` (instream videos of audience network) `facebook_marketplace` (marketplace section inside facebook) `facebook_rhc` (right hand column inside facebook) |

| Return Type | |
| :--- | :--- |
| `Struct {id: string, success: bool, error_code: string, error_message: string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 2641 | Your ad includes or excludes locations that are currently restricted |
| 200 | Permissions error |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Activities

**Reading**

Activities related to an Ad Account.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {} }` | |
| `data` | A list of `AdActivity` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 613 | Calls to this api have exceeded the rate limit. |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 190 | Invalid OAuth 2.0 Access Token |
| 100 | Invalid parameter |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |

**Creating**

You can't perform this operation on this endpoint.

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Ad Place Page Sets

This endpoint applies to published Pages.

**Reading**

You can't perform this operation on this endpoint.

**Creating**

You can make a `POST` request to `ad_place_page_sets` edge from the following paths:
*   `/act_{ad_account_id}/ad_place_page_sets`

When posting to this edge, an `AdPlacePageSet` will be created.

| Parameters | |
| :--- | :--- |
| `location_types` | `list<enum {recent, home}>` | Type of user location the page set targets (e.g., 'recent', 'home') |
| `name` | `string` | Name of The Place PageSet |
| | **Required** | |
| `parent_page` | `numeric string` or `integer` | The parent page ID for all the locations pages |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Ad Creatives

**Reading**

The Ad Creatives that belong to this Ad Account.

Contains creative content for an ad account that you can use in your ads. Includes images, videos and so on. Using an ad account creative for a particular ad is subject to validation rules based on the ad type and other rules. See [Facebook Ads Guide](https://www.facebook.com/business/ads-guide) and [Validation, Objectives and Creative](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives).

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/act_<AD_ACCOUNT_ID>/adcreatives?fields=name%2Cid%2Cstatus HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `AdCreative` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=total_count`). |
| `total_count` | `unsigned int32` | Total number of creatives in the ad account. |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 190 | Invalid OAuth 2.0 Access Token |
| 2500 | Error parsing graph query |

**Creating**

You can make a `POST` request to `adcreatives` edge from the following paths:
*   `/act_{ad_account_id}/adcreatives`

When posting to this edge, no Graph object will be created.

**Limitations**

*   When creating ad creatives, if the `object_story_id` being used is already in use by an existing creative, then the API will return the value of the existing `creative_id` instead of creating a new one.
*   Using `radius` can cause an error, code: 100, subcode 1815946, when targeting multiple locations. We recommend creating an ad for each location or not using `radius` in your call.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/adcreatives HTTP/1.1
Host: graph.facebook.com

name=Sample+Promoted+Post&object_story_id=%3CPAGE_ID%3E_%3CPOST_ID%3E` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `actor_id` | `int64` | The actor ID (Page ID) of this creative. |
| `ad_disclaimer_spec` | `JSON object` | Disclaimer information to attach to your creative. |
| `adlabels` | `list<Object>` | Ad Labels associated with this creative. Used to group it with related ad objects. |
| `applink_treatment` | `enum{automatic, deeplink_with_web_fallback, deeplink_with-appstore_fallback, web_only}` | Used for Dynamic Ads. Specify what action should occur if a person clicks a link in the ad, but the business' app is not installed on their device. For example, open a webpage displaying the product, or open the app in an app store on the person's mobile device. |
| `asset_feed_spec` | `Object` | Used for Dynamic Creative to automatically experiment and deliver different variations of an ad's creative. Specifies an asset feed with multiple images, text and other assets used to generate variations of an ad. Formatted as a JSON string. |
| | **Supports Emoji** | |
| `authorization_category` | `enum{NONE, POLITICAL, POLITICAL_WITH_DIGITALLY_CREATED_MEDIA}` | Specifies whether ad is political or not. If your ad has political content, set this to POLITICAL, otherwise it defaults to null. Your ad will be disapproved if it contains political content but not labeled POLITICAL. See [Facebook Advertising Policies](https://www.facebook.com/policies/ads). This field cannot be used for Dynamic Ads. |
| `body` | `string` | The body of the ad. |
| | **Supports Emoji** | |
| `branded_content` | `JSON object` | `branded_content` |
| `branded_content_sponsor_page_id` | `numeric string` or `integer` | ID for page representing business which runs Branded Content ads. See [Creating Branded Content Ads](#creating-branded-content). |
| `bundle_folder_id` | `numeric string` or `integer` | The Dynamic Ad's bundle folder ID |
| `call_to_action` | `Object` | This field promotes an onsite or offsite action. |
| | **Supports Emoji** | |
| `categorization_criteria` | `enum{brand, category, product_type}` | The Dynamic Category Ad's categorization criteria |
| `category_media_source` | `enum{CATEGORY, MIXED, PRODUCTS_COLLAGE, PRODUCTS_SLIDESHOW}` | The Dynamic Ad's rendering mode for category ads |
| `contextual_multi_ads` | `JSON object` | `contextual_multi_ads` |
| `degrees_of_freedom_spec` | `JSON object` | Specifies the type of transformation which is enabled for the given creative |
| `destination_set_id` | `numeric string` | The ID of the Product Set for a Destination Catalog that will be used to link with Travel Catalogs. |
| `dynamic_ad_voice` | `enum{DYNAMIC, STORY_OWNER}` | Determines the Page voice to be used in Dynamic Local Ads |
| `enable_direct_install` | `boolean` | Whether Direct Install should be enabled on supported devices. |
| `enable_launch_instant_app` | `boolean` | Whether Instant App should be enabled on supported devices. |
| `execution_options` | `list<enum{validate_only}>` | **Default value:** Set |
| | An execution setting | |
| | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field. | |
| | If the call passes validation or review, response will be `{"success": true}`. If the call does not pass, an error will be returned with more details. These options can be used to improve any UI to display errors to the user much sooner, e.g. as soon as a new value is typed into any field corresponding to this ad object, rather than at the upload/save stage, or after review. | |
| `facebook_branded_content` | `JSON object` | Params required for facebook branded content. |
| `format_transformation_spec` | `array<JSON object>` | `format_transformation_spec` |
| `image_crops` | `dictionary { enum{191x100, 100x72, 400x150, 600x360, 100x100, 400x500, 90x160, 300x400} : <list<list<int64>>> }` | Crop dimensions for the image specified. See [image crop reference](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/image-crop) for more details. |
| `image_file` | `string` | Reference to a local image file to upload for use in a creative. Not to exceed 8MB in size. If `object_story_spec` or `object_story_id` is specified, this field will be ignored |
| `image_hash` | `string` | Image hash for an image you have uploaded and can be used in a creative. If `object_story_spec` or `object_story_id` is specified, this field will be ignored |
| `image_url` | `URL` | URL for the image in this ad creative. Do not use image URLs returned by Facebook. Instead you should host the image on your own servers. Facebook saves the image from your URL to your ad account's image library. Images cannot exceed 8 MB. You must also provide one of these three fields: `image_file`, `image_hash`, or `image_url`. |
| `instagram_branded_content` | `JSON object` | Params required for instagram branded content. |
| `instagram_permalink_url` | `URL` | URL for a post on Instagram you want to run as an ad. Also known as Instagram media. |
| `instagram_user_id` | `numeric string` or `integer` | Instagram user ID |
| `interactive_components_spec` | `JSON object` | The specification for interactive component overlay on the media. |
| | **Supports Emoji** | |
| `link_og_id` | `string` | The Open Graph (OG) ID for the link in this creative if the landing page has OG tags. |
| `link_url` | `URL` | Identify a specific landing tab on your Facebook page by the Page tab's URL. See [connection objects](https://developers.facebook.com/docs/graph-api/reference/v24.0/page/tabs) for retrieving Page tab URLs. You can add `app_data` parameters to the URL to pass data to a Page's tab. |
| `marketing_message_structured_spec` | `JSON object` | `marketing_message_structured_spec` |
| `media_sourcing_spec` | `JSON object` | media sourcing spec for advertiser to specify additional media from various sources |
| `name` | `string` | Name of this ad creative as seen in the ad account's library. |
| `object_id` | `int64` | The Facebook object ID that is relevant to the ad. See [connection objects](https://developers.facebook.com/docs/graph-api/reference/v24.0/object) |
| `object_story_id` | `post_id` | ID of a Facebook Page post to use in an ad. You can get this ID by querying the posts of the page. If this post includes an image, it should not exceed 8 MB. Facebook will upload the image from the post to your ad account's image library. |
| `object_story_spec` | `string (ObjectStorySpec)` | JSON string of `AdCreativeObjectStorySpec` type. Use if you want to create a new unpublished page post and turn the post into an ad. The Page ID and the content to create a new unpublished page post. Specify `link_data`, `photo_data`, `video_data`, `text_data` or `template_data` with the content. |
| | **Supports Emoji** | |
| `object_type` | `string` | The type of Facebook object you want to advertise. Allowed values are: |
| | `PAGE` | |
| | `DOMAIN` | |
| | `EVENT` | |
| | `STORE_ITEM`: refers to an iTunes or Google Play store destination | |
| | `OFFER` | |
| | `SHARE`: from a page | |
| | `PHOTO` | |
| | `STATUS`: of a page | |
| | `VIDEO` | |
| | `APPLICATION`: app on Facebook | |
| `object_url` | `URL` | URL that opens if someone clicks your link on a link ad. This URL is not connected to a Facebook page. |
| `page_welcome_message` | `string` | You can create more tailored user experiences for your ads that click to Messenger or to WhatsApp by customizing your ads' greeting message. For ads that clicks to Whatsapp, you can set the the `page_welcome_message` field under `object_story_spec`. |
| | **Note:** If you are using the message received in Whatsapp to trigger any bot flows, please make sure to work with your BSP and agencies to update it so as to ensure flows aren't disrupted. | |
| | **Supports Emoji** | |
| `place_page_set_id` | `numeric string` | The Place Page Set when objective is `LOCAL_AWARENESS`. Used with Dynamic Local Ads |
| `platform_customizations` | `JSON` or `object-like arrays` | Use this field to specify the exact media to use on different Facebook placements. You can currently use this setting for images and videos. Facebook replaces the media originally defined in ad creative with this media when the ad displays in a specific placements. For example, if you define a media here for instagram, Facebook uses that media instead of the media defined in the ad creative when the ad appears on Instagram. |
| `playable_asset_id` | `numeric string` | The ID of the playable asset in this creative. |
| `portrait_customizations` | `JSON object` | Use this field to customizations how ads look in portrait mode format example for IG Stories, Facebook Stories, IGTV, etc |
| `product_set_id` | `numeric string` or `integer` | Used for Dynamic Ad. An ID for a product set, which groups related products or other items being advertised. |
| `recommender_settings` | `JSON object` | The recommender settings that can be used to control recommendations for Dynamic Ads. |
| `referral_id` | `numeric string` or `integer` | The ID of Referral Ad Configuration in this creative. |
| `regional_regulation_disclaimer_spec` | `JSON object` | `regional_regulation_disclaimer_spec` |
| `template_url` | `URL` | The product link url, which overrides the one set in Dynamic Product Ad's product feeds. |
| `template_url_spec` | `string (TemplateURLSpec)` | An optional structured collection of templated web and app-link descriptors that override the fallbacks that would otherwise be pulled from a Dynamic Ad`s catalog |
| `threads_user_id` | `numeric string` or `integer` | `threads_user_id` |
| `thumbnail_url` | `URL` | URL for a thumbnail image for this ad creative. You can provide dimensions for this with `thumbnail_width` and `thumbnail_height`. See [example](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/ad-creative-thumbnail). |
| `title` | `string` | Title for a Page Likes ad, which appears in the right-hand column on Facebook. |
| `url_tags` | `string` | A set of query string parameters which will replace or be appended to urls clicked from page post ads, message of the post, and canvas app install creatives only. |
| `use_page_actor_override` | `boolean` | If true, we show the page actor for mobile app ads. |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 500 | Message contains banned content |
| 200 | Permissions error |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 613 | Calls to this api have exceeded the rate limit. |
| 1500 | The url you supplied is invalid |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 190 | Invalid OAuth 2.0 Access Token |
| 105 | The number of parameters exceeded the maximum for this operation |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Ad Images

**Reading**

Ad Images that belong to this Ad Account.

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/{ad-account-id}/adimages HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `biz_tag_id` | `int64` | Business tag ID to filter images. |
| `business_id` | `numeric string` or `integer` | Optional. Assists with filters such as recently used. |
| `hashes` | `list<string>` | Hash of the image. |
| `minheight` | `int64` | Minimum height of the image. |
| `minwidth` | `int64` | Minimum width of the image. |
| `name` | `string` | Image name used in image names filter. |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `AdImage` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=total_count`). |
| `total_count` | `int32` | Total number of images in the Ad Account. |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |

**Creating**

You can make a `POST` request to `adimages` edge from the following paths:
*   `/act_{ad_account_id}/adimages`

When posting to this edge, an `AdImage` will be created.

| Parameters | |
| :--- | :--- |
| `bytes` | `Base64 UTF-8 string` | Image file. Example: `bytes = <image content in bytes format>` |
| `copy_from` | `JSON` or `object-like arrays` | This copies the Ad Image from the source to the destination account. |
| | `{"source_account_id":"<SOURCE_ACCOUNT_ID>", "hash":"02bee5277ec507b6fd0f9b9ff2f22d9c"}` | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `images` in the return type. | |
| `Map {string: Map {string: Struct {hash: string, url: string, url_128: string, url_256: string, url_256_height: string, url_256_width: string, height: int32, width: int32, name: string, } } }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 190 | Invalid OAuth 2.0 Access Token |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 613 | Calls to this api have exceeded the rate limit. |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can dissociate an AdImage from an AdAccount by making a `DELETE` request to `/act_{ad_account_id}/adimages`.

| Parameters | |
| :--- | :--- |
| `hash` | `string` | Hash of the image you wish to delete. |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |

# Ad Account Ads

**Graph API Version**

v24.0

**Reading**

Ads belonging to this ad account.

| Example | |
| :--- | :--- |
| cURL | `curl -G \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads` |

| Parameters | |
| :--- | :--- |
| `date_preset` | `enum{today, yesterday, this_month, last_month, this_quarter, maximum, data_maximum, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, last_week_mon_sun, last_week_sun_sat, last_quarter, last_year, this_week_mon_today, this_week_sun_today, this_year}` | Predefine date range used to aggregate insights metrics |
| `effective_status` | `list<string>` | Filter ads by effective status |
| `time_range` | `{'since':YYYY-MM-DD,'until':YYYY-MM-DD}` | Date range used to aggregate insights metrics |
| `updated_since` | `integer` | Time since the Ad has been updated. |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `Ad` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=insights`). |
| `insights` | `Edge<AdsInsights>` | Analytics summary for all objects |
| `total_count` | `unsigned int32` | Total number of Ads returned by the query |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 613 | Calls to this api have exceeded the rate limit. |
| 100 | Invalid parameter |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 190 | Invalid OAuth 2.0 Access Token |
| 2500 | Error parsing graph query |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |

**Creating**

You can make a `POST` request to `ads` edge from the following paths:
*   `/act_{ad_account_id}/ads`

When posting to this edge, an `Ad` will be created.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/ads HTTP/1.1
Host: graph.facebook.com

name=My+Ad&adset_id=%3CAD_SET_ID%3E&creative=%7B%22creative_id%22%3A%22%3CCREATIVE_ID%3E%22%7D&status=PAUSED` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `ad_schedule_end_time` | `datetime` | An optional parameter that defines the end time of an individual ad. If no end time is defined, the ad will run on the campaign’s schedule. This parameter is only available for sales and app promotion campaigns. |
| `ad_schedule_start_time` | `datetime` | An optional parameter that defines the start time of an individual ad. If no start time is defined, the ad will run on the campaign’s schedule. This parameter is only available for sales and app promotion campaigns. |
| `adlabels` | `list<Object>` | Ad labels associated with this ad |
| `adset_id` | `int64` | The ID of the ad set, required on creation. |
| `adset_spec` | `Ad set spec` | The ad set spec for this ad. When the spec is provided, `adset_id` field is not required. |
| `audience_id` | `string` | The ID of the audience. |
| `bid_amount` | `integer` | Deprecated. We no longer allow setting the `bid_amount` value on an ad. Please set `bid_amount` for the ad set. |
| `conversion_domain` | `string` | The domain where conversions happen. Required to create or update an ad in a campaign that shares data with a pixel. This field will be auto-populated for existing ads by inferring from destination URLs . Note that this field should contain only the first and second level domains, and not the full URL. For example `facebook.com`. |
| `creative` | `AdCreative` | This field is required for create. The ID or creative spec of the ad creative to be used by this ad. You can read more about creatives [here](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives). You may supply the ID within an object as follows: |
| | `{"creative_id": <CREATIVE_ID>}` | |
| | or creative spec as follow: | |
| | `{"creative": {\"name\": \"<NAME>\", \"object_story_spec\": <SPEC>}}` | |
| | **Required** | **Supports Emoji** |
| `creative_asset_groups_spec` | `string (CreativeAssetGroupsSpec)` | `creative_asset_groups_spec` |
| | **Supports Emoji** | |
| `date_format` | `string` | The format of the date. |
| `display_sequence` | `int64` | The sequence of the ad within the same campaign |
| `engagement_audience` | `boolean` | Flag to create a new audience based on users who engage with this ad |
| `execution_options` | `list<enum{validate_only, synchronous_ad_review, include_recommendations}>` | **Default value:** Set |
| | An execution setting | |
| | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field. | |
| | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. | |
| | `synchronous_ad_review`: this option should not be used by itself. It should always be specified with `validate_only`. When these options are specified, the API call will perform Ads Integrity validations, which include message language checking, image 20% text rule, and so on, as well as the validation logics. | |
| | If the call passes validation or review, response will be `{"success": true}`. If the call does not pass, an error will be returned with more details. These options can be used to improve any UI to display errors to the user much sooner, e.g. as soon as a new value is typed into any field corresponding to this ad object, rather than at the upload/save stage, or after review. | |
| `include_demolink_hashes` | `boolean` | Include the demolink hashes. |
| `name` | `string` | Name of the ad. |
| | **Required** | **Supports Emoji** |
| `priority` | `int64` | Priority |
| `source_ad_id` | `numeric string` or `integer` | ID of the source Ad, if applicable. |
| `status` | `enum{ACTIVE, PAUSED, DELETED, ARCHIVED}` | Only `ACTIVE` and `PAUSED` are valid during creation. Other statuses can be used for update. When an ad is created, it will first go through ad review, and will have the ad status `PENDING_REVIEW` before it finishes review and reverts back to your selected status of `ACTIVE` or `PAUSED`. During testing, it is recommended to set ads to a `PAUSED` status so as to not incur accidental spend. |
| `tracking_specs` | `Object` | With Tracking Specs, you log actions taken by people on your ad. See [Tracking and Conversion Specs](#tracking-and-conversion-specs). |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 613 | Calls to this api have exceeded the rate limit. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 194 | Missing at least one required parameter |
| 500 | Message contains banned content |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 190 | Invalid OAuth 2.0 Access Token |
| 105 | The number of parameters exceeded the maximum for this operation |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Adsets

**Graph API Version**

v24.0

**Reading**

The adsets of this ad account

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/act_<AD_ACCOUNT_ID>/adsets?fields=name%2Cid%2Cstatus HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `date_preset` | `enum {TODAY, YESTERDAY, THIS_MONTH, LAST_MONTH, THIS_QUARTER, MAXIMUM, DATA_MAXIMUM, LAST_3D, LAST_7D, LAST_14D, LAST_28D, LAST_30D, LAST_90D, LAST_WEEK_MON_SUN, LAST_WEEK_SUN_SAT, LAST_QUARTER, LAST_YEAR, THIS_WEEK_MON_TODAY, THIS_WEEK_SUN_TODAY, THIS_YEAR}` | Predefine date range used to aggregate insights metrics |
| `effective_status` | `list<enum{ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, CAMPAIGN_PAUSED, ARCHIVED, ADSET_PAUSED, IN_PROCESS, WITH_ISSUES}>` | Effective status of adset |
| `is_completed` | `boolean` | Filter adset by completed status |
| `time_range` | `{'since':YYYY-MM-DD,'until':YYYY-MM-DD}` | Date range used to aggregate insights metrics |
| `updated_since` | `integer` | Time since the Adset has been updated. |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `AdSet` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=insights`). |
| `insights` | `Edge<AdsInsights>` | Analytics summary for all objects. Use nested parameters with this field. `insights.time_range({'until':'2018-01-01', 'since':'2017-12-12'}).time_increment(1)` |
| `total_count` | `unsigned int32` | Total number of objects |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 613 | Calls to this api have exceeded the rate limit. |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 2500 | Error parsing graph query |

**Creating**

Mobile App Install CPA Billing will no longer be supported. The billing event cannot be App Install if the Optimization goal is App Install.

You can make a `POST` request to `adsets` edge from the following paths:
*   `/act_{ad_account_id}/adsets`

When posting to this edge, an `AdSet` will be created.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/adsets HTTP/1.1
Host: graph.facebook.com

name=My+First+Adset&lifetime_budget=20000&start_time=2025-12-10T11%3A21%3A33-0800&end_time=2025-12-20T11%3A21%3A33-0800&campaign_id=%3CAD_CAMPAIGN_ID%3E&bid_amount=100&billing_event=LINK_CLICKS&optimization_goal=LINK_CLICKS&targeting=%7B%22facebook_positions%22%3A%5B%22feed%22%5D%2C%22geo_locations%22%3A%7B%22countries%22%3A%5B%22US%22%5D%7D%2C%22publisher_platforms%22%3A%5B%22facebook%22%2C%22audience_network%22%5D%7D&status=PAUSED` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `adlabels` | `list<Object>` | Specifies list of labels to be associated with this object. This field is optional |
| `adset_schedule` | `list<Object>` | Ad set schedule, representing a delivery schedule for a single day |
| `anchor_event_attribution_window_days` | `int64` | `anchor_event_attribution_window_days` |
| `attribution_spec` | `list<JSON object>` | Conversion attribution spec used for attributing conversions for optimization. Supported window lengths differ by optimization goal and campaign objective. |
| `automatic_manual_state` | `enum{UNSET, AUTOMATIC, MANUAL}` | `automatic_manual_state` |
| `bid_amount` | `integer` | Bid cap or target cost for this ad set. The bid cap used in a lowest cost bid strategy is defined as the maximum bid you want to pay for a result based on your `optimization_goal`. The target cost used in a target cost bid strategy lets Facebook bid to meet your target on average and keep costs stable as you spend. If an ad level `bid_amount` is specified, updating this value will overwrite the previous ad level bid. Unless you are using Reach and Frequency, `bid_amount` is required if `bid_strategy` is set to `LOWEST_COST_WITH_BID_CAP` or `COST_CAP`. The bid amount's unit is cents for currencies like USD, EUR, and the basic unit for currencies like JPY, KRW. The bid amount for ads with `IMPRESSION` or `REACH` as `billing_event` is per 1,000 occurrences, and has to be at least 2 US cents or more. For ads with other `billing_events`, the bid amount is for each occurrence, and has a minimum value 1 US cents. The minimum bid amounts of other currencies are of similar value to the US Dollar values provided. |
| `bid_strategy` | `enum{LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS}` | Choose bid strategy for this ad set to suit your specific business goals. Each strategy has tradeoffs and may be available for certain `optimization_goals`: |
| | `LOWEST_COST_WITHOUT_CAP`: Designed to get the most results for your budget based on your ad set `optimization_goal` without limiting your bid amount. This is the best strategy if you care most about cost efficiency. However with this strategy it may be harder to get stable average costs as you spend. This strategy is also known as automatic bidding. Learn more in [Ads Help Center, About bid strategies: Lowest cost](https://www.facebook.com/business/help/1288599478479574). | |
| | `LOWEST_COST_WITH_BID_CAP`: Designed to get the most results for your budget based on your ad set `optimization_goal` while limiting actual bid to your specified amount. With a bid cap you have more control over your cost per actual optimization event. However if you set a limit which is too low you may get less ads delivery. If you select this, you must provide a bid cap with the `bid_amount` field. Note: during creation this bid strategy is set if you provide `bid_amount` only. This strategy is also known as manual maximum-cost bidding. Learn more in [Ads Help Center, About bid strategies: Lowest cost](https://www.facebook.com/business/help/1288599478479574). | |
| | **Notes:** | |
| | If you enable [campaign budget optimization](https://developers.facebook.com/docs/marketing-api/guides/campaign-budget-optimization), you should set `bid_strategy` at the parent campaign level. | |
| | `TARGET_COST` bidding strategy has been deprecated with Marketing API v9. | |
| `billing_event` | `enum{APP_INSTALLS, CLICKS, IMPRESSIONS, LINK_CLICKS, NONE, OFFER_CLAIMS, PAGE_LIKES, POST_ENGAGEMENT, THRUPLAY, PURCHASE, LISTING_INTERACTION}` | The billing event that this ad set is using: |
| | `APP_INSTALLS`: Pay when people install your app. | |
| | `CLICKS`: Deprecated. | |
| | `IMPRESSIONS`: Pay when the ads are shown to people. | |
| | `LINK_CLICKS`: Pay when people click on the link of the ad. | |
| | `OFFER_CLAIMS`: Pay when people claim the offer. | |
| | `PAGE_LIKES`: Pay when people like your page. | |
| | `POST_ENGAGEMENT`: Pay when people engage with your post. | |
| | `VIDEO_VIEWS`: Pay when people watch your video ads for at least 10 seconds. | |
| | `THRUPLAY`: Pay for ads that are played to completion, or played for at least 15 seconds. | |
| `budget_schedule_specs` | `list<JSON or object-like arrays>` | Initial high demand periods to be created with the ad set. |
| | Provide list of `time_start`, `time_end`,`budget_value`, and `budget_value_type`. | |
| | For example, | |
| | `-F 'budget_schedule_specs=[{
"time_start":1699081200,
"time_end":1699167600,
"budget_value":100,
"budget_value_type":"ABSOLUTE"
}]'` | |
| | See [High Demand Period](https://developers.facebook.com/docs/marketing-api/reference/high-demand-period) for more details on each field. | |
| `budget_source` | `enum{NONE, RMN}` | `budget_source` |
| `budget_split_set_id` | `numeric string` or `integer` | `budget_split_set_id` |
| `campaign_attribution` | `enum{}` | `campaign_attribution` |
| `campaign_id` | `numeric string` or `integer` | The ad campaign you wish to add this ad set to. |
| `campaign_spec` | `Campaign spec` | Provide `name`, `objective` and `buying_type` for a campaign you want to create. Otherwise you need to provide `campaign_id` for an existing ad campaign. For example: |
| | `-F 'campaign_spec={
  "name": "Inline created campaign",
  "objective": "CONVERSIONS",
  "buying_type": "AUCTION"
}'` | |
| | Please refer to the [Outcome-Driven Ads Experiences mapping table](https://developers.facebook.com/docs/marketing-api/guides/odax) to find new objectives and their corresponding destination types, optimization goals and promoted objects. | |
| `contextual_bundling_spec` | `Object` | settings of Contextual Bundle to support ads serving in Facebook contextual surfaces |
| `creative_sequence` | `list<numeric string or integer>` | Order of the adgroup sequence to be shown to users |
| `daily_budget` | `int64` | The daily budget defined in your account currency, allowed only for ad sets with a duration (difference between `end_time` and `start_time`) longer than 24 hours. |
| | Either `daily_budget` or `lifetime_budget` must be greater than 0. | |
| `daily_imps` | `int64` | Daily impressions. Available only for campaigns with `buying_type=FIXED_CPM` |
| `daily_min_spend_target` | `int64` | Daily minimum spend target of the ad set defined in your account currency. To use this field, daily budget must be specified in the Campaign. This target is not a guarantee but our best effort. |
| `daily_spend_cap` | `int64` | Daily spend cap of the ad set defined in your account currency. To use this field, daily budget must be specified in the Campaign. Set the value to 922337203685478 to remove the spend cap. |
| `destination_type` | `enum{WEBSITE, APP, MESSENGER, APPLINKS_AUTOMATIC, WHATSAPP, INSTAGRAM_DIRECT, FACEBOOK, MESSAGING_MESSENGER_WHATSAPP, MESSAGING_INSTAGRAM_DIRECT_MESSENGER, MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP, MESSAGING_INSTAGRAM_DIRECT_WHATSAPP, SHOP_AUTOMATIC, ON_AD, ON_POST, ON_EVENT, ON_VIDEO, ON_PAGE, INSTAGRAM_PROFILE, FACEBOOK_PAGE, INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE, INSTAGRAM_LIVE, FACEBOOK_LIVE, IMAGINE}` | Destination of ads in this Ad Set. Options include: Website, App, Messenger, `INSTAGRAM_DIRECT`, `INSTAGRAM_PROFILE`. |
| `dsa_beneficiary` | `string` | `dsa_beneficiary` |
| `dsa_payor` | `string` | `dsa_payor` |
| `end_time` | `datetime` | End time, required when `lifetime_budget` is specified. e.g. `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`. When creating a set with a daily budget, specify `end_time=0` to set the set to be ongoing and have no end date. UTC UNIX timestamp |
| `execution_options` | `list<enum{validate_only, include_recommendations}>` | **Default value:** Set |
| | An execution setting | |
| | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field. | |
| | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. | |
| | If the call passes validation or review, response will be `{"success": true}`. If the call does not pass, an error will be returned with more details. These options can be used to improve any UI to display errors to the user much sooner, e.g. as soon as a new value is typed into any field corresponding to this ad object, rather than at the upload/save stage, or after review. | |
| `existing_customer_budget_percentage` | `int64` | `existing_customer_budget_percentage` |
| `frequency_control_specs` | `list<Object>` | An array of frequency control specs for this ad set. Writes to this field are only available in ad sets where `REACH` and `THRUPLAY` are the performance goal. |
| `is_dynamic_creative` | `boolean` | Indicates the ad set must only be used for dynamic creatives. Dynamic creative ads can be created in this ad set. Defaults to `false` |
| `is_sac_cfca_terms_certified` | `boolean` | `is_sac_cfca_terms_certified` |
| `lifetime_budget` | `int64` | Lifetime budget, defined in your account currency. If specified, you must also specify an `end_time`. |
| | Either `daily_budget` or `lifetime_budget` must be greater than 0. | |
| `lifetime_imps` | `int64` | Lifetime impressions. Available only for campaigns with `buying_type=FIXED_CPM` |
| `lifetime_min_spend_target` | `int64` | Lifetime minimum spend target of the ad set defined in your account currency. To use this field, lifetime budget must be specified in the Campaign. This target is not a guarantee but our best effort. |
| `lifetime_spend_cap` | `int64` | Lifetime spend cap of the ad set defined in your account currency. To use this field, lifetime budget must be specified in the Campaign. Set the value to 922337203685478 to remove the spend cap. |
| `max_budget_spend_percentage` | `int64` | `max_budget_spend_percentage` |
| `min_budget_spend_percentage` | `int64` | `min_budget_spend_percentage` |
| `multi_optimization_goal_weight` | `enum{UNDEFINED, BALANCED, PREFER_INSTALL, PREFER_EVENT}` | `multi_optimization_goal_weight` |
| `name` | `string` | Ad set name, max length of 400 characters. |
| | **Required** | **Supports Emoji** |
| `optimization_goal` | `enum{NONE, APP_INSTALLS, AD_RECALL_LIFT, ENGAGED_USERS, EVENT_RESPONSES, IMPRESSIONS, LEAD_GENERATION, QUALITY_LEAD, LINK_CLICKS, OFFSITE_CONVERSIONS, PAGE_LIKES, POST_ENGAGEMENT, QUALITY_CALL, REACH, LANDING_PAGE_VIEWS, VISIT_INSTAGRAM_PROFILE, VALUE, THRUPLAY, DERIVED_EVENTS, APP_INSTALLS_AND_OFFSITE_CONVERSIONS, CONVERSATIONS, IN_APP_VALUE, MESSAGING_PURCHASE_CONVERSION, SUBSCRIBERS, REMINDERS_SET, MEANINGFUL_CALL_ATTEMPT, PROFILE_VISIT, PROFILE_AND_PAGE_ENGAGEMENT, ADVERTISER_SILOED_VALUE, AUTOMATIC_OBJECTIVE, MESSAGING_APPOINTMENT_CONVERSION}` | What the ad set is optimizing for. |
| | `APP_INSTALLS`: Will optimize for people more likely to install your app. | |
| | `ENGAGED_USERS`: Will optimize for people more likely to take a particular action in your app. | |
| | `EVENT_RESPONSES`: Will optimize for people more likely to attend your event. | |
| | `IMPRESSIONS`: Will show the ads as many times as possible. | |
| | `LEAD_GENERATION`: Will optimize for people more likely to fill out a lead generation form. | |
| | `LINK_CLICKS`: Will optimize for people more likely to click in the link of the ad. | |
| | `OFFER_CLAIMS`: Will optimize for people more likely to claim the offer. | |
| | `OFFSITE_CONVERSIONS`: Will optimize for people more likely to make a conversion in the site | |
| | `PAGE_ENGAGEMENT`: Will optimize for people more likely to engage with your page. | |
| | `PAGE_LIKES`: Will optimize for people more likely to like your page. | |
| | `POST_ENGAGEMENT`: Will optimize for people more likely to engage with your post. | |
| | `REACH`: Optimize to reach the most unique users of each day or interval specified in `frequency_control_specs`. | |
| | `SOCIAL_IMPRESSIONS`: Increase the number of impressions with social context. For example, with the names of one or more of the user's friends attached to the ad who have already liked the page or installed the app. | |
| | `VALUE`: Will optimize for maximum total purchase value within the specified attribution window. | |
| | `THRUPLAY`: Will optimize delivery of your ads to people are more likely to play your ad to completion, or play it for at least 15 seconds. | |
| | `AD_RECALL_LIFT`: Optimize for people more likely to remember seeing your ads. | |
| | `VISIT_INSTAGRAM_PROFILE`: Optimize for visits to the advertiser's instagram profile. | |
| `optimization_sub_event` | `enum{NONE, VIDEO_SOUND_ON, TRIP_CONSIDERATION, TRAVEL_INTENT, TRAVEL_INTENT_NO_DESTINATION_INTENT, TRAVEL_INTENT_BUCKET_01, TRAVEL_INTENT_BUCKET_02, TRAVEL_INTENT_BUCKET_03, TRAVEL_INTENT_BUCKET_04, TRAVEL_INTENT_BUCKET_05, POST_INTERACTION}` | Optimization sub event for a specific optimization goal (ex: Sound-On event for Video-View-2s optimization goal) |
| `pacing_type` | `list<string>` | Defines the pacing type, standard by default or using ad scheduling |
| `promoted_object` | `Object` | The object this ad set is promoting across all its ads. Required with certain campaign objectives. |
| | **CONVERSIONS** | |
| | `pixel_id` (Conversion pixel ID) | |
| | `pixel_id` (Facebook pixel ID) and `custom_event_type` | |
| | `pixel_id` (Facebook pixel ID) and `pixel_rule` and `custom_event_type` | |
| | `event_id` (Facebook event ID) and `custom_event_type` | |
| | `application_id`, `object_store_url`, and `custom_event_type` for mobile app events | |
| | `offline_conversion_data_set_id` (Offline dataset ID) and `custom_event_type` for offline conversions | |
| | **PAGE\_LIKES** | |
| | `page_id` | |
| | **OFFER\_CLAIMS** | |
| | `page_id` | |
| | **LINK\_CLICKS** | |
| | `application_id` and `object_store_url` for mobile app or Canvas app engagement link clicks | |
| | **APP\_INSTALLS** | |
| | `application_id` and `object_store_url` | |
| | if the `optimization_goal` is `OFFSITE_CONVERSIONS` | |
| | `application_id`, `object_store_url`, and `custom_event_type` (Standard Events) | |
| | `application_id`, `object_store_url`, `custom_event_type = OTHER` and `custom_event_str` (Custom Events) | |
| | **PRODUCT\_CATALOG\_SALES** | |
| | `product_set_id` | |
| | `product_set_id` and `custom_event_type` | |
| | When `optimization_goal` is `LEAD_GENERATION`, `page_id` needs to be passed as `promoted_object`. | |
| | Please refer to the [Outcome-Driven Ads Experiences mapping table](https://developers.facebook.com/docs/marketing-api/guides/odax) to find new objectives and their corresponding destination types, optimization goals and promoted objects. | |
| `rf_prediction_id` | `numeric string` or `integer` | Reach and frequency prediction ID |
| `source_adset_id` | `numeric string` or `integer` | The source adset id that this ad is copied from (if applicable). |
| `start_time` | `datetime` | The start time of the set, e.g. `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`. UTC UNIX timestamp |
| `status` | `enum{ACTIVE, PAUSED, DELETED, ARCHIVED}` | Only `ACTIVE` and `PAUSED` are valid for creation. The other statuses can be used for update. If it is set to `PAUSED`, all its active ads will be paused and have an effective status `ADSET_PAUSED`. |
| `targeting` | `Targeting object` | An ad set's targeting structure. "countries" is required. See [targeting](https://developers.facebook.com/docs/marketing-api/targeting-specs). |
| `time_based_ad_rotation_id_blocks` | `list<list<int64>>` | Specify ad creative that displays at custom date ranges in a campaign as an array. A list of Adgroup IDs. The list of ads to display for each time range in a given schedule. For example display first ad in Adgroup for first date range, second ad for second date range, and so on. You can display more than one ad per date range by providing more than one ad ID per array. For example set `time_based_ad_rotation_id_blocks` to `[[1], [2, 3], [1, 4]]`. On the first date range show ad 1, on the second date range show ad 2 and ad 3 and on the last date range show ad 1 and ad 4. Use with `time_based_ad_rotation_intervals` to specify date ranges. |
| `time_based_ad_rotation_intervals` | `list<int64>` | Date range when specific ad creative displays during a campaign. Provide date ranges in an array of UNIX timestamps where each timestamp represents the start time for each date range. For example a 3-day campaign from May 9 12am to May 11 11:59PM PST can have three date ranges, the first date range starts from May 9 12:00AM to May 9 11:59PM, second date range starts from May 10 12:00AM to May 10 11:59PM and last starts from May 11 12:00AM to May 11 11:59PM. The first timestamp should match the campaign start time. The last timestamp should be at least 1 hour before the campaign end time. You must provide at least two date ranges. All date ranges must cover the whole campaign length, so any date range cannot exceed campaign length. Use with `time_based_ad_rotation_id_blocks` to specify ad creative for each date range. |
| `time_start` | `datetime` | Time start |
| `time_stop` | `datetime` | Time stop |
| `tune_for_category` | `enum{NONE, EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS, ONLINE_GAMBLING_AND_GAMING, FINANCIAL_PRODUCTS_SERVICES}` | `tune_for_category` |
| `value_rule_set_id` | `numeric string` or `integer` | Value Rule Set ID |
| `value_rules_applied` | `boolean` | `value_rules_applied` |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 2695 | The ad set creation reached its campaign group(ios14) limit. |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 2641 | Your ad includes or excludes locations that are currently restricted |
| 190 | Invalid OAuth 2.0 Access Token |
| 900 | No such application exists. |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

This operation has been deprecated with Marketing API V8.

You can't perform this operation on this endpoint.

# Ad Account Adspixels

**Graph API Version**

v24.0

**Reading**

`ad account` to `ads pixels` edge

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/<PIXEL_ID>/?fields=code HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `AdsPixel` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=total_count`). |
| `total_count` | `int32` | Total number of objects on this edge |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 100 | Invalid parameter |

**Creating**

You can make a `POST` request to `adspixels` edge from the following paths:
*   `/act_{ad_account_id}/adspixels`

When posting to this edge, an `AdsPixel` will be created.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/adspixels HTTP/1.1
Host: graph.facebook.com

name=My+WCA+Pixel` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `name` | `string` | Name of the pixel |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 6202 | More than one pixel exist for this account |
| 6200 | A pixel already exists for this account |
| 100 | Invalid parameter |
| 200 | Permissions error |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Videos

**Graph API Version**

v24.0

**Reading**

You can't perform this operation on this endpoint.

**Creating**

You can make a `POST` request to `advideos` edge from the following paths:
*   `/act_{ad_account_id}/advideos`

When posting to this edge, a `Video` will be created.

| Parameters | |
| :--- | :--- |
| `audio_story_wave_animation_handle` | `string` | Everstore handle of wave animation used to burn audio story video |
| `composer_session_id` | `string` | `SELF_EXPLANATORY` |
| `description` | `UTF-8 string` | `SELF_EXPLANATORY` |
| | **Supports Emoji** | |
| `edit_description_spec` | `JSON object` | This represents the schema that the client should send to WWW for the edit description spec during video upload. |
| `end_offset` | `int64` | `end_offset` |
| `file_size` | `int64` | The size of the video file in bytes. Using during chunked upload. |
| `file_url` | `string` | `SELF_EXPLANATORY` |
| `fisheye_video_cropped` | `boolean` | Whether the single fisheye video is cropped or not |
| `front_z_rotation` | `float` | The front z rotation in degrees on the single fisheye video |
| `name` | `string` | The name of the video in the library. |
| `og_action_type_id` | `numeric string` or `integer` | `SELF_EXPLANATORY` |
| `og_icon_id` | `numeric string` or `integer` | `SELF_EXPLANATORY` |
| `og_object_id` | `OG object ID` or `URL string` | `SELF_EXPLANATORY` |
| `og_phrase` | `string` | `SELF_EXPLANATORY` |
| `og_suggestion_mechanism` | `string` | `SELF_EXPLANATORY` |
| `original_fov` | `int64` | Original field of view of the source camera |
| `original_projection_type` | `enum {equirectangular, cubemap, half_equirectangular}` | Original Projection type of the video being uploaded |
| `prompt_id` | `string` | `SELF_EXPLANATORY` |
| `prompt_tracking_string` | `string` | `SELF_EXPLANATORY` |
| `referenced_sticker_id` | `numeric string` or `integer` | `SELF_EXPLANATORY` |
| `source` | `string` | The video, encoded as form data. See the [Video Format doc](https://developers.facebook.com/docs/marketing-api/guides/video-ads/ad-videos#video-format) for more details on video formats. |
| `start_offset` | `int64` | The start position in byte of the chunk that is being sent, inclusive. Used during chunked upload. |
| `time_since_original_post` | `int64` | `SELF_EXPLANATORY` |
| `title` | `UTF-8 string` | The name of the video being uploaded. Must be less than 255 characters. Special characters may count as more than 1 character. |
| | **Supports Emoji** | |
| `transcode_setting_properties` | `string` | Properties used in computing transcode settings for the video |
| `unpublished_content_type` | `enum {SCHEDULED, SCHEDULED_RECURRING, DRAFT, PUBLISH_PENDING, ADS_POST, INLINE_CREATED, PUBLISHED, REVIEWABLE_BRANDED_CONTENT}` | `SELF_EXPLANATORY` |
| `upload_phase` | `enum {start, transfer, finish, cancel}` | The phase during chunked upload. Using during chunked upload. |
| `upload_session_id` | `numeric string` or `integer` | The session ID of this chunked upload. Using during chunked upload. |
| `video_file_chunk` | `string` | The chunk of the video, between `start_offset` and `end_offset`. Using during chunked upload. |

| Return Type | |
| :--- | :--- |
| `Struct {id: numeric string, upload_session_id: numeric string, video_id: numeric string, start_offset: numeric string, end_offset: numeric string, success: bool, skip_upload: bool, upload_domain: string, region_hint: string, xpv_asset_id: numeric string, is_xpv_single_prod: bool, transcode_bit_rate_bps: numeric string, transcode_dimension: numeric string, should_expand_to_transcode_dimension: bool, action_id: string, gop_size_seconds: numeric string, target_video_codec: string, target_hdr: string, maximum_frame_rate: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |
| 222 | Video not visible |
| 389 | Unable to fetch video file from URL. |
| 190 | Invalid OAuth 2.0 Access Token |
| 352 | The video file you selected is in a format that we don't support. |
| 6001 | There was a problem uploading your video. Please try again. |
| 382 | The video file you tried to upload is too small. Please try again with a larger file. |
| 351 | There was a problem with your video file. Please try again with another file, |
| 6000 | There was a problem uploading your video file. Please try again with another file. |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can dissociate a Video from an AdAccount by making a `DELETE` request to `/act_{ad_account_id}/advideos`.

| Parameters | |
| :--- | :--- |
| `video_id` | `video ID` | Ad account library video ID |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 613 | Calls to this api have exceeded the rate limit. |
| 100 | Invalid parameter |

# Ad Account Async Batch Requests

**Reading**

You can't perform this operation on this endpoint.

**Creating**

You can make a `POST` request to `async_batch_requests` edge from the following paths:
*   `/act_{ad_account_id}/async_batch_requests`

When posting to this edge, a `Campaign` will be created.

| Parameters | |
| :--- | :--- |
| `adbatch` | `list<Object>` | JSON encoded batch reqeust |
| | **Required** | |
| `name` | `UTF-8 encoded string` | Name of the batch request for tracking purposes. |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 194 | Missing at least one required parameter |
| 100 | Invalid parameter |
| 2500 | Error parsing graph query |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Asyncadcreatives

**Reading**

You can't perform this operation on this endpoint.

**Creating**

You can make a `POST` request to `asyncadcreatives` edge from the following paths:
*   `/act_{ad_account_id}/asyncadcreatives`

When posting to this edge, no Graph object will be created.

| Parameters | |
| :--- | :--- |
| `creative_spec` | `AdCreative` | Specs for ad creative |
| | **Required** | **Supports Emoji** |
| `name` | `UTF-8 encoded string` | Name of async job |
| | **Required** | |
| `notification_mode` | `enum{OFF, ON_COMPLETE}` | Specify 0 for no notifications and 1 for notification on completion. |
| `notification_uri` | `URL` | If notifications are enabled, specify the URL to send them. |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Asyncadrequestsets

**Reading**

You can't perform this operation on this endpoint.

**Creating**

You can make a `POST` request to `asyncadrequestsets` edge from the following paths:
*   `/act_{ad_account_id}/asyncadrequestsets`

When posting to this edge, no Graph object will be created.

| Parameters | |
| :--- | :--- |
| `ad_specs` | `list<dictionary { non-empty string : <string> }>` | Specs for ads in the request set |
| | **Required** | |
| `name` | `UTF-8 encoded string` | Name of the request set |
| | **Required** | |
| `notification_mode` | `enum{OFF, ON_COMPLETE}` | Specify 0 for no notifications and 1 for notification on completion. |
| `notification_uri` | `URL` | If notifications are enabled, specify the URL to send them. |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account, Ad Campaigns

The ad campaigns associated with a given ad account.
On May 1, 2018 with the release of Marketing API 3.0 we removed `kpi_custom_conversion_id`, `kpi_type`, and `kpi_results`.
Beginning September 15, 2022, with the release of Marketing API v15.0, advertisers will no longer be allowed to create incremental conversion optimization campaigns. Existing conversion optimization campaigns will behave normally.

**Ads About Social Issues, Elections, and Politics**

Beginning with the release of Marketing API v15.0, advertisers will no longer be able to create Special Ad Audiences. See [Special Ad Audiences details here](https://developers.facebook.com/docs/marketing-api/guides/special-ad-audiences) for more information.

**Reading**

Returns the campaigns under this ad account. A request with no filters returns only campaigns that were not archived or deleted.

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/act_<AD_ACCOUNT_ID>/campaigns?effective_status=%5B%22ACTIVE%22%2C%22PAUSED%22%5D&fields=name%2Cobjective HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `date_preset` | `enum{today, yesterday, this_month, last_month, this_quarter, maximum, data_maximum, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, last_week_mon_sun, last_week_sun_sat, last_quarter, last_year, this_week_mon_today, this_week_sun_today, this_year}` | Predefine date range used to aggregate insights metrics. |
| `effective_status` | `list<enum{ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, CAMPAIGN_PAUSED, ARCHIVED, ADSET_PAUSED, IN_PROCESS, WITH_ISSUES}>` | **Default value:** Vec | Effective status for the campaigns |
| `is_completed` | `boolean` | If true, we return completed campaigns. |
| `time_range` | `{'since':YYYY-MM-DD,'until':YYYY-MM-DD}` | Date range used to aggregate insights metrics |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `Campaign` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=insights`). |
| `insights` | `Edge<AdsInsights>` | Analytics summary for all objects |
| `total_count` | `unsigned int32` | Total number of objects |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 613 | Calls to this api have exceeded the rate limit. |
| 368 | The action attempted has been deemed abusive or is otherwise disallowed |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 2500 | Error parsing graph query |

**Creating**

You can make a `POST` request to `campaigns` edge from the following paths:
*   `/act_{ad_account_id}/campaigns`

When posting to this edge, a `Campaign` will be created.

| Example | |
| :--- | :--- |
| HTTP | `POST /v24.0/act_<AD_ACCOUNT_ID>/campaigns HTTP/1.1
Host: graph.facebook.com

name=My+campaign&objective=OUTCOME_TRAFFIC&status=PAUSED&special_ad_categories=%5B%5D&is_adset_budget_sharing_enabled=0` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `adlabels` | `list<Object>` | Ad Labels associated with this campaign |
| `bid_strategy` | `enum{LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS}` | Choose bid strategy for this campaign to suit your specific business goals. Each strategy has tradeoffs and may be available for certain `optimization_goals`: |
| | `LOWEST_COST_WITHOUT_CAP`: Designed to get the most results for your budget based on your ad set `optimization_goal` without limiting your bid amount. This is the best strategy if you care most about cost efficiency. However with this strategy it may be harder to get stable average costs as you spend. This strategy is also known as automatic bidding. Learn more in [Ads Help Center, About bid strategies: Lowest cost](https://www.facebook.com/business/help/1288599478479574). | |
| | `LOWEST_COST_WITH_BID_CAP`: Designed to get the most results for your budget based on your ad set `optimization_goal` while limiting actual bid to your specified amount. With a bid cap you have more control over your cost per actual optimization event. However if you set a limit which is too low you may get less ads delivery. If you select this, you must provide a bid cap in the `bid_amount` field for each ad set in this ad campaign. Note: during creation this is the default bid strategy if you don't specify. This strategy is also known as manual maximum-cost bidding. Learn more in [Ads Help Center, About bid strategies: Lowest cost](https://www.facebook.com/business/help/1288599478479574). | |
| | **Notes:** | |
| | If you do not enable [campaign budget optimization](https://developers.facebook.com/docs/marketing-api/guides/campaign-budget-optimization), you should set `bid_strategy` at ad set level. | |
| | `TARGET_COST` bidding strategy has been deprecated with Marketing API v9. | |
| `budget_schedule_specs` | `list<JSON or object-like arrays>` | Initial high demand periods to be created with the campaign. |
| | Provide list of `time_start`, `time_end`,`budget_value`, and `budget_value_type`. | |
| | For example, | |
| | `-F 'budget_schedule_specs=[{
"time_start":1699081200,
"time_end":1699167600,
"budget_value":100,
"budget_value_type":"ABSOLUTE"
}]'` | |
| | See [High Demand Period](https://developers.facebook.com/docs/marketing-api/reference/high-demand-period) for more details on each field. | |
| `buying_type` | `string` | **Default value:** `AUCTION` | This field will help Facebook make optimizations to delivery, pricing, and limits. All ad sets in this campaign must match the buying type. Possible values are: |
| | `AUCTION` (default) | |
| | `RESERVED` (for reach and frequency ads). | |
| `campaign_optimization_type` | `enum{NONE, ICO_ONLY}` | `campaign_optimization_type` |
| `daily_budget` | `int64` | Daily budget of this campaign. All adsets under this campaign will share this budget. You can either set budget at the campaign level or at the adset level, not both. |
| `execution_options` | `list<enum{validate_only, include_recommendations}>` | **Default value:** Set |
| | An execution setting | |
| | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field. | |
| | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. | |
| | If the call passes validation or review, response will be `{"success": true}`. If the call does not pass, an error will be returned with more details. These options can be used to improve any UI to display errors to the user much sooner, e.g. as soon as a new value is typed into any field corresponding to this ad object, rather than at the upload/save stage, or after review. | |
| `is_skadnetwork_attribution` | `boolean` | To create an iOS 14 campaign, enable SKAdNetwork attribution for this campaign. |
| `is_using_l3_schedule` | `boolean` | `is_using_l3_schedule` |
| `iterative_split_test_configs` | `list<Object>` | Array of Iterative Split Test Configs created under this campaign . |
| `lifetime_budget` | `int64` | Lifetime budget of this campaign. All adsets under this campaign will share this budget. You can either set budget at the campaign level or at the adset level, not both. |
| `name` | `string` | Name for this campaign |
| | **Supports Emoji** | |
| `objective` | `enum{APP_INSTALLS, BRAND_AWARENESS, CONVERSIONS, EVENT_RESPONSES, LEAD_GENERATION, LINK_CLICKS, LOCAL_AWARENESS, MESSAGES, OFFER_CLAIMS, OUTCOME_APP_PROMOTION, OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_TRAFFIC, PAGE_LIKES, POST_ENGAGEMENT, PRODUCT_CATALOG_SALES, REACH, STORE_VISITS, VIDEO_VIEWS}` | Campaign's objective. If it is specified the API will validate that any ads created under the campaign match that objective. |
| | Currently, with `BRAND_AWARENESS` objective, all creatives should be either only images or only videos, not mixed. | |
| | See [Outcome Ad-Driven Experience Objective Validation](https://developers.facebook.com/docs/marketing-api/guides/odax) for more information. | |
| `promoted_object` | `Object` | The object this campaign is promoting across all its ads. It’s required for Meta iOS 14+ app promotion (SKAdNetwork or Aggregated Event Measurement) campaign creation. Only `product_catalog_id` is used at the ad set level. |
| `source_campaign_id` | `numeric string` or `integer` | Used if a campaign has been copied. The ID from the original campaign that was copied. |
| `special_ad_categories` | `array<enum {NONE, EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS, ONLINE_GAMBLING_AND_GAMING, FINANCIAL_PRODUCTS_SERVICES}>` | `special_ad_categories` |
| | **Required** | |
| `special_ad_category_country` | `array<enum {AC, AD, AE, AF, AG, AI, AL, AM, AN, AO, AQ, AR, AS, AT, AU, AW, AX, AZ, BA, BB, BD, BE, BF, BG, BH, BI, BJ, BL, BM, BN, BO, BQ, BR, BS, BT, BV, BW, BY, BZ, CA, CC, CD, CF, CG, CH, CI, CK, CL, CM, CN, CO, CR, CU, CV, CW, CX, CY, CZ, DE, DJ, DK, DM, DO, DZ, EC, EE, EG, EH, ER, ES, ET, FI, FJ, FK, FM, FO, FR, GA, GB, GD, GE, GF, GG, GH, GI, GL, GM, GN, GP, GQ, GR, GS, GT, GU, GW, GY, HK, HM, HN, HR, HT, HU, ID, IE, IL, IM, IN, IO, IQ, IR, IS, IT, JE, JM, JO, JP, KE, KG, KH, KI, KM, KN, KP, KR, KW, KY, KZ, LA, LB, LC, LI, LK, LR, LS, LT, LU, LV, LY, MA, MC, MD, ME, MF, MG, MH, MK, ML, MM, MN, MO, MP, MQ, MR, MS, MT, MU, MV, MW, MX, MY, MZ, NA, NC, NE, NF, NG, NI, NL, NO, NP, NR, NU, NZ, OM, PA, PE, PF, PG, PH, PK, PL, PM, PN, PR, PS, PT, PW, PY, QA, RE, RO, RS, RU, RW, SA, SB, SC, SD, SE, SG, SH, SI, SJ, SK, SL, SM, SN, SO, SR, SS, ST, SV, SX, SY, SZ, TC, TD, TF, TG, TH, TJ, TK, TL, TM, TN, TO, TR, TT, TV, TW, TZ, UA, UG, UM, US, UY, UZ, VA, VC, VE, VG, VI, VN, VU, WF, WS, XK, YE, YT, ZA, ZM, ZW}>` | `special_ad_category_country` |
| `spend_cap` | `int64` | A spend cap for the campaign, such that it will not spend more than this cap. Defined as integer value of subunit in your currency with a minimum value of $100 USD (or approximate local equivalent). Set the value to 922337203685478 to remove the spend cap. Not available for Reach and Frequency or Premium Self Serve campaigns |
| `start_time` | `datetime` | `start_time` |
| `status` | `enum{ACTIVE, PAUSED, DELETED, ARCHIVED}` | Only `ACTIVE` and `PAUSED` are valid during creation. Other statuses can be used for update. If it is set to `PAUSED`, its active child objects will be paused and have an effective status `CAMPAIGN_PAUSED`. |
| `stop_time` | `datetime` | `stop_time` |
| `topline_id` | `numeric string` or `integer` | Topline ID |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node represented by `id` in the return type. | |
| `Struct {id: numeric string, success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 613 | Calls to this api have exceeded the rate limit. |
| 200 | Permissions error |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 190 | Invalid OAuth 2.0 Access Token |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 300 | Edit failure |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can dissociate a Campaign from an AdAccount by making a `DELETE` request to `/act_{ad_account_id}/campaigns`.

| Parameters | |
| :--- | :--- |
| `before_date` | `datetime` | Set a before date to delete campaigns before this date |
| `delete_strategy` | `enum{DELETE_ANY, DELETE_OLDEST, DELETE_ARCHIVED_BEFORE}` | Delete strategy |
| | **Required** | |
| `object_count` | `integer` | Object count |

| Return Type | |
| :--- | :--- |
| `Struct {objects_left_to_delete_count: unsigned int32, deleted_object_ids: List [numeric string ], }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

# Ad Account Generatepreviews

When you use a Page Post which links to an app on the Google Play Store or an app on the Apple App Store Facebook overrides the following fields:
*   We overwrite the `name` parameter of the Page Post with the name of the app from the Play Store or App Store.
*   We import the thumbnail icon of the app associated with the Page Post from the Play Store or App Store.

We only support certain combinations of creatives and `ad_format`:
*   Link ad not connected to a page - `RIGHT_COLUMN_STANDARD`
*   Page like ad - `RIGHT_COLUMN_STANDARD`, `DESKTOP_FEED_STANDARD`, `MOBILE_FEED_STANDARD`
*   Event ad: `RIGHT_COLUMN_STANDARD`
*   Page like ad - `RIGHT_COLUMN_STANDARD`
*   Page post ad - `RIGHT_COLUMN_STANDARD`, `DESKTOP_FEED_STANDARD`, `MOBILE_FEED_STANDARD`, `INSTAGRAM_STANDARD`
*   Desktop app ad - `DESKTOP_FEED_STANDARD`
*   Mobile app install - `MOBILE_FEED_STANDARD`, `INSTAGRAM_STANDARD`, `MOBILE_BANNER`, `MOBILE_INTERSTITIAL"`,
*   Collection ads - Standard ads, no ads with product sets.

**Reading**

Generate previews for a creative specification

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/act_<AD_ACCOUNT_ID>/generatepreviews?creative=%3CCREATIVE_SPEC%3E&ad_format=%3CAD_FORMAT%3E HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `ad_format` | `enum{AUDIENCE_NETWORK_INSTREAM_VIDEO, AUDIENCE_NETWORK_INSTREAM_VIDEO_MOBILE, AUDIENCE_NETWORK_OUTSTREAM_VIDEO, AUDIENCE_NETWORK_REWARDED_VIDEO, BIZ_DISCO_FEED_MOBILE, DESKTOP_FEED_STANDARD, FACEBOOK_IFU_REELS_MOBILE, FACEBOOK_PROFILE_FEED_DESKTOP, FACEBOOK_PROFILE_FEED_MOBILE, FACEBOOK_PROFILE_REELS_MOBILE, FACEBOOK_REELS_BANNER, FACEBOOK_REELS_BANNER_DESKTOP, FACEBOOK_REELS_BANNER_FEED_ANDROID, FACEBOOK_REELS_BANNER_FEED_ANDROID_LARGE, FACEBOOK_REELS_BANNER_FULLSCREEN_IOS, FACEBOOK_REELS_BANNER_FULLSCREEN_MOBILE, FACEBOOK_REELS_MOBILE, FACEBOOK_REELS_POSTLOOP, FACEBOOK_REELS_POSTLOOP_FEED, FACEBOOK_REELS_STICKER, FACEBOOK_STORY_MOBILE, FACEBOOK_STORY_STICKER_MOBILE, INSTAGRAM_EXPLORE_CONTEXTUAL, INSTAGRAM_EXPLORE_GRID_HOME, INSTAGRAM_EXPLORE_IMMERSIVE, INSTAGRAM_FEED_WEB, INSTAGRAM_FEED_WEB_M_SITE, INSTAGRAM_LEAD_GEN_MULTI_SUBMIT_ADS, INSTAGRAM_PROFILE_FEED, INSTAGRAM_PROFILE_REELS, INSTAGRAM_REELS, INSTAGRAM_REELS_INSTREAM, INSTAGRAM_REELS_OVERLAY, INSTAGRAM_REELS_WEB, INSTAGRAM_REELS_WEB_M_SITE, INSTAGRAM_SEARCH_CHAIN, INSTAGRAM_SEARCH_GRID, INSTAGRAM_STANDARD, INSTAGRAM_STORY, INSTAGRAM_STORY_EFFECT_TRAY, INSTAGRAM_STORY_WEB, INSTAGRAM_STORY_WEB_M_SITE, INSTANT_ARTICLE_RECIRCULATION_AD, INSTANT_ARTICLE_STANDARD, INSTREAM_BANNER_DESKTOP, INSTREAM_BANNER_FEED_IOS, INSTREAM_BANNER_FULLSCREEN_IOS, INSTREAM_BANNER_FULLSCREEN_MOBILE, INSTREAM_BANNER_IMMERSIVE_MOBILE, INSTREAM_BANNER_MOBILE, INSTREAM_VIDEO_DESKTOP, INSTREAM_VIDEO_FULLSCREEN_IOS, INSTREAM_VIDEO_FULLSCREEN_MOBILE, INSTREAM_VIDEO_IMAGE, INSTREAM_VIDEO_IMMERSIVE_MOBILE, INSTREAM_VIDEO_MOBILE, JOB_BROWSER_DESKTOP, JOB_BROWSER_MOBILE, MARKETPLACE_MOBILE, MESSENGER_MOBILE_INBOX_MEDIA, MESSENGER_MOBILE_STORY_MEDIA, MOBILE_BANNER, MOBILE_FEED_BASIC, MOBILE_FEED_STANDARD, MOBILE_FULLWIDTH, MOBILE_INTERSTITIAL, MOBILE_MEDIUM_RECTANGLE, MOBILE_NATIVE, RIGHT_COLUMN_STANDARD, SUGGESTED_VIDEO_DESKTOP, SUGGESTED_VIDEO_FULLSCREEN_MOBILE, SUGGESTED_VIDEO_IMMERSIVE_MOBILE, SUGGESTED_VIDEO_MOBILE, WATCH_FEED_HOME, WATCH_FEED_MOBILE}` | Use this to select what placement on Facebook the ad preview should be for. The API returns an iframe, which is only valid for 24 hours. |
| | **Required** | |
| `creative` | `AdCreative` | Ad creative spec |
| | **Required** | **Supports Emoji** |
| `creative_feature` | `enum{product_metadata_automation, profile_card, standard_enhancements_catalog, text_overlay_translation}` | `creative_feature` |
| `dynamic_asset_label` | `string` | Provide a label for rendering specific variation of an asset customization ad |
| `dynamic_creative_spec` | `Object` | Dynamic creative spec for dynamic ads. |
| | **Supports Emoji** | |
| `dynamic_customization` | `Object` | For dynamic ads in multiple languages, specify the customization to be applied to the ad |
| `end_date` | `datetime` | Provide an end date for trip.\* parameters in the creative |
| `height` | `int64` | Custom height of the resulting iframe, recommended at least 280 x 280 for the large right hand size height. **Note:** the parameter affects only the size of the iframe containing the preview object. It has no affect on the actual size of the previewed ad. |
| `place_page_id` | `Page ID` | Place page ID to use when rendering a dynamic local ad preview |
| `post` | `Object` | Specs for a page post. This field is used when the `creative` field contains only a Page id as `object_id` in it. Not supported for `ad_format` = `RIGHT_COLUMN_STANDARD` |
| `product_item_ids` | `list<string>` | A list of Product Item IDs to use when rendering a dynamic ad preview. |
| `start_date` | `datetime` | Provide a start date for trip.\* parameters in the creative |
| `width` | `int64` | Custom width of the resulting iframe, recommended at least 280 x 280 for the large right hand size widths. **Note:** the parameter affects only the size of the iframe containing the preview object. It has no affect on the actual size of the previewed ad. |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {} }` | |
| `data` | A list of `AdPreview` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 200 | Permissions error |
| 194 | Missing at least one required parameter |
| 1500 | The url you supplied is invalid |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |

**Creating**

You can't perform this operation on this endpoint.

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account, Insights

The Insights API can return several metrics which are estimated or in-development. In some cases a metric may be both estimated and in-development.
*   **Estimated** - Provide directional insights for outcomes that are hard to precisely quantify. They may evolve as we gather more data. See [Ads Help Center, Estimated metrics](https://www.facebook.com/business/help/1288599478479574).
*   **In Development** - Still being tested and may change as we improve our methodologies. We encourage you to use it for directional guidance, but please use caution when using it for historical comparisons or strategic planning. See [Ads Help Center, In development metrics](https://www.facebook.com/business/help/1288599478479574).

For more information, see [Insights API, Estimated and Deprecated Metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated).

Facebook will no longer be able to aggregate non-inline conversion metric values across iOS 14.5 and non-iOS 14.5 campaigns due to differences in attribution logic. Querying across iOS 14.5 and non-iOS 14.5 campaigns will result in no data getting returned for non-inline conversion metrics such as app installs and purchases. Inline event metrics like impressions, link clicks, and video views, however, can still be aggregated. Please visit our [changelog](https://developers.facebook.com/docs/graph-api/changelog) for more information.

The `date_preset = lifetime` parameter is disabled in Graph API v10.0 and replaced with `date_preset = maximum`, which returns a maximum of 37 months of data. For v9.0 and below, `date_preset = maximum` will be enabled on May 25, 2021, and any `lifetime` calls will default to `maximum` and return only 37 months of data.

**Reading**

Provides insights on your advertising performance. Allows for deduped metrics across child objects, such as `unique_clicks`, sorting of metrics, and async reporting.

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/<AD_SET_ID>/insights?fields=impressions&breakdown=publisher_platform HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| `action_attribution_windows` | `list<enum{1d_view, 7d_view, 28d_view, 1d_click, 7d_click, 28d_click, 1d_ev, dda, default, 7d_view_first_conversion, 28d_view_first_conversion, 7d_view_all_conversions, 28d_view_all_conversions, skan_view, skan_click, skan_click_second_postback, skan_view_second_postback, skan_click_third_postback, skan_view_third_postback}>` | **Default value:** `default` | The attribution window for the actions. For example, `28d_click` means the API returns all actions that happened 28 days after someone clicked on the ad. `1d_ev` refers to engaged-view conversions counted when a skippable video ad is played for at least 10 seconds, or for at least 97% of its total length if it’s shorter than 10 seconds, and a person takes an action within 1 day. The default option means `["7d_click","1d_view"]`. |
| `action_breakdowns` | `list<enum{action_device, conversion_destination, matched_persona_id, matched_persona_name, signal_source_bucket, standard_event_content_type, action_canvas_component_name, action_carousel_card_id, action_carousel_card_name, action_destination, action_reaction, action_target_id, action_type, action_video_sound, action_video_type, is_business_ai_assisted}>` | **Default value:** Vec | How to break down action results. Supports more than one breakdowns. Default value is `["action_type"]`. **Note:** you must also include `actions` field whenever `action_breakdowns` is specified. |
| `action_report_time` | `enum{impression, conversion, mixed, lifetime}` | Determines the report time of action stats. For example, if a person saw the ad on Jan 1st but converted on Jan 2nd, when you query the API with `action_report_time=impression`, you see a conversion on Jan 1st. When you query the API with `action_report_time=conversion`, you see a conversion on Jan 2nd. |
| `breakdowns` | `list<enum{ad_extension_domain, ad_extension_url, ad_format_asset, age, app_id, body_asset, breakdown_ad_objective, breakdown_reporting_ad_id, call_to_action_asset, coarse_conversion_value, comscore_market, country, creative_automation_asset_id, creative_relaxation_asset_type, crm_advertiser_l12_territory_ids, crm_advertiser_subvertical_id, crm_advertiser_vertical_id, crm_ult_advertiser_id, description_asset, fidelity_type, flexible_format_asset_type, gen_ai_asset_type, gender, hsid, image_asset, impression_device, is_auto_advance, is_conversion_id_modeled, is_rendered_as_delayed_skip_ad, landing_destination, link_url_asset, mdsa_landing_destination, media_asset_url, media_creator, media_destination_url, media_format, media_origin_url, media_text_content, media_type, postback_sequence_index, product_brand_breakdown, product_category_breakdown, product_custom_label_0_breakdown, product_custom_label_1_breakdown, product_custom_label_2_breakdown, product_custom_label_3_breakdown, product_custom_label_4_breakdown, product_group_content_id_breakdown, product_group_id, product_id, product_set_id_breakdown, product_vendor_id_breakdown, redownload, region, rta_ugc_topic, skan_campaign_id, skan_conversion_id, skan_version, sot_attribution_model_type, sot_attribution_window, sot_channel, sot_event_type, sot_source, title_asset, user_persona_id, user_persona_name, video_asset, rule_set_id, rule_set_name, dma, frequency_value, hourly_stats_aggregated_by_advertiser_time_zone, hourly_stats_aggregated_by_audience_time_zone, mmm, place_page_id, publisher_platform, platform_position, device_platform, standard_event_content_type, conversion_destination, signal_source_bucket, reels_trending_topic, marketing_messages_btn_name, impression_view_time_advertiser_hour_v2}>` | How to break down the result. For more than one breakdown, only certain combinations are available: See [Combining Breakdowns](#combining-breakdowns) and the [Breakdowns page](#insights-api-breakdowns). The option `impression_device` cannot be used by itself. |
| `date_preset` | `enum{today, yesterday, this_month, last_month, this_quarter, maximum, data_maximum, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, last_week_mon_sun, last_week_sun_sat, last_quarter, last_year, this_week_mon_today, this_week_sun_today, this_year}` | **Default value:** `last_30d` | Represents a relative time range. This field is ignored if `time_range` or `time_ranges` is specified. |
| `default_summary` | `boolean` | **Default value:** `false` | Determine whether to return a summary. If `summary` is set, this param is be ignored; otherwise, a summary section with the same fields as specified by `fields` will be included in the `summary` section. |
| `export_columns` | `list<string>` | Select fields on the exporting report file. It is an optional param. Exporting columns are equal to the param `fields`, if you leave this param blank |
| `export_format` | `string` | Set the format of exporting report file. If the `export_format` is set, Report file is asyncrhonizely generated. It expects `["xls", "csv"]`. |
| `export_name` | `string` | Set the file name of the exporting report. |
| `fields` | `list<string>` | Fields to be retrieved. Default behavior is to return `impressions` and `spend`. |
| `filtering` | `list<Filter Object>` | **Default value:** Vec | Filters on the report data. This parameter is an array of filter objects. |
| `graph_cache` | `boolean` | **Default value:** `true` | \[internal use only] This param controls whether the the Graph API level cache should be used for insights endpoint |
| `level` | `enum {ad, adset, campaign, account}` | Represents the level of result. |
| `limit` | `integer` | `limit` |
| `product_id_limit` | `integer` | Maximum number of product ids to be returned for each ad when breakdown by `product_id`. |
| `sort` | `list<string>` | **Default value:** Vec | Field to sort the result, and direction of sorting. You can specify sorting direction by appending "\_ascending" or "\_descending" to the sort field. For example, `"reach_descending"`. For actions, you can sort by action type in form of `"actions:<action_type>"`. For example, `["actions:link_click_ascending"]`. This array supports no more than one element. By default, the sorting direction is ascending. |
| `summary` | `list<string>` | If this param is used, a summary section will be included, with the fields listed in this param. |
| `summary_action_breakdowns` | `list<enum{action_device, conversion_destination, matched_persona_id, matched_persona_name, signal_source_bucket, standard_event_content_type, action_canvas_component_name, action_carousel_card_id, action_carousel_card_name, action_destination, action_reaction, action_target_id, action_type, action_video_sound, action_video_type, is_business_ai_assisted}>` | **Default value:** Vec | Similar to `action_breakdowns`, but applies to `summary`. Default value is `["action_type"]`. |
| `time_increment` | `enum{monthly, all_days}` or `integer` | **Default value:** `all_days` | If it is an integer, it is the number of days from 1 to 90. After you pick a reporting period by using `time_range` or `date_preset`, you may choose to have the results for the whole period, or have results for smaller time slices. If `"all_days"` is used, it means one result set for the whole period. If `"monthly"` is used, you will get one result set for each calendar month in the given period. Or you can have one result set for each N-day period specified by this param. This param is ignored if `time_ranges` is specified. |
| `time_range` | `{'since':YYYY-MM-DD,'until':YYYY-MM-DD}` | A single time range object. UNIX timestamp not supported. This param is ignored if `time_ranges` is provided. |
| `time_ranges` | `list<{'since':YYYY-MM-DD,'until':YYYY-MM-DD}>` | Array of time range objects. Time ranges can overlap, for example to return cumulative insights. Each time range will have one result set. You cannot have more granular results with `time_increment` setting in this case.If `time_ranges` is specified, `date_preset`, `time_range` and `time_increment` are ignored. |
| `use_account_attribution_setting` | `boolean` | **Default value:** `false` | When this parameter is set to `true`, your ads results will be shown using the attribution settings defined for the ad account. |
| `use_unified_attribution_setting` | `boolean` | When this parameter is set to `true`, your ads results will be shown using unified attribution settings defined at ad set level and parameter `use_account_attribution_setting` will be ignored. |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `AdsInsights` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=account_currency`). |
| `account_currency` | `string` | Currency that is used by your ad account. |
| `account_id` | `numeric string` | The ID number of your ad account, which groups your advertising activity. Your ad account includes your campaigns, ads and billing. |
| | **Default** | |
| `account_name` | `string` | The name of your ad account, which groups your advertising activity. Your ad account includes your campaigns, ads and billing. |
| `action_values` | `list<AdsActionStats>` | The total value of all conversions attributed to your ads. |
| `actions` | `list<AdsActionStats>` | The total number of actions people took that are attributed to your ads. Actions may include engagement, clicks or conversions. |
| `activity_recency` | `string` | `activity_recency` |
| `ad_click_actions` | `list<AdsActionStats>` | `ad_click_actions` |
| `ad_format_asset` | `string` | `ad_format_asset` |
| `ad_id` | `numeric string` | The unique ID of the ad you're viewing in reporting. |
| | **Default** | |
| `ad_impression_actions` | `list<AdsActionStats>` | `ad_impression_actions` |
| `ad_name` | `string` | The name of the ad you're viewing in reporting. |
| `adset_id` | `numeric string` | The unique ID of the ad set you're viewing in reporting. An ad set is a group of ads that share the same budget, schedule, delivery optimization and targeting. |
| | **Default** | |
| `adset_name` | `string` | The name of the ad set you're viewing in reporting. An ad set is a group of ads that share the same budget, schedule, delivery optimization and targeting. |
| `anchor_event_attribution_setting` | `string` | anchor event attribution setting |
| `anchor_events_performance_indicator` | `string` | `anchor_events_performance_indicator` |
| `attribution_setting` | `string` | The default attribution window to be used when attribution result is calculated. Each ad set has its own attribution setting value. The attribution setting for campaign or account is calculated based on existing ad sets. |
| `auction_bid` | `numeric string` | `auction_bid` |
| `auction_competitiveness` | `numeric string` | `auction_competitiveness` |
| `auction_max_competitor_bid` | `numeric string` | `auction_max_competitor_bid` |
| `body_asset` | `AdAssetBody` | `body_asset` |
| `buying_type` | `string` | The method by which you pay for and target ads in your campaigns: through dynamic auction bidding, fixed-price bidding, or reach and frequency buying. This field is currently only visible at the campaign level. |
| `campaign_id` | `numeric string` | The unique ID number of the ad campaign you're viewing in reporting. Your campaign contains ad sets and ads. |
| | **Default** | |
| `campaign_name` | `string` | The name of the ad campaign you're viewing in reporting. Your campaign contains ad sets and ads. |
| `canvas_avg_view_percent` | `numeric string` | The average percentage of the Instant Experience that people saw. An Instant Experience is a screen that opens after someone interacts with your ad on a mobile device. It may include a series of interactive or multimedia components, including video, images product catalog and more. |
| `canvas_avg_view_time` | `numeric string` | The average total time, in seconds, that people spent viewing an Instant Experience. An Instant Experience is a screen that opens after someone interacts with your ad on a mobile device. It may include a series of interactive or multimedia components, including video, images product catalog and more. |
| `catalog_segment_actions` | `list<AdsActionStats>` | The number of actions performed attributed to your ads promoting your catalog segment, broken down by action type. |
| `catalog_segment_value` | `list<AdsActionStats>` | The total value of all conversions from your catalog segment attributed to your ads. |
| `catalog_segment_value_mobile_purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from mobile app purchases for your catalog segment. |
| `catalog_segment_value_omni_purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from all purchases for your catalog segment. |
| `catalog_segment_value_website_purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from website purchases for your catalog segment. |
| `clicks` | `numeric string` | The number of clicks on your ads. |
| `coarse_conversion_value` | `string` | Allows advertisers and ad networks to receive directional post-install quality insights when the volume of campaign conversions isn't high enough to meet the privacy threshold needed to unlock the standard conversion value. Possible values of this breakdown are low, medium and high. **Note:** This breakdown is only supported by the `total_postbacks_detailed_v4` field. |
| `comparison_node` | `AdsInsightsComparison` | Parent node that encapsulates fields to be compared (current time range Vs comparison time range) |
| `comscore_market` | `string` | `comscore_market` |
| `conversion_values` | `list<AdsActionStats>` | `conversion_values` |
| `conversions` | `list<AdsActionStats>` | `conversions` |
| `converted_product_app_custom_event_fb_mobile_purchase` | `list<AdsActionStats>` | `converted_product_app_custom_event_fb_mobile_purchase` |
| `converted_product_app_custom_event_fb_mobile_purchase_value` | `list<AdsActionStats>` | `converted_product_app_custom_event_fb_mobile_purchase_value` |
| `converted_product_offline_purchase` | `list<AdsActionStats>` | `converted_product_offline_purchase` |
| `converted_product_offline_purchase_value` | `list<AdsActionStats>` | `converted_product_offline_purchase_value` |
| `converted_product_omni_purchase` | `list<AdsActionStats>` | `converted_product_omni_purchase` |
| `converted_product_omni_purchase_values` | `list<AdsActionStats>` | `converted_product_omni_purchase_values` |
| `converted_product_quantity` | `list<AdsActionStats>` | The number of products purchased which are recorded by your merchant partner's pixel or app SDK for a given product ID and driven by your ads. Has to be used together with converted product ID breakdown. |
| `converted_product_value` | `list<AdsActionStats>` | The value of purchases recorded by your merchant partner's pixel or app SDK for a given product ID and driven by your ads. Has to be used together with converted product ID breakdown. |
| `converted_product_website_pixel_purchase` | `list<AdsActionStats>` | `converted_product_website_pixel_purchase` |
| `converted_product_website_pixel_purchase_value` | `list<AdsActionStats>` | `converted_product_website_pixel_purchase_value` |
| `converted_promoted_product_app_custom_event_fb_mobile_purchase` | `list<AdsActionStats>` | `converted_promoted_product_app_custom_event_fb_mobile_purchase` |
| `converted_promoted_product_app_custom_event_fb_mobile_purchase_value` | `list<AdsActionStats>` | `converted_promoted_product_app_custom_event_fb_mobile_purchase_value` |
| `converted_promoted_product_offline_purchase` | `list<AdsActionStats>` | `converted_promoted_product_offline_purchase` |
| `converted_promoted_product_offline_purchase_value` | `list<AdsActionStats>` | `converted_promoted_product_offline_purchase_value` |
| `converted_promoted_product_omni_purchase` | `list<AdsActionStats>` | `converted_promoted_product_omni_purchase` |
| `converted_promoted_product_omni_purchase_values` | `list<AdsActionStats>` | `converted_promoted_product_omni_purchase_values` |
| `converted_promoted_product_quantity` | `list<AdsActionStats>` | `converted_promoted_product_quantity` |
| `converted_promoted_product_value` | `list<AdsActionStats>` | `converted_promoted_product_value` |
| `converted_promoted_product_website_pixel_purchase` | `list<AdsActionStats>` | `converted_promoted_product_website_pixel_purchase` |
| `converted_promoted_product_website_pixel_purchase_value` | `list<AdsActionStats>` | `converted_promoted_product_website_pixel_purchase_value` |
| `cost_per_15_sec_video_view` | `list<AdsActionStats>` | `cost_per_15_sec_video_view` |
| `cost_per_2_sec_continuous_video_view` | `list<AdsActionStats>` | `cost_per_2_sec_continuous_video_view` |
| `cost_per_action_type` | `list<AdsActionStats>` | The average cost of a relevant action. |
| `cost_per_ad_click` | `list<AdsActionStats>` | `cost_per_ad_click` |
| `cost_per_conversion` | `list<AdsActionStats>` | `cost_per_conversion` |
| `cost_per_dda_countby_convs` | `numeric string` | `cost_per_dda_countby_convs` |
| `cost_per_inline_link_click` | `numeric string` | The average cost of each inline link click. |
| `cost_per_inline_post_engagement` | `numeric string` | The average cost of each inline post engagement. |
| `cost_per_objective_result` | `list<AdsInsightsResult>` | The average cost per objective result from your ads. Objective results are what you're trying to get the most of in your ad campaign, based on the objective you selected. |
| `cost_per_one_thousand_ad_impression` | `list<AdsActionStats>` | `cost_per_one_thousand_ad_impression` |
| `cost_per_outbound_click` | `list<AdsActionStats>` | The average cost for each outbound click. |
| `cost_per_result` | `list<AdsInsightsResult>` | The average cost per result from your ads. |
| `cost_per_thruplay` | `list<AdsActionStats>` | The average cost for each ThruPlay. This metric is in development. |
| `cost_per_unique_action_type` | `list<AdsActionStats>` | The average cost of each unique action. This metric is estimated. |
| `cost_per_unique_click` | `numeric string` | The average cost for each unique click (all). This metric is estimated. |
| `cost_per_unique_conversion` | `list<AdsActionStats>` | `cost_per_unique_conversion` |
| `cost_per_unique_inline_link_click` | `numeric string` | The average cost of each unique inline link click. This metric is estimated. |
| `cost_per_unique_outbound_click` | `list<AdsActionStats>` | The average cost for each unique outbound click. This metric is estimated. |
| `country` | `string` | `country` |
| `cpc` | `numeric string` | The average cost for each click (all). |
| `cpm` | `numeric string` | The average cost for 1,000 impressions. |
| `cpp` | `numeric string` | The average cost to reach 1,000 people. This metric is estimated. |
| `created_time` | `string` | `created_time` |
| `creative_automation_asset_id` | `AdAssetMedia` | `creative_automation_asset_id` |
| `creative_relaxation_asset_type` | `string` | `creative_relaxation_asset_type` |
| `ctr` | `numeric string` | The percentage of times people saw your ad and performed a click (all). |
| `date_start` | `string` | The start date for your data. This is controlled by the date range you've selected for your reporting view. |
| | **Default** | |
| `date_stop` | `string` | The end date for your data. This is controlled by the date range you've selected for your reporting view. |
| | **Default** | |
| `dda_countby_convs` | `numeric string` | `dda_countby_convs` |
| `dda_results` | `list<AdsInsightsDdaResult>` | `dda_results` |
| `description_asset` | `AdAssetDescription` | `description_asset` |
| `device_platform` | `string` | `device_platform` |
| `dma` | `string` | `dma` |
| `fidelity_type` | `string` | To differentiate StoreKit-rendered ads from view-through ads, SKAdNetwork defines a fidelity-type parameter, which you include in the ad signature and receive in the install-validation postback. Use a fidelity-type value of 1 for StoreKit-rendered ads and attributable web ads, and 0 for view-through ads. **Note:** This breakdown is only supported by the `total_postbacks_detailed_v4` field. |
| `flexible_format_asset_type` | `string` | `flexible_format_asset_type` |
| `frequency` | `numeric string` | The average number of times each person saw your ad. This metric is estimated. |
| `frequency_value` | `string` | `frequency_value` |
| `full_view_impressions` | `numeric string` | The number of Full Views on your Page's posts as a result of your ad. |
| `full_view_reach` | `numeric string` | The number of people who performed a Full View on your Page's post as a result of your ad. |
| `gen_ai_asset_type` | `string` | `gen_ai_asset_type` |
| `hourly_stats_aggregated_by_advertiser_time_zone` | `string` | `hourly_stats_aggregated_by_advertiser_time_zone` |
| `hourly_stats_aggregated_by_audience_time_zone` | `string` | `hourly_stats_aggregated_by_audience_time_zone` |
| `hsid` | `string` | The `hsid` key is available for ad impressions that use SKAdNetwork 4 and later. This integer can have up to four digits. You can encode information about your advertisement in each set of digits; you may receive two, three, or all four digits of the `sourceIdentifier` in the first winning postback, depending on the ad impression's postback data tier. **Note:** This breakdown is only supported by the `total_postbacks_detailed_v4` field. |
| `image_asset` | `AdAssetImage` | `image_asset` |
| `impression_device` | `string` | `impression_device` |
| `impressions` | `numeric string` | The number of times your ads were on screen. |
| | **Default** | |
| `inline_link_click_ctr` | `numeric string` | The percentage of time people saw your ads and performed an inline link click. |
| `inline_link_clicks` | `numeric string` | The number of clicks on links to select destinations or experiences, on or off Facebook-owned properties. Inline link clicks use a fixed 1-day-click attribution window. |
| `inline_post_engagement` | `numeric string` | The total number of actions that people take involving your ads. Inline post engagements use a fixed 1-day-click attribution window. |
| `instagram_upcoming_event_reminders_set` | `numeric string` | `instagram_upcoming_event_reminders_set` |
| `instant_experience_clicks_to_open` | `numeric string` | `instant_experience_clicks_to_open` |
| `instant_experience_clicks_to_start` | `numeric string` | `instant_experience_clicks_to_start` |
| `instant_experience_outbound_clicks` | `list<AdsActionStats>` | `instant_experience_outbound_clicks` |
| `interactive_component_tap` | `list<AdsActionStats>` | `interactive_component_tap` |
| `is_auto_advance` | `string` | `is_auto_advance` |
| `landing_page_view_per_link_click` | `numeric string` | `landing_page_view_per_link_click` |
| `marketing_messages_delivered` | `numeric string` | The number of messages your business sent to customers that were delivered. Some messages may not be delivered, such as when a customer's device is out of service. This metric doesn’t include messages delivered to Europe and Japan. In some cases, this metric may be estimated and may differ from what’s shown on your invoice due to small variations in data processing. |
| `marketing_messages_delivery_rate` | `numeric string` | The number of messages delivered divided by the number of messages sent. Some messages may not be delivered, such as when a customer's device is out of service. This metric doesn't include messages sent to Europe and Japan. |
| `marketing_messages_read_rate_benchmark` | `string` | We calculate this metric as the 75th percentile of read rates across similar businesses, representing the percentage of messages read out of total messages delivered. |
| `media_asset` | `AdAssetMedia` | `media_asset` |
| `mobile_app_purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from mobile app purchases. This is based on the value that you assigned when you set up the app event. |
| `multi_event_conversion_attribution_setting` | `string` | multi event conversion attribution setting |
| `objective` | `string` | The objective reflecting the goal you want to achieve with your advertising. It may be different from the selected objective of the campaign in some cases. |
| `objective_result_rate` | `list<AdsInsightsResult>` | The number of objective results you received divided by the number of impressions. |
| `objective_results` | `list<AdsInsightsResult>` | The number of responses you wanted to achieve from your ad campaign, based on the objective you selected. For example, if you selected promote your Page as your campaign objective, this metric shows the number of Page likes that happened as a result of your ads. |
| `optimization_goal` | `string` | The optimization goal you selected for your ad or ad set. Your optimization goal reflects what you want to optimize for the ads. |
| `outbound_clicks` | `list<AdsActionStats>` | The number of clicks on links that take people off Facebook-owned properties. |
| `outbound_clicks_ctr` | `list<AdsActionStats>` | The percentage of times people saw your ad and performed an outbound click. |
| `platform_position` | `string` | `platform_position` |
| `postback_sequence_index` | `string` | Sequence of postbacks received from SkAdNetwork API version 4.0. Possible values of this breakdown are 0 (first postback), 1 (second postback) and 2 (third postback). **Note:** This breakdown is only supported by the `total_postbacks_detailed_v4` field. |
| `product_brand_breakdown` | `string` | `product_brand_breakdown` |
| `product_category_breakdown` | `string` | `product_category_breakdown` |
| `product_custom_label_0_breakdown` | `string` | `product_custom_label_0_breakdown` |
| `product_custom_label_1_breakdown` | `string` | `product_custom_label_1_breakdown` |
| `product_custom_label_2_breakdown` | `string` | `product_custom_label_2_breakdown` |
| `product_custom_label_3_breakdown` | `string` | `product_custom_label_3_breakdown` |
| `product_custom_label_4_breakdown` | `string` | `product_custom_label_4_breakdown` |
| `product_group_content_id_breakdown` | `string` | `product_group_content_id_breakdown` |
| `product_group_retailer_id` | `string` | `product_group_retailer_id` |
| `product_id` | `string` | `product_id` |
| `product_retailer_id` | `string` | `product_retailer_id` |
| `product_set_id_breakdown` | `string` | `product_set_id_breakdown` |
| `product_vendor_id_breakdown` | `string` | product vendor id breakdown |
| `product_views` | `string` | `product_views` |
| `publisher_platform` | `string` | `publisher_platform` |
| `purchase_per_landing_page_view` | `numeric string` | `purchase_per_landing_page_view` |
| `purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from purchases. This is based on information received from one or more of your connected Facebook Business Tools and attributed to your ads. |
| `qualifying_question_qualify_answer_rate` | `numeric string` | `qualifying_question_qualify_answer_rate` |
| `reach` | `numeric string` | The number of people who saw your ads at least once. Reach is different from impressions, which may include multiple views of your ads by the same people. This metric is estimated. |
| `redownload` | `string` | Boolean flag that indicates the customer redownloaded and reinstalled the app when the value is true. A 1 indicates customer has reinstalled the app and 0 indicates that customer hasn’t reinstalled the app **Note:** This breakdown is only supported by the `total_postbacks_detailed_v4` field. |
| `reels_trending_topic` | `string` | `reels_trending_topic` |
| `result_rate` | `list<AdsInsightsResult>` | The percentage of results you received out of all the views of your ads. |
| `result_values_performance_indicator` | `string` | `result_values_performance_indicator` |
| `results` | `list<AdsInsightsResult>` | The number of times your ad achieved an outcome, based
| :--- | :--- | :--- |
| | on the objective and settings you selected. | |
| `rta_ugc_topic` | `string` | `rta_ugc_topic` |
| `rule_asset` | `AdAssetRule` | `rule_asset` |
| `rule_set_id` | `string` | `rule_set_id` |
| `rule_set_name` | `string` | `rule_set_name` |
| `shops_assisted_purchases` | `string` | `shops_assisted_purchases` |
| `skan_version` | `string` | `skan_version` |
| `social_spend` | `numeric string` | The total amount you've spent so far for your ads showed with social information. (ex: Jane Doe likes this). |
| `spend` | `numeric string` | The estimated total amount of money you've spent on your campaign, ad set or ad during its schedule. This metric is estimated. |
| | **Default** | |
| `title_asset` | `AdAssetTitle` | `title_asset` |
| `total_card_view` | `string` | `total_card_view` |
| `updated_time` | `string` | `updated_time` |
| `user_segment_key` | `string` | `user_segment_key` |
| `video_30_sec_watched_actions` | `list<AdsActionStats>` | The number of times your video played for at least 30 seconds, or for nearly its total length if it's shorter than 30 seconds. For each impression of a video, we'll count video views separately and exclude any time spent replaying the video. |
| `video_asset` | `AdAssetVideo` | `video_asset` |
| `video_avg_time_watched_actions` | `list<AdsActionStats>` | The average time a video was played, including any time spent replaying the video for a single impression. |
| `video_continuous_2_sec_watched_actions` | `list<AdsActionStats>` | `video_continuous_2_sec_watched_actions` |
| `video_p100_watched_actions` | `list<AdsActionStats>` | The number of times your video was played at 100% of its length, including plays that skipped to this point. |
| `video_p25_watched_actions` | `list<AdsActionStats>` | The number of times your video was played at 25% of its length, including plays that skipped to this point. |
| `video_p50_watched_actions` | `list<AdsActionStats>` | The number of times your video was played at 50% of its length, including plays that skipped to this point. |
| `video_p75_watched_actions` | `list<AdsActionStats>` | The number of times your video was played at 75% of its length, including plays that skipped to this point. |
| `video_p95_watched_actions` | `list<AdsActionStats>` | The number of times your video was played at 95% of its length, including plays that skipped to this point. |
| `video_play_actions` | `list<AdsActionStats>` | The number of times your video starts to play. This is counted for each impression of a video, and excludes replays. This metric is in development. |
| `video_play_curve_actions` | `list<AdsHistogramStats>` | A video-play based curve graph that illustrates the percentage of video plays that reached a given second. Entries 0 to 14 represent seconds 0 thru 14. Entries 15 to 17 represent second ranges [15 to 20), [20 to 25), and [25 to 30). Entries 18 to 20 represent second ranges [30 to 40), [40 to 50), and [50 to 60). Entry 21 represents plays over 60 seconds. |
| `video_play_retention_0_to_15s_actions` | `list<AdsHistogramStats>` | `video_play_retention_0_to_15s_actions` |
| `video_play_retention_20_to_60s_actions` | `list<AdsHistogramStats>` | `video_play_retention_20_to_60s_actions` |
| `video_play_retention_graph_actions` | `list<AdsHistogramStats>` | `video_play_retention_graph_actions` |
| `video_time_watched_actions` | `list<AdsActionStats>` | `video_time_watched_actions` |
| `website_ctr` | `list<AdsActionStats>` | The percentage of times people saw your ad and performed a link click. |
| `website_purchase_roas` | `list<AdsActionStats>` | The total return on ad spend (ROAS) from website purchases. This is based on the value of all conversions recorded by the Facebook pixel on your website and attributed to your ads. |
| `wish_bid` | `numeric string` | `wish_bid` |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 100 | Invalid parameter |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 613 | Calls to this api have exceeded the rate limit. |
| 2642 | Invalid cursors values |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 190 | Invalid OAuth 2.0 Access Token |
| 2500 | Error parsing graph query |
| 105 | The number of parameters exceeded the maximum for this operation |
| 3001 | Invalid query |

**Creating**

You can make a `POST` request to `insights` edge from the following paths:
*   `/act_{ad_account_id}/insights`

When posting to this edge, an `AdReportRun` will be created.

| Parameters | |
| :--- | :--- |
| `action_attribution_windows` | `list<enum{1d_view, 7d_view, 28d_view, 1d_click, 7d_click, 28d_click, 1d_ev, dda, default, 7d_view_first_conversion, 28d_view_first_conversion, 7d_view_all_conversions, 28d_view_all_conversions, skan_view, skan_click, skan_click_second_postback, skan_view_second_postback, skan_click_third_postback, skan_view_third_postback}>` | **Default value:** `default` | The attribution window for the actions. For example, `28d_click` means the API returns all actions that happened 28 days after someone clicked on the ad. `1d_ev` refers to engaged-view conversions counted when a skippable video ad is played for at least 10 seconds, or for at least 97% of its total length if it’s shorter than 10 seconds, and a person takes an action within 1 day. The default option means `["7d_click","1d_view"]`. |
| `action_breakdowns` | `list<enum{action_device, conversion_destination, matched_persona_id, matched_persona_name, signal_source_bucket, standard_event_content_type, action_canvas_component_name, action_carousel_card_id, action_carousel_card_name, action_destination, action_reaction, action_target_id, action_type, action_video_sound, action_video_type, is_business_ai_assisted}>` | **Default value:** Vec | How to break down action results. Supports more than one breakdowns. Default value is `["action_type"]` **Note:** you must also include `actions` field whenever `action_breakdowns` is specified. |
| `action_report_time` | `enum{impression, conversion, mixed, lifetime}` | Determines the report time of action stats. For example, if a person saw the ad on Jan 1st but converted on Jan 2nd, when you query the API with `action_report_time=impression`, you see a conversion on Jan 1st. When you query the API with `action_report_time=conversion`, you see a conversion on Jan 2nd |
| `breakdowns` | `list<enum{ad_extension_domain, ad_extension_url, ad_format_asset, age, app_id, body_asset, breakdown_ad_objective, breakdown_reporting_ad_id, call_to_action_asset, coarse_conversion_value, comscore_market, country, creative_automation_asset_id, creative_relaxation_asset_type, crm_advertiser_l12_territory_ids, crm_advertiser_subvertical_id, crm_advertiser_vertical_id, crm_ult_advertiser_id, description_asset, fidelity_type, flexible_format_asset_type, gen_ai_asset_type, gender, hsid, image_asset, impression_device, is_auto_advance, is_conversion_id_modeled, is_rendered_as_delayed_skip_ad, landing_destination, link_url_asset, mdsa_landing_destination, media_asset_url, media_creator, media_destination_url, media_format, media_origin_url, media_text_content, media_type, postback_sequence_index, product_brand_breakdown, product_category_breakdown, product_custom_label_0_breakdown, product_custom_label_1_breakdown, product_custom_label_2_breakdown, product_custom_label_3_breakdown, product_custom_label_4_breakdown, product_group_content_id_breakdown, product_group_id, product_id, product_set_id_breakdown, product_vendor_id_breakdown, redownload, region, rta_ugc_topic, skan_campaign_id, skan_conversion_id, skan_version, sot_attribution_model_type, sot_attribution_window, sot_channel, sot_event_type, sot_source, title_asset, user_persona_id, user_persona_name, video_asset, rule_set_id, rule_set_name, dma, frequency_value, hourly_stats_aggregated_by_advertiser_time_zone, hourly_stats_aggregated_by_audience_time_zone, mmm, place_page_id, publisher_platform, platform_position, device_platform, standard_event_content_type, conversion_destination, signal_source_bucket, reels_trending_topic, marketing_messages_btn_name, impression_view_time_advertiser_hour_v2}>` | How to break down the result. For more than one breakdown, only certain combinations are available: See "Combining Breakdowns" in the [Breakdowns page](#insights-api-breakdowns). The option `impression_device` cannot be used by itself |
| `date_preset` | `enum{today, yesterday, this_month, last_month, this_quarter, maximum, data_maximum, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, last_week_mon_sun, last_week_sun_sat, last_quarter, last_year, this_week_mon_today, this_week_sun_today, this_year}` | **Default value:** `last_30d` | Represents a relative time range. This field is ignored if `time_range` or `time_ranges` is specified |
| `default_summary` | `boolean` | **Default value:** `false` | Determine whether to return a summary. If `summary` is set, this param is ignored; otherwise, a summary section with the same fields as specified by `fields` is included in the `summary` section |
| `export_columns` | `list<string>` | Select fields on the exporting report file. It is an optional param. Exporting columns are equal to the param `fields` if you leave this param blank |
| `export_format` | `string` | Set the format of exporting report file. If the `export_format` is set, Report file is asyncrhonizely generated. It expects `["xls", "csv"]`. |
| `export_name` | `string` | Set the file name of the exporting report. |
| `fields` | `list<string>` | Fields to be retrieved. Default behavior is to return a list of most used fields |
| `filtering` | `list<Filter Object>` | **Default value:** Vec | Filters on the report data. This parameter is an array of filter objects |
| `graph_cache` | `boolean` | **Default value:** `true` | \[internal use only] This param controls whether the the Graph API level cache should be used for insights endpoint |
| `level` | `enum {ad, adset, campaign, account}` | Represents the level of result |
| `limit` | `integer` | `limit` |
| `product_id_limit` | `integer` | Maximum number of product ids to be returned for each ad when breakdown by `product_id`. |
| `sort` | `list<string>` | **Default value:** Vec | Field to sort the result, and direction of sorting. You can specify sorting direction by appending "\_ascending" or "\_descending" to the sort field. For example, `"reach_descending"`. For actions, you can sort by action type in form of `"actions:<action_type>"`. For example, `["actions:link_click_ascending"]`. This array supports no more than one element. By default, the sorting direction is ascending |
| `summary` | `list<string>` | If this param is used, a summary section is included, with the fields listed in this param |
| `summary_action_breakdowns` | `list<enum{action_device, conversion_destination, matched_persona_id, matched_persona_name, signal_source_bucket, standard_event_content_type, action_canvas_component_name, action_carousel_card_id, action_carousel_card_name, action_destination, action_reaction, action_target_id, action_type, action_video_sound, action_video_type, is_business_ai_assisted}>` | **Default value:** Vec | Similar to `action_breakdowns`, but applies to `summary`. Default value is `["action_type"]` |
| `time_increment` | `enum{monthly, all_days}` or `integer` | **Default value:** `all_days` | If it is an integer, it is the number of days from 1 to 90. After you pick a reporting period by using `time_range` or `date_preset`, you may choose to have the results for the whole period, or have results for smaller time slices. If `"all_days"` is used, it means one result set for the whole period. If `"monthly"` is used, you get one result set for each calendar month in the given period. Or you can have one result set for each N-day period specified by this param. This param is ignored if `time_ranges` is specified |
| `time_range` | `{'since':YYYY-MM-DD,'until':YYYY-MM-DD}` | A single time range object. UNIX timestamp not supported. This param is ignored if `time_ranges` is provided |
| `time_ranges` | `list<{'since':YYYY-MM-DD,'until':YYYY-MM-DD}>` | Array of time range objects. Time ranges can overlap, for example to return cumulative insights. Each time range has one result set. You cannot have more granular results with `time_increment` setting in this case.If `time_ranges` is specified, `date_preset`, `time_range` and `time_increment` are ignored |
| `use_account_attribution_setting` | `boolean` | **Default value:** `false` | When this parameter is set to `true`, your ads results are shown using the attribution settings defined for the ad account |
| `use_unified_attribution_setting` | `boolean` | When this parameter is set to `true`, your ads results will be shown using unified attribution settings defined at ad set level and parameter `use_account_attribution_setting` will be ignored. **Note:** Please set this to `true` to get the same behavior as in the Ads Manager. |

| Return Type | |
| :--- | :--- |
| `Struct {report_run_id: numeric string, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 190 | Invalid OAuth 2.0 Access Token |
| 3018 | The start date of the time range cannot be beyond 37 months from the current date |
| 200 | Permissions error |
| 2500 | Error parsing graph query |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Instagram Accounts

**Reading**

Retrieve instagram accounts associated with this Ad Account

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/{ad-account-id}/instagram_accounts HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {},    "summary": {} }` | |
| `data` | A list of `IGUser` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |
| `summary` | Aggregated information about the edge, such as counts. Specify the fields to fetch in the `summary` param (like `summary=total_count`). |
| `total_count` | `int32` | Total number of objects on this edge |
| | **Default** | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 200 | Permissions error |
| 190 | Invalid OAuth 2.0 Access Token |
| 80002 | There have been too many calls to this Instagram account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting. |
| 2635 | You are calling a deprecated version of the Ads API. Please update to the latest version. |
| 100 | Invalid parameter |
| 80004 | There have been too many calls to this ad-account. Wait a bit and try again. For more info, please refer to https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management. |

**Creating**

You can't perform this operation on this endpoint.

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

# Ad Account Tracking

**Reading**

`AdAccountTracking`

| Example | |
| :--- | :--- |
| HTTP | `GET /v24.0/{ad-account-id}/tracking HTTP/1.1
Host: graph.facebook.com` |

If you want to learn how to use the Graph API, read our [Using Graph API](https://developers.facebook.com/docs/graph-api/overview) guide.

| Parameters | |
| :--- | :--- |
| This endpoint doesn't have any parameters. | |

| Fields | |
| :--- | :--- |
| Reading from this edge will return a JSON formatted result: | |
| ` {    "data": [],    "paging": {} }` | |
| `data` | A list of `AdAccountTrackingData` nodes. |
| `paging` | For more details about pagination, see the [Graph API guide](#paginated-results). |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |
| 200 | Permissions error |

**Creating**

You can make a `POST` request to `tracking` edge from the following paths:
*   `/act_{ad_account_id}/tracking`

When posting to this edge, no Graph object will be created.

| Parameters | |
| :--- | :--- |
| `tracking_specs` | `Object` | Tracking specs to add to the account level |
| | **Required** | |

| Return Type | |
| :--- | :--- |
| This endpoint supports read-after-write and will read the node to which you POSTed. | |
| `Struct {success: bool, }` | |

| Error Codes | |
| :--- | :--- |
| **Error** | **Description** |
| 100 | Invalid parameter |

**Updating**

You can't perform this operation on this endpoint.

**Deleting**

You can't perform this operation on this endpoint.

````
