<\!-- Source: META-ADS-API-GUIDE.md, Lines 4790-6115 -->

# Advantage+ Campaign Experience for Sales, App, and Leads

We are introducing a new and streamlined process for creating campaigns, replacing the existing separate workflows for Manual, Advantage+ shopping campaigns (ASC), and Advantage+ app campaigns (AAC). In this new unified flow, you no longer need to specify the `smart_promotion_type` flag to create ASC or AAC campaigns. Instead, you can establish a campaign in the Advantage+ state by configuring it with Advantage+ budget, Advantage+ audience, and Advantage+ placement settings.

Beginning with v25.0, you will no longer be able to use the Advantage+ shopping campaign (ASC) API with the `smart_promotion_type=AUTOMATED_SHOPPING_ADS` field to create ASC campaigns, or the Advantage+ app campaign API with the `smart_promotion_type=SMART_APP_PROMOTION` field to create AAC campaigns. Instead, you will need to create campaigns with Advantage+ audience, Advantage+ campaign budget, and Advantage+ placements to create campaigns with an `advantage_state` that reflects the type of Advantage+ campaign. For more details, please review the blog post [here](https://developers.facebook.com/blog/post/2023/11/27/advantage-campaign-experience-updates/).

The `existing_customer_buget_percentage` field will be deprecated at the same time as the ASC API in v25.0. To replicate this field, refer to the [Replicate existing_customer_budget_percentage Behavior](#replicate-existing_customer_budget_percentage-behavior) section below.

This guide shows you how to create Advantage+ sales and app campaigns with `advantage_state` set to `advantage_plus_sales` or `advantage_plus_app`. These campaigns will be displayed in Ads Manager as Advantage+ sales (or app) campaign "ON" with the associated performance benefits. Advantage+ sales and app campaigns are the updated, streamlined versions of Advantage+ shopping campaigns and Advantage+ app campaigns.

In this new setup, all sales and app promotion campaigns can benefit from the AI optimizations that drive performance for Advantage+ shopping and app campaigns today. The complete range of ad tools will remain available to meet businesses’ needs.

You will need to ensure the campaign includes Advantage+ audience, Advantage+ campaign budget, and Advantage+ placement for the campaign to have the Advantage+ state enabled, as reflected in the `advantage_state` field set to a value other than `DISABLED`.

**Note:** No action is required to opt in to Advantage+ placement, as it is the default setting in the API.

## Create an Advantage+ Campaign

### Step 1: Choose an objective for the ad campaign

- `OUTCOME_SALES`: Use this to achieve the same performance results of an Advantage+ shopping campaign when opted into the following automation settings.
- `APP_INSTALLS`: Use this to achieve the same performance results of an Advantage+ app campaign when opted into the following automation settings.
- `OUTCOME_LEADS`: Use this to achieve an Advantage+ leads campaign. Advantage+ leads campaigns are designed to maximize the performance of your leads campaigns with less set up time and greater efficiency. Using AI, Advantage+ leads campaigns can help you generate qualified leads by delivering your ads to more relevant audiences on more effective ad placements.

### Step 2: Set the required Advantage+ criteria

You can create an ad campaign that uses the same automation levers as an Advantage+ shopping campaign or Advantage+ app campaign using the following settings:

**Advantage+ placement state automation criteria**

- No placement targeting or exclusions should be set, so all available placements will be eligible.
- All ad sets in the ad campaign must fit this criteria or the ad campaign will reflect `advantage_state: DISABLED` due to placement restrictions (i.e., `advantage_placement_state: DISABLED`).
- Placement exclusions may be set on the ad account level and the campaign will still be eligible for an `advantage_state` value that is not `DISABLED`.

**Advantage+ budget state criteria**

- The budget is configured at the ad campaign level using a supported bid strategy

**Advantage+ audience state criteria**

Any of the following criteria may be used. **Note:** The following behavior must be applied to at least one ad set in the ad campaign.

- (Recommended) Opt into Advantage+ audience with `"targeting_automation": {"advantage_audience": 1}`.
- No targeting parameters set besides `geo_locations`, which are allowed.
- (Advanced setup) Individual targeting options are allowed, but with relaxation. For more details on how to enable relaxation for individual targeting options, refer to the following documentation:
  - [Advantage Lookalike](https://developers.facebook.com/docs/marketing-api/audiences/advantage-lookalike)
  - [Advantage Custom Audience](https://developers.facebook.com/docs/marketing-api/audiences/advantage-custom-audience)
  - [Advantage Detailed Targeting](https://developers.facebook.com/docs/marketing-api/guides/advantage-detailed-targeting)
  - [Advanced Targeting: Enable Age and Gender as Suggestions](https://developers.facebook.com/docs/marketing-api/guides/advantage-detailed-targeting#advanced-targeting)

### Step 3: Verify the advantage_state_info opt-in

Once opted into these three automation levers, the ad campaign will reflect the following `advantage_state` at the ad campaign level in `advantage_state_info` depending on the objective.

`GET /v24.0/<CAMPAIGN_ID>?fields=name,objective,advantage_state_info`

`objective: OUTCOME_SALES`

```json
advantage_state_info: {
 advantage_state: ADVANTAGE_PLUS_SALES
 advantage_budget_state: ENABLED
 advantage_audience_state: ENABLED
 advantage_placement_state: ENABLED
}
```

`objective: APP_PROMOTION`

```json
advantage_state_info: {
 advantage_state: ADVANTAGE_PLUS_APP
 advantage_budget_state: ENABLED
 advantage_audience_state: ENABLED
 advantage_placement_state: ENABLED
}
```

`objective: OUTCOME_LEADS`

```json
advantage_state_info: {
 advantage_state: ADVANTAGE_PLUS_LEADS
 advantage_budget_state: ENABLED
 advantage_audience_state: ENABLED
 advantage_placement_state: ENABLED
}
```

### DISABLED state

If any of the levers `advantage_budget_state`, `advantage_audience_state`, or `advantage_placement_state` are `DISABLED`, the `advantage_state` within `advantage_stage_info` will be `DISABLED`.

```json
advantage_state_info: {
 advantage_state: DISABLED
 advantage_budget_state: DISABLED
 advantage_audience_state: ENABLED
 advantage_placement_state: ENABLED
}
```

A campaign must have `advantage_budget_state`, `advantage_audience_state`, and `advantage_placement_state` set to`ENABLED` in order to have the `advantage_state` set to `ADVANTAGE_PLUS_SALES`, `ADVANTAGE_PLUS_APP`, or `ADVANTAGE_PLUS_LEADS`.

If any of the automation levers return `DISABLED`, the `advantage_state` will reflect `DISABLED`.

The `advantage_state` field and its sub-fields `advantage_budget_state`, `advantage_audience_state`, and `advantage_placement_state` are read-only state information flags that can be queried, but are set by configuring the Advantage+ automation levers.

**Note:** Campaigns created with an `advantage_state` of `ADVANTAGE_PLUS_SALES`, `ADVANTAGE_PLUS_APP`, or `ADVANTAGE_PLUS_LEADS` will reflect a `smart_promotion_type` of `GUIDED_CREATION`.

## Replicate Advantage+ Shopping Campaign Performance with Advantage+ Campaigns

- Set your ad campaign objective to `OUTCOME_SALES`.
- Refrain from setting placement targeting or placement exclusions.
- Configure a budget at the ad campaign level with a `bid_strategy` with `LOWEST_COST_WITHOUT_CAP` (recommended), `COST_CAP`, `LOWEST_COST_WITH_BID_CAP`, or `LOWEST_COST_WITH_MIN_ROAS`.
- Refrain from setting any targeting parameters besides `geo_locations`, or opt into Advantage+ audience.

## Replicate existing_customer_budget_percentage behavior

To replicate `existing_customer_budget_percentage` behavior for your ad campaign, create two ad sets per ad campaign that separate existing customers from new customers.

1.  Set up a custom audience that defines your existing customers and have its custom audience ID.
2.  Set your budget at the ad campaign level using Advantage campaign budget.
3.  Create an ad set by making a `POST` request to `/act_<AD_ACCOUNT_ID/adsets`.
    - Set a maximum spending limit for the ad set: `"daily_min_spend_target": "X", "daily_spend_cap": "X"`
    - Set the `custom_audience` settings to include the custom audience that you consider your existing customers. Make sure this is not a suggestion or relaxed by ensuring that `targeting_relaxation_types` is set to 0 for custom audiences.

    ```json
    {
      "targeting":{
        "geo_locations":{
          "countries":["US"]
        },
        "custom_audiences":[{
          "id":<CUSTOM_AUDIENCE_ID>
        }],
        "targeting_relaxation_types":{
          "custom_audience":0
        }
      }
    }
    ```

4.  Use the same creative settings in both ad sets. Then, you can create your ad with the `/act_<AD_ACCOUNT_ID>/ads` endpoint.
5.  Duplicate your ad set, but edit it so that it includes a custom audience exclusion to exclude people who are your existing customers. You can:
    - Include a second ad set in your `POST` call in step 3 with the exclusion of your custom audience that represents your existing customers.
    - Repeat steps 1-4 to create a second ad set but ensure that your custom audience of existing customers is set to exclude.
    - Use the `/adcopies` endpoint to duplicate your first ad set, then make a `POST` call to edit the ad set to exclude the custom audience ID of existing customers.

    ```json
    {
      "targeting":{
        "geo_locations":{
          "countries":["US"]
        },
        "age_min":25,
        "age_max":40,
        "excluded_custom_audiences":[{
          "id":<CUSTOM_AUDIENCE_ID>
        }],
      }
    }
    ```

You have created a new ad campaign with a spending limit on existing customers. It will run after review.

## Creating ads with an Advantage+ state follows the same process as in manual sales campaigns.

Refer to this documentation to create ads to with an enabled Advantage+ state:

- [Manual Ads (non-Catalog Ads)](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/manual-ads)
- [Advantage+ Catalog Ads](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads)
- [Shops Ads](https://developers.facebook.com/docs/marketing-api/guides/shops-ads)
- [Localized Catalogs (or Advantage+ Catalog Ads for Multiple Languages or Countries)](https://developers.facebook.com/docs/marketing-api/guides/localized-catalog-for-advantage-catalog-ads)

## Migrate Advatage+ Shopping Campaigns and Advantage+ App Campaigns into Advantage+ Campaigns

**Limitations**

- Advantage+ app campaigns can only be migrated, not copied, into the Advantage+ format.
- Advantage+ shopping campaigns using `existing_customer_budget_percentage` cannot be migrated to the Advantage+ structure using the Marketing API. Open the campaign in Ads Manager to migrate to the Advantage+ structure.
- Advantage+ shopping campaigns with more than 150 ads cannot be migrated to the Advantage+ structure using the Marketing API. Open the campaign in Ads Manager to migrate to the Advantage+ structure.

**Copy and migrate**

You can copy your Advantage+ shopping campaign into a new campaign in the Advantage+ structure with the `migrate_to_advantage_plus` parameter.

**Example request**

`curl -X POST <AD_CAMPAIGN_ID>/copies?migrate_to_advantage_plus=true`

**Example response**

```json
{
  "copied_campaign_id": "6877326900432",
  "ad_object_ids": [
    {
      "ad_object_type": "campaign",
      "source_id": "6877313029432",
      "copied_id": "6877326900432"
    }
  ]
}
```

When the new campaign (`copied_id`) is queried, it will reflect a `smart_promotion_type` of `GUIDED_CREATION` and will have `advantage_state_info` details.

**Campaigns using existing_customer_budget_percentage**

Campaigns using `existing_customer_budget_percentage` can only be migrated to the Advantage+ structure by duplicating the campaign in the Ads Manager. You may open the campaign in Ads Manager for instructions on how to duplicate into the Advantage+ structure. For recreating as a new campaign, see the [Replicate Existing Customer Budget Percentage](#replicate-existing_customer_budget_percentage-behavior) section.

**Migrate only**

If you would like to keep the same campaign IDs, you can use the `migrate_to_advantage_plus` field to migrate your Advantage+ shopping campaigns/Advantage+ app campaigns into the Advantage+ format.

**Example request**

`curl -X POST <AD_CAMPAIGN_ID>?migrate_to_advantage_plus=true`

**Example response**

`{success: <BOOLEAN>}`

The campaign will then reflect a `smart_promotion_type` of `GUIDED_CREATION` and will have `advantage_state_info` details.

## FAQ

- When will the phased rollout of the new streamlined Advantage+ campaign experience UI in Ads Manager be complete?
- Why are we updating Advantage+ shopping campaigns to Advantage+ sales campaigns?
- What are the implications of this update to the Advantage+ campaign experience on my campaign performance?
- What happens to my campaign learnings when I use the `migrate_to_advantage_plus` field to copy or migrate my campaign?
- Why are my advertisers seeing the new experience in some ad accounts and the original experience in others?
- What happens to my existing Advantage+ shopping campaigns that I created via API when v25.0 rolls out?
- What happens if I try to create an ASC/AAC campaign on v24.0?
- How can I migrate my Advantage app campaigns into Advantage+?
- Will I be able to edit my old Advantage+ shopping campaigns that I created via API without issue in the new Ads Manager UI after the new Advantage+ campaign UI experience is fully rolled out?
- Will my ASC campaigns created through the API with `automated_shopping_ads` reflect as `"advantage_state": "ADVANTAGE_PLUS_SALES"` after this change?
- If I create an ASC campaign before my ad account is enrolled in the new Advantage+ campaign Ads Manager experience, will that campaign reflect as "Advantage+ On" when it becomes enrolled? Will it show as `"advantage_state": "ADVANTAGE_PLUS_SALES"` in the API?
- What’s the impact when I edit an API-created ASC campaign in the new Advantage+ campaign UI experience and leave its settings as "Advantage+ On"?
- What happens to my ASC campaigns with `smart_promotion_type=AUTOMATED_SHOPPING_ADS` that were using `existing_customer_budget_percentage` if it’s not supported with Advantage+ sales campaigns?
- The ad set of my ASC campaign contains more than 50 ads. Can I convert this ASC campaign to `"advantage_state": "ADVANTAGE_PLUS_SALES"`?
- Can I use the `advantage_state` field to make a POST request to create an `ADVANTAGE_PLUS_SALES` campaign?
- Can I make a POST request to `smart_promotion_type` to set it back to `GUIDED_CREATION` instead of `AUTOMATED_SHOPPING_ADS`?
- What specific qualifications will make my campaign `ENABLED` for `advantage_audience_state`?
- How do I disable an Advantage+ sales campaign so that `advantage_state` will reflect `DISABLED`?
- Can I migrate my ad campaign if it is part of a Special Ad Category?

# Advantage+ Shopping Campaigns

We are introducing a new, unified, and streamlined process for creating campaigns, replacing the existing separate workflows for Manual, Advantage+ Shopping Campaigns (ASC), and Advantage+ App Campaigns.

As of v25.0, Marketing API developers will no longer be able to use the ASC API with the `smart_promotion_type=AUTOMATED_SHOPPING_ADS` field to create ASC campaigns. Instead, developers will need to use Advantage+ audience, Advantage+ campaign budget, and Advantage+ placements to create campaigns with an `advantage_state` that reflects the type of Advantage+ campaign. Refer to the [Advantage+ Campaigns documentation](#advantage-campaign-experience-for-sales-app-and-leads) to start creating Advantage+ campaigns today and avoid disruption with the releases of v24.0 and v.25.0.

Advantage+ shopping campaigns is a solution that enables ecommerce and retail direct-to-consumer and brand advertisers to potentially achieve better performance, greater personalization and more efficiency. These campaigns provide greater flexibility to control levers such as creative, targeting, placements and budget, and more opportunities to optimize campaigns that drive conversions.

Advantage+ Shopping Campaigns empower advertisers to use automation and AI to:

- deliver campaigns at scale with sustained performance
- increase efficiency with minimum effort to set up and manage different campaigns

It replaces a portfolio of manual sales campaigns using a combination of targeting, bidding, destination, creative, placement and budget set-ups within a single campaign to test up to 150 different combinations and optimize for the highest performing ads.

Learn more about the context and benefits of ASC in our [blog](https://developers.facebook.com/blog/post/2023/11/27/advantage-campaign-experience-updates/).

## Manual Campaign Setup Compared to Advantage+ Shopping Campaigns

| Manual BAU Campaign Setup                       | Advantage+ Shopping Campaign                                                      |
| :---------------------------------------------- | :-------------------------------------------------------------------------------- |
| Multiple BAU campaigns                          | BAU portfolio replacement                                                         |
| Manual Targeting with 7 Targeting levers        | Automated targeting, automation to increase setup efficiency with 1 country input |
| Strict budget allocations in multiple campaigns | Budget liquidity within 1 campaign                                                |
| Test up to 50 creative combinations             | Allows both dynamic and static ads with up to 150 creative combinations           |

This document outlines the steps you need to follow to set up your integration for Advantage+ shopping campaigns. You will need to:

- [Define Existing Customers](#step-1-define-your-existing-customers-optional)
- [Create Campaign](#step-2-create-campaign-1)
- [Verify Campaign Creation](#step-3-verify-campaign-creation)
- [Create Ad Set](#step-4-create-ad-set)
- [Provide Creative and Create Ads](#step-5-provide-creative-and-create-ads)
- [Set Minimum Age Constraint and Geo Exclusion (See Ad Account Controls reference doc)](#step-6-ad-account-controls-optional)
- Have a `pixel_id` to set up Advantage+ Shopping Campaigns

Learn more about [Cross-Channel Conversion Optimization for Advantage+ shopping campaigns](#cross-channel-conversion-optimization-for-advantage-shopping-campaigns).

## Step 1: Define Your Existing Customers (Optional)

Optionally, Advantage+ shopping campaigns allow you to define your existing customers as a collection of custom audience IDs. Your existing customers are users who are already familiar with your business/product. Once this definition is set up, you can use this to segment your budget for Advantage+ shopping campaigns to limit spend on existing customers via `existing_customer_budget_percentage`. We will also provide you with metrics reporting the performance of your campaigns among these different segments. This step is not required unless you plan on using `existing_customer_budget_percentage`.

| Parameter            | Description     |
| :------------------- | :-------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `existing_customers` | `Array<string>` | Array of custom audience IDs that the ad account has access to. Currently the supported sources for the custom audience are website, app activity, customer list, catalog and offline activity. |

For information on how to create a custom audience, refer to [this page](https://developers.facebook.com/docs/marketing-api/guides/custom-audiences).

**Example**

```curl
curl -X POST \
  -F 'existing_customers=[<CUSTOM_AUDIENCE_ID>, <CUSTOM_AUDIENCE_ID>]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>
```

For more information on tracking new and existing audiences in third-party tracking tools, see [Audience Type URL Parameters](#audience-type-url-parameters).

## Step 2: Create Campaign

Start by creating your ad campaign. To do this, make a `POST` request to `/act_{ad_account_id}/campaigns`.

- Set `campaign_objective` to `OUTCOME_SALES`
- Set `smart_promotion_type` to `AUTOMATED_SHOPPING_ADS` to indicate that the campaign you’re creating is an ASC campaign
- ASC can be created only with the `OUTCOME_SALES` campaign objective.

| Parameters              |                |
| :---------------------- | :------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `name`                  | `string`       | Required                                                                                                                                                                                                                                                                                  | Name for the Advantage+ shopping campaign                                                                              |
| `objective`             | `enum`         | Required                                                                                                                                                                                                                                                                                  | Campaign's objective. Specify `OUTCOME_SALES` for this type of ad                                                      |
| `special_ad_categories` | `list<Object>` | Required                                                                                                                                                                                                                                                                                  | Special ad categories associated with the Advantage+ shopping campaign                                                 |
| `adlabels`              | `list<Object>` | Optional                                                                                                                                                                                                                                                                                  | Ad Labels associated with the Advantage+ shopping campaign                                                             |
| `buying_type`           | `string`       | Optional                                                                                                                                                                                                                                                                                  | Advantage+ shopping campaigns only support the value `AUCTION`                                                         |
| `execution_options`     | `list<enum>`   | Optional                                                                                                                                                                                                                                                                                  | Default value: `set`. Other options are:                                                                               |
|                         |                | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field.                                                                                                                        |
|                         |                | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. |
|                         |                | If the call passes validation or review, the response will be `{"success": true}`. If the call does not pass, an error will be returned with more details.                                                                                                                                |
| `smart_promotion_type`  | `enum`         | Required                                                                                                                                                                                                                                                                                  | To specify this is an Advantage+ shopping campaign, the smart promotion type should be set to `AUTOMATED_SHOPPING_ADS` |
| `status`                | `enum`         | Optional                                                                                                                                                                                                                                                                                  | Valid options are: `PAUSED` and `ACTIVE`.                                                                              |
|                         |                | If this status is `PAUSED`, all its active ad sets and ads will be paused and have an effective status `CAMPAIGN_PAUSED`                                                                                                                                                                  |

**Campaign Create Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping Campaign' \
  -F 'objective=OUTCOME_SALES' \
  -F 'status=ACTIVE' \
  -F 'special_ad_categories=[]' \
  -F 'smart_promotion_type=AUTOMATED_SHOPPING_ADS' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns
```

**Response**

```json
{
  "id": "<campaign_id>"
}
```

**Updating**

You can update a Campaign by making a `POST` request to `/{campaign_id}`.

| Parameters              |                               |
| :---------------------- | :---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                  | `string`                      | Name for the Advantage+ shopping campaign                                                                                                                                                                                                                                                 |
| `special_ad_categories` | `list<Object>`                | Special ad categories associated with the Advantage+ shopping campaign                                                                                                                                                                                                                    |
| `adlabels`              | `list<Object>`                | Ad Labels associated with the Advantage+ shopping campaign                                                                                                                                                                                                                                |
| `execution_options`     | `list<enum>`                  | Default value: `set`. Other options are:                                                                                                                                                                                                                                                  |
|                         |                               | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field.                                                                                                                        |
|                         |                               | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. |
|                         |                               | If the call passes validation or review, the response will be `{"success": true}`. If the call does not pass, an error will be returned with more details.                                                                                                                                |
| `topline_id`            | `numeric string` or `integer` | Topline ID                                                                                                                                                                                                                                                                                |
| `status`                | `enum`                        | You can use the following status for an update API call:                                                                                                                                                                                                                                  |
|                         |                               | `ACTIVE`                                                                                                                                                                                                                                                                                  |
|                         |                               | `PAUSED`                                                                                                                                                                                                                                                                                  |
|                         |                               | `DELETED`                                                                                                                                                                                                                                                                                 |
|                         |                               | `ARCHIVED`                                                                                                                                                                                                                                                                                |
|                         |                               | If an ad campaign is set to `PAUSED`, its active child objects will be paused and have an effective status `CAMPAIGN_PAUSED`.                                                                                                                                                             |

**Campaign Update Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping Update Sample Campaign' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID>
```

## Step 3: Verify Campaign Creation

To verify that you have successfully created an Advantage+ shopping campaign, you can make a `GET` request to `/<AD_CAMPAIGN_ID>` with the field `smart_promotion_type`.

A valid Advantage+ shopping campaign will return the field value `AUTOMATED_SHOPPING_ADS`.

**Example**

```curl
curl -X GET -G \
  -d 'fields=smart_promotion_type' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_CAMPAIGN_ID>
```

**Response**

```json
{
  "smart_promotion_type": "AUTOMATED_SHOPPING_ADS",
  "id": <AD_CAMPAIGN_ID>}
```

## Step 4: Create Ad Set

Once you have completed the campaign creation, you can create an ASC ad set. Make a `POST` request to `/act_{ad_account_id}/adsets`.

Only one Ad Set can be associated with each ASC campaign.

For ad sets targeting Taiwan, the `regional_regulated_categories` and `regional_regulation_identities` fields must be set to identify the name of the individual or organization paying for and/or benefitting from the ad. Please see the [Ad Set documentation](https://developers.facebook.com/docs/marketing-api/reference/ad-set) for more details.

For a lightweight Ad Set creation:

- Set performance goal to maximize the number of conversions (`optimization_goal=OFFSITE_CONVERSIONS`)
- Use auto-bidding (`bid_strategy=LOWEST_COST_WITHOUT_CAP`)
- Target by ISO country code using `geo_locations` field
- Choose either a `daily_budget` or a `lifetime_budget`. If you choose to specify a `lifetime_budget`, you must also set the `end_time`
- Set the conversion location to website under the `promoted_object` by specifying the `pixel_id` for your website and setting `custom_event_type=PURCHASE`
- Set `billing_event=IMPRESSIONS`. This is the only supported billing event for ASC.

| Parameters                            |                               |
| :------------------------------------ | :---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `campaign_id`                         | `numeric string` or `integer` | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | A valid Advantage+ shopping campaign you wish to add this ad set to.                                                                                                                                                                                                                                                                 |
| `name`                                | `string`                      | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Name for the Advantage+ shopping campaign                                                                                                                                                                                                                                                                                            |
| `promoted_object`                     | `Object`                      | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The object this ad set is promoting across all its ads. For Advantage+ shopping campaigns, provide:                                                                                                                                                                                                                                  |
|                                       |                               | `pixel_id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|                                       |                               | `custom_event_type`: Advantage+ shopping ad set supports the following events: `PURCHASE`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`, `CONTENT_VIEW`, `COMPLETE_REGISTRATION`, `DONATE`, `START_TRIAL`, `SUBSCRIBE`, `SEARCH`, `DONATE` (Website-only conversion location), `OTHER` (Website-only conversion location for custom events), and custom conversions.                                                                                                                                                                                                                                                      |
|                                       |                               | **Restrictions**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                       |                               | `optimization_goal=VALUE` only supports `PURCHASE` as the conversion event                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|                                       |                               | All conversion events are supported for `optimization_goal=OFFSITE_CONVERSIONS`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|                                       |                               | Website and Shop conversion location only supports `PURCHASE` as a conversion event. If an advertiser selects anything else, the campaign will convert to the Website conversion location                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|                                       |                               | There are 2 types of cross-channel conversion configurations in `promoted_object`. Cross-channel conversion is optional. For a Website-only conversion location, specify the `pixel_id` for your website and set `custom_event_type=PURCHASE`.                                                                                                                                                                                                                                                                                                                                                                                                          |
|                                       |                               | Website and App: Use this if you can track the same web and app events, such as with an active Meta Pixel or Facebook SDK. You will need to specify the app information under `promoted_object` using `omnichannel_object`.                                                                                                                                                                                                                                                                                                                                                                                                                             |
|                                       |                               | Website and Shop: Use this if your business has an onsite Shop. This is for businesses with both an app and an eligible Shop. Specify Shop information by setting `destination_type=SHOP_AUTOMATIC` and using `omnichannel_object` under `promoted_object` to specify `commerce_merchant_settings_id`.                                                                                                                                                                                                                                                                                                                                                  |
|                                       |                               | Learn more about and view configuration examples for [cross-channel conversion optimization for Advantage+ shopping campaigns](#cross-channel-conversion-optimization-for-advantage-shopping-campaigns).                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `targeting`                           | `Targeting object`            | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | An Advantage+ shopping ad set’s targeting structure. Only `geo_locations` are allowed to be specified.                                                                                                                                                                                                                               |
| `geo_locations`                       | `array`                       | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Used to limit the audience of the ad set by                                                                                                                                                                                                                                                                                          |
|                                       |                               | `countries` — Country targeting. Requires an array of 2-digit ISO 3166 format codes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|                                       |                               | **Example:** `{"geo_locations": {"countries": [“US”]}}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|                                       |                               | `regions` — State, province, or region. See [Targeting Search, Regions](https://developers.facebook.com/docs/marketing-api/targeting-search/reference#regions) for available values. Limit: 200.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                       |                               | **Example:** `{"geo_locations": {"regions": [{"key":"3847"}]}}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `daily_budget`                        | `int64`                       | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The daily budget defined in your account currency, allowed only for ad sets with a duration (difference between `end_time` and `start_time`) longer than 24 hours.                                                                                                                                                                   |
|                                       |                               | Either `daily_budget` or `lifetime_budget` must be greater than 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `lifetime_budget`                     | `int64`                       | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Lifetime budget, defined in your account currency. If specified, you must also specify an `end_time`.                                                                                                                                                                                                                                |
|                                       |                               | Either `daily_budget` or `lifetime_budget` must be greater than 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `end_time`                            | `datetime`                    | Required when `lifetime_budget` is specified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | When creating an ad set with a `daily_budget`, specify `end_time=0` to set the ad set as ongoing with no end date. UTC UNIX timestamp                                                                                                                                                                                                |
|                                       |                               | **Example:** `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `optimization_goal`                   | `enum`                        | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Select `OFFSITE_CONVERSIONS` to target delivery to individuals more likely to take a specific action on your website.                                                                                                                                                                                                                |
|                                       |                               | Select `VALUE` as the optimization goal if you want to target delivery to individuals who are more likely to make high-value purchases. In Ads Manager, we display **Highest Value** as your bid strategy.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|                                       |                               | `VALUE` optimization goal is only available for Website conversion location and requires `promoted_object` to have a specified `pixel_id` for your website and the `custom_event_type=PURCHASE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `bid_strategy`                        | `enum`                        | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `LOWEST_COST_WITHOUT_CAP`: Facebook automatically bids on your behalf and gets you the lowest cost results. Automatically increase your effective bid as needed to get the results you want based on your given `optimization_goal`. This is the default `bid_strategy` when `optimization_goal` is `OFFSITE_CONVERSION` or `VALUE`. |
|                                       |                               | `LOWEST_COST_WITH_MIN_ROAS`: Specific bidding option for value optimization. You must specify a `roas_average_floor`, which is the minimum return wanted from ads spend. Allows advertisers to keep return on ad spend around an average amount over the course of their campaign. You must specify `roas_average_floor`, which is the minimum return wanted from ads spend, within the `bid_constraints` object. This strategy is available for Website-only conversion location. It is compatible with `VALUE` as the `optimization_goal`. See [Minimum Return on Advertiser Spend Bidding](https://www.facebook.com/business/help/1569094709848135). |
|                                       |                               | `COST_CAP`: Get the most results possible while we strive to meet the cost per action you set. You must provide a cap number in the `bid_amount` field. Allows advertisers to scale conversions while keeping costs around their desired average CPA. You must provide a cap number in `bid_amount` to use this strategy. It is available for Website and Website and App conversion locations, and is compatible with `OFFSITE_CONVERSIONS` as the `optimization_goal`.                                                                                                                                                                                |
|                                       |                               | Adherence to cost cap limits is not guaranteed. See [Cost Cap](https://www.facebook.com/business/help/201402283731114).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `bid_amount`                          |                               | Required if `bid_strategy` is `COST_CAP`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `bid_constraints`                     | `JSON object`                 | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `optimization_goal` must be `VALUE`.                                                                                                                                                                                                                                                                                                 |
|                                       |                               | `bid_strategy` must be `LOWEST_COST_WITH_MIN_ROAS`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
|                                       |                               | Min ROAS bidding uses `bid_constraints` to pass the "ROAS floor", but you cannot use with `bid_constraints`, use `roas_average_floor` instead. See [Minimum Return on Advertiser Spend Bidding](https://www.facebook.com/business/help/1569094709848135).                                                                                                                                                                                                                                                                                                                                                                                               |
|                                       |                               | The valid range of `roas_average_floor` is `[100, 10000000]`, inclusive. This means that the valid range of "minimum ROAS" is `[0.01, 1000.0]` or `[1%, 100000.0%]`, inclusive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `billing_event`                       | `enum`                        | Required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | A billing event for the ad set. Only `IMPRESSIONS` is supported for Advantage+ shopping campaigns.                                                                                                                                                                                                                                   |
| `existing_customer_budget_percentage` | `number`                      | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Specifies the maximum percentage of the budget that can be spent on the existing customers associated with this ad account. Lower values may lead to higher costs per conversion. Valid values are between 0-100.                                                                                                                    |
| `adlabels`                            | `list<Object>`                | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Specifies a list of labels to be associated with this object.                                                                                                                                                                                                                                                                        |
| `start_time`                          | `datetime`                    | Optional.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | The start time of the set. UTC UNIX timestamp                                                                                                                                                                                                                                                                                        |
|                                       |                               | **Example:** `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `time_start`                          | `datetime`                    | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Time start                                                                                                                                                                                                                                                                                                                           |
| `time_stop`                           | `datetime`                    | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Time stop                                                                                                                                                                                                                                                                                                                            |
| `attribution_spec`                    | `list<JSON Object>`           | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Conversion attribution spec used for attributing conversions for optimization.                                                                                                                                                                                                                                                       |

**Ad Set Create Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping Sample Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'promoted_object={ "pixel_id": "<PIXEL_ID>", "CUSTOM_EVENT_TYPE": "PURCHASE" }' \
  -F 'daily_budget=<NUM>' \
  -F 'existing_customer_budget_percentage=<NUM>' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'targeting={"geo_locations": {"countries": ["US"]}}' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

**Example Response**
 `"id": "<adset_id>"`

**Ad Set Create Example where `bid_strategy=COST_CAP`:**

```curl
curl \
  -F 'name=My Ad Set' \
  -F 'optimization_goal=OFFSITE_CONVERSIONS \
  -F 'billing_event=IMPRESSIONS'
  -F 'bid_strategy=COST_CAP'
  -F 'bid_amount=200' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={"geo_locations":{"countries":["US"]}}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/<VERSION>/act_<AD_ACCOUNT_ID>/adsets
```

**Ad Set Create Example where `bid_strategy=LOWEST_COST_WITH_MIN_ROAS`:**

```curl
  curl \
  -F 'name=My Ad Set' \
  -F 'optimization_goal=OFFSITE_CONVERSIONS \
  -F 'billing_event=IMPRESSIONS'
  -F 'bid_strategy=LOWEST_COST_WITH_MIN_ROAS
  -F 'bid_constraints={"roas_average_floor": 1000} \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={"geo_locations":{"countries":["US"]}}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/<VERSION>/act_<AD_ACCOUNT_ID>/adsets
```

**Updating**

You can update an Ad Set by making a `POST` request to `/{ad_set_id}`.

| Parameters                            |                     |
| :------------------------------------ | :------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `adlabels`                            | `list<Object>`      | Specifies a list of labels to be associated with this object. This field is optional.                                                                                                                                                                                                     |
| `daily_budget`                        | `int64`             | The daily budget defined in your account currency, allowed only for ad sets with a duration (difference between `end_time` and `start_time`) longer than 24 hours.                                                                                                                        |
|                                       |                     | Either `daily_budget` or `lifetime_budget` must be greater than 0.                                                                                                                                                                                                                        |
| `existing_customer_budget_percentage` | `number`            | Specifies the maximum percentage of the budget that can be spent on the existing customers associated with this ad account. Lower values may lead to higher costs per conversion. Valid values are between 0-100.                                                                         |
| `end_time`                            | `datetime`          | End time, required when `lifetime_budget` is specified.                                                                                                                                                                                                                                   |
|                                       |                     | **Example:** `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`                                                                                                                                                                                                                     |
|                                       |                     | When creating an ad set with a daily budget, specify `end_time=0` to set the ad set as ongoing with no end date.                                                                                                                                                                          |
|                                       |                     | UTC UNIX timestamp.                                                                                                                                                                                                                                                                       |
| `execution_options`                   | `list<enum>`        | Default value: `set`. Other options are:                                                                                                                                                                                                                                                  |
|                                       |                     | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field.                                                                                                                        |
|                                       |                     | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist. |
|                                       |                     | If the call passes validation or review, the response will be `{"success": true}`. If the call does not pass, an error will be returned with more details.                                                                                                                                |
| `start_time`                          | `datetime`          | The start time of the set. Must be provided in UTC UNIX timestamp.                                                                                                                                                                                                                        |
|                                       |                     | **Example:** `2015-03-12 23:59:59-07:00` or `2015-03-12 23:59:59 PDT`.                                                                                                                                                                                                                    |
| `status`                              | `enum`              | Available options for updates:                                                                                                                                                                                                                                                            |
|                                       |                     | `ACTIVE`                                                                                                                                                                                                                                                                                  |
|                                       |                     | `PAUSED`                                                                                                                                                                                                                                                                                  |
|                                       |                     | `DELETED`                                                                                                                                                                                                                                                                                 |
|                                       |                     | `ARCHIVED`                                                                                                                                                                                                                                                                                |
|                                       |                     | If it is set to `PAUSED`, all its active ads will be paused and have an effective status `ADSET_PAUSED`.                                                                                                                                                                                  |
| `lifetime_budget`                     | `int64`             | Lifetime budget, defined in your account currency. If specified, you must also specify an `end_time`.                                                                                                                                                                                     |
|                                       |                     | Either `daily_budget` or `lifetime_budget` must be greater than 0.                                                                                                                                                                                                                        |
| `time_start`                          | `datetime`          | Time start                                                                                                                                                                                                                                                                                |
| `time_stop`                           | `datetime`          | Time stop                                                                                                                                                                                                                                                                                 |
| `targeting`                           | `Targeting object`  | Targeting structure for your ad set. Valid values for targeting are `geo_locations`.                                                                                                                                                                                                      |
| `geo_locations`                       | `array`             | Required                                                                                                                                                                                                                                                                                  | Used to limit the audience of the ad set by                                    |
|                                       |                     | `countries` — Country targeting. Requires an array of 2-digit ISO 3166 format codes.                                                                                                                                                                                                      |
|                                       |                     | **Example:** `{"geo_locations": {"countries": [“US”]}}`                                                                                                                                                                                                                                   |
|                                       |                     | `regions` — State, province, or region. See [Targeting Search, Regions](https://developers.facebook.com/docs/marketing-api/targeting-search/reference#regions) for available values. Limit: 200.                                                                                          |
|                                       |                     | **Example:** `{"geo_locations": {"regions": [{"key":"3847"}]}}`                                                                                                                                                                                                                           |
| `attribution_spec`                    | `list<JSON Object>` | Optional                                                                                                                                                                                                                                                                                  | Conversion attribution spec used for attributing conversions for optimization. |

**Ad Set Update Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping Sample Updated Ad Set' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_SET_ID>
```

## Step 5: Provide Creative and Create Ads

Once you have an ad set, you can create your ad by posting to the `/act_{ad_account_id}/ads` endpoint. Creating Ads in Advantage+ Shopping Campaigns follows the same process as in manual sales campaigns. Please refer to the links below to create Ads under Advantage+ Shopping Campaigns:

- [Manual Ads (non-Catalog Ads)](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/manual-ads)
- [Advantage+ Catalog Ads (formerly known as Dynamic Ads)](#advantage-catalog-ads)
- [Shops Ads](#shops-ads-with-advantage-shopping-campaigns)
- [Localized Catalogs (or Advantage+ Catalog Ads for Multiple Languages or Countries)](https://developers.facebook.com/docs/marketing-api/guides/localized-catalog-for-advantage-catalog-ads)

| Parameters          |                |
| :------------------ | :------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`              | `string`       | Required                                                                                                                                                                                                                                                                                                                 | Name of the ad                                                                                                                                               |
| `adset_id`          | `int64`        | Required                                                                                                                                                                                                                                                                                                                 | The ID of the ad set, required on creation.                                                                                                                  |
| `creative`          | `AdCreative`   | Required                                                                                                                                                                                                                                                                                                                 | The creative spec or the ID of the ad creative to be used by this ad. Valid fields are:                                                                      |
|                     |                | `object_story_spec`                                                                                                                                                                                                                                                                                                      |
|                     |                | `product_set_id`                                                                                                                                                                                                                                                                                                         |
|                     |                | `use_page_actor_override`                                                                                                                                                                                                                                                                                                |
|                     |                | `creative_id`                                                                                                                                                                                                                                                                                                            |
|                     |                | You can read more about creatives [here](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives)                                                                                                                                                                                                         |
|                     |                | Provide the creative in the following format: `{"creative_id": <CREATIVE_ID>}`                                                                                                                                                                                                                                           |
|                     |                | Or provide a creative spec:                                                                                                                                                                                                                                                                                              |
|                     |                | `{`                                                                                                                                                                                                                                                                                                                      |
|                     |                | `        "creative": {`                                                                                                                                                                                                                                                                                                  |
|                     |                | `          "name": <NAME>, `                                                                                                                                                                                                                                                                                             |
|                     |                | `          "object_story_spec": <SPEC>,`                                                                                                                                                                                                                                                                                 |
|                     |                | `          "product_set_id": <PRODUCT_SET_ID>`                                                                                                                                                                                                                                                                           |
|                     |                | `        }}`                                                                                                                                                                                                                                                                                                             |
| `status`            | `enum`         | Optional                                                                                                                                                                                                                                                                                                                 | Only `ACTIVE` and `PAUSED` are valid during creation. During testing, it is recommended to set ads to a `PAUSED` status so as to not incur accidental spend. |
| `adlabels`          | `list<Object>` | Optional                                                                                                                                                                                                                                                                                                                 | Ad Labels associated with this ad                                                                                                                            |
| `execution_options` | `list<enum>`   | Optional                                                                                                                                                                                                                                                                                                                 | Default value: `set`.                                                                                                                                        |
|                     |                | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field.                                                                                                                                                       |
|                     |                | `synchronous_ad_review`: this option should not be used by itself. It should always be specified with `validate_only`. When these options are specified, the API call will perform Ads Integrity validations, which include message language checking, image 20% text rule, and so on, as well as the validation logics. |
|                     |                | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist.                                |
|                     |                | If the call passes validation or review, the response will be `{"success": true}`. If the call does not pass, an error will be returned with more details.                                                                                                                                                               |

**Ad Create Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping campaign Sample Ad' \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={"name": <NAME>, "object_story_spec": <SPEC>}' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Individual Ad Scheduling**

Individual Ad Scheduling allows advertisers to have more granular control to run their Ads during a specific time period by scheduling the start and end time. This feature is available for all campaign types.

**Example**

```json
{
  "ad_schedule_end_time": "2024-07-30T09:00:00+0100",
  "ad_schedule_start_time": "2024-07-26T12:00:32+0100"
}
```

These are the parameters.

**Creative Fields**

For a full list of Ad Creative fields, see [here](https://developers.facebook.com/docs/marketing-api/reference/ad-creative).

| Field                     | Description                 |
| :------------------------ | :-------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `object_story_spec`       | `AdCreativeObjectStorySpec` | Required | Use if you want to create a new unpublished page post and turn the post into an ad. The Page ID and the content to create a new unpublished page post. |
| `use_page_actor_override` | `AdCreative`                | Required | If `true`, we display the Facebook page associated with the Advantage shopping ads.                                                                    |

**Create Creative Example**

```curl
curl -X POST \
  -F 'object_story_spec=<SPEC>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Updating**

You can update an Ad by making a `POST` request to `/{ad_id}`.

| Parameters          |                |
| :------------------ | :------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`              | `string`       | New name of the ad                                                                                                                                                                                                                                                                                                                                                       |
| `adlabels`          | `list<Object>` | Ad labels associated with this ad.                                                                                                                                                                                                                                                                                                                                       |
| `execution_options` | `list<enum>`   | Default value: `set`. Other options are:                                                                                                                                                                                                                                                                                                                                 |
|                     |                | `validate_only`: when this option is specified, the API call will not perform the mutation but will run through the validation rules against values of each field.                                                                                                                                                                                                       |
|                     |                | `synchronous_ad_review`: this option should not be used by itself. It should always be specified with `validate_only`. When these options are specified, the API call will perform Ads Integrity validations, which include message language checking, image 20% text rule, and so on, as well as the validation logics.                                                 |
|                     |                | `include_recommendations`: this option cannot be used by itself. When this option is used, recommendations for ad object's configuration will be included. A separate section recommendations will be included in the response, but only if recommendations for this specification exist.                                                                                |
|                     |                | If the call passes validation or review, the response will be `{"success": true}`. If the call does not pass, an error will be returned with more details.                                                                                                                                                                                                               |
| `status`            | `enum`         | Options are:                                                                                                                                                                                                                                                                                                                                                             |
|                     |                | `ACTIVE`                                                                                                                                                                                                                                                                                                                                                                 |
|                     |                | `PAUSED`                                                                                                                                                                                                                                                                                                                                                                 |
|                     |                | `DELETED`                                                                                                                                                                                                                                                                                                                                                                |
|                     |                | `ARCHIVED`                                                                                                                                                                                                                                                                                                                                                               |
|                     |                | During testing, it is recommended to set ads to a `PAUSED` status so as to not incur accidental spend.                                                                                                                                                                                                                                                                   |
| `creative`          | `AdCreative`   | The creative spec of the ad creative to be used by this ad. Valid fields are `object_story_spec`, `asset_feed_spec`, and `use_page_actor_override` and can be viewed [here](https://developers.facebook.com/docs/marketing-api/reference/ad-creative). You can read more about creatives [here](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives). |
|                     |                | Provide the creative in the following format:                                                                                                                                                                                                                                                                                                                            |
|                     |                | `{`                                                                                                                                                                                                                                                                                                                                                                      |
|                     |                | `    "creative": {`                                                                                                                                                                                                                                                                                                                                                      |
|                     |                | `      "name": <NAME>, `                                                                                                                                                                                                                                                                                                                                                 |
|                     |                | `      "object_story_spec": <SPEC>,`                                                                                                                                                                                                                                                                                                                                     |
|                     |                | `      "product_set_id": <PRODUCT_SET_ID>`                                                                                                                                                                                                                                                                                                                               |
|                     |                | `    }}`                                                                                                                                                                                                                                                                                                                                                                 |

**Ad Update Example**

```curl
curl -X POST \
  -F 'name=Advantage+ Shopping campaign Sample Update Ad' \
  -F 'creative={"name": <NAME>, "object_story_spec": <SPEC>}' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_ID>
```

## Step 6: Ad Account Controls (Optional)

If your business has constraints, such as unable to show ads to people under a certain age, or is restricted to some countries, you can use Ad Account controls to choose how your ads are delivered. These constraints will apply across all new and existing campaigns (manual sales and ASC) across the account.

You can set the following optional features at the Ad Account Control level:

1.  **Minimum Age Constraint:** You can set the minimum age from 18 to 25. You cannot set the maximum age.
2.  **Exclude Geo Locations:** You can exclude certain locations from ad delivery based on country, state/province, city, DMA or zip code. See [targeting search](https://developers.facebook.com/docs/marketing-api/targeting-search) for available values.
3.  **Geo Inclusions:** You can include locations at the country level.
4.  **Placement Exclusions:** You can exclude certain placements to prevent ads appearing on specific surfaces. Available placements for exclusions are Audience Network, Facebook Marketplace, and Facebook’s Right Column. See [available values on the Marketing API](https://developers.facebook.com/docs/marketing-api/reference/ad-account-business-constraints).

**Step 6a: Define Constraints**

Make a `POST` request to `/act_{ad_account_id}/account_controls`:

- Set `age_min` to a value between 18 - 25

- Exclude locations you do not want your Ads to deliver in using `exclude_geo_locations`

- Exclude ad placements where you do not want your Ads to appear using `placement_exclusions`

- Include a specific country

**Example Request**

```curl
curl -X POST \-F 'audience_controls={
"age_min": 20, 
"excluded_geo_locations": {"countries": ["US"]}' \"geo_locations":{"countries": ["GB"]} \-F 'placement_controls = {"placement_exclusions": ["facebook_marketplace"]} \
-F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/account_controls  
```

**Example Response**

```json
{
  "id": "<ad_account_business_constraints_id>",
  "success": true
}
```

**Learn More**

- [How to Create a Custom Audience](https://developers.facebook.com/docs/marketing-api/guides/custom-audiences)
- [Campaigns](https://developers.facebook.com/docs/marketing-api/guides/campaigns)
- [Ad Sets](https://developers.facebook.com/docs/marketing-api/guides/adsets)
- [Ads](https://developers.facebook.com/docs/marketing-api/guides/ads)
- [Ad Creative](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives)
- [Ad Recommendations](https://developers.facebook.com/docs/marketing-api/reference/ad-recommendations)
- [Ad Creative Object Story Spec](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-object-story-spec)
- [Cross-channel conversion optimization for Advantage+ shopping campaigns](#cross-channel-conversion-optimization-for-advantage-shopping-campaigns)

# Cross-Channel Conversion Optimization for Advantage+ Shopping Campaigns

Cross-channel conversion optimization enables you to optimize conversions for both website and app within a single campaign. Selecting a website and app as the places you want conversions to happen captures more data, which may help lower cost per action (CPA) and can lead to an increase in conversions.

There are no changes at the Campaign level. The changes are at the Ad Set level and Ad level.

## Ad Set

At the Ad Set level, you need to specify the app information in `promoted_object`. To do that, please use `omnichannel_object`, and put it under `promoted_object`.

For omnichannel object validation:

- All `custom_event_type` fields in the app and Pixel must be of the same event.
- Both app SDK and Pixel are required.
- Current ad accounts must have access to all app- and Pixel-promoted objects.

You can now also create Shop Ads with Advantage+ Shopping Campaigns by setting the `destination_type` as `SHOP_AUTOMATIC` on the ad set level and specifying your commerce account ID (`commerce_merchant_settings_id`) in the `omnichannel_object` under `promoted_object`.

| Field    | Description                                                                                                                                                                                                                                            |
| :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `app`    | `list<AppPromotedObject>`                                                                                                                                                                                                                              | App-promoted objects associated with this omnichannel object.                                                                                                                                                                                          |
|          | `application_id`                                                                                                                                                                                                                                       | `string`                                                                                                                                                                                                                                               | Application ID being promoted.                                                       |
|          | `object_store_urls`                                                                                                                                                                                                                                    | `List<string>`                                                                                                                                                                                                                                         | List of object store URLs associated with application_id (Play Store and/or iTunes). |
|          | `custom_event_type` — Advantage+ shopping ad set supports the following events: `PURCHASE`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`, `CONTENT_VIEW`, `COMPLETE_REGISTRATION`, `START_TRIAL`, `SUBSCRIBE`, `SEARCH`. |
|          |                                                                                                                                                                                                                                                        | For app-promoted object validation:                                                                                                                                                                                                                    |
|          |                                                                                                                                                                                                                                                        | All `object_store_urls` must be associated with that application with corresponding `application_id`. You can configure this on [developers.facebook.com](https://developers.facebook.com) under your application settings.                            |
|          |                                                                                                                                                                                                                                                        | `custom_event_type` — Advantage+ shopping ad set supports the following events: `PURCHASE`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`, `CONTENT_VIEW`, `COMPLETE_REGISTRATION`, `START_TRIAL`, `SUBSCRIBE`, `SEARCH`. |
| `pixel`  | `list<PixelPromotedObject>`                                                                                                                                                                                                                            | Pixel-promoted objects associated with this omnichannel object.                                                                                                                                                                                        |
|          | `pixel_id`                                                                                                                                                                                                                                             | `string`                                                                                                                                                                                                                                               | Pixel ID being promoted.                                                             |
|          | `custom_event_type` — Advantage+ shopping ad set supports the following events: `PURCHASE`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`, `CONTENT_VIEW`, `COMPLETE_REGISTRATION`, `START_TRIAL`, `SUBSCRIBE`, `SEARCH`. |
| `onsite` | `list`                                                                                                                                                                                                                                                 | Required for Shops Ads.                                                                                                                                                                                                                                |
|          | `commerce_merchant_settings_id`                                                                                                                                                                                                                        | `String`                                                                                                                                                                                                                                               | Commerce account ID                                                                  |

**Example**

```json
{ 
     daily_budget: 20000, 
     promoted_object: {
         omnichannel_object: { 
             app: [ 
                 { 
                     application_id: <application_id>,
                     custom_event_type: PURCHASE,
                     object_store_urls: [
                         "https://play.google.com/store/apps/details?id=com.facebook.ka"
                         "https://apps.apple.com/us/app/facebook/id284882215",
                     ],
                 },
             ],
             pixel:  [
                 {
                     Pixel_id: <pixel_id>,
                     custom_event_type: PURCHASE
                 },
             ],
         }
     }}
```

## Ad

At the Ad level, you can specify the primary destination and secondary destination that advertisers want users to land on when users click their ad. For example, you may want primary destination as apps, and if apps are not installed on users’ phones, then secondary destination can be website or app store. This destination setting is specified using `applink_treatment`. Advantage+ catalog ads already use these fields..

`applink_treatment` has the following values with the description below:

| Name                              | Description                                                                                                                                                                                                                                     |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web_only`                        | Always send the user to the given web URL.                                                                                                                                                                                                      |
| `deeplink_with_web_fallback`      | If the app is installed on the user's phone and we have corresponding deep link information, send the user to the app. If one of these conditions is not met, send them to the website.                                                         |
| `deeplink_with_appstore_fallback` | Default when app links are present for the product. If the app is installed on the user's phone and we have corresponding deep link information, send the user to the app. If the app is not installed, send them to the app store for the app. |

Advantage+ shopping campaign does not support automatic mode.

There are also opportunities to specify deep links in the apps or website destinations. Learn more about [product deep links](https://www.facebook.com/business/help/1402287436662492).

The way to specify deep links is a little different for catalog ads and non-catalog ads format.

**Catalog Ads**

For catalog ads, the same `applink_treatment` setting can be used. But to specify deep links, `template_url_spec` is used instead of `omnichannel_link_spec`. In this field, you may use dynamic fields such as product URL or ID.

`template_url_spec` follows this specification.

**Example**

```json
{
  "creative": {
    "applink_treatment": "deeplink_with_web_fallback",
    "template_url_spec": {
      "android": {
        "url": "example://product/{{product.retailer_id | urlencode}}"
      },
      "config": {
        "app_id": "<application_id>"
      },
      "ios": {
        "url": "example://product/{{product.name | urlencode}}"
      },
      "web": {
        "url": "https://www.example.com/deeplink/{{product.name | urlencode}}"
      }
    }
  },
  "tracking_specs": [
    {
      "action.type": "offsite_conversion",
      "fb_pixel": "<pixel_id>"
    }
  ]
}
```

**Non-Catalog Ads**

For manual upload ads, we've introduced a new field, `omnichannel_link_spec`, in Creative. It includes the following fields.

| Field | Description                                                     |
| :---- | :-------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `web` | Web configuration                                               |
|       | Pixel-promoted objects associated with this omnichannel object. |
|       | `url`                                                           | `string` | Website that the user lands on via the browser. For web validation, `url` must be the same as the link provided in `link_data`..                                         |
| `app` | App destination configuration                                   |
|       | App-promoted objects associated with this omnichannel object.   |
|       | `application_id`                                                | `string` | App that the user lands on via the browser. For validation, `application_id` must be consistent as the `application_id` in `omnichannel_object` within `promoted_object` |
|       | `platform_specs`                                                | `JSON`   | Landing destination configuration per the platform.                                                                                                                      |

**Platform Specifications**

| Field     | Description |
| :-------- | :---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `android` | `JSON`      | Landing configuration for Android app. For web validation, `ios`, `ipad`, `iphone` are mutually exclusive. There can only be one of those keys that exist in the `platform_specs`.     |
|           | `url`       | `string`                                                                                                                                                                               | Deep link to open the app. [Learn more about product deep links](https://www.facebook.com/business/help/1402287436662492). |
| `ios`     | `JSON`      | Landing configuration for iOS app. For web validation, `ios`, `ipad`, `iphone` are mutually exclusive. There can only be one of those keys that exist in the `platform_specs`.         |
|           | `url`       | `string`                                                                                                                                                                               | Deep link to open the app. [Learn more about product deep links](https://www.facebook.com/business/help/1402287436662492). |
| `ipad`    | `JSON`      | Landing configuration for iPad-only app. For web validation, `ios`, `ipad`, `iphone` are mutually exclusive. There can only be one of those keys that exist in the `platform_specs`.   |
|           | `url`       | `string`                                                                                                                                                                               | Deep link to open the app. [Learn more about product deep links](https://www.facebook.com/business/help/1402287436662492). |
| `iphone`  | `JSON`      | Landing configuration for iPhone-only app. For web validation, `ios`, `ipad`, `iphone` are mutually exclusive. There can only be one of those keys that exist in the `platform_specs`. |
|           | `url`       | `string`                                                                                                                                                                               | Deep link to open the app. [Learn more about product deep links](https://www.facebook.com/business/help/1402287436662492). |

**Example**

```json
{
  “creative”:{
  "applink_treatment": "deeplink_with_web_fallback",
  "omnichannel_link_spec": {
      "web": {
        "url": <web_url>
      },
      "app": {
        "application_id": <application_id>,
        "platform_specs": {
          "android": {
            "url": <android_deeplink>
          }, 
          "ios": {
            "url": <ios_deeplink>
          }
        }
      }
   },
  "object_story_spec": {
    "instagram_user_id": <IG_USER_ID>,
    "page_id": <page_id>,
    "link_data": {
      "call_to_action": {
        "type": "LEARN_MORE",
      },
      "link": web_url,
      "message": "Purchase now!",
      "name": "Sample creative"
    }
  },
  "object_type": "SHARE"}}
```

| Field            | Description                               |
| :--------------- | :---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creative`       | `Creative spec`                           | Required for creation. The ID or creative spec of the ad creative to be used by this ad. [Learn more about ad creatives](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives). |
|                  | `{"creative_id": <creative_id>}`          |
|                  | or creative spec as in the above example. |
| `tracking_specs` | `List of tracking spec`                   | Required tracking spec for conversion tracking. For ad validation, see the required specs below and respective example.                                                                           |

For ad validation:
The tracking spec's (`tracking_specs`) `pixel_id` and `application_id` must be consistent with those in `promoted_object`. `tracking_specs` must include these specs:

| Tracking Spec   | Code Sample                                     |
| :-------------- | :---------------------------------------------- |
| **Pixel**       | `{`                                             |
|                 | `       "action.type": ["offsite_conversion"],` |
|                 | `       "fb_pixel": [<pixel_id>]}`              |
| **App install** | `{`                                             |
|                 | `       "action.type": ["mobile_app_install"],` |
|                 | `       "application": [<application_id>]}`     |
| **App event**   | `{`                                             |
|                 | `       "action.type": ["app_custom_event"],`   |
|                 | `       "application": [<application_id>]}`     |

**Example**

```json
{
     "name": "sample ad"
     "adset_id": "6170648652866",
     "creative": {
         "creative_id": <creative_id>,
    }
    "status": "PAUSED",
    "tracking_specs": [
        {
            "action.type": ["offsite_conversion"],
            "fb_pixel": [<pixel_id>]
        }
        {
            "action.type": ["mobile_app_install"],
            "application": [<application_id>]
        }
        {
            "action.type": ["app_custom_event"],
            "application": [<application_id>]
        }
    ]}
```

## Audience Type URL Parameters

The Urchin Tracking Module\* (UTM) is a standardized system for passing information from ad clicks via destination URL parameters to use in analytics. This means, when a user clicks on an ad, the request url will contain parameters that can be extracted by web plugins like Google Analytics.

At Meta, we allow advertisers to specify UTM parameters at an ad level under the **Tracking** section of the ad creation flow in Ads Manager. Typically, ads can have multiple ad sets per campaign which allows for having different URL parameters for each audience type associated with the ad set. However, Advantage+ shopping campaigns have only one ad set per campaign which is used for both retargeting and prospecting users.

Now, Advantage+ shopping campaigns will support custom audience types — new (prospecting) and existing (retargeting) for URL parameters to provide more context to the ad impressions. More specifically, we allow you to configure three (3) values of the `custom_audience_info` field to enable the audience type URL parameters: `audience_type_param_name`, `new_cusomter_tag`, and `existing_customer_tag`.

This feature is only available once the existing custom audience is set up. When that is completed, these parameters can be set in the Ad Account Settings in the **Advantage+ Shopping Campaigns** section.

**Parameters**

The `custom_audience_info` field extends the `/act_AD_ACCOUNT_ID` node.

| Name                   | Description |
| :--------------------- | :---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `custom_audience_info` | Required.   | **Values:** `audience_type_param_name` and `new_customer_tag` or `existing_customer_tag`                                                                       |
|                        |             | For a successful `POST` call, the `audience_type_param_name` and either the `new_customer_tag` parameter or the `existing_customer_tag` parameter is required. |

**The `custom_audience_info` field**

| Name                       | Description |
| :------------------------- | :---------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `audience_type_param_name` | `string`    | Required.                                                                                                        | **Value:** `audience_type` |
|                            |             | The field name for the URL. Should be a non-empty string containing letters, numbers or underscores.             |
| `new_customer_tag`         | `string`    | Optional.                                                                                                        | **Value:** `prospecting`   |
|                            |             | The field value for new customers. Should be a non-empty string containing letters, numbers or underscores.      |
| `existing_customer_tag`    | `string`    | Optional.                                                                                                        | **Value:** `retargeting`   |
|                            |             | The field value for existing customers. Should be a non-empty string containing letters, numbers or underscores. |

**Examples**

**Retrieve the custom audience info**

**Request**

```curl
curl -X GET -G \
  -d 'fields=custom_audience_info' \
  -d 'access_token=ACCESS_TOKEN' \
https://graph.facebook.com/v24.0/act_AD_ACCOUNT_ID
```

**Response**

```json
{
  "custom_audience_info": {
    "audience_type_param_name": "audience_type",
    "new_customer_tag": "prospecting",
    "existing_customer_tag": "retargeting"
  },
  "id": "act_AD_ACCOUNT_ID"
}
```

**Create new custom audience info**

```curl
curl -i -X POST \
  -H 'Content-Type: application/json' \
  -d '{"custom_audience_info": {"audience_type_param_name": "audience_type", "new_customer_tag": "prospecting", "existing_customer_tag": "retargeting"}}' \
  // Note: new_customer_tag and existing_customer_tag are both shown here for example only
  -d 'access_token=ACCESS_TOKEN' \
  https://graph.facebook.com/v24.0/act_AD_ACCOUNT_ID
```

# Shops Ads with Advantage+ Shopping Campaigns

```json
        "onsite_destinations": [
          {
            "storefront_shop_id": "<SHOP_STOREFRONT_ID>"
          }
        ]
      }' \
  -F 'object_story_spec={ 
    "link_data": { 
      "image_hash": "<IMAGE_HASH>", 
      "link": "<OFFSITE_LANDING_URL>", 
      "message": "try it out" 
    }, 
    "page_id": "<PAGE_ID>",
    "instagram_user_id" : "<IG_USER_ID>" 
  }' \
  -F 'degrees_of_freedom_spec={
      "creative_features_spec": {
        "standard_enhancements": {
          "enroll_status": "OPT_OUT"
        }
      }
    }' \ 
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Advantage+ catalog ads with a carousel format**

To create a carousel ad promoting products from a product set, you can follow [Get Started with Advantage+ Catalog Ads - Step 3: Provide an Ad Creative](#step-3-provide-an-ad-creative-1).

The `page_id` and/or `instagram_user_id` specified in `object_story_spec` must have at least one shop belonging to the commerce account you chose to promote in your ad set or the catalog you chose to promote in your campaign. They must also be connected to the same commerce account.

For the product set in the creative:

- If you are setting up a campaign with `PRODUCT_CATALOG_SALES` as the objective, the product set you choose must belong to the catalog you set in your campaign and must be the same as the product set you choose to promote in your ad set.
- If you are setting up a campaign with `CONVERSIONS` as the objective, the product set you choose must belong to the catalog of the commerce account you choose to promote in your ad set.

The additional features supported for Shops ads are optimizations for shops. If we think that it might improve your ad performance, we will automatically add different optimizations to your ads. To opt-in to this, set `shops_bundle` to `true` in the `asset_feed_spec` of your creative (This includes both automated product tags and reasons to shop at the moment, and potentially other optimizations in the future.)

Current supported shop optimizations are:

- **Automated product tags:** We may automatically tag products in your ad. Product tags send people directly to the relevant product page in your shop.
- **Reasons to shop:** We may automatically highlight product information from your shop, like "Free shipping", "Trending" or "Low stock". We may also add an existing offer, which lets customers save on selected items in your shop.

To opt-in to automated product tags, set `automated_product_tags` to `true` in the `template_data` of the `object_story_spec`. To opt-in to reasons to shop, set `reasons_to_shop` to `true` in the `asset_feed_spec` of your creative.

**Examples of carousel ads promoting a product set with opt-in to fully automated shop optimizations**

**Opting in to `shops_bundle`**

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'product_set_id="<PRODUCT_SET_ID>"' \
  -F 'asset_feed_spec= {
        "shops_bundle": true
      }'\
  -F 'object_story_spec={ 
    "template_data": { 
      "call_to_action":  {
            "type": "SHOP_NOW"
          },
      "link": "<OFFSITE_LANDING_URL>",
      "multi_share_end_card": false,
      "name": "{{product.name}}"
    }, 
    "page_id": "<PAGE_ID>",
    "instagram_user_id": "<IG_USER_ID>" 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Opting in to `automated_product_tags`**

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'product_set_id="<PRODUCT_SET_ID>"' \
  -F 'object_story_spec={ 
        "template_data": {
          "automated_product_tags": true
          "call_to_action":  {
            "type": "SHOP_NOW"
          },
          "link": "<OFFSITE_LANDING_URL>",
          "multi_share_end_card": false,
          "name": "{{product.name}}"
        }, 
        "page_id": "<PAGE_ID>",
        "instagram_user_id": "<IG_USER_ID>"
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives 
```

**Opting in to `reasons_to_shop`**

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'product_set_id="<PRODUCT_SET_ID>"' \
  -F 'asset_feed_spec= {
        "reasons_to_shop": true
      }'\
  -F 'object_story_spec={ 
    "template_data": { 
      "call_to_action":  {
            "type": "SHOP_NOW"
          },
      "link": "<OFFSITE_LANDING_URL>",
      "multi_share_end_card": false,
      "name": "{{product.name}}"
    }, 
    "page_id": "<PAGE_ID>",
    "instagram_user_id": "<IG_USER_ID>" 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Note:**

- Shops ads does not support categories for Advantage+ catalog ads.
- Automated product tags optimization is only supported on Instagram.

**Advantage+ creative for catalog**

Shops ads also support Advantage+ creative for catalog. This feature displays different formats and ad creatives to different Account Center accounts based on what they are most likely to respond to.

You can follow the instructions in [Advantage+ Creative for Catalog - Step 3: Provide Ad Creative](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative/advantage-catalog-ads#provide-ad-creative) to set up your creative.

The `page_id` and/or `instagram_user_id` specified in `object_story_spec` must have at least one shop belonging to the commerce account you chose to promote in your ad set or the catalog you chose to promote in your campaign. They must also be connected to the same commerce account.

For the product set in the creative:

- If you are setting up a campaign with `PRODUCT_CATALOG_SALES` as the objective, the product set you choose must belong to the catalog you set in your campaign and must be the same as the product set you choose to promote in your ad set.
- If you are setting up a campaign with `CONVERSIONS` as objective, the product set you choose must belong to the catalog of the commerce account you choose to promote in your ad set.

**Example of an Advantage+ creative for catalog**

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'product_set_id="<PRODUCT_SET_ID>"' \
  -F 'asset_feed_spec= {
    "optimization_type":"FORMAT_AUTOMATION",
    "ad_formats": ["CAROUSEL", "COLLECTION"],
    "images": [{"hash": "<CUSTOMIZED_IMAGE_HASH>"}],
    "descriptions": [{"text": "{{product.description}}", "From {{product.current_price}}", ...]
    } 
   }'\
  -F 'object_story_spec={ 
    "template_data": { 
      "call_to_action":  {
            "type": "SHOP_NOW"
          },
      "link": "<OFFSITE_LANDING_URL>",
      "multi_share_end_card": false,
      "name": "{{product.name}}"
    }, 
    "page_id": "<PAGE_ID>",
    “instagram_user_id” : “<IG_USER_ID>” 
  }' \
  -F 'degrees_of_freedom_spec={
      "creative_features_spec": {
        "standard_enhancements": {
          "enroll_status": "OPT_OUT"
        }
      }
    }' \ 
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Step 4: Create an ad**

Finally, you can create an ad referencing an ad creative.

```curl
curl \
-F 'status=PAUSED' \
-F 'name=Test' \
-F 'adset_id=<ADSET_ID>' \
-F 'creative= {
       "creative_id": "<CREATIVE_ID>"
    },
}' \
-F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads 
```

**Shops ads with Advantage+ Shopping Campaigns**

Shops ads are supported together with Advantage+ shopping campaigns, which is believed to drive an even better performance when combined together.

To create an Advantage+ shopping campaign with Shops ads, follow the steps in [Advantage+ Shopping Campaigns - Step 2: Create Campaign](#step-2-create-campaign-1) to create a campaign first.

When creating an ad set for Advantage+ shopping campaigns with Shops ads, similar to Shops ads alone, set the `destination_type` to be `SHOP_AUTOMATIC` and specify your commerce account in `promoted_object`.

```curl
curl \
  -F 'name=Advantage+ Shopping Adset' \
  -F 'bid_amount=3000' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'daily_budget=15000' \
  -F 'bid_strategy=LOWEST_COST_WITHOUT_CAP' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={"geo_locations": {"countries":["US"]}}' \
  -F 'destination_type=SHOP_AUTOMATIC' \
  -F 'promoted_object={"omnichannel_object":{"onsite":[{"commerce_merchant_settings_id":"<COMMERCE_ACCOUNT_ID>"}],"pixel":[{"pixel_id": "<PIXEL_ID>","custom_event_type": "PURCHASE"}]}}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

See [Cross-Channel Conversion Optimization for Advantage+ Shopping Campaigns](#cross-channel-conversion-optimization-for-advantage-shopping-campaigns) for more information.

When creating a creative and an ad for Advantage+ shopping campaigns with Shops ads, the spec is the same as Shops ads alone. See [Step 3: Provide a creative](#step-3-provide-an-ad-creative-1) above for more detail.

## Commerce Eligibility for Shops Ads

In order to get relevant IDs for Shops ads, you need to the `catalog_management` permission from your client.

To create Shops ads for a Page, the Page has to have an onsite visible shop. You can get this from

```curl
curl -i -X GET \
"https://graph.facebook.com/v24.0/<PAGE_ID>/commerce_merchant_settings?fields=id,shops{id,fb_sales_channel{status,fb_page{id,name}},is_onsite_enabled,shop_status}&access_token=<PAGE_ACCESS_TOKEN>"
```

**Sample Response**

```json
{
  "id":"<commerce_account_id>",
  "shops": {
    "data": [
      {
        "fb_sales_channel": {
          "status": "STAGING",
          "fb_page": {
            "name": "Page 1",
            "id": "<page_id>"
          }
        },
        "id": "<shop_id_1>",
        "is_onsite_enabled": true,
        "shop_status": "INACTIVE"
      },
      {
        "fb_sales_channel": {
          "status": "ENABLED",
          "fb_page": {
            "name": "Page 2",
            "id": "<page_id>"
          }
        },
        "id": "<shop_id_2>",
        "is_onsite_enabled": true,
        "shop_status": "ACTIVE"
      }
    ],    
    // …
}
```

For the Page you wish to create Shops ads with, check if both `is_onsite_enabled` is `true` and `shop_status` is `ACTIVE`. If so, you will be able to create Shops ads for the Page through the instructions in the rest of this guide.

## Get Commerce IDs for Creating Shops Ads

To create a Shops ad for a Page, you need:

- Commerce Account ID (for [Step 2: Create an ad set](#step-2-create-an-ad-set-1))
- Catalog ID (for [Step 1: Create a campaign](#step-1-create-an-ad-campaign))
- Product set ID (for [Step 2: Create an ad set](#step-2-create-an-ad-set-1) or Advantage+ catalog ads with a carousel format)
- Shop ID (for Carousel Ads or Image/Video Ads)
- Product ID (for Carousel Ads or Image/Video Ads)

You can get the Commerce Account ID and Shop ID by running the previous query.

```curl
curl -i -X GET \
"https://graph.facebook.com/v24.0/<PAGE_ID>/commerce_merchant_settings?fields=id,shops{id,fb_sales_channel{fb_page{id,name}}}&access_token=<PAGE_ACCESS_TOKEN>"
```

A commerce account might have multiple shops, you need to get the one with the Page you want to create Shops ads with.

For catalog ID, product set ID and product ID

```curl
curl -i -X GET \
"https://graph.facebook.com/v24.0/<PAGE_ID>/commerce_merchant_settings?fields=id,product_catalogs{id,product_sets}&access_token=<PAGE_ACCESS_TOKEN>"
```

**Sample Response**

```json
{
  "id": "<commerce_account_id>",
  "product_catalogs": {
    "data": [
      {
        "id": "<product_catalog_id>",
        "product_sets": {
          "data": [
            {
              "id": "<product_set_id>",
              "name": "Product Set 1",
              "filter": "{\"product_item_id\":{\"is_any\":[]}}"
            }
          ]
        }
      }
    ]
  }
}
```
