<\!-- Source: META-ADS-API-GUIDE.md, Lines 11285-12618 -->

# Insights API

Provides a single, consistent interface to retrieve ad statistics.

- [Breakdowns](#insights-api-breakdowns) - Group results
- [Action Breakdowns](https://developers.facebook.com/docs/marketing-api/insights/action-breakdowns) - Understanding the response from action breakdowns.
- [Async Jobs](#insights-api-asynchronous-jobs) - For requests with large results, use asynchronous jobs
- [Limits and Best Practices](#limits-and-best-practices) - Call limits, filtering and best practices.

Before you can get data on your ad's performance, you should set up your ads to track the metrics you are interested in. For that, you can use [URL Tags](https://developers.facebook.com/docs/marketing-api/guides/ads-for-testing#url), [Meta Pixel](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/pixel-setup-guide), and the [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api).

## Before you begin

You will need:

- The `ads_read` permission.
- An app. See [Meta App Development](https://developers.facebook.com/docs/development) for more information.

## Campaign Statistics

To get the statistics of a campaign's last 7 day performance:

```curl
curl -G \
  -d "date_preset=last_7d" \
  -d "access_token=ACCESS_TOKEN" \
  "https://graph.facebook.com/API_VERSION/AD_CAMPAIGN_ID/insights"
```

To learn more, see the [Ad Insights Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-insights).

## Making Calls

The Insights API is available as an edge on any ads object.

| API Method                     |     |
| :----------------------------- | :-- |
| `act_<AD_ACCOUNT_ID>/insights` |     |
| `<CAMPAIGN_ID>/insights`       |     |
| `<ADSET_ID>/insights`          |     |
| `<AD_ID>/insights`             |     |

- **Request**

  You can request specific fields with a comma-separated list in the `fields` parameters. For example:

  ```curl
  curl -G \-d "fields=impressions" \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/<AD_ID>/insights"
      
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "impressions": "2466376",
        "date_start": "2009-03-28",
        "date_stop": "2016-04-01"
      }
    ],
    "paging": {
      "cursors": {
        "before": "MAZDZD",
        "after": "MAZDZD"
      }
    }}
  ```

## Levels

Aggregate results at a defined object level. This automatically deduplicates data.

- **Request**

  For example, get a campaign's insights on ad level.

  ```curl
  curl -G \-d "level=ad" \-d "fields=impressions,ad_id" \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/CAMPAIGN_ID/insights"
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "impressions": "9708",
        "ad_id": "6142546123068",
        "date_start": "2009-03-28",
        "date_stop": "2016-04-01"
      },
      {
        "impressions": "18841",
        "ad_id": "6142546117828",
        "date_start": "2009-03-28",
        "date_stop": "2016-04-01"
      }
    ],
    "paging": {
      "cursors": {
        "before": "MAZDZD",
        "after": "MQZDZD"
      }
    }}
  ```

If you don't have access to all ad objects at the requested level, the insights call returns no data. For example, while requesting insights with level set to `ad`, if you don't have access to one or more ad objects under the ad account, this API call will return a permission error.

## Attribution windows

The conversion attribution window provides timeframes that define when we attribute an event to an ad on a Meta app. For background information, see [Meta Business Help Center, About attribution windows](https://www.facebook.com/business/help/330543667106622). We measure the actions that occur when a conversion event occurs and look back in time 1-day and 7-days. To view actions attributed to different attribution windows, make a request to `/{ad-account-id}/insights`. If you do not provide `action_attribution_windows` we use 7d_click and provide it under `value`.

For example specify `action_attribution_windows` and 'value' is fixed at 7d_click attribution window. Make a request to `act_10151816772662695/insights?action_attribution_windows=['1d_click','1d_view']` and get this result:

`"spend": 2352.45,"actions": [{"action_type": "link_click","value": 6608,"1d_view": 86,"1d_click": 6510},"cost_per_action_type": [{"action_type": "link_click","value": 0.35600030266344,"1d_view": 27.354069767442,"1d_click": 0.36135944700461},// if attribution window is _not_ specified in query. And note that the number under 'value' key is the same even if attribution window is specified.// act_10151816772662695/insights"spend": 2352.45,"actions": [{"action_type": "link_click","value": 6608},"cost_per_action_type": [{"action_type": "link_click","value": 0.35600030266344},`

## Field Expansion

Request fields at the node level and by fields specified in field expansion.

- **Request**

  ```curl
  curl -G \-d "fields=insights{impressions}" \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/AD_ID"
  ```

- **Response**

      ```json
      {

    "id": "6042542123268",
    "name": "My Website Clicks Ad",
    "insights": {
      "data": [
        {
          "impressions": "9708",
          "date_start": "2016-03-06",
          "date_stop": "2016-04-01"
        }
      ],
      "paging": {
        "cursors": {
          "before": "MAZDZD",
          "after": "MAZDZD"
        }
      }
    }}
  ```

## Sorting

Sort results by providing the `sort` parameter with `{fieldname}_descending` or `{fieldname}_ascending`:

- **Request**

  ```curl
  curl -G \-d "sort=reach_descending" \-d "level=ad" \-d "fields=reach" \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/AD_SET_ID/insights"
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "reach": 10742,
        "date_start": "2009-03-28",
        "date_stop": "2016-04-01"
      },
      {
        "reach": 5630,
        "date_start": "2009-03-28",
        "date_stop": "2016-04-03"
      },
      {
        "reach": 3231,
        "date_start": "2009-03-28",
        "date_stop": "2016-04-02"
      },
      {
        "reach": 936,
        "date_start": "2009-03-29",
        "date_stop": "2016-04-02"
      }
    ],
    "paging": {
      "cursors": {
        "before": "MAZDZD",
        "after": "MQZDZD"
      }
    }}
  ```

## Ads Labels

Stats for all labels whose names are identical. Aggregated into a single value at an ad object level. See the [Ads Labels Reference](https://developers.facebook.com/docs/marketing-api/adlabels/reference) for more information.

- **Request**

  ```curl
  curl -G \  -d "fields=id,name,insights{unique_clicks,cpm,total_actions}" \-d "level=ad" \-d 'filtering=[{"field":"ad.adlabels","operator":"ANY", "value":["Label Name"]}]'  \-d 'time_range={"since":"2015-03-01","until":"2015-03-31"}' \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/AD_OBJECT_ID/insights"
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "unique_clicks": 74,
        "cpm": 0.81081081081081,
        "total_actions": 49,
        "date_start": "2015-03-01",
        "date_stop": "2015-03-31",
      },
    ], 
    "paging": {
      "cursors": {
        "before": "MA==",
        "after": "MA==",
      }
    }}
  ```

## Clicks definition

To better understand the click metrics that Meta offers today, please read the definitions and usage of each below:

- **Link Clicks, `actions:link_click`** - The number of clicks on ad links to select destinations or experiences, on or off Meta-owned properties. See [Ads Help Center, Link Clicks](https://www.facebook.com/business/help/1183756771694200)

- **Clicks (All), `clicks`** - The metric counts multiple types of clicks on your ad, including certain types of interactions with the ad container, links to other destinations, and links to expanded ad experiences. See [Ads Help Center, Clicks(All)](https://www.facebook.com/business/help/1458994504153036)

## Deleted and Archived Objects

Ad units may be `DELETED` or `ARCHIVED`. The stats of deleted or archived objects appear when you query their parents. This means if you query impressions at the ad set level, results include impressions from all ads in the set it, regardless of whether the the ads are in a deleted or archived state. See also, [Storing and Retrieving Ad Objects Best Practice](#object-archive-and-delete-status).

However, if you query using `filtering`, status filtering will be applied by default to return only Active objects. As a result, the total stats of the parent node may be greater than the stats of its children.

You can get the stats of `ARCHIVED` objects from their parent nodes though, by providing an extra filtering parameter.

- **Request**

  To get the stats of all `ARCHIVED` ads in an ad account listed one by one:

  ```curl
  curl -G \
    -d "level=ad" \
    -d "filtering=[{'field':'ad.effective_status','operator':'IN','value':['ARCHIVED']}]" \
    -d "access_token=<ACCESS_TOKEN>" \
    "https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights/"
  ```

- **Response**

      Note that only archived objects are returned in this response.

      ```json
      {

    "data": [
      {
        "impressions": "1741",
        "date_start": "2016-03-11",
        "date_stop": "2016-03-12"
      }
    ],
    "paging": {
      "cursors": {
        "before": "MAZDZD",
        "after": "MAZDZD"
      }
    }}
  ```

**Deleted Objects Insights**

You can query insights on deleted objects if you have their IDs or by using the `ad.effective_status` filter.

- **Request**

  For example, if you have the ad set ID:

  ```curl
  curl -G \-d "fields=id,name,status,insights{impressions}" \-d "access_token=ACCESS_TOKEN" \"https://graph.facebook.com/v24.0/AD_SET_ID"
      
  ```

  In this example, we query with `ad.effective_status`:

  `POST https://graph.facebook.com/<VERSION>/act_ID/insights?access_token=token&appsecret_proof=proof&fields=ad_id,impressions&date_preset=lifetime&level=ad&filtering=[{"field":"ad.effective_status","operator":"IN","value":["DELETED"]}]`

- **Response**

      ```json
      {

    "id": "6042147342661",
    "name": "My Like Campaign",
    "status": "DELETED",
    "insights": {
      "data": [
        {
          "impressions": "1741",
          "date_start": "2016-03-11",
          "date_stop": "2016-03-12"
        }
      ],
      "paging": {
        "cursors": {
          "before": "MAZDZD",
          "after": "MAZDZD"
        }
      }
    }}
  ```

## Troubleshooting

**Timeouts**

The most common issues causing failure at this endpoint are too many requests and time outs:

- On `/GET` or synchronous requests, you can get out-of-memory or timeout errors.
- On `/POST` or asynchronous requests, you can possibly get timeout errors. For asynchronous requests, it can take up to an hour to complete a request including retry attempts. For example if you make a query that tries to fetch large volume of data for many ad level objects.

**Recommendations**

- There is no explicit limit for when a query will fail. When it times out, try to break down the query into smaller queries by putting in filters like date range.
- Unique metrics are time consuming to compute. Try to query unique metrics in a separate call to improve performance of non-unique metrics.

**Rate Limiting**

The Meta Insights API utilizes rate limiting to ensure an optimal reporting experience for all of our partners. For more information and suggestions, see our [Insights API Limits & Best Practices](#limits-and-best-practices).

**Discrepancy with Ads Manager**

Beginning June 10, 2025, to reduce discrepancies with Meta Ads Manager, `use_unified_attribution_setting` and `action_report_time` parameters will be disregarded and API responses will mimic Ads Manager settings:

- Attributed values will be based on Ad-Set-level attribution settings (similar to `use_unified_attribution_setting=true`), and inline/on-ad actions will be included in 1d_click or 1d_view attribution window data. After this change, standalone inline attribution window data will no longer be returned.
- Actions will be reported using `action_report_time=mixed`: on-Meta actions (like Link Clicks) will use impression-based reporting time; whereas off-Meta actions (like Web Purchases) will leverage conversion-based reporting time.

The default behavior of the API is different from the default behavior in Ads Manager. If you would like to observe the same behavior as in Ads Manager, please set the field `use_unified_attribution_setting` to `true`.

## Learn More

- [Ad Account Insights](https://developers.facebook.com/docs/marketing-api/reference/ad-account-insights)
- [Ad Campaign Insights](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-insights)
- [Ad Set Insights](https://developers.facebook.com/docs/marketing-api/reference/ad-set-insights)
- [Ad Insights](https://developers.facebook.com/docs/marketing-api/reference/ad-insights)

Any endpoints not in the above list are not covered in this API. If you plan to include reports from Meta in your solution, see [Meta Platform Terms and Developer Policies for Marketing API](https://developers.facebook.com/policy).

# Insights API Breakdowns

You can group the Insights API results into different sets using breakdowns.

The Insights API can return several metrics that are estimated, in development, or both. Insights breakdown values are estimated. For more information, see [Insights API, Estimated and Deprecated Metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated).

## Limitations

**Unavailable fields**

The following fields cannot be requested when specifying a breakdown:

- `app_store_clicks`
- `newsfeed_avg_position`
- `newsfeed_clicks`
- `relevance_score`
- `newsfeed_impressions`

**Restrictions for Off-Meta Action Metrics**

The following breakdowns will no longer be available for off-Meta action metrics.

| Type 1                                            |     |
| :------------------------------------------------ | :-- |
| `region`                                          |     |
| `dma`                                             |     |
| `hourly_stats_aggregated_by_audience_time_zone`   |     |
| `hourly_stats_aggregated_by_advertiser_time_zone` |     |

| Type 2                                                |     |
| :---------------------------------------------------- | :-- |
| `action_device`                                       |     |
| `action_destination`                                  |     |
| `action_target_id`                                    |     |
| `product_id`                                          |     |
| `action_carousel_card_id`/`action_carousel_card_name` |     |
| `action_canvas_component_name`                        |     |

Rules related to queries containing above breakdowns:

- **Type 1** — The Insights API will not return unsupported offsite metrics (e.g., `actions` metric with Type 1 breakdowns).
- **Type 2** — Offsite web metrics will continue to be returned from the API, however will not contain the breakdown value. The mobile metrics will not be returned anymore when queried with these breakdowns.

**Note:** The breakdowns listed above will still be supported for on-Meta metrics such as impressions, link clicks, etc. The changes will also not impact historical data prior to April 27, 2021; breakdowns for historical data will continue to be available.

**Action Metrics**

Metrics will not be available under the following scenarios:

- When there is an attempted aggregation across multiple attribution settings
- When requested with impacted breakdowns (this restriction only applies for off-Meta & action types).

**Note:** Metrics will be available if querying with `action_attribution_windows=1d_click,7d_click,1d_view,incrementality` (not including the default window).

## Generic Breakdowns

The following breakdowns are available.

| Breakdown                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| :------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action_device`                                   | The device on which the conversion event you're tracking occurred. For example, \"Desktop\" if someone converted on a desktop computer.                                                                                                                                                                                                                                                                         |
| `action_canvas_component_name`                    | Name of a component within a Canvas ad.                                                                                                                                                                                                                                                                                                                                                                         |
| `action_carousel_card_id`                         | The ID of the specific carousel card that people engaged with when they saw your ad.                                                                                                                                                                                                                                                                                                                            |
| `action_carousel_card_name`                       | The specific carousel card that people engaged with when they saw your ad. The cards are identified by their headlines.                                                                                                                                                                                                                                                                                         |
| `action_destination`                              | The destination where people go after clicking on your ad. This could be your Facebook Page, an external URL for your conversion pixel or an app configured with the software development kit (SDK).                                                                                                                                                                                                            |
| `action_reaction`                                 | The number of reactions on your ads or boosted posts. The reactions button on an ad allows people to share different reactions on its content: Like, Love, Haha, Wow, Sad or Angry.                                                                                                                                                                                                                             |
| `action_target_id`                                | The ID of destination where people go after clicking on your ad. This could be your Facebook Page, an external URL for your conversion pixel or an app configured with the software development kit (SDK).                                                                                                                                                                                                      |
| `action_type`                                     | The kind of actions taken on your ad, Page, app or event after your ad was served to someone, even if they didn't click on it. Action types include Page likes, app installs, conversions, event responses, and more.                                                                                                                                                                                           |
| `action_video_sound`                              | The sound status (on/off) when someone plays your video ad.                                                                                                                                                                                                                                                                                                                                                     |
| `action_video_type`                               | Video metrics breakdown.                                                                                                                                                                                                                                                                                                                                                                                        |
| `ad_format_asset`                                 | The ID of the ad format asset involved in impression, click, or action                                                                                                                                                                                                                                                                                                                                          |
| `age`                                             | The age range of the people you've reached.                                                                                                                                                                                                                                                                                                                                                                     |
| `app_id`                                          | The ID of the application associated with the ad account or campaign requested. The application information, including its ID, is viewable in the App Dashboard.                                                                                                                                                                                                                                                |
|                                                   | This breakdown is only supported by the `total_postbacks` field.                                                                                                                                                                                                                                                                                                                                                |
| `body_asset`                                      | The ID of the body asset involved in impression, click, or action.                                                                                                                                                                                                                                                                                                                                              |
| `call_to_action_asset`                            | The ID of the call to action asset involved in impression, click, or action.                                                                                                                                                                                                                                                                                                                                    |
| `country`                                         | The country where the people you've reached are located. This is based on information, such as a person's hometown, their current city, and the geographical location where they tend to be when they visit Meta.                                                                                                                                                                                               |
| `description_asset`                               | The ID of the description asset involved in impression, click, or action.                                                                                                                                                                                                                                                                                                                                       |
| `device_platform`                                 | The type of device, mobile or desktop, used by people when they viewed or clicked on an ad, as shown in ads reporting.                                                                                                                                                                                                                                                                                          |
| `dma`                                             | The Designated Market Area (DMA) regions are the 210 geographic areas in the United States in which local television viewing is measured by The Nielsen Company.                                                                                                                                                                                                                                                |
| `frequency_value`                                 | The number of times an ad in your Reach and Frequency campaign was served to each Accounts Center account.                                                                                                                                                                                                                                                                                                      |
| `gender`                                          | Gender of people you've reached. People who don't list their gender are shown as 'not specified'.                                                                                                                                                                                                                                                                                                               |
| `hourly_stats_aggregated_by_advertiser_time_zone` | Hourly breakdown aggregated by the time ads were delivered in the advertiser's time zone. For example, if your ads are scheduled to run from 9 AM to 11 AM, but they reach audiences in multiple time zones, they may deliver from 9 AM to 1 PM in the advertiser's time zone. Stats will be aggregated into four groups 9 AM - 10 AM, 10 AM - 11 AM, 11 AM - 12 PM, and 12 PM - 1 PM.                          |
| `hourly_stats_aggregated_by_audience_time_zone`   | Hourly breakdown aggregated by the time ads were delivered in the audiences' time zone. For example, if your ads are scheduled to run from 9:00 am to 11:00 am, but they reach audiences in multiple time zones, they may deliver from 9:00 am to 1:00 pm in the advertiser's time zone. Stats are aggregated into 2 groups: 9:00 am to 10:00 am and 10:00 am to 11:00 am.                                      |
| `image_asset`                                     | The ID of the image asset involved in impression, click, or action.                                                                                                                                                                                                                                                                                                                                             |
| `impression_device`                               | The device where your last ad was served to someone on Meta. For example \"iPhone\" if someone viewed your ad on an iPhone.                                                                                                                                                                                                                                                                                     |
| `is_conversion_id_modeled`                        | A boolean flag that indicates whether the conversion_bits are modeled. A 0 indicates conversion_bits aren't modeled, and a 1 indicates that conversion_bits are modeled.                                                                                                                                                                                                                                        |
|                                                   | This breakdown is only supported by the `total_postbacks_detailed` field.                                                                                                                                                                                                                                                                                                                                       |
| `link_url_asset`                                  | The ID of the URL asset involved in impression, click or action.                                                                                                                                                                                                                                                                                                                                                |
| `place_page_id`                                   | The ID of the place page involved in impression or click.                                                                                                                                                                                                                                                                                                                                                       |
|                                                   | Account-level insights and `page_place_id` are not compatible with each other, so they cannot be queried together.                                                                                                                                                                                                                                                                                              |
| `platform_position`                               | Where your ad was shown within a platform, for example on Facebook desktop Feed, or Instagram Mobile Feed.                                                                                                                                                                                                                                                                                                      |
| `product_id`                                      | The ID of the product involved in impression, click, or action.                                                                                                                                                                                                                                                                                                                                                 |
| `publisher_platform`                              | Which platform your ad was shown, for example on Facebook, Instagram, or Audience Network.                                                                                                                                                                                                                                                                                                                      |
| `region`                                          | The regions where the people you've reached are located. This is based on information such as a person's hometown, their current city and the geographical location where they tend to be when they visit Facebook.                                                                                                                                                                                             |
| `skan_campaign_id`                                | The raw campaign ID received as a part of Skan postback from iOS 15+.                                                                                                                                                                                                                                                                                                                                           |
|                                                   | Note: This breakdown is only supported by the `total_postbacks_detailed` field.                                                                                                                                                                                                                                                                                                                                 |
| `skan_conversion_id`                              | The assigned Conversion ID (also referred to as Priority ID) of the event and/or event bundle configured in the application’s SKAdNetwork configuration schema. The app events configuration can be viewed and adjusted in Meta Events Manager. You can learn more about configuring your app events for Apple's SKAdNetwork [here](https://developers.facebook.com/docs/app-events/skadnetwork#configuration). |
|                                                   | Note: This breakdown is only supported by the `total_postbacks` field.                                                                                                                                                                                                                                                                                                                                          |
| `title_asset`                                     | The ID of the title asset involved in impression, click or action.                                                                                                                                                                                                                                                                                                                                              |
| `user_segment_key`                                | User segment (ex: new, existing) of Advantage+ Shopping Campaigns (ASC). Existing user is specified by the custom audience in ASC settings.                                                                                                                                                                                                                                                                     |
| `video_asset`                                     | The ID of the video asset involved in impression, click or action.                                                                                                                                                                                                                                                                                                                                              |

**Notes**

- Filtering `app_id` and `skan_conversion_id` using the `filtering` field is currently not supported.
- The `dma` breakdown is not available for the `estimated_ad_recall_rate` metric or `video_thruplay_watched_actions` metric.
- The `dma` breakdown employs a sampling methodology to compute unique metrics like reach. In instances where there are a large number of DMA regions with comparatively low volumes, they might not be represented in the sample or could be scaled up to a power of 2. Therefore, it's advisable to query the corresponding impressions as well for enhanced accuracy.
- `frequency_value` is used with `reach` only. For example, how frequently a unique user saw an ad.
- By design, `image_asset` and `video_asset` breakdowns are not available at the ad account level for assets used in Dynamic Creative.
- Ad actions `video_p25_watched_actions`, `video_p50_watched_actions`, `video_p75_watched_actions`, `video_p95_watched_actions`, and `video_p100_watched_actions` do not support `region` breakdown.
- All Dynamic Creative asset breakdowns only support a limited set of metrics:

| Dynamic Creative Breakdowns | Supported metrics for Dynamic Creative Breakdowns |
| :-------------------------- | :------------------------------------------------ |
| `ad_format_asset`           | `impressions`                                     |
| `body_asset`                | `clicks`                                          |
| `call_to_action_asset`      | `spend`                                           |
| `description_asset`         | `reach`                                           |
| `image_asset`               | `actions`                                         |
| `link_url_asset`            | `action_values`                                   |
| `title_asset`               |                                                   |
| `video_asset`               |                                                   |

The following call groups the results by age and gender.

**cURL**

```curl
curl -G \
  -d "breakdowns=age,gender" \
  -d "fields=impressions" \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/<API_VERSION>/<AD_CAMPAIGN_ID>/insights"
```

**Show Response**

```json
{
  "data": [
    {
      "impressions": "304",
      "date_start": "2015-08-01",
      "date_stop": "2015-08-01",
      "age": "18-24",
      "gender": "male"
    },
    {
      "impressions": "100",
      "date_start": "2015-08-01",
      "date_stop": "2015-08-01",
      "age": "25-34",
      "gender": "male"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MQZDZD"
    }
  }
}
```

## Hourly Breakdowns

Hourly stats are now an available breakdown using the following breakdowns:

- `hourly_stats_aggregated_by_advertiser_time_zone`
- `hourly_stats_aggregated_by_audience_time_zone`

See [Combining Breakdowns](#combining-breakdowns) for limits on number of breakdowns you may request with the hourly breakdown. Hourly breakdowns do not support unique fields, which are any fields prepended with `unique_*`, `reach` or `frequency`. `reach` and `frequency` fields will return 0 when hourly breakdowns are in use.

**cURL**

```curl
curl -G \-d "fields=impressions" \-d "breakdowns=hourly_stats_aggregated_by_audience_time_zone" \-d "access_token=<ACCESS_TOKEN>" \"https://graph.facebook.com/<API_VERSION>/<AD_CAMPAIGN_ID>/insights"
```

**Show Response**

```json
{
  "data": [
    {
      "impressions": "1883",
      "date_start": "2015-08-01 00:00:00",
      "date_stop": "2015-08-01 01:00:00"
    },
    {
      "impressions": "1883",
      "date_start": "2015-08-01 01:00:00",
      "date_stop": "2015-08-01 02:00:00"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MQZDZD"
    }
  }
}
```

## Action Breakdown

Group results in the `actions` field. You can use the following breakdowns for `action_breakdowns`:

The following are the possible breakdowns that can be supplied into the `action_breakdowns` field.

- `action_device`
- `conversion_destination`
- `matched_persona_id`
- `matched_persona_name`
- `signal_source_bucket`
- `standard_event_content_type`
- `action_canvas_component_name`
- `action_carousel_card_id`
- `action_carousel_card_name`
- `action_destination`
- `action_reaction`
- `action_target_id`
- `action_type`
- `action_video_sound`
- `action_video_type`
- `is_business_ai_assisted`

If `action_breakdowns` parameter is not specified, `action_type` is implicitly added as the `action_breakdowns`.

**Total Count in `actions`**

The total count (sum) of all values returned in group results (`actions`).

This result may not equal `total_actions` since fields returned in `actions` are hierarchical and include detailed actions not counted.

|                                                       |     |
| :---------------------------------------------------- | :-- |
| `total_actions` - 33                                  |     |
|     `page_engagement` - 10                            |     |
|         `post_engagement` - 10                        |     |
|             `link_click` - 2                          |     |
|             `comment` - 3                             |     |
|             `post_reaction` - 3                       |     |
|             `like` - 2                                |     |
|     `mobile_app_install` - 12                         |     |
|     `app_custom_event` - 11                           |     |
|         `app_custom_event.fb_mobile_activate_app` - 6 |     |
|         `app_custom_event.other` - 5                  |     |

In this example, `post_engagement` is a sum of `link_click`, `comment`, `like`, and `post_reaction`, where `post_reaction` is the count of all reactions, including likes. The `total_actions` field represents a sum of top-level actions for an object, such as `page_engagement`, `mobile_app_install`, and `app_custom_event`.

## Combining Breakdowns

Due to storage constraints, only some permutations of breakdowns are available. Permutations marked with an asterisk (\*) can be joined with `action_type`, `action_target_id` and `action_destination` which is the name for `action_target_id`.

| Permutation                                                                       |                                                     |
| :-------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `action_converted_product_id`                                                     | - Under limited availability for Collaborative Ads. |
| `action_type`\*                                                                   |                                                     |
| `action_type`, `action_converted_product_id`                                      | - Under limited availability for Collaborative Ads. |
| `action_target_id`\*                                                              |                                                     |
| `action_device`\*                                                                 |                                                     |
| `action_device`, `impression_device`\*                                            |                                                     |
| `action_device`, `publisher_platform`\*                                           |                                                     |
| `action_device`, `publisher_platform`, `impression_device`\*                      |                                                     |
| `action_device`, `publisher_platform`, `platform_position`\*                      |                                                     |
| `action_device`, `publisher_platform`, `platform_position`, `impression_device`\* |                                                     |
| `action_reaction`                                                                 |                                                     |
| `action_type`, `action_reaction`                                                  |                                                     |
| `age`\*                                                                           |                                                     |
| `gender`\*                                                                        |                                                     |
| `age`, `gender`\*                                                                 |                                                     |
| `app_id`, `skan_conversion_id`                                                    |                                                     |
| `country`\*                                                                       |                                                     |
| `region`\*                                                                        |                                                     |
| `publisher_platform`\*                                                            |                                                     |
| `publisher_platform`, `impression_device`\*                                       |                                                     |
| `publisher_platform`, `platform_position`\*                                       |                                                     |
| `publisher_platform`, `platform_position`, `impression_device`\*                  |                                                     |
| `product_id`\*                                                                    |                                                     |
| `hourly_stats_aggregated_by_advertiser_time_zone`\*                               |                                                     |
| `hourly_stats_aggregated_by_audience_time_zone`\*                                 |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`                           |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`                           |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`, `impression_device`      |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`, `country`                |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`, `age`                    |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`, `gender`                 |                                                     |
| `action_carousel_card_id` / `action_carousel_card_name`, `age`, `gender`          |                                                     |

**Limitations**

- `video_*` fields cannot be requested with any hourly stats breakdowns.
- `video_avg_time_watched_actions` field cannot be requested with the `region` breakdown.
- `action_type` is implicitly added as the `action_breakdowns` when `action_breakdowns` parameter is not specified.

# Limits and Best Practices

Beginning June 10, 2025, to improve overall API performance, `reach` will no longer be returned for standard queries that apply breakdowns and use `start_dates` more than 13 months old. (Responses to such requests will omit `reach` and related fields, such as `frequency` and `cpp`.)

To apply breakdowns and still retrieve >13-month-old `reach` values, you can use [asynchronous jobs](#insights-api-asynchronous-jobs) to make up to 10 requests per Ad Account per day. Check the `x-Fb-Ads-Insights-Reach-Throttle` header to monitor how close you are to that rate-limit, and note that once the rate-limit is breached, requests will omit `reach` and related fields.

When the rate limit threshold for reach-related breakdowns is exceeded, the following error message will be returned:

` Reach-related metric breakdowns are unavailable due to rate limit threshold.`

Facebook Insights API provides performance data from Facebook marketing campaigns. To protect system performance and stability, we have protective measures to equally distribute system resources among applications. All policies we describe below are subject to change.

## Data Per Call Limits

We use data-per-call limits to prevent a query from retrieving too much data beyond what the system can handle. There are 2 types of data limits:

- By number of rows in response, and
- By number of data points required to compute the total, such as summary row.

These limits apply to both sync and async `/insights` calls, and we return an error:

`error_code = 100,  CodeException (error subcode: 1487534)`

**Best Practices, Data Per Call Limits**

- Limit your query by limiting the date range or number of ad ids. You can also limit your query to metrics that are necessary, or break it down into multiple queries with each requesting a subset of metrics.
- Avoid account-level queries that include high cardinality breakdowns such as `action_target_id` or `product_id`, and wider date ranges like `lifetime`.
- Use `/insights` edge directly with lower level ad objects to retrieve granular data for that level. For example, first use the account-level query to fetch the list of lower-level object ids with `level` and `filtering` parameters. In this example, we fetch all campaigns that recorded some impressions:

  ```curl
  curl -G \-d 'access_token=<ACCESS_TOKEN>' \-d 'level=campaign' \-d 'filtering=[{field:"ad.impressions",operator:"GREATER_THAN",value:0}]' \'https://graph.facebook.com/v2.7/act_<ACCOUNT_ID>/insights'
  ```

  We can then use `/<campaign_id>/insights` with each returned value to query and batch the insights requests for these campaigns in a single call:

  ```curl
  curl \-F 'access_token=<ACCESS_TOKEN>' \-F 'batch=[ \
    { \
      "method": "GET", \
      "relative_url": "v24.0/<CAMPAIGN_ID_1>/insights?fields=impressions,spend,ad_id,adset_id&level=ad" \
    }, \
    { \
      "method": "GET", \
      "relative_url": "v24.0/<CAMPAIGN_ID_2>/insights?fields=impressions,spend,ad_id,adset_id&level=ad" \
    }, \
    { \
      "method": "GET", \
      "relative_url": "v24.0/<CAMPAIGN_ID_3>/insights?fields=impressions,spend,ad_id,adset_id&level=ad" \
    } \
  ]' \'https://graph.facebook.com'
  ```

- Use `filtering` parameter only to retrieve insights for ad objects with data. The field value specified in `filtering` uses DOT notation to denote the fields under the object. Please note that filtering with `STARTS_WITH` and `CONTAIN` does not change the summary data. In this case, use the `IN` operator. See example of a filtering request:

  ```curl
  curl -G \-d 'access_token=<ACCESS_TOKEN>' \-d 'level=ad' \-d 'filtering=[{field:"ad.impressions",operator:"GREATER_THAN",value:0},]' \'https://graph.facebook.com/v24.0/act_<ACCOUNT_ID>/insights'
  ```

- Use `date_preset` if possible. Custom date ranges are less efficient to run in our system.
- Use [batch requests](#batch-requests) for multiple sync calls and [async](#insights-api-asynchronous-jobs) to query for large volume of data to avoid timeouts.
- Try sync calls first and then use async calls in cases where sync calls timeout
- Insights refresh every 15 minutes and do not change after 28 days of being reported

## Insights Call Load Limits

Ninety days from the release of v3.3 and effective for all public versions, we change the ad account level rate limit to better reflect the volume of API calls needed. We compute the rate limit quota on your Marketing API access tier and the business owning your app. see [Access and Authentication](#authorization). This change applies to all Ads Insights API endpoints: `GET {adaccount_ID}/insights`, `GET {campaign_ID}/insights`, `GET {adset_ID}/insights`, `GET {ad_ID}/insights`, `POST {adaccount_ID}/insights`, `POST {campaign_ID}/insights`, `POST {adset_ID}/insights`, `POST {ad_ID}/insights`.

We use load limits for optimal reporting experience. We measure API calls for their rate as well as the resources they require. We allow a fixed load limit per application per second. When you exceed that limit, your requests fail.

Check the `x-fb-ads-insights-throttle` HTTP header in every API response to know how close your app is to its limit as well as to estimate how heavy a particular query may be. Insights calls are also subject to the default ad account limits shown in the `x-ad-account-usage` HTTP header. More details can be found here [Marketing API, Best Practices](https://developers.facebook.com/docs/marketing-api/best-practices).

Once an app reaches its limit, the call gets an error response with `error_code = 4`, `CodedException`. You should stay well below your limit. If your app reaches its allowed limits, only a certain percentage of requests go through, depending on the query, and the rate.

We apply rate limiting to each app sending synchronous and asynchronous `/insights` calls combined. The two main parameters limits are counted against are by application, and by ad account.

Here's an example of the HTTP header with an application's accrued score as a percentage of the limits:

`X-FB-Ads-Insights-Throttle: { "app_id_util_pct": 100, "acc_id_util_pct": 10, "ads_api_access_tier": "standard_access" }`

The header `"x-fb-ads-insights-throttle"` is a JSON value containing these info:

- `app_id_util_pct` — The percentage of allocated capacity for the associated `app_id` has consumed.
- `acc_id_util_pct` — The percentage of allocated capacity for the associated ad `account_id` has consumed.
- `ads_api_access_tier` — Tiers allows your app to access the Marketing API. `standard_access` enables lower rate limiting.

## Global Rate Limits

During periods of elevated global load to the `/insights` endpoint, the system can throttle requests to protect the backend. This can occur in rare cases when too many queries of high complexity (large time ranges, complex metrics, and/or high number of ad object IDs) are coming at the same time. This will manifest in an error that looks like this:

`error_code = 4,  CodeException (error subcode: 1504022), error_title: Too many API requests`

During these periods, it is advised to reduce calls, wait a short period, and query again.

## Rate Limits Best Practices

- Sending several queries at once are more likely to trigger our rate limiting. Try to spread your `/insights` queries by pacing them with wait time in your job.
- Use the rate information in the HTTP response header to moderate your calls. Add a back-off mechanism to slow down or pause your `/insights` queries when you come close to hitting 100% utility for your application, or for your ad account.
- We report ad insights data in the ad account's timezone. To retrieve insights data for the associated ad account daily, consider the time of day using the account timezone. This helps pace queries throughout the day.
- Check the `ads_api_access_tier` that allows you to access the Marketing API. By default, apps are in the `development_access` tier and `standard_access` enables lower rate limiting. To get a higher rate limit and get to the standard tier, you can apply for the "[Advanced Access](https://developers.facebook.com/docs/development/release/access-levels#advanced-access)" to the [Ads Management Standard Access feature](#authorization).

## Insights API Asynchronous Jobs

Fetch stats on many objects and apply filtering and sorting; we made the asynchronous workflow simpler:

1.  Send a `POST` request to `<AD_OBJECT>/insights` endpoint, which responds with the `id` of an Ad Report Run.

        ```json
        {

      "report_run_id": 6023920149050,}
    ```

        Do not store the `report_run_id` for long term use, it expires after 30 days.

2.  Ad Report Runs contain information about this asynchronous job, such as `async_status`. Poll this field until `async_status` is **Job Completed** and `async_percent_completion` is 100.

        ```json
        {

      "id": "6044775548468",
      "account_id": "1010035716096012",
      "time_ref": 1459788928,
      "time_completed": 1459788990,
      "async_status": "Job Completed",
      "async_percent_completion": 100}
    ```

3.  Then you can query `<AD_REPORT_RUN_ID>/insights` edge to fetch the final result.

        ```json
        {

      "data": [
        {
          "impressions": "9708",
          "date_start": "2009-03-28",
          "date_stop": "2016-04-04"
        },
        {
          "impressions": "18841",
          "date_start": "2009-03-28",
          "date_stop": "2016-04-04"
        }
      ],
      "paging": {
        "cursors": {
          "before": "MAZDZD",
          "after": "MQZDZD"
        }
      }}
    ```

This job gets all stats for the account and returns an asynchronous job ID:

```curl
curl \
  -F 'level=campaign' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID>/insights
curl -G \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/1000002
curl -G \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/1000003/insights
```

| Async Job Status    | Description                                                          |
| :------------------ | :------------------------------------------------------------------- |
| **Job Not Started** | Job has not started yet.                                             |
| **Job Started**     | Job has been started, but is not yet running.                        |
| **Job Running**     | Job has started running.                                             |
| **Job Completed**   | Job has successfully completed.                                      |
| **Job Failed**      | Job has failed. Review your query and try again.                     |
| **Job Skipped**     | Job has expired and skipped. Please resubmit your job and try again. |

## Export Reports

We provide a convenience endpoint for exporting `<AD_REPORT_RUN_ID>` to a localized human-readable format.

**Note:** this endpoint is not part of our versioned Graph API and therefore does not conform to its breaking-change policy. Scripts and programs should not rely on the format of the result as it may change unexpectedly.

```curl
  curl -G \
  -d 'report_run_id=<AD_REPORT_RUN_ID>' \
  -d 'name=myreport' \
  -d 'format=xls' \'https://www.facebook.com/ads/ads_insights/export_report/'
  
```

| Name            | Description     |
| :-------------- | :-------------- | ------------------------------------------------------------------------------------------- |
| `name`          | `string`        | Name of downloaded file                                                                     |
| `format`        | `enum{csv,xls}` | Format of file                                                                              |
| `report_run_id` | `integer`       | ID of report to run                                                                         |
| `access_token`  | `string`        | Permissions granted by the logged-in user. Provide this to export reports for another user. |

# Tracking and Conversion Specs

**Tracking Specs** are used primarily for monitoring and reporting purposes. They define what user actions should be tracked after they view or click on an ad. These specs help advertisers understand how users interact with the ad content and whether it leads to offsite conversions, app installs, or other key actions. Tracking specs do not directly influence the optimization of ad delivery but are essential for gathering data on user engagement.

**Conversion specs** are used to define the conditions under which a conversion (a desired action by the user) is counted. These specs are crucial for attributing conversions to specific ads and for optimizing ad performance. Conversion specs are used in the optimization process of ad delivery, where the system predicts and improves conversion rates. `Conversion_specs` has been read-only since v2.4. The value is derived from `optimization_goal` from ad set.

## Set Tracking Specs

Use with any bid type and creative combination. To specify tracking specs, you need an additional field in an ad, named `tracking_specs`. The `tracking_specs` field takes arguments identical to [action spec](https://developers.facebook.com/docs/marketing-api/insights/action-breakdowns). To create an ad, see [ad creation](#create-an-ad).

## Default Tracking Specs

There will be a set of default tracking specs for certain objective, bid_type and creative combinations. If you set any additional new tracking specs, the default tracking specs are still available and won't be overwritten. Except for `APP_INSTALLS` or `OUTCOME_ENGAGEMENT` objectives, the default tracking specs will be overwritten. If you want to have the defaults you must add them to your custom specs.

You can use both string or array notation in the spec such as `'APPLICATION_ID'` or `['APPLICATION_ID']`.

- `CPM` refers to `billing_event=IMPRESSIONS`, `optimization_goal=IMPRESSIONS`
- `CPC` refers to `billing_event=CLICKS`, `optimization_goal=CLICKS`
- `oCPM` refers to `billing_event=IMPRESSIONS`, `optimization_goal` set to an action
- `CPA` refers to both `billing_event` and `optimization_goal` set to an action

| Objective                   | Creative, Bid type                                                                                                 | Tracking Spec                                                                                                                                                                                    | Description                                                                                                                                                                                                                                                                                                                                                                                                         |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CANVAS_APP_ENGAGEMENT`     | Canvas app engagement ads with `optimization_goal= APP_INSTALLS`                                                   | `[{'action.type':'app_engagement','application':'APPLICATION_ID'}, {'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}]`                                                        | See `app_engagement` and `post_engagement` meta specs                                                                                                                                                                                                                                                                                                                                                               |
| `CANVAS_APP_INSTALLS`       | Canvas app install ads with optimization not set to `optimization_goal= APP_INSTALLS`                              | `[{'action.type':'app_engagement','application':'APPLICATION_ID'}, {'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}]`                                                        | See `app_engagement` and `post_engagement` meta specs                                                                                                                                                                                                                                                                                                                                                               |
| `CONVERSIONS`               | Page post link and photo ads with `promoted_object` set to a pixel ID and `optimization_goal= OFFSITE_CONVERSIONS` | `{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'},{'action.type':'like','page':PAGE_ID}`                                                                                     | Post Engagement, Page Like specs. Number of link clicks on the specific page post if there is only one link, number of engagements on the post, and number of times users generate stories or engage with a page                                                                                                                                                                                                    |
| `CONVERSIONS`               | Page post link and photo ads with optimization not set to `optimization_goal= OFFSITE_CONVERSIONS`                 | `{'action.type':'offsite_conversion','fb_pixel':'FACEBOOK_PIXEL_ID'}, {'action.type':{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'},{'action.type':'like','page':PAGE_ID}` | Conversions, Post Engagement, Page Like specs. Number of link clicks on the specific page post if there is only one link, number of engagements on the post, and number of times users generate stories or engage with a page                                                                                                                                                                                       |
| `CONVERSIONS`               | Domain ads with `promoted_object` set to a pixel ID and `optimization_goal= OFFSITE_CONVERSIONS`                   | `{'action.type':'link_click','object':'PAGE_ID'}, {'action.type':'like','page':PAGE_ID}`                                                                                                         | Page Likes, Link Clicks specs. Number of link clicks on the specific page post if there is only one link, number of engagements on the post, and number of times users generate stories or engage with a page.                                                                                                                                                                                                      |
| `CONVERSIONS`               | Domain ads with optimization not set to `optimization_goal= OFFSITE_CONVERSIONS`                                   | `{'action.type':'offsite_conversion','fb_pixel':'FACEBOOK_PIXEL_ID'}, {'action.type':'link_click','object':'PAGE_ID'}, {'action.type':'like','page':PAGE_ID}`                                    | Conversion, Page Likes, Link Clicks specs. Number of link clicks on the specific page post if there is only one link, number of engagements on the post, and number of times users generate stories or engage with a page.                                                                                                                                                                                          |
| `EVENT_RESPONSES`           | Event ads with optimization not set to `optimization_goal= EVENT_RESPONSES`                                        | `[{'action.type':'rsvp' ,'response':'yes', 'event':'EVENT_ID'},{'action.type':'rsvp' ,'response':'maybe', 'event':'EVENT_ID'},[{'action.type':'rsvp' ,'response':'no', 'event':'EVENT_ID'}]`     | Number of RSVPs (yes, maybe, no) to an event.                                                                                                                                                                                                                                                                                                                                                                       |
| `EVENT_RESPONSES`           | Event ads with `optimization_goal= EVENT_RESPONSES`                                                                | empty (conversion spec will cover the tracked actions)                                                                                                                                           | Number of RSVPs (yes, maybe, no) to an event.                                                                                                                                                                                                                                                                                                                                                                       |
| `LINK_CLICKS`               | Page post link and photo ads with any bid option                                                                   | `{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}`                                                                                                                           | Post Engagement. Number of times an offsite url link, link with particular url domain, offsite link on a page, offsite link on a post was clicked.                                                                                                                                                                                                                                                                  |
| `LINK_CLICKS`               | Domain ads with `optimization_goal= LINK_CLICKS`                                                                   | `{'action.type':'like','page':PAGE_ID}]`                                                                                                                                                         | Page likes. Number of times an offsite url link, link with particular url domain, offsite link on a page, offsite link on a post was clicked.                                                                                                                                                                                                                                                                       |
| `LINK_CLICKS`               | Domain ads with optimization not set to `optimization_goal= LINK_CLICKS`                                           | `{'action.type':'link_click','object':'PAGE_ID'}, {'action.type':'like','page':PAGE_ID}`                                                                                                         | Website Click, Page Likes. Number of times an offsite url link, link with particular url domain, offsite link on a page, offsite link on a post was clicked.                                                                                                                                                                                                                                                        |
| `MOBILE_APP_ENGAGEMENT`     | Mobile app engagement ads with any bid option                                                                      | `{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}`                                                                                                                           | For App Engagement Ads you must specify a tracking spec explicitly using the Facebook App ID: `[{'action.type': 'mobile_app_install', 'application': 'APP_ID'}, {'action.type':'app_custom_event','application':APP_ID}]` See `post_engagement` meta spec. Also, number of times an app event occurs.                                                                                                               |
| `MOBILE_APP_INSTALLS`       | Mobile app install ads with any bid option                                                                         | `{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}`                                                                                                                           | For App Install Ads you must specify a tracking spec explicitly using the Facebook App ID: `[{'action.type':'app_custom_event','application':APP_ID}, {'action.type': 'mobile_app_install', 'application': 'APP_ID'}]` See `post_engagement` meta spec. Also, number of times users install the app through a mobile app install ad if there is an iOS/Android version and the number of times an app event occurs. |
| `NONE`                      | Any ad type                                                                                                        | See default tracking specs by ad type                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `PAGE_LIKES`                | Page Like ads or page post ads with any bid option                                                                 | `{'action.type':'page_engagement', 'page':'PAGE_ID'}`                                                                                                                                            | See Page Engagement meta spec                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST_ENGAGEMENT`           | Page post ads with optimization not set to `optimization_goal= POST_ENGAGEMENT`                                    | `{'action.type':'post_engagement','post':'POST_ID', 'page':'PAGE_ID'}`                                                                                                                           | See Page Post Engagement meta spec                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST_ENGAGEMENT`           | Page post ads with `optimization_goal= POST_ENGAGEMENT`                                                            | empty                                                                                                                                                                                            | See Page Post Engagement meta spec                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST_ENGAGEMENT` (testing) | any                                                                                                                | `{'action.type':'dwell','post':'POST_ID', 'page':'PAGE_ID'}`                                                                                                                                     | A small percentage of this kind of ads has dwell tracking type, forcusing on users spending at least a min time on the ads.                                                                                                                                                                                                                                                                                         |
| `PRODUCT_ CATALOG_SALES`    | Dynamic Product Ads                                                                                                | `{'action.type': 'post_engagement', 'page': PAGE_ID, 'post': POST_ID}`                                                                                                                           | Number of link clicks on the specific page post if there is only one link, number of engagements on the post, number of times users generate stories or engage with a page. You can specify a product set that is different from the product set in the promoted object but the default is the product set specified in the promoted object.                                                                        |

## Meta Specs

You can specify multiple types of actions on a single object using a single spec.

| Object          | Conversion Spec                                                               | Description                                                                                                                                                                                                                                                                                                                                                                                     |
| :-------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Application** | `{"action.type":["app_engagement"], "application":["APPLICATION_ID"]}`        | Number of times users generate stories `app_story` or engage with content via `app_use`, `app_install`, `credit_spent`.                                                                                                                                                                                                                                                                         |
| **Page**        | `{"action.type":["page_engagement"], "page":["PAGE_ID"]}`                     | Number of times users perform any of the following actions in the context of the specified page: `checkin`, `comment`, `follow`, `like`, `page post like`, `mention`, `post on page`, `share a post`, `answer a question`. Plus the number of times users perform any of the following actions in the context of the specified page: `click a link`, `view a photo`, `play a native FB video`.  |
| **Page Post**   | `{"action.type":["post_engagement"], "post":["POST_ID"], "page":["PAGE_ID"]}` | Number of times users perform any of the following actions in the context of the specified post: `comment`, `follow question`, `like`, `share`, `answer question`. Plus the number of times users perform any of the following actions: `click a link`, `page like`, `view photo`, `play a video hosted on Facebook or an inline Youtube video play`. For non embedded videos use `link_click`. |

## Custom Tracking Specs

To define your own tracking specs, use the [action spec framework](https://developers.facebook.com/docs/marketing-api/insights/action-breakdowns). See the [Action Specs, Reference](https://developers.facebook.com/docs/marketing-api/insights/action-breakdowns).

| Action (Object Types)                     | Description, Tracking spec details                                                                                                                    | Tracking or Conversion Spec                                                                                                                                                                                                                          |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_custom_event` (application)          | Custom event on an aplication. Number of custome events on a mobile app.                                                                              | `{'action.type':'app_custom_event','application':APP_ID}`                                                                                                                                                                                            |
| `app_install` (application)               | Installing an app. Number of installs on canvas or mobile app                                                                                         | `[{'action.type':'app_install','application':APP_ID},{'action.type':'mobile_app_install','application':APP_ID}]`                                                                                                                                     |
| `app_use` (application)                   | Number of times app was used.                                                                                                                         | `{'action.type':'app_use','application':APP_ID}`                                                                                                                                                                                                     |
| `checkin` (place)                         | Check in a place. Number of checkins into the place or into any child places of this page.                                                            | `{'action.type':'checkin','page': PAGE_ID},{'action.type':'checkin','page.parent:PAGE_ID}`                                                                                                                                                           |
| `comment` (post)                          | Commenting on a post. Number of comments on any or specific page post.                                                                                | `{'action.type':'comment','post.wall':PAGE_ID},{'action.type':'comment','post':POST_ID,'post.wall':PAGE_ID}`                                                                                                                                         |
| `credit_spend` (application)              | Instances of spending credit in an app.                                                                                                               | `'action.type':'credit_spent','application':APP_ID}`                                                                                                                                                                                                 |
| `follow` (question)                       | Subscribing to an object. Number of answers or follows to a question.                                                                                 | `{'action.type':'vote', 'question':QUESTION_ID, 'question.creator':PAGE_ID}, {'action.type':'follow', 'question':QUESTION_ID, 'question.creator':PAGE_ID}`                                                                                           |
| `leadgen_quality_conversion` (pixel)      | Down funnel lead conversion (CRM) events.                                                                                                             | `{'action.type': 'leadgen_quality_conversion', 'fb_pixel': 'FACEBOOK_PIXEL_ID'}, {'action.type': 'leadgen_quality_conversion', 'dataset': 'OFFLINE_EVENT_SET_ID'}`                                                                                   |
| `like` (page, post)                       | Liking an object. Number of likes on a page or a post.                                                                                                | `{'action.type':'like','page':PAGE_ID},{'action.type':'like','post.wall':PAGE_ID},{'action.type':'like','post':POST_ID,'post.wall':PAGE_ID}`                                                                                                         |
| `link_click` (page,post, url, url domain) | Clicking on a link. Number of times an offsite url link, link with particular url domain, offsite link on a page, offsite link on a post was clicked. | `{'action.type':['link_click'],'object':['PAGE_ID']},{'action.type':['link_click'],'object.domain':['URL_DOMAIN']},{'action.type':['link_click'],'post.wall':['PAGE_ID']},{'action.type':['link_click'],'post':['POST_ID'],'post.wall':['PAGE_ID']}` |
| `mention` (page)                          | Mentioning of a Page. Number of mentions of a page.                                                                                                   | `{'action.type':'mention','object':PAGE_ID'}`                                                                                                                                                                                                        |
| `offsite_conversion` (pixel)              | Number of offsite conversions, and accumulated revenue.                                                                                               | `{'action.type':'offsite_conversion','fb_pixel':'FACEBOOK_PIXEL_ID'}`                                                                                                                                                                                |
| `photo_view` (page)                       | Viewing a photo. Number of photo views, video_plays or link_clicks of the photos/videos/link-shares of any or specific post on a page.                | `{'action.type':'photo_view', 'post.wall':PAGE_ID}{'action.type':'photo_view', 'post':POST_ID,'post.wall':PAGE_ID}`                                                                                                                                  |
| `post` (post)                             | Sharing a story. Number of users post on a page.                                                                                                      | `{'action.type':'post','post.wall':PAGE_ID}`                                                                                                                                                                                                         |
| `receive_offer` (offer)                   | Claiming an Offer. Number of people who claimed a specific offer.                                                                                     | `{'action.type':'receive_offer','offer':OFFER_ID}`                                                                                                                                                                                                   |
| `rsvp` (event)                            | Rsvping into an Event. Number of RSVPs (yes and maybe) to an event. Valid values are yes, maybe, and no.                                              | `{'action.type':'rsvp','event': EVENT_ID},{'action.type':'rsvp','response':'yes','event': EVENT_ID},{'action.type':'rsvp','response':'no','event': EVENT_ID},{'action.type':'rsvp','response':'maybe','event': EVENT_ID}`                            |
| `tab_view` (page)                         | Viewing a page tab Number of views of a specific page tab. If you want all tab views just specify the page.                                           | `{'action.type':'tab_view','page.tab.name':'PAGE_TAB_NAME', 'page':PAGE_ID},{'action.type':'tab_view','page':PAGE_ID}`                                                                                                                               |
| `video_play` (post)                       | Watching a video. Number of video watches for any or a specific video post on a page.                                                                 | `{'action.type':'video_play', 'post.wall':PAGE_ID},{'action.type':'video_play', 'post':POST_ID,'post.wall':PAGE_ID}`                                                                                                                                 |

## Examples

**Pixel Tracking**

Track the performance of different pixels in an ad by specifying the tracking pixel in the ad's `tracking_specs` field. For example:

`tracking_specs="[
  {'action.type':'offsite_conversion','fb_pixel':1},
  {'action.type':'offsite_conversion','fb_pixel':2},
  {'action.type':'offsite_conversion','fb_pixel':3}
]"`

This tracks the performance of pixels "1", "2" and "3". If you want to optimize for pixel "1" only, define the `promoted_object` of the parent ad set. This is useful when you want to optimize for CHECKOUT, but also want to track the number of REGISTRATION and ADD_TO_CART.

Pixels optimized by specifying the pixel ID in the `promoted_object` are automatically tracked, so you do not need to specify the same pixel in `tracking_specs`.

## Using Conversion Specs

`conversion_specs` is a field for ad. It follows the format `{'action.type':'{ACTION}', ... }` where each action applies to an object. Here are examples of conversion specs for various ad types:

| Ad type                       | Conversion Spec                                                              |
| :---------------------------- | :--------------------------------------------------------------------------- |
| Domain ad with social context | `{'action.type':'link_click', 'object':'PAGE_ID'}`                           |
| Page like ad                  | `{'action.type':'like', 'page':PAGE_ID}`                                     |
| Page post link ad             | `{'action.type':['link_click'], 'post': [POST_ID], 'post.wall':[PAGE_ID]}`   |
| All other page post ads       | `{'action.type':'post_engagement', 'post':'POST_ID', 'page':'PAGE_ID'}`      |
| Event ad                      | `{'action.type':'rsvp' , 'response':'yes', 'event':'EVENT_ID'}`              |
| Offer ad                      | `{'action.type':'receive_offer', 'offer':OFFER_ID, 'offer.creator':PAGE_ID}` |
| Mobile app install ad         | N/A - cannot create such an ad with `NONE` objective.                        |
| Mobile app engagement ads     | N/A - only CPC and CPM bid types are supported                               |
| Canvas app install ad         | N/A - cannot create such an ad with `NONE` objective                         |
| Canvas app engagment ad       | N/A - cannot create such an ad with `NONE` objective                         |

Some conversion specs contain multiple actions that apply to a single object. These are called meta specs. Below are examples:

| Object          | Conversion Spec                                                               | Description                                                                                                                                                                                                                                                                                                                      |
| :-------------- | :---------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**        | `{"action.type":["page_engagement"], "page":["PAGE_ID"]}`                     | Times someone takes the following actions in a specific page: `checkin`, `comment`, `follow`, `like`, `page post like`, `mention`, `post on page`, `share a post`, `answer a question`. Includes the number of times someone performs these actions in a specific page: `view a photo`, `play a native Facebook video`.          |
| **Page Post**   | `{"action.type":["post_engagement"], "post":["POST_ID"], "page":["PAGE_ID"]}` | Number of times somone takes one of these actions in a specific post: `comment`, `follow question`, `like`, `share`, `claim offer`, `answer question`. Includes the number of times someone perform these actions: `click a link`, `page like`, `view photo`, `play a video hosted on Facebook or an inline Youtube video play`. |
| **Application** | `{"action.type":["app_engagement"], "application":["APPLICATION_ID"]}`        | Number of times someone generate `app_story` or engage with content as `app_use`, `app_install`, or `credit_spent`.                                                                                                                                                                                                              |

# Marketing Mix Modeling Breakdown on Insights API

The marketing mix modeling breakdown on the Insights API is a self-service data extraction option you can use in order to export Meta ads data quickly and easily without going through a Meta Marketing Science Partner or third-party agencies and mobile measurement partners.

The API calls are built into the Insights API using the `breakdowns=mmm` parameter. **Note:** It is not supported in combination with other breakdowns or `action_breakdowns`.

The responses contain similar metrics and breakdowns as results from the [Marketing Mix Modeling Data Export](https://www.facebook.com/business/help/902720913926868) in Ads Reporting. Marketing mix modeling data is available only on the ad set level (equivalent to the `level=adset` parameter). Currently, the supported metrics for marketing mix modeling data are `impressions` and `spend`. **Note:** The `spend` metric is estimated. See [Insights API, Estimated and Deprecated Metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated) for more information.

## Permissions

You will need the following permissions for your ad account:

- `ads_read`

## Async Export Queries (Preferred)

Running an async export query using the `export_format=csv` parameter results in a downloaded file with column names that match those in Ads Manager.

**Note:** The `time_increment` can be set to 1 day (i.e., 1), otherwise `all_time` will be used by default.

- **Example request**

  ```curl
  curl GET \
    -F "access_token=<ACCESS_TOKEN>" \ 
    -F "breakdowns=mmm" \ 
    -F “export_format=csv” \
    -F "time_increment=1" \ 
  "https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights
  ```

## Retrieve the Marketing Mix Modeling Data

Send a `GET` API call to the `/insights` endpoint with `breakdowns=mmm`.

```curl
curl GET \
  -F "access_token=<ACCESS_TOKEN>" \ 
  -F "breakdowns=mmm" \ 
"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights"
```

**Note:** The Insights API uses default values for parameters not specified in the call. We recommend using the `time_range` and `date_preset` parameters. The granularity of the response can be increased further by using `time_increment`.

- **Example request**

  TRetrieve daily marketing mix modeling data for the last week:

  ```curl
  curl GET \
    -F "access_token=<ACCESS_TOKEN>" \ 
    -F "breakdowns=mmm" \ 
    -F "date_preset=last_7d" \ 
    -F "time_increment=1” \ 
  "https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights"
  ```

For more information about the Insights API and how to onboard to the Marketing API see the [Insights API Quickstart](#insights-api).

## Querying at the Business Manager Level

A common use case is to retrieve marketing mix modeling data for a single Business Manager. This operation isn't directly supported because the Insights API works on the ad account level and below.

To download data for a Business Manager you first need to query available ad accounts with the `/owned_ad_accounts` and `/client_ad_accounts` endpoints. Then iterate over the returned individual ad account IDs to query the marketing mix modeling data for each ad account.

- **Example requests**

  **Using `/owned_ad_accounts`**

  ```curl
  curl GET \
    -F "access_token=<ACCESS_TOKEN>" \ "https://graph.facebook.com/v24.0/<BUSINESS_ID>/owned_ad_accounts"
  ```

  **Using `/client_ad_accounts`**

  ```curl
  curl GET \
    -F "access_token=<ACCESS_TOKEN>" \ "https://graph.facebook.com/v24.0/<BUSINESS_ID>/client_ad_accounts"
  ```

## Limits and Best Practices

The granularity of marketing mix modeling data causes the response to have a large number of records as well as a substantial record size. This can cause your requests to time out during computation. To mitigate this, decrease the size of the request by using the `time_range` and `filtering` parameters and query for the total time range in sections. To learn more, see [Insights API Limits & Best Practices](#limits-and-best-practices).

Only specific filtering supported for querying the marketing mix modeling data. Only these listed operator combinations are allowed for a field; other usages of filtering will return an error.

| Field                | Allowed Operators        |
| :------------------- | :----------------------- |
| `campaign.id`        | `IN`, `NOT_IN`           |
| `campaign.name`      | `CONTAIN`, `NOT_CONTAIN` |
| `adset.id`           | `IN`, `NOT_IN`           |
| `adset.name`         | `CONTAIN`, `NOT_CONTAIN` |
| `country`            | `IN`                     |
| `region`             | `IN`                     |
| `dma`                | `IN`                     |
| `device_platform`    | `IN`                     |
| `publisher_platform` | `IN`                     |
| `platform_position`  | `IN`                     |

We recommend leveraging the [Marketing Mix Modeling Data Export](https://www.facebook.com/business/help/902720913926868) in Ads Reporting to export historical data if the API is not needed.

Alternatively, you can use the [Insights API Asynchronous Jobs flow](#insights-api-asynchronous-jobs). This creates a job that computes the data in an asynchronous fashion. The endpoint responds with the `id` of an Ad Report Run, which you can query for the job status and to retrieve the computed data. **Note:** Some requests can time out even as an asynchronous job. For more information, see [Insights API Asynchronous Jobs](#insights-api-asynchronous-jobs).

You may encounter slightly different column header mappings and column header ordering than the Marketing Mix Modeling Data Export in Ads Reporting. You also have full flexibility to join the marketing mix modeling breakdown's default data with other tables queried from the API.

| Column Index | Default Column Headers from Marketing Mix Modeling Breakdown |
| :----------- | :----------------------------------------------------------- |
| 0            | `account_id`                                                 |
| 1            | `campaign_id`                                                |
| 2            | `adset_id`                                                   |
| 3            | `date_start`                                                 |
| 4            | `date_stop`                                                  |
| 5            | `impressions`                                                |
| 6            | `spend`                                                      |
| 7            | `country`                                                    |
| 8            | `region`                                                     |
| 9            | `dma`                                                        |
| 10           | `device_platform`                                            |
| 11           | `platform_position`                                          |
| 12           | `publisher_platform`                                         |
| 13           | `creative_media_type`                                        |

# Split Testing

Test different advertising strategies on mutually exclusive audiences to see what works. The API automates audience division, ensures no overlap between groups and helps you to test different variables. Test the impact of different audience types, delivery optimization techniques, ad placements, ad creative, budgets and more. You or your marketing partner can create, initiate and view test results in one place. See [Ad Study Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-study).

## Guidelines

- Define KPIs with your marketing partner or internal team you create a test.
- **Confidence Level** Determine this before creating a test. Tests with larger reach, longer schedules, or higher budgets tend to deliver more statistically significant results.
- Select only one variable per test. This helps determine the most likely cause of difference in performance.
- **Comparable Test Sizes** When you test for volume metrics, such as number of conversions, you should scale results and audience sizes so both both test sizes are comparable.

## Test Restrictions

- Max concurrent studies per advertiser: 100
- Max cells per study: 150
- Max ad entities per cell: 100

## Variable Testing

While you can test many different types of variables, we recommend you only test one variable at a time. This preserves the scientific integrity of your test, and helps you identify the specific difference that drives better performance.

For example, consider a split test with ad set A and ad set B. If A uses conversions as its delivery optimization method and automatic placements, while B uses link clicks for delivery optimization and custom placements, you cannot determine if the different delivery optimization methods or the different placements drove better performance.

In this example, if both ad sets used conversions for delivery optimization, but had different placements, you know that placement strategy is responsible for differences in performance.

To setup this test at the ad set level:

```curl
curl \-F 'name="new study"' \-F 'description="test creative"' \ -F 'start_time=1478387569' \-F 'end_time=1479597169' \-F 'type=SPLIT_TEST' \-F 'cells=[{name:"Group A",treatment_percentage:50,adsets:[<AD_SET_ID>]},{name:"Group B",treatment_percentage:50,adsets:[<AD_SET_ID>]}]' \-F 'access_token=<ACCESS_TOKEN>' \ https://graph.facebook.com/<API_VERSION>/<BUSINESS_ID>/ad_studies
```

## Testing Strategies

You can test two or more strategies against one another. For example, do ads with the conversion objective have a greater impact on your direct response marketing than a website visits objective? To setup this test at the campaign level:

```curl
curl \-F 'name="new study"' \-F 'description="test creative"' \ -F 'start_time=1478387569' \-F 'end_time=1479597169' \-F 'type=SPLIT_TEST' \-F 'cells=[{name:"Group A",treatment_percentage:50,campaigns:[<CAMPAIGN_ID>]},{name:"Group B",treatment_percentage:50,campaigns:[<CAMPAIGN_ID>]}]' \-F 'access_token=<ACCESS_TOKEN>' \ https://graph.facebook.com/<API_VERSION>/<BUSINESS_ID>/ad_studies
```

## Evaluating Tests

To determine the test that performs the best, chose a strategy or variable that achieves the highest efficiency metric based on your campaign objective. For example, to test the conversions objective, the ad set that achieves the lowest cost-per-action (CPA) performs the best.

Avoid evaluating tests with uneven test group sizes, or significantly different audience sizes. In this case, you should increase the size and results of one split so that it is comparable to you other tests. If your budget is not proportionate to the size of the test group you should consider the volume of outcomes in addition to efficiency.

You should also use an attribution model that makes sense for your business, and to agree upon it before initiating a split test. If your current attribution model needs reevaluation, contact your Facebook representative to run a lift study. This can show the true causal impact of your conversion and brand marketing efforts.

## Budgeting

You can use custom budgets with your split tests, and choose to test different budgets against each other. However, budget directly impacts reach for your test groups. If your test groups result in large differences in reach or audience size, you increase budget to improve your results and make your test comparable.

# Ad Volume

## View Ad Volume for Your Ad Account

View the volume of ads running or in review for your ad accounts. These ads count against the ads limit per page that we enacted in early 2021. Query the number of ads running or in review for a given ad account.

To see the ad volume for your ad account:

```curl
curl -G \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/v<API_VERSION>/act_<AD_ACCOUNT_ID>/ads_volume"
```

**Response**

`{"data":[{"ads_running_or_in_review_count":2}]}`

For information on managing ad volume, see [About Managing Ad Volume](https://www.facebook.com/business/help/113164948792015).

## View Running or In Review Status

To see if an ad is running or in review, we check `effective_status`, then `configured_status`, and the ad account's status:

- If an ad has `effective_status` of 1 - `active`, we consider it in running or in review state.
- If an ad has `configured_status` of `active` and `effective_status` of 9 - `pending review` or 17 - `pending processing`, we consider it a running or in review.
- The ad can be running or in review only if the ad account status is in 1 - `active`, 8 - `pending settlement`, or 9 - `in grace period`.

We also determine if an ad is running or in review based on the ad set's schedule:

- If start time is before current time, and current time is before end time, then we consider the ad running or in review.
- If start time is before current time and the ad set has no end time, we also consider it running or in review.

For example, if the ad set is scheduled to run in the future, the ads are not running or in review. However, if the ad set is scheduled to run from now until 3 months from now, we consider the ads running or in review.

If you are using special ads scheduling features, such as day-parting, we consider the ad running or in review the whole day not just for the part of the day when the ad starts running.

## Breakdown by Actors

Use the `show_breakdown_by_actor` field to get a breakdown of ad limits by a specific `actor_id`:

```curl
curl -G \
  -d "show_breakdown_by_actor=true" \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/v<API_VERSION>/act_<AD_ACCOUNT_ID>/ads_volume"
```

**Response**

```json
{
  "data": [
    {
      "ads_running_or_in_review_count": 0,
      "current_account_ads_running_or_in_review_count": 0,
      "actor_id": "<ACTOR_ID_1>",
      "recommendations": []
    },
    {
      "ads_running_or_in_review_count": 2,
      "current_account_ads_running_or_in_review_count": 2,
      "actor_id": "<ACTOR_ID_2>",
      "recommendations": []
    }
  ]
}
```

Use `page_id` to get the ad limits for a specific page:

```curl
curl -G \
  -d "page_id=<PAGE_ID>" \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/v<API_VERSION>/act_<AD_ACCOUNT_ID>/ads_volume"
```

**Response**

```json
{
  "data": [
    {
      "ads_running_or_in_review_count": 2,
      "current_account_ads_running_or_in_review_count": 2,
      "actor_id": "<ACTOR_ID>",
      "recommendations": []
    }
  ]
}
```

## Supported Fields

| Field                                                         | Description                                                                                                                                                         |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `actor_id`                                                    | Actor that the limit is enforced against. Currently, this is always the page ID.                                                                                    |
| `ads_running_or_in_review_count`                              | Number of ads running or in review for a specific actor.                                                                                                            |
| `current_account_ads_running_or_in_review_count`              | Number of ads running or in review within the current ad account on a specific actor.                                                                               |
| `actor_name`                                                  | Actor that the ads volume aggregated on. Currently, it can only be page name.                                                                                       |
| `ad_limit_scope_business`                                     | Used in cases where an ad account belongs to a Business Manager and the ad account is subject to Business Manager level ad limits.                                  |
|                                                               | This field has the business that defines the ad limits for an ad account.                                                                                           |
| `ad_limit_scope_business_manager_id`                          | Used in cases where an ad account belongs to a Business Manager and the ad account is subject to Business Manager level ad limits.                                  |
|                                                               | This field has the Business Manager ID for a business that defines the ad limits for an ad account.                                                                 |
| `ad_limit_set_by_page_admin`                                  | Ad limit set by a page admin for the business that owns the ad account.                                                                                             |
| `ads_running_or_in_review_count_subject_to_limit_set_by_page` | Number of ads running or in review for a group of ad accounts. In this case, the group can contain ad accounts that belong to a business or individual ad accounts. |
|                                                               | If ad limit is not set by the page owner, it returns null.                                                                                                          |
|                                                               | If ad limit is set by the page owner, it returns the number of ads running or in review for the group of ad accounts.                                               |
| `future_limit_activation_date`                                | Starting date of ad limit that will be effective in the future.                                                                                                     |
| `future_limit_on_ads_running_or_in_review`                    | Ad limit that will be effective in the future. This limit is related to the number of ads running or in review for the given actor.                                 |
| `limit_on_ads_running_or_in_review`                           | Current ad limit for a given actor ID. This limit is related to the number of ads running or in review.                                                             |
| `recommendations`                                             | Recommendations to help reduce the ad volume. Currently, supported values are:                                                                                      |
|                                                               | `zero_impression`                                                                                                                                                   |
|                                                               | `learning_limited`                                                                                                                                                  |
|                                                               | `top_campaigns_with_ads_under_cap`                                                                                                                                  |
|                                                               | `top_adsets_with_ads_under_cap`                                                                                                                                     |
|                                                               | More information can be found in the [Business Help Center](https://www.facebook.com/business/help/113164948792015).                                                |

## Parameters

| Field                 | Description                                                                                              |
| :-------------------- | :------------------------------------------------------------------------------------------------------- |
| `recommendation_type` | Type of the recommendation to help reduce the ad volume. Currently, supported values are:                |
|                       | `zero_impression`                                                                                        |
|                       | `learning_limited`                                                                                       |
|                       | `top_campaigns_with_ads_under_cap`                                                                       |
|                       | `top_adsets_with_ads_under_cap`                                                                          |
|                       | See [more information about managing ad volume](https://www.facebook.com/business/help/113164948792015). |

## Best Practices

**Ad Changes Triggering Ad Reviews**

If you make any changes to the following scenarios, your ad will be triggered for review:

- Any changes to your creative (image, text, link, video, and so on)
- Any changes to targeting
- Any changes of optimization goals and billing events may also trigger review

**Note:** Changes to bid amount, budget, and ad set schedule will not have any effect on the review status.

Additionally, if an ad enters Ad Review with the run status of "Paused", then it will remain Paused upon exiting Ad Review. Otherwise, the ad will be considered Active and ready to deliver.

## Pagination

For paging response data, see the [Graph API Pagination](#paginated-results).

## User Information

You should store user IDs, session keys, and the ads account ID so it is easy to programmatically access them and keep them together. This is important because any calls made with an account ID belonging to one user and the session key for another user will fail with a permissions error. Any storages of user data must be done in compliance with [Facebook Platform Terms](https://developers.facebook.com/policy) and [Developer Policies](https://developers.facebook.com/policy/details).

## Suggested Bids

Run frequent reports on your campaigns, as suggested bids change dynamically in response to bidding by competitors using similar targeting. Bid suggestions get updated within a few hours, depending upon the bidding of competitors.

## Batch Requests

Make multiple requests to the API with a single call, see:

- [Multiple Requests](#batch-requests-2)
- [Batch Requests](#batch-requests-2)

You can also query for multiple objects by ID as follows:

`https://graph.facebook.com/<API_VERSION>?ids=[id1,id2]`

To query for a specific field:

`https://graph.facebook.com/<API_VERSION>?ids=[id1,id2]&amp;fields=field1,field2`

## Check Data Changes using ETags

Quickly check if the response to a request has changed since you last made it, see:

- [ETags blog](https://developers.facebook.com/blog/post/2012/03/14/using-etags-with-the-graph-api/)
- [ETags Reference](#etags)

## Object Archive and Delete Status

Ad objects have two types of delete states: archived and deleted. You can query both archived and deleted objects with the object id. However, we do not return deleted objects if you request it from another object's edge.

You can have up to 5000 archived objects at any time. You should move ad objects from archived states to deleted states if you no longer need to retrieve them via edges. To learn how states work and for sample calls see [Storing Ad Objects](#manage-your-ad-object's-status).

## Viewing Errors

People make mistakes and try to create ads that are not accepted, [Error Codes](#error-codes) provide reasons an API call failed. You should share some form of the error to users so they can fix their ads.

## Facebook Marketing Developer Community Group

Join [Facebook Marketing Developer Community group](https://www.facebook.com/groups/marketingapidevelopers/) on Facebook for news and update on for Marketing API. We post items from the [Marketing API blog](https://developers.facebook.com/blog/marketing-api) to the group.

## Testing

- [Sandbox mode](https://developers.facebook.com/docs/marketing-api/guides/testing#sandbox) is a testing environment to read and write Marketing API calls without delivering actual ads. See [Sandbox Mode for Developers](https://developers.facebook.com/docs/marketing-api/guides/testing)
- Try API calls with [Graph API Explorer](https://developers.facebook.com/tools/explorer). You can try any API call you would like to make to the Marketing API, see [blog post](https://developers.facebook.com/blog/post/2012/05/17/introducing-the-new-graph-api-explorer/). Select your app in **App**, and grant your app `ads_management` or `ads_read` permission in extended permissions when you create an access token. Use `ads_read` if you only need Ads Insights API access for reporting. Use `ads_management` to read and update ads in an account.
- For development and basic access, configure a list of ad accounts your app is able to make API calls for, see [account list](https://developers.facebook.com/docs/apps/review/account-list).
- You can use sandbox mode to demonstrate your app for app review. However in sandbox mode you cannot create ads or ad creative. Therefore you should use hard coded ad IDs and ad creative IDs to demonstrate your use of our API for app review.

**Basic Criteria**

- Demonstrate value beyond Facebook's core solutions, such as Facebook Ads Manager.

- Focus on business objectives, such as increase in sales. Facebook business objectives can be found [here](https://www.facebook.com/business/goals).

**Policies**

Understand the API policies; Facebook has the right to audit your activity anytime:

- [Platform Terms](https://developers.facebook.com/policy)
- [Developer Policies](https://developers.facebook.com/policy/details)
- [Promotion Policies](https://www.facebook.com/policies/pages_groups_events)
- [Data Use Policy](https://www.facebook.com/about/privacy/update)
- [Statement of Rights and Responsibilities](https://www.facebook.com/legal/terms)
- [Advertising Guidelines](https://www.facebook.com/policies/ads)

Be ready to adapt quickly to changes. Most changes are versioned and change windows are 90 days, ongoing.

In [Statement of Rights and Responsibilities](https://www.facebook.com/legal/terms), you are financially and operationally responsible for your application, its contents, and your use of the Meta Platform and the Ads API. You should manage your app's stability and potential bugs.
