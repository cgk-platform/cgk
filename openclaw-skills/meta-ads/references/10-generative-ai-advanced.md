<\!-- Source: META-ADS-API-GUIDE.md, Lines 9783-11284 -->

# Get Started with the Generative AI Features on Marketing API

## API support for Generative AI features

Advertisers are responsible for previewing ad creative featuring AI-generated creatives before publishing their ads. See [preview configuration instructions](#step-2-preview-for-text-generation).

Meta does not make any warranties regarding the completeness, reliability, and accuracy of the suggested text generations, generated backgrounds, or expanded images. If you use Marketing API to access our Generative AI features outlined below, the [Ad Creative Generative AI Terms](https://www.facebook.com/legal/commerce_product_seller_terms/ad_creative_generative_ai_terms) apply in addition to the Meta [Platform Terms](https://www.facebook.com/legal/commerce_product_seller_terms/general_terms) and [Developer Policies](https://developers.facebook.com/policy/details/).

This document shows you how to use text generation, image expansion, and background generation generative AI features for ads.

## Before You Begin

You need to follow these steps to set up your ad campaigns with Meta generative AI features.

- [Create a Campaign](#create-an-ad-campaign)
- [Create an Ad Set](#create-an-ad-set)
- [Create the Ad or a standalone Creative](#step-1-create-an-ad-or-creative-opted-in-to-text-generation)
- [Preview the Creative](#step-2-preview-for-text-generation)
- [Enable the Ad](#step-3-set-the-adgroup-status-to-active)

## Text Generation

Text variations are generated with AI inspired by your original primary text, your previous ads, or content from your business Page to help make suggestions more relevant. Adding more text options to your ad can help customize your creative and reduce creative fatigue which can help increase performance. Learn more about this feature [here](https://www.facebook.com/business/help/380695076296338).

**Step 1: Opt-in to use Text Generation when creating the ad**

You can create an ad through the `/ads` endpoint or create a standalone creative through the `/adcreatives` endpoint. Opt-in to the feature only applies to the ad or creative created in the current request. In either approach, opt-in to use the **Text Generation** feature by:

- Providing a primary text in the `message` field in the `object_story_spec`
- Opting in to use `text_generation`

See example requests below:

**Opt-in through `/adcreatives` endpoint**

```curl
curl -X POST \
  -F 'name=Text Gen Creative' \
  -F 'object_story_spec={
      "link_data": {
         "image_hash": "<IMAGE_HASH>", 
         "link": "<URL>", 
         "message": "<PRIMARY_TEXT_HERE>",  <--- Primary Text Here
      },
      "page_id": "<PAGE_ID>"
  }' \
  -F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "text_generation": {
        "enroll_status": "OPT_IN"
      }
    }
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

Or you can create an ad object with the `act_<AD_ACCOUNT_ID>/ads` endpoint:

**Opt-in through `/ads` endpoint**

```curl
curl \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
    "name": "Text Gen Adgroup",
    "object_story_spec": {
      "link_data": {
         "image_hash": "<IMAGE_HASH>", 
         "link": "<URL>", 
         "message": "<PRIMARY_TEXT_HERE>",  <--- Primary Text Here
      },
      "page_id": "<PAGE_ID>"
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "text_generation": {
          "enroll_status": "OPT_IN"
        }
      }
    }
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Step 2: Preview for Text Generation**

When an ad is created with opt-in to use `text_generation`, the feature will only be applied to the current ad, and generated primary texts will be inserted to the creative spec. If the feature was opted-in through the `/ads` endpoint, the `status` field on the adgroup will be set to `PAUSED` by default (see [documentation](https://developers.facebook.com/docs/marketing-api/guides/ads)). You can review the generated suggestions before manually setting the ad’s status to `ACTIVE` so it can be delivered.

The creative spec containing generated suggestions can be previewed by reading the `asset_feed_spec` through the creative ID or the ad ID. See example request and response below:

Start by querying `asset_feed_spec` of your standalone ad creative created in step 1.

- **Request**

  ```curl
  // request from creative
  curl -X GET -G \
    -d 'fields=asset_feed_spec' \
    -d 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/<CREATIVE_ID>
    // request from ad
  curl -X GET -G \
    -d 'fields=creative{asset_feed_spec,status}' \
    -d 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/<AD_ID>
  ```

- **Response**

      ```json
      {

    "asset_feed_spec": {
      "bodies": [
        {
          "text": "Buy some cool LED TV at cheap price"
        },
        {
          "text": "Get your dream LED TV at an unbeatable price! Buy now and save big!"
        },
        {
          "text": "Get the best LED TV deals! 📺 Save money and upgrade your entertainment."
        },
        {
          "text": "Get an LED TV at a low cost! Cheap, high-quality options are available."
        },
        {
          "text": "Get LED TVs at affordable prices  ✨  !"
        }
      ],
      "optimization_type": "DEGREES_OF_FREEDOM"
    },
    "id": "<CREATIVE_ID>"}
  ```

Once the suggestions have been reviewed and appear acceptable to publish, please move on to [Step 3](#step-3-set-the-adgroup-status-to-active) to set the ad to `ACTIVE`. If any of the generated suggestions are not acceptable, please create a new ad or creative without opt-in to Text Generation:

**Create creative without opt-in to Text Generation**

```curl
curl -X POST \
  -F 'name=Text Gen Creative' \
  -F 'object_story_spec={
      "link_data": {
         "image_hash": "<IMAGE_HASH>", 
         "link": "<URL>", 
         "message": "<PRIMARY_TEXT_HERE>",
      },
      "page_id": "<PAGE_ID>"
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Step 3: Set the adgroup status to ACTIVE**

After you have verified the generated text suggestions, you can set the `status` of the ad to `ACTIVE`. This step needs to be done in both cases:

- When an ad opts in to the feature through the `/ads` endpoint
- If the ad is the first ad to use an existing creative with opt-in to text generation.

- **Request**

  ```curl
  curl \
    -F 'status=ACTIVE' \
    -F 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/<AD_ID>
  ```

## Image Expansion

Automatically expand your image to fit more placements.

**Step 1: Create an ad or creative opted-in to image expansion**

You can create an ad through the `/ads` endpoint or create a standalone creative through the `/adcreatives` endpoint. In either approach, opt-in to use the **Image Expansion** feature in the creative spec (see examples below).

- **Request**

  ```curl
  // creative example
  curl -X POST \
    -F 'name=Image Expansion Creative' \
    -F 'degrees_of_freedom_spec={
      "creative_features_spec": {
        "image_uncrop": {
          "enroll_status": "OPT_IN"
        }
      }
    }' \
    -F 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
    // ad example
  curl \
    -F 'adset_id=<ADSET_ID>' \
    -F 'creative={
      "name": "Image Expansion Adgroup",
      "object_story_spec": {
        "link_data": {
           "image_hash": "<IMAGE_HASH>", 
           "link": "<URL>", 
           "message": "You got this.",
        },
        "page_id": "<PAGE_ID>"
      },
      "degrees_of_freedom_spec": {
        "creative_features_spec": {
          "image_uncrop": {
            "enroll_status": "OPT_IN"
          }
        }
      }
    }' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
  ```

**Step 2: Preview for Image Expansion**

This feature is supported for `INSTAGRAM_STANDARD`, `FACEBOOK_REELS_MOBILE`, `INSTAGRAM_REELS`, `MOBILE_FEED_STANDARD`, `INSTGRAM_STORY` placements. To look at a preview for these placements, make a `GET` request to the `/<AD_ID>/previews` endpoint.

If any of the generated images are not acceptable, please re-create the ad or creative without opt-in to Image Expansion:

- Set the `creative_feature` as `image_uncrop`.
- Re-request the preview if the `status` shows as `pending`.

**Note:** If a `transformation_spec` node is not shown, that means the creative is not eligible for image expansion.

- **Request**

  **`INSTAGRAM_STANDARD`**

  ```curl
  curl -X GET -G \
    -d 'ad_format=INSTAGRAM_STANDARD' \
    -d 'creative_feature=image_uncrop' \
    -d 'access_token=/<ACCESS_TOKEN>' \
    https://graph.facebook.com/v19.0/<AD_ID>/previews
  ```

  **`FACEBOOK_REELS_MOBILE`**

  ```curl
  curl -X GET -G \
    -d 'ad_format=FACEBOOK_REELS_MOBILE' \
    -d 'creative_feature=image_uncrop' \
    -d 'access_token=/<ACCESS_TOKEN>' \
    https://graph.facebook.com/v19.0/<AD_ID>/previews
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "body": "<iframe src='<PREVIEW_URL>'></iframe>",
        "transformation_spec": {
          "image_uncrop": [
            {
              "body": "<iframe src='<PREVIEW_URL>'></iframe>",
              "status": "eligible"
            }
          ]
        }
      }
    ]}
  ```

**(Optional) Direct preview without ad creation**

You can also request a preview using the `act_<AD_ACCOUNT_ID>/generatepreviews` endpoint without actually creating an ad.

- **Request**

  **`FACEBOOK_REELS_MOBILE`**

  ```curl
  curl -X GET -G \
    -d 'ad_format=FACEBOOK_REELS_MOBILE' \
    -d 'creative_feature=image_uncrop' \
    -d 'creative={
         "object_story_spec": {
           "page_id": "<PAGE_ID>",
            "link_data": {
              "image_hash": "<IMAGE_HASH>",
              "link": "<WEBSITE_LINK>"
            }
          }
       }'
    -d 'access_token=<ACCESS_TOKEN>'
    https://graph.facebook.com/v19.0/act_<AD_ACCOUNT_ID>/generatepreviews
  ```

## Background Generation

We'll create different backgrounds for eligible product images and deliver the version that your audience is most likely to respond to. These backgrounds were created based on your original asset.

**Step 1: Create an ad or creative opted-in to background generation**

Background generation currently only works with dynamic product ads or Advantage+ catalog ads on Mobile Feed.

You can create an ad through the `/ads` endpoint or create a standalone creative through the `/adcreatives` endpoint. In either approach, opt-in to use the **Background Generation** feature in the creative spec (see examples below).

- **Request**

  ```curl
  // creative example
    curl -X POST \
    -F 'name=Background Gen Creative' \
    -F 'degrees_of_freedom_spec={
      "creative_features_spec": {
        "image_background_gen": {
          "enroll_status": "OPT_IN"
        }
      }
    }' \
    -F 'product_set_id=<PRODUCT_SET_ID>'
    -F 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives// ad example
  curl \
    -F 'adset_id=<ADSET_ID>' \
    -F 'creative={
      "name": "Background Gen Adgroup",
      "object_story_spec": {
        "page_id": "<PAGE_ID>",
        "template_data": {
          "description": "Description {{product.description}} ",
          "link": "https://www.example.com/",
          "message": "Test {{product.name | titleize}} ",
          "name": "Headline {{product.price}}"
        }
      },
      "product_set_id": "<PRODUCT_SET_ID>",
      "degrees_of_freedom_spec": {
        "creative_features_spec": {
          "image_background_gen": {
            "enroll_status": "OPT_IN"
          }
        }
      }
    }' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
  ```

**Step 2: Preview for Background Generation**

With opt-in to the feature, we will create different backgrounds for eligible product images and deliver the version that your audience is most likely to respond to. Feature opt-in only applies to the ad created in the current request. These backgrounds are created based on your original asset, featuring different colors or patterns for eligible product images. You will see a static or live preview of your generated background depending on catalog eligibility.

If any of the generated backgrounds are not acceptable, please re-create the ad or creative without opt-in to Background Generation.

- Preview is currently supported only the `MOBILE_FEED_STANDARD` placement
- Set the `creative_feature` as `image_background_gen`
- If the live preview for your catalog products is not ready, a stock preview is shown with `status` set to `PENDING`

- **Request**

  **`MOBILE_FEED_STANDARD`**

  ```curl
  curl -X GET -G \
    -d 'ad_format=MOBILE_FEED_STANDARD' \
    -d 'creative_feature=image_background_gen' \
    -d 'access_token=/<ACCESS_TOKEN>' \
    https://graph.facebook.com/v19.0/<AD_ID>/previews
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "body": "<iframe src='<PREVIEW_URL>'></iframe>",
        "transformation_spec": {
          "image_background_gen": [
            {
              "body": "<iframe src='<PREVIEW_URL>'></iframe>",
              "status": "eligible" // or one of "pending", "ineligible"
            }
          ]
        }
      }
    ]}
  ```

**(Optional) Direct preview without ad creation**

You can also request a preview of a creative using the `/<AD_CREATIVE_ID>/previews` endpoint without actually creating an ad.

- **Request**

  **`MOBILE_FEED_STANDARD`**

  ```curl
  curl -X GET -G \
    -d 'ad_format=MOBILE_FEED_STANDARD' \
    -d 'creative_feature=image_background_gen' \
    -d 'access_token=<ACCESS_TOKEN>'
    https://graph.facebook.com/v19.0/<AD_CREATIVE_ID>/generatepreviews
  ```

- **Response**

      ```json
      {

    "data": [
      {
        "body": "<iframe src='<PREVIEW_URL>'></iframe>",
        "transformation_spec": {
          "image_background_gen": [
            {
              "body": "<iframe src='<PREVIEW_URL>'></iframe>",
              "status": "eligible" // or one of "pending", "ineligible"
            }
          ]
        }
      }
    ]}
  ```

## About AI transparency

Ad images created or materially edited with certain Meta generative AI creative features available in our marketing tools may include AI info within the three-dot menu of an ad or have an AI info label next to the **Sponsored** label. [Learn about generative AI transparency for ads](https://www.facebook.com/business/help/807802100808240).

# Collaborative Ads

Collaborative Ads is a solution built on top of Advantage+ catalog ads. It enables brand advertisers to safely collaborate with a retailer or a marketing partner and achieve advertising goals such as target product for sales using retailer-provided content.

The retailer or marketing partner should share a catalog segment with the brand advertiser with all their products. This segment is a portion of their catalog or a superset of product sets. The brand advertiser can then accept this catalog segment and start running Advantage+ catalog ads using this catalog segment. Brand advertisers cannot edit the catalog segment but they can create their own product sets from it.

An advertiser essentially runs a Advantage+ catalog ads campaign for catalog sales with a product catalog. Therefore they can use standard Facebook ads reports which now include metrics related to the catalog segment.

In addition, you can use product-level reporting and retailer-level reporting to show only the brand’s purchases to the brand advertiser.

## High-Level Steps

**For retailers and marketing partners:**

- Step 1: Onboard into Collaborative Ads
- Step 2: Create Catalog Segment - The segment must contain products belonging to one of its prospective brand partners.
- Step 3: Share Catalog Segment with Brand Partner
- (For Marketing Partners Only) Step 4: Provide Discovery Tools for Brands

**For brands:**

- Step 1: Accept Catalog Segment
- Step 2: Create Ad Campaign with Catalog Segment
- Step 3: View Reporting - View reporting related to the products in the catalog segment.
- Optional Step 4: Debugging - Use tools to diagnose and resolve problems, see [Advantage+ catalog ads, Debugging Tools](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads/debugging-tools).

## Steps For Retailers and Marketing Partners

**Step 1: Onboard into Collaborative Ads**

To complete this step, your app needs `business_management` and `catalog_management` permissions.

Currently, this is not supported via API, and must be completed via UI. To start this process, click **‘Become a Retail Partner’** in the [Collaborative Ads Retailer Directory](https://www.facebook.com/business/help/861780820612984).

**Step 2: Create Catalog Segment**

To complete this step, your app needs `business_management` and `catalog_management` permissions.

Create a catalog segment from one of your existing catalogs. The segment must contain all the products you would like to share with your brand partner.

To create a catalog segment via API, make a `POST` request to the `owned_product_catalogs` edge. The following fields are required for catalog segment creation:

- `parent_catalog_id`: The parent catalog from which your segment was created. This catalog needs to be Collaborative Ads compliant. You can find your catalog’s status in Commerce Manager.
- `catalog_segment_filter`: A JSON-encoded rule used to create the catalog segment.

**Step 3: Share Catalog Segment**

To complete this step, your app needs `business_management` and `catalog_management` permissions.

Share your catalog segment with your brand partner. To do this via API, make a `POST` request to `/{catalog_segment_id}/agencies`. In your call, you can add the following fields:

| Field                  | Description                                                                                   |
| :--------------------- | :-------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `business`             | **type: numeric string or integer**                                                           | Required.                                               | ID for the business the catalog will be shared with.                                                                                                         |
| `permitted_tasks`      | **type: array < enum {MANAGE, ADVERTISE} >**                                                  | Required.                                               | Tasks the business will be allowed to execute. Available options are: `['ADVERTISE', 'MANAGE']`.                                                             |
| `utm_settings`         | **type: JSON object {enum{campaign_source,campaign_medium,campaign_name}: string}**           | Optional.                                               | You can specify `campaign_source`, `campaign_medium`, and `campaign_name`.                                                                                   |
|                        |                                                                                               | For example: `{campaign_source: “fb_campaign_source”}`. |
| `enabled_collab_terms` | **type: array < enum {ENFORCE_CREATE_NEW_AD_ACCOUNT, ENFORCE_SHARE_AD_PERFORMANCE_ACCESS} >** | Optional.                                               | Collaboration terms to be enforced on new brand partners. Available options are: `['ENFORCE_CREATE_NEW_AD_ACCOUNT', 'ENFORCE_SHARE_AD_PERFORMANCE_ACCESS']`. |

**(For Marketing Partners Only) Step 4: Provide Discovery Tools for Brands**

To complete this step, your app needs the `business_management` permission. The API call must include a user access token and that user needs to have permission on the suggested partner, business, or collaboration request.

As a marketing partner, you should provide a way for brands to discover possible Collaborative Ads partners. You can use the following endpoints to find retailers to work with:

- `GET {business-id}?fields=collaborative_ads_suggested_partners` — Find partners for a specific business.
- `GET collaborative_ads_directory?fields=collaborative_ads_merchants` — Get the complete list of collaborative ads retailers.
- `GET {cpas-advertiser-partnership-recommendation-id}?fields=advertiser_business_id,brand_business_id,brands,countries,merchant_business_id,status,status_reason` — Get one single retailer recommendation.

If a brand finds a partner, you can reach out to the retailer with a collaboration request. Do that by making the following `POST` request to `/{cpas-collaboration-request-id}`:

`{business-id}/collaborative_ads_collaboration_requests?
brands=”[“[BRAND NAME]”, “[BRAND NAME 2]”]”&
contact_email=[CONTACT_EMAIL]&
contact_first_name=[CONTACT_FIRST_NAME]&
contact_last_name=[CONTACT_LAST_NAME]&
phone_number=[PHONE NUMBER]&
receiver_business=[RECEIVING BUSINESS ID]
requester_agency_or_brand=[REQUESTING ENTITY - AGENCY, BRAND or MERCHANT]`

Keep track of your reach outs with the following endpoints:

- `GET {business-id}/collaborative_ads_collaboration_requests`
- `GET {cpas-collaboration-request-id}?fields=phone_number,receiver_business,request_type,source,status`

## Steps For Brands

**Step 1: Accept Catalog Segment**

If your brand has not accepted the Terms of Service for the new shared business, you must do so.
After receiving the shared asset, the business admin user needs to:

- Go to the [Collaboration Center](https://business.facebook.com/collaboration_center).
- Select the business you're accepting Terms of Service for.
- Select **Partners** from the left side navigation.
- Click the **Accept assets** button to begin the acceptance workflow.

After accepting the terms, your brand can add people to the catalog segment using the `/{product-catalog-id}/assigned_users` endpoint. **Note:** This requires the `business_management` permission.

In addition to accepting the terms of service, brands may also be required to agree to retailer-mandated collaboration terms; creating a new ad account and/or granting view access so the retailer can see ad performance. It is necessary to accept these terms in order to complete onboarding.

**Step 2: Create Ad Campaign**

To complete this step, your app needs `business_management` and `ads_management` permissions.

Your brand can use the accepted catalog segment to create ad campaigns. You should use a separate ad account for each retailer you want to run Collaborative Ads for. Once the dedicated ad account is linked to a retailer, it can only select catalog segments belonging to that specific retailer.

To create and run ads you do as you normally do for your own product catalog, however you should provide `catalog_segment_ID` instead of a catalog ID:

```curl
curl \
  -F 'name=Product Catalog Sales Campaign' \
  -F 'objective=PRODUCT_CATALOG_SALES' \
  -F 'promoted_object={"product_catalog_id":"<CATALOG_SEGMENT_ID>"}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/campaigns
```

On success, you get a new ad campaign ID:

`{"id": "<CAMPAIGN_ID>"}`

There are four fields which you can normally set with Advantage+ catalog ads which you cannot with a catalog segment:

- `multi_share_end_card` is set to `false` by default and you cannot change
- You cannot change `description` in `template_data`
- `template_url_spec` which you can use for deeplink URLs must point to merchant's website
- Custom tracking specs are disabled

**Step 3: View Reports**

Once the ads are running, Brand Advertisers can get metrics on how ads are performing. We have several new insights metrics at different ad object levels. See `catalog_segment_value` and related metrics for:

- Ad Account
- Ad Campaign
- Ad Set
- Ad

`catalog_segment_value` includes a breakdown of the conversion events, including purchases, add-to-carts and view products for the catalog segment at each ad object level. It aggregates events across website, mobile and omni-channel sources. Learn more about [Estimated and In-Development Insights Metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated).

**Step 4: Debug and Diagnose Issues**

Brands should now troubleshoot and debug any issues running their Advantage+ catalog ads for the catalog segment.

See [Advantage+ Catalog Ads Debugging Tools](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads/debugging-tools).

## Insights

The following [estimated metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated) are related to Collaborative Ads —see [About Estimated, In development, and Third-party metrics](https://developers.facebook.com/docs/marketing-api/insights/metrics#estimated).

To query any of our reporting metrics:

- Your app needs to have `ads_management` and `business_management` permissions. See [App Review](https://developers.facebook.com/docs/apps/review).
- You need to have a [user access token](https://developers.facebook.com/docs/facebook-login/access-tokens) and this user must be allowed to view reporting for the ad account in question.
- Queries can be made on the following objects: ad account, ad campaign, ad set, and ad.
- The `action_converted_product_id` breakdown is not supported on the ad account level.

| Metric                                        | Description                                                                                                                                                                                                                                                 |
| :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog_segment_value`                       | Value from conversion events, including a breakdown of purchases, add-to-carts and view products for the catalog segment at each ad object level.                                                                                                           |
| `catalog_segment_value_omni_purchase_roas`    | Total return on ad spend (ROAS) from purchases of items shared between Brand and Retailer. This number is based on information received from one or more Retailer' connected Facebook Business Tools. The amount is attributed to your ads.                 |
| `catalog_segment_value_website_purchase_roas` | Total return on ad spend (ROAS) from website purchases of items shared between Brand and Retailer. This number is based on information received from one or more Retailers' connected Facebook Business Tools. The amount is attributed to your ads.        |
| `catalog_segment_value_mobile_purchase_roas`  | The total return on ad spend (ROAS) from mobile app purchases of items shared between Brand and Retailer. This number is based on information received from one or more Retailers' connected Facebook Business Tools. The amount is attributed to your ads. |
| `catalog_segment_actions`                     | Similar to `catalog_segment_value`, when using this metric a breakdown of actions is given for the catalog segment at each ad object level.                                                                                                                 |
| `converted_product_value`                     | Value of conversions driven by your ads for a given product ID. This number is recorded by your Retailer partner's Pixel or App SDK.                                                                                                                        |
|                                               | The API only returns Product IDs —see `/{product-item-id}` for information. If you want to get brand names as well, please use Ads Manager.                                                                                                                 |
| `converted_product_quantity`                  | Quantity of conversions driven by your ads for a given product ID. This number is recorded by your Retailer partner's Pixel or App SDK.                                                                                                                     |
|                                               | The API only returns Product IDs —see `/{product-item-id}` for information. If you want to get brand names as well, please use Ads Manager.                                                                                                                 |

**Breakdowns**

Breakdowns are used to group your insights results into different sets —see [Breakdowns](#insights-api-breakdowns). You can use following breakdowns with Collaborative Ads metrics:

- **Date:** Get insights for a specific date range. To use this breakdown, add `time_range` to your query. For example: `&time_range[since]=2020-03-01&time_range[until]=2020-04-01`.
- **Product Level:** Get insights for a specific product. Use this breakdown for `converted_product_value` and `converted_product_quantity` metrics by adding `&action_breakdowns=action_converted_product_id` to your query.

**Combining Breakdowns**

Use the following combining breakdowns for Collaborative Ads:

The `action_converted_product_id` breakdown is not supported on the ad account level.

- `action_converted_product_id`
- `action_type`, `action_converted_product_id`

# Managed Partner Ads

Managed Partner Ads is primarily an API-based solution from [Collaborative Ads](#collaborative-ads) for marketplaces to run ads on behalf of their sellers as a monetizable service at scale.

Marketplaces can help run Meta ads on behalf of sellers who typically lack the expertise or resources to do it on their own. This also allows them to apply insights captured from onsite and offsite data to optimize seller campaigns, which can help target seller ads to high intent customers. This results in greater exposure of small, unknown seller businesses via brand equity of the marketplace.

Sellers interact with the ad service exclusively through the marketplace’s dedicated, self-contained and built surface, and not through a Meta onsite experience. This allows the marketplace to control and manage all aspects of the seller ads ecosystem, even though the ads appear offsite on Facebook.

To get started, please review the [Get Started](#managed-partner-ads-integration) section and follow the link to the [Integration page](#managed-partner-ads-integration).

## Benefits

Some of the key benefits listed for both Marketplaces and Sellers:

**Marketplace**

- Get more traffic and sales on your eCommerce site by empowering your sellers on running Meta ads
- Have an additional revenue stream by monetizing through an optional service fee
- Monitor all seller marketing activity on Meta through Collaboration Center, a platform powered by Meta
- Measure the impact of seller-funded campaigns on sales
- Apply insights captured from onsite and offsite data to optimize seller campaigns, which can help target seller ads to high intent customers
- Build a custom interface for sellers to engage your services by utilising the Managed Partner Ads APIs

**Seller**

- Enable more online discovery and sales of products where people already spend their time
- Boost exposure and brand image of small, unknown seller businesses via brand equity of the marketplace host
- Reduce the operational and creative cost of running ads by enabling marketplaces to run it for them
- Requires no Meta Pixel or Meta SDK implementation on the sellers’ side
- Measure the impact of marketplace-run ads

## Terminology

The common terminology referenced in our API documentation/reference.

| Term                                 | Description                                                                                                                                                                                           |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace (Parent) or Retailer** | Platforms that bring consumers and sellers together exclusively online. They often stock and sell products from different brands. This is sometimes referred to as "parent" in our API documentation. |
| **Seller (Child)**                   | Businesses that sell their products through marketplaces and/or retailers. This is sometimes referred to as "child" in our API documentation.                                                         |
| **Access Token**                     | A unique-string generated by Meta to allow developers to make Meta API calls from their application.                                                                                                  |
| **Admin System User**                | An admin system user from the marketplace Business Manager that is a financial editor and an admin on the marketplace/parent catalog.                                                                 |

## Get Started

There are three main steps to start the integration process for Managed Partner Ads:

- **Preparation** - ensure you meet all the minimum requirements to be eligible for Managed Partner Ads
- **Integration** - start building the integration for your sellers using our APIs
- **Launch** - communicate and launch this service to your sellers

To understand these steps in more detail, please review the [Integration Section](#managed-partner-ads-integration) of the Managed Partner Ads developer documentation to start the integration process.

# Managed Partner Ads: Integration

## Overview

There are three main steps involved in the overall Managed Partner Ads integration process, as outlined below. This section provides an overview to help you understand and plan your work accordingly.

The end-goal is to set up an automated process to onboard your sellers and build an interface for sellers to engage with. Through this service, Meta ads are run and operated.

## Step 1: Preparation

- Onboard into Collaborative Ads. To start this process, click **Become a Retail Partner** in the [Collaborative Ads Retailer Directory](https://www.facebook.com/business/help/861780820612984).
- Own the following assets:
  - Your marketplace Business Manager — If you don't have one, see the [Create a Business Manager](https://www.facebook.com/business/help/113164948792015) to learn how to create it.
  - A registered Meta app — This is used to interact with the [Marketing API](https://developers.facebook.com/docs/marketing-api), which the Managed Partner Ads API is built upon.
    - Your app must have the `business_management` and `ads_management` permissions.
    - Ensure your app has [Ads Management Standard Access](https://developers.facebook.com/docs/features/reference/ads-management-standard-access) for higher rate limiting.
  - Pass the [App Review process](https://developers.facebook.com/docs/apps/review).
  - A marketplace access token (user token) — Follow the instructions found in [Add Systems Users to Your Business Manager](https://developers.facebook.com/docs/marketing-api/business-management/system-users) to generate the token.
  - At least 20,000 unique sellers in your catalog with each seller having a unique ID (Vendor ID) associated with them.
  - Each seller must have a unique ID associated with them. This is referred to as the **Vendor ID** and is used to automatically create a [Catalog Segment](https://developers.facebook.com/docs/marketing-api/guides/collaborative-ads/brand-advertiser-integration#step-2-create-catalog-segment) when onboarding a seller.

## Step 2: Integration

You are now ready to start integrating your platform with the Managed Partner Ads APIs.

In order to create a **Minimum Viable Product (MVP)** for your sellers, the following 4 modules will need to be built or setup:

- **[Build] Seller Onboarding** — This is a process that you as a marketplace will create in order to allow sellers to sign-up for the service you provide using Managed Partner Ads. During your pilot phase of testing Managed Partner Ads, you may utilise our seller onboarding tool in order to quickly assess the performance of using Managed Partner Ads. This should be a temporary process and you should be creating your own process once you are ready to start offering Managed Partner Ads to your sellers. Please contact your Meta representative for access to this tool.

- **[Setup] Default Template for campaigns** — This is a standard template that you create for all your sellers to run campaigns. This can be created in the [Collaboration Center](https://www.facebook.com/business/help/902720913926868) and must be set up before any sellers can run a campaign. The template will use Catalog Sales as the objective with two ad sets (prospecting and retargeting) using the carousel format. The following parameters can be configured:
  - Budget allocation
  - Ad creative primary text
  - URL

  Both default templates and custom templates are supported. More information can be found in the [Types of Templates](https://www.facebook.com/business/help/278553075591321) section.

- **[Build] Seller Ad Campaigns** — This is a custom interface you provide your sellers in order to create, manage and display reports for campaigns. See the [API section](#partner-ads-management) under Partner Ads Management to understand how to build this.
- **[Build] Billing** — This should be integrated with your own existing billing infrastructure and should be provided as part of the Managed Partner Ads service and allow sellers to view/manage their finances with respect to the campaigns being run. Meta will send an invoice to the marketplace every billing cycle for payment settlement between Meta and the marketplace. The default invoice setting is 1 invoice to 1 seller.
  - To consolidate invoices, you can create an invoice group and add ad accounts into the group up to 3 days before the invoice is sent. This can be achieved using our [Business Management API](https://developers.facebook.com/docs/marketing-api/business-management/invoice-groups) to manage invoice groups (add/update/delete).

Marketplaces are expected to provide services to sellers using a dedicated, self-contained and built platform that utilises the Managed Partner Ads APIs. This allows the marketplace to control and manage all aspects of the seller ads ecosystem, even though the ads appear offsite on Meta.

**APIs overview and UI mock**

| Marketplace Managed Partner Ads API Overview |                                                                            |
| :------------------------------------------- | :------------------------------------------------------------------------- |
| **Endpoint**                                 | **Description**                                                            |
| `/seller_eligible`                           | Check eligibility of a seller to join Managed Partner Ads (MPA)            |
| `/seller_business`                           | Get the list of sellers in your marketplace with their status              |
| `/seller_business/create`                    | Create a seller business ID for a new seller in your marketplace           |
| `/seller_business/configure`                 | Configure a seller business with the seller identity Page and access token |

| Seller Managed Partner Ads API Overview |                                                                            |
| :-------------------------------------- | :------------------------------------------------------------------------- |
| **Endpoint**                            | **Description**                                                            |
| `/seller_business/configure`            | Configure a seller business with the seller identity Page and access token |

**Seller onboarding and lookup**

To onboard and search for existing sellers, use the [Seller Eligibility API](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/check-eligibility), [Lookup Seller Business API](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/lookup), [Seller Business Creation API](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/onboard) and [Seller Business Configuration API](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/configure).

An example flow chart of the seller onboarding and lookup flow:

![Flowchart detailing the steps for seller onboarding and lookup. It shows the check eligibility phase, the lookup seller business phase, and the creation and configuration phase for new sellers.](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/images/MPA_FlowChart.png)

In addition, you will also be using other Meta Graph APIs for campaign management and invoicing. For full technical details on our APIs, please refer to the [Managed Partner Ads API Reference](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/reference).

**Example: User Interfaces for Sellers**

As a marketplace, you are expected to use the Managed Partner Ads APIs to create an interface for your sellers to engage with as part of your service offering. The below mockups are some examples and for illustration purposes ONLY.

- **Seller registration** — This is where the seller will express interest in onboarding onto Managed Partner Ads. Please note, the Facebook page URL refers to the Seller's Identity Page and is compulsory for integrity check purposes.
- **Ad creation** — A custom interface built by the marketplace using the Managed Partner Ads APIs to allow sellers to run Meta ad campaigns.
- **Ad update** — Modify existing ad campaigns.
- **Ad performance viewing** — Review performance of ad campaigns.

**Managed Sellers Dashboard**

As a marketplace, you can access a list of your managed sellers to view details of the campaigns you are running on their behalf by going to **Business Manager > Collaboration Center > Partnerships > Managed partners**. This will allow you to:

- View a dashboard of all managed sellers, including business information.
- See an overview of campaign delivery, credit, catalog segment, ad account, page and business account issues.

If you have use cases in addition to the ones in the Collaboration Center, you may want to consider developing an internal admin portal for your business operations team.

## Step 3: Launch

Before launching, please ensure that your Meta app has passed our [App Review process](https://developers.facebook.com/docs/apps/review).

You are now all set to launch your Managed Partner Ads solution. You may consider rolling it out to eligible sellers in batches and devise communication plans accordingly.

- Ensure eligible sellers are aware of the Managed Partner Ads solution.
- Provide a channel to receive feedback on the seller interface, including any feature requests and bug reports.
- Monitor seller activity on Collaboration Center through Seller Dashboard or build your own monitoring tool for your own needs using [Marketing API](https://developers.facebook.com/docs/marketing-api).
- Keep track of your sellers’ campaign performance, build automated systems to detect problems and make changes for further optimization of delivery and performance.
- Test different creatives, targeting and optimization options, understand what works/what does not for which seller.
- When your solution starts delivering value and can scale, start rolling it out to more sellers gradually, promote it in different channels and scale the number of sellers in your platform and their overall investment through Managed Partner Ads.

# Managed Partner Ads API Guide

These are the resources you'll need to run manged partner ads using API calls.

## Prerequisites

Before you can begin the managed partner ads API integration, you will need to:

- [Create an Admin System User](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/prerequisites#create-admin-system-user)
- [Assign Permissions to the Admin System User](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/prerequisites#assign-permissions)
- [Generate an Access Token for the Admin System User](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/prerequisites#generate-access-token)

## Seller Management

| Seller Management                                                                                                                      |     |
| :------------------------------------------------------------------------------------------------------------------------------------- | :-- |
| [Check Seller Eligibility](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/check-eligibility) |     |
| [Onboard a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/onboard)                   |     |
| [Delete a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/seller-management/delete)                     |     |

## Partner Ads Management

| Partner Ads Management                                                                                                                                |     |
| :---------------------------------------------------------------------------------------------------------------------------------------------------- | :-- |
| [Get the List of Campaigns for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/get-campaigns) |     |
| [Create a Campaign for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/create-campaign)       |     |
| [Update a Campaign for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/update-campaign)       |     |
| [Delete a Campaign for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/delete-campaign)       |     |
| [Get the List of Ads for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/get-ads)             |     |
| [Create an Ad for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/create-ad)                  |     |
| [Update an Ad for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/update-ad)                  |     |
| [Delete an Ad for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/delete-ad)                  |     |
| [Get Ad Performance for a Seller](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/partner-ads-management/get-performance)      |     |

## Async API User Guide

| Poll Async Session ID for Results                                                                                                   |     |
| :---------------------------------------------------------------------------------------------------------------------------------- | :-- |
| [Check Async Session Status](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/async-api/check-session-status) |     |
| [Get Results](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/async-api/get-results)                         |     |

## Error Handling

| Error Handling Guide                                                                               |     |
| :------------------------------------------------------------------------------------------------- | :-- |
| [Error Codes](https://developers.facebook.com/docs/marketing-api/managed-partner-ads/errors/codes) |     |

# Multi-advertiser Ads

Multi-advertiser ads delivery will become `OPT-IN` by default beginning August 19, 2024. Partners will need to implement the multi-advertiser request in order to opt out of multi-advertiser ads. Ads created on or after August 19 that do not specify the `enroll_status` field within the `contextual_multi_ads` field will be opted into multi-advertiser ads by default.

Multi-advertiser ads showcase ads from multiple advertisers, helping advertisers drive performance by reaching more people looking to go deeper in their shopping journey. Multi-advertiser ads are available for select placements on Facebook and Instagram. For more information, please visit the [Business Help Center](https://www.facebook.com/business/help/2653245038318856).

## API support for multi-advertiser ads

Multi-advertiser ads are supported in all versions of the Marketing API. Multi-advertiser ads support all campaign objectives and all ad formats across all available placements. The `enroll_status` field must be provided with either an `OPT_IN` or `OPT_OUT` value. Ads created on or after August 19, 2024 that do not specify the `enroll_status` field will be opted into multi-advertiser ads by default.

## Ad creation

- **Request**

  ```curl
  curl -X POST \
    -F 'name="My creative title"' \
    -F 'object_story_spec={
         "page_id": "<PAGE_ID>",
         "link_data": {
           "link": "https://www.google.com",
           "image_hash": "<IMAGE_HASH>",
           "attachment_style": "link",
        }
       }' \
    -F 'contextual_multi_ads={
         "enroll_status": "OPT_IN"
       },'
    -F "access_token=<ACCESS_TOKEN>" \
     https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
  ```

  For more details, see [Ad Creative](https://developers.facebook.com/docs/marketing-api/reference/ad-creative).

| Parameters             |                                                                                                                                                                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextual_multi_ads` | The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. For more details, see [Ad Creative Features Details, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-features-details). |

## Learn More

**Business Help Center**

- [About multi-advertiser ads](https://www.facebook.com/business/help/2653245038318856)

**Marketing API Reference**

- [Ad Creative](https://developers.facebook.com/docs/marketing-api/reference/ad-creative)
- [Ad Account Ads](https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads)

# Reels Ads

Create a Meta ad with a focus on available reels placements and learn best practices around our ads operations.

## Prerequisites

- You have previously created a [Facebook app](https://developers.facebook.com/docs/apps/register)
- You are familiar with [Marketing APIs](https://developers.facebook.com/docs/marketing-api) and have enabled [Facebook Login](https://developers.facebook.com/docs/facebook-login)

If you do not meet those prerequisites, please refer to our [developer documentation](https://developers.facebook.com/docs/marketing-api).

## Sandbox Testing

Meta offers a testing environment, which doesn't actually deliver ads, but allows you to:

- Add Marketing API as a product within your Meta app in the **Tools** section to create and edit ads using our APIs without incurring costs
- [Create an ad account](https://developers.facebook.com/docs/marketing-api/guides/ads-for-testing) to use the Marketing API
- [Read through our testing best practices](https://developers.facebook.com/docs/marketing-api/guides/testing)

## Step 1: Access Asset

An access token is an opaque string that identifies a user, app, or Page and can be used by the app to make graph API calls. You can see when it expires and which app generated it. Marketing API calls on Meta apps need to include an access token.

Get an access token with necessary permissions:

- `ads_management`: make changes in selected ad accounts
- `ads_read`: read out ads data
- `read_insights`: read out performance insights

Use [system access tokens](https://developers.facebook.com/docs/marketing-api/business-management/system-users) as they have longer expiration times.

**Additional Authorization Layer**

To access Marketing API endpoints, you need to create a **Business app**. They are subject to an additional layer of Graph API authorization called [access levels](https://developers.facebook.com/docs/development/release/access-levels). During [App Review](https://developers.facebook.com/docs/apps/review), your app must also request specific permissions and features. You must complete [Business Verification](https://developers.facebook.com/docs/development/release/business-verification) if your app will be used by app users who do not have a role on the app itself, or a role in a Business that has claimed the app.

If your app is managing other people’s ad accounts, you need:

- [Advanced Access](https://developers.facebook.com/docs/development/release/access-levels#advanced-access) `ads_read`
  - and/or
- [Advanced Access](https://developers.facebook.com/docs/development/release/access-levels#advanced-access) `ads_management`

## Step 2: Fetch Ad Account

Fetch your advertisers ad account(s) and allow them to select the one for ads creation.

Through our [Business Management API](https://developers.facebook.com/docs/marketing-api/business-management), you can see all the ad accounts their business has access to. This returns all ad accounts owned by a business. Note that you will need the `business_management` permission at app and user level. Refer to [Business Asset Management APIs](https://developers.facebook.com/docs/marketing-api/business-management/business-assets).

**Sample Call**

```curl
curl -G \-d "access_token=<ACCESS_TOKEN>" \"https://graph.facebook.com/v24.0/<BUSINESS_ID>/owned_ad_accounts"
```

## Step 3: Create Campaign

A campaign is the highest level organizational structure within an ad account and should represent a single objective for an advertiser. These objects contain your advertising objective and one or more ad sets. This helps you optimize and measure results for each advertising objective. Learn more about creating, reading, updating and deleting a campaign [here](https://developers.facebook.com/docs/marketing-api/guides/campaigns).

**Sample Call**

```curl
curl -X POST \
  -F 'name="My campaign"' \
  -F 'objective="OUTCOME_TRAFFIC"' \
  -F 'status="PAUSED"' \
  -F 'special_ad_categories=[]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns
```

## Step 4: Target Definition

To enable advertisers to reach specific groups, specific these parameters in your API requests:

- demographics (age, gender, location)
- interests
- behaviors

Then potential customers who are most likely to be interested in your products or services will be reached.

**Sample Call**

```curl
curl -X POST \
  -F 'access_token=YOUR_ACCESS_TOKEN' \
  -F 'name=My Custom Audience' \
  -F 'subtype=CUSTOM' \
  -F 'description=People who live in New York, aged 25-40, interested in technology' \
  -F 'customer_file_source=USER_PROVIDED_ONLY' \
  -F 'targeting_spec={
        "geo_locations": {
          "countries": ["US"],
          "regions": [{"key": "4081"}]  # New York region key
        },
        "age_min": 25,
        "age_max": 40,
        "interests": [{"id": "6003139266461", "name": "Technology"}]
      }' \
  https://graph.facebook.com/v24.0/act_YOUR_AD_ACCOUNT_ID/customaudiences
```

## Step 5: Create Ad Set

Ad sets can have one or more ads. Ads within an ad set should have the same targeting, budget, billing, optimization goal, and duration.

You can set the budget, schedule, targeting, bid strategy, and placement options. Ad sets allow for fine-tuning how and where ads are delivered to specific audience segments, optimizing performance, and achieving marketing goals.

Key parameters:

- audience targeting criteria
- daily or lifetime budgets
- scheduling options to control when ads are shown

More comprehensive details [here](https://developers.facebook.com/docs/marketing-api/guides/adsets).

You can pick a manual placement that includes Instagram and Facebook reels ads, or default to automatic placements. If you do not specify anything for a particular placement field, it considers all possible default positions for that field.

**Sample Call**

```curl
curl -X POST \
  -F 'access_token=YOUR_ACCESS_TOKEN' \
  -F 'name=Reels Ad Set' \
  -F 'campaign_id=YOUR_CAMPAIGN_ID' \
  -F 'daily_budget=5000' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'optimization_goal=REACH' \
  -F 'start_time=2024-07-10T10:00:00-0700' \
  -F 'end_time=2024-07-20T10:00:00-0700' \
  -F 'targeting={"geo_locations":{"countries":["US"]},"age_min":18,"age_max":65}' \
  -F 'promoted_object={"page_id":"YOUR_PAGE_ID"}' \
  -F 'status=PAUSED' \
  -F 'instagram_user_id=<IG_USER_ID>' \
  -F 'publisher_platforms=["instagram"]' \
  -F 'instagram_positions=["reels"]' \
  https://graph.facebook.com/v24.0/act_YOUR_AD_ACCOUNT_ID/adsets
```

**Placement Targeting: Reels Available Positions, Compatible Objectives, and Optimization Goals**

| `publisher_platforms` | `facebook_position` or `instagram position` | Compatible Objectives   | `optimization_goal`                 |
| :-------------------- | :------------------------------------------ | :---------------------- | :---------------------------------- |
| instagram             | reels, profile_reels                        | `OUTCOME_APP_PROMOTION` | `LINK_CLICKS`                       |
|                       |                                             |                         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `APP_INSTALLS`                      |
| instagram             | reels, profile_reels                        | `OUTCOME_AWARENESS`     | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `AD_RECALL_LIFT`                    |
|                       |                                             |                         | `THRUPLAY`                          |
| instagram             | reels, profile_reels                        | `OUTCOME_LEADS`         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `LEAD_GENERATION`                   |
|                       |                                             |                         | `QUALITY_LEAD`                      |
| instagram             | reels, profile_reels                        | `OUTCOME_TRAFFIC`       | `LINK_CLICKS`                       |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `CONVERSATIONS`                     |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `VISIT_INSTAGRAM_PROFILE`           |
| instagram             | reels, profile_reels                        | `OUTCOME_ENGAGEMENT`    | `CONVERSATIONS`                     |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `THRUPLAY`                          |
|                       |                                             |                         | `POST_ENGAGEMENT`                   |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `REMINDERS_SET`                     |
|                       |                                             |                         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
| instagram             | reels, profile_reels                        | `OUTCOME_SALES`         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `CONVERSATIONS`                     |
| facebook              | facebook_reels                              | `OUTCOME_APP_PROMOTION` | `LINK_CLICKS`                       |
|                       |                                             |                         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `APP_INSTALLS`                      |
| facebook              | facebook_reels                              | `OUTCOME_AWARENESS`     | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `AD_RECALL_LIFT`                    |
|                       |                                             |                         | `THRUPLAY`                          |
|                       |                                             |                         | `TWO_SECOND_CONTINUOUS_VIDEO_VIEWS` |
| facebook              | facebook_reels                              | `OUTCOME_LEADS`         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `LEAD_GENERATION`                   |
|                       |                                             |                         | `QUALITY_LEAD`                      |
| facebook              | facebook_reels                              | `OUTCOME_TRAFFIC`       | `LINK_CLICKS`                       |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `CONVERSATIONS`                     |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `QUALITY_CALL`                      |
| facebook              | facebook_reels                              | `OUTCOME_ENGAGEMENT`    | `CONVERSATIONS`                     |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `THRUPLAY`                          |
|                       |                                             |                         | `TWO_SECOND_CONTINUOUS_VIDEO_VIEWS` |
|                       |                                             |                         | `POST_ENGAGEMENT`                   |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `EVENT_RESPONSES`                   |
|                       |                                             |                         | `QUALITY_CALL`                      |
|                       |                                             |                         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `PAGE_LIKES`                        |
| facebook              | facebook_reels                              | `OUTCOME_SALES`         | `OFFSITE_CONVERSIONS`               |
|                       |                                             |                         | `LANDING_PAGE_VIEWS`                |
|                       |                                             |                         | `LINK_CLICKS`                       |
|                       |                                             |                         | `REACH`                             |
|                       |                                             |                         | `IMPRESSIONS`                       |
|                       |                                             |                         | `CONVERSATIONS`                     |
|                       |                                             |                         | `QUALITY_CALL`                      |

**Limitations**

| Compatible Objective + `optimization_goal` Combination     | FB Reels Eligible? | IG Reels Eligible? |
| :--------------------------------------------------------- | :----------------- | :----------------- |
| `OUTCOME_AWARENESS` + `TWO_SECOND_CONTINUOUS_VIDEO_VIEWS`  | ✅                 | ❌                 |
| `OUTCOME_TRAFFIC` + `VISIT_INSTAGRAM_PROFILE`              | ❌                 | ✅                 |
| `OUTCOME_TRAFFIC` + `QUALITY_CALL`                         | ✅                 | ❌                 |
| `OUTCOME_ENGAGEMENT` + `TWO_SECOND_CONTINUOUS_VIDEO_VIEWS` | ✅                 | ❌                 |
| `OUTCOME_ENGAGEMENT` + `EVENT_RESPONSES`                   | ✅                 | ❌                 |
| `OUTCOME_ENGAGEMENT` + `REMINDERS_SET`                     | ❌                 | ✅                 |
| `OUTCOME_ENGAGEMENT` + `QUALITY_CALL`                      | ✅                 | ❌                 |
| `OUTCOME_ENGAGEMENT` + `PAGE_LIKES`                        | ✅                 | ❌                 |
| `OUTCOME_SALES` + `QUALITY_CALL`                           | ✅                 | ❌                 |

## Step 6: Select Creative

Ad creatives are the visual and textual components of ads, which support the following ad formats:

- images
- videos
- carousels
- enabling customized ad designs

Automate design elements and optimize performance using our [creative process](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives).

**Repurpose an Existing Reel as the Ad Creative**

Users can provide a new asset or repurpose an existing reel from their Instagram account as the ad creative.

You can create ads from existing, organic Instagram or Facebook reels that are eligible to be promoted, provided they are:

- Less than 90 seconds
- Have a full-screen (9:16) vertical aspect ratio
- Free of copyrighted music, GIFs, interactive stickers or camera filters from a third party
- Not shared to Facebook

To repurpose an organic Instagram reel as the ad creative for a new ad campaign:

- Obtain the Instagram Business account ID, which needs to be connected to a Facebook Page
  - `GET/{ad_account_id}/connected_instagram_accounts` or
  - `GET/{business_id}/instagram_business_accounts`
- **Find the Reel You Want to Promote**
  - `GET/{ig-business-account-user-id}/media`
- **Provide Ad Creative**
  - Instead of specifying `instagram_user_id` in the creative spec, set `instagram_user_id` as the Instagram user ID
  - Specify `source_instagram_media_id` as the media ID
  - Optionally, update `call_to_action` for your promotion
- Leverage `boost_eligibility_info` as a convenient way to determine whether media is eligible to be boosted as an ad and `boost_ads_list` to trace related past boost Instagram ad information.

**Sample Call**

```curl
curl -i -X POST \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT>/adcreatives?object_id=<PAGE_ID>&instagram_user_id=<IG_USER_ID>&source_instagram_media_id=<IG_ORGANIC_MEDIA_ID>&call_to_action="{'type':'LEARN_MORE','value':{'link': '<YOUR_LINK>'}}"&access_token=<API_ACCESS_TOKEN>
```

**Gen AI Creative Toolbox**

You can automate the generation of diverse and engaging ad elements, such as: images, videos, and text. These AI-driven tools help optimize ad performance by tailoring content to audience preferences and enhancing creative variety. Ad creation will result in higher engagement and better campaigns.

## Step 7: Preview Ad

Preview the ad in the Facebook and Instagram Reels formats tabulated below using:

- Ad ID
- Ad Creative ID
- Ad Creative spec

| PUBLISHING PLATFORM | Ad Format                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Facebook**        | `DESKTOP_FEED_STANDARD`, `FACEBOOK_STORY_MOBILE`, `INSTANT_ARTICLE_STANDARD`, `INSTREAM_VIDEO_DESKTOP`, `INSTREAM_VIDEO_MOBILE`, `MARKETPLACE_DESKTOP`, `MARKETPLACE_MOBILE`, `MOBILE_FEED_BASIC`, `MOBILE_FEED_STANDARD`, `RIGHT_COLUMN_STANDARD`, `SUGGESTED_VIDEO_DESKTOP`, `SUGGESTED_VIDEO_MOBILE`, `WATCH_FEED_MOBILE`, `FACEBOOK_REELS_BANNER`, `FACEBOOK_REELS_BANNER_DESKTOP`, `FACEBOOK_REELS_MOBILE`, `FACEBOOK_REELS_POSTLOOP`, `FACEBOOK_REELS_STICKER`, `FACEBOOK_STORY_STICKER_MOBILE`, `WATCH_FEED_HOME` |
| **Instagram**       | `INSTAGRAM_STANDARD`, `INSTAGRAM_STORY`, `INSTAGRAM_EXPLORE_CONTEXTUAL`, `INSTAGRAM_EXPLORE_IMMERSIVE`, `INSTAGRAM_EXPLORE_GRID_HOME`, `INSTAGRAM_FEED_WEB`, `INSTAGRAM_FEED_WEB_M_SITE`, `INSTAGRAM_PROFILE_FEED`, `INSTAGRAM_REELS`, `INSTAGRAM_REELS_OVERLAY`, `INSTAGRAM_SEARCH_CHAIN`, `INSTAGRAM_SEARCH_GRID`, `INSTAGRAM_STORY_CAMERA_TRAY`, `INSTAGRAM_STORY_WEB`, `INSTAGRAM_STORY_WEB_M_SITE`                                                                                                                  |

**Sample Call**

```curl
curl -X POST \
  'https://graph.facebook.com/v24.0/act_{ad_account_id}/adpreviews' \
  -F 'access_token={your_access_token}' \
  -F 'creative={
        "object_story_spec": {
            "instagram_user_id": "<IG_USER_ID>",
            "video_data": {
                "video_id": "{video_id}",
                "title": "Check out our new product!",
                "description": "Exciting new features and benefits.",
                "call_to_action": {
                    "type": "LEARN_MORE",
                    "value": {
                        "link": "https://www.example.com/product"
                    }
                }
            }
        }
    }' \
  -F 'ad_format=INSTAGRAM_REELS'
```

## Step 8: Schedule Ad Delivery

To book an ad using the marketing API, create an ad group object and link your ad set object to the Ad Creative. Use `/act_{ad_account_id}/ads` to submit your Ad object, and validate the response to confirm successful booking. This step finalizes your ad setup, making it ready for delivery based on the configurations provided.

**Sample Call**

```curl
curl -X POST \
  -F 'name="My Ad"' \
  -F 'adset_id="<AD_SET_ID>"' \
  -F 'creative={
       "creative_id": "<CREATIVE_ID>"
     }' \
  -F 'status="PAUSED"' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

## Step 9: Review Performance

Use the Insights API to fetch metrics from ad account to ads:

- `act_<AD_ACCOUNT_ID>/insights`
- `<CAMPAIGN_ID>/insights`
- `<ADSET_ID>/insights`
- `<AD_ID>/insights`

When running a campaign on Instagram and Facebook, add `breakdowns=publisher_platform` to see the stats of Facebook and Instagram placements separately, as shown in the sample call below. When breaking down insights by Placement level, it will be possible to see how ads perform via Instagram and Facebook Reels placement.

**Sample Call**

```curl
curl -X GET \
  'https://graph.facebook.com/v24.0/{ad_account_id}/insights' \
  -F 'access_token={your_access_token}' \
  -F 'level=campaign' \
  -F 'fields=campaign_name,impressions,clicks,spend' \
  -F 'breakdowns=publisher_platform,platform_position' \
  -F 'filtering=[{"field":"platform_position","operator":"IN","value":["instagram_reels"]}]' \
  -F 'time_range={"since":"2024-06-01","until":"2024-06-30"}'
```

## Important Considerations

**New Objectives Supported in ODAX (Outcome-Driven Ads Experiences Objective Validation)**

- `OUTCOME_APP_PROMOTION`
- `OUTCOME_AWARENESS`
- `OUTCOME_ENGAGEMENT`
- `OUTCOME_LEADS`
- `OUTCOME_SALES`
- `OUTCOME_TRAFFIC`

**Rate Limits**

The Marketing API has its own rate limiting logic and is excluded from all the Graph API rate limitations. The feature that impacts the Marketing API rate limit quota is [Ads Management Standard Access](https://developers.facebook.com/docs/features/reference/ads-management-standard-access). By default, you get Standard Access when you add the Marketing API product to your App Dashboard, which provides you development access to the Marketing API. To increase the rate limiting quota, upgrade to Advanced Access.

## Creative Essentials

Reels ads turn attention into action, supercharging results. When you build them the right way, they are even more effective.

1.  **Build in 9:16 video to make your video captivating:** Reels is a full-screen, immersive video format. To help your creative feel at home here, consider leading with video and resizing it to 9:16.
2.  **Build in safe zones so that your messages are clear:** Work within the [safe zones](https://developers.facebook.com/docs/marketing-api/guides/video-ads/ad-videos#safe-zone) so your text sticker overlays, calls to action or key messages aren’t obscured by the Reels user interface. Keep the bottom 35% of your 9:16 creative free of text, logos, and other key elements.
3.  **Build for sound on to make your video entertaining:** Audio – whether that's music, voiceover or sound effects – is a key driver of engagement and entertainment on Reels.

## Dynamic Media with Catalog Product Video

Use Catalog Product Video for your Reels placements to enhance your catalog and ad experience. With Dynamic Media, you can deliver video assets from your catalog along with the existing product images in your Advantage+ catalog ads campaigns. Dynamic Media allows you to extend your reach to Instagram Reels and Facebook Reels. In addition, it consolidates multiple video campaigns into a single dynamic ad campaign. You can use Dynamic Media ads across different placements, but we focus on using Dynamic Media ads in Reels placements here.

Dynamic Media ads will show either images or videos of your catalog items based on what each person viewing your ad is likely to find engaging. Dynamic media uses automation and product ranking to deliver not only the most relevant products, but also the highest-performing assets to audiences across placements.

**Why use catalog product video?**

Catalog product video is supported across all catalog verticals, and Dynamic Media ads are open to all advertisers. Catalog product video is a good fit for advertisers who would like to enhance their Advantage+ catalog ads campaigns with more inspirational video creatives.

**Requirements**

To create Dynamic Media ads that deliver on Reels, you will need a product catalog with existing products and at least one video for each product item in a downloadable video URL format. For more information, see [Dynamic Media](#dynamic-media).

**Step 1: Configure the catalog for catalog product videos**

- Ensure that at least one video per product is a 9:16 aspect ratio for the best performance on Reels
  - Dynamic Media ads will automatically select a 9:16 video for the Reels placements
  - If a 9:16 video is not available, the first video will be used
- Ensure that the videos provided for your catalog are hosted on downloadable URLs
- Audio is welcome and may have a positive impact on your ad, but is not required
- You may add tags to your catalog videos to use `preferred_video_tags` on the ad

**Step 2: Create an ad campaign compatible with Reels placements and Advantage+ catalog ads**

- [Reels campaign creation](#step-3-create-campaign)
- [Advantage+ catalog ads campaign creation](#step-1-create-an-ad-campaign)
- Ensure that your ad campaign objective is `OUTCOME_SALES`, `LINK_CLICKS`, `APP_INSTALLS`, or `CONVERSIONS`

**Step 3: Create an adset targeting Reels Placements with a product set**

- [Advantage+ Catalog adset creation](#step-2-create-an-ad-set-1)
- [Reels placement adset creation](#step-5-create-ad-set)
- Set an optimization goal that aligns with your objective at the campaign level that adheres to our [validation rules](https://developers.facebook.com/docs/marketing-api/reference/ad-set#billing-event-and-optimization-goal)
- Set the appropriate targeting options, budget, billing event, and schedule
- Ensure that `publisher_platforms` is set for `["instagram","facebook"]`, `facebook_positions` and `instagram_positions` are set for `reels`
- Set your desired `product_set_id` in `promoted_object` for your ad set to promote products from that product set

**Step 4: Create a Dynamic Media ad**

- Ensure that you are creating either a carousel ad or a single video format ad. Collection ads featuring catalog product videos are not yet supported on Reels placements. Carousel ads contain a series of different products from a set. Single video will show one product at a time from the specified product set
- [More information on catalog product videos](#dynamic-media)

# Get Started with the Flexible Ad Format

This document shows you how the flexible ad format empowers multi-asset creative automation by grouping related assets in a single ad without needing to select a specific format.

## Before You Start

You need to familiarize yourself with these steps to set up your ad campaigns for the flexible ad format:

- [Create a Campaign](#create-an-ad-campaign)
- [Create an Ad Set](#create-an-ad-set)
- [Create the Ad or a standalone Creative](#create-an-ad-using-the-flexible-ad-format)
- [Enable the Ad](#create-an-ad-using-the-flexible-ad-format)

**Limitations**

Currently only `OUTCOME_SALES` and `OUTCOME_APP_PROMOTION` campaign objectives support the flexible ad format.

## Create an Ad using the Flexible Ad Format

You can use `creative_asset_groups_spec` to provide multiple creative assets, with the following limitations:

- At least 1 image or video is required per group.
- All `call_to_actions` provided must have the same type.
- There can be no more than 5 texts per `text_type` in a group.

For example, to create an ad using the flexible ad format through the `/ads` endpoint:

```curl
curl \
  -F 'adset_id=<ADSET_ID>' \
  -F "creative={
    'name': 'Sample Creative',
    'object_story_spec': {  
      ...    
    },
  }" \
  -F 'creative_asset_groups_spec={
  "groups": [
    {
      "images": [
        {
          "hash": <IMAGE_HASH_1>,
        },
        {
          "hash": <IMAGE_HASH_2>,
        }
      ],
      "videos": [
        {
          "video_id": <VIDEO_ID_1>,
        },
        {
          "video_id": <VIDEO_ID_2>,
        },
      ],
      "texts": [
        {
          "text": "Summer Sale",
          "text_type": "primary_text",
        },
        {
          "text": "Everything 50% Off",
          "text_type": "headline",
        }
      ],
      "call_to_action": {
        "type": "LEARN_MORE",
        "value": {
          "link": "https://www.example.com/",
        }
      }
    }
  ],
}' \
  -F 'status=PAUSED' \
  -F "access_token=<ACCESS_TOKEN>" \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads 
```

## Read the Flexible Ad Format

To check your ad, read `creative_asset_group_spec`:

```curl
curl -G \
  -d 'fields=creative_asset_groups_spec' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_ID>/
```

**Response**

```json
{
  "creative_asset_groups_spec": {
    "groups": [
      {
        "images": [
          {
            "hash": <IMAGE_HASH_1>,
          },
          {
            "hash": <IMAGE_HASH_2>,
          }
        ],
        "texts": [
          {
            "text": "Summer Sale",
            "text_type": "primary_text"
          },
          {
            "text": "Everything 50% off",
            "text_type": "headline"
          }
        ],
        "videos": [
          {
            "video_id": <VIDEO_ID_1>,
            "image_hash": <VIDEO_THUMBNAIL_HASH_1>
          },
          {
            "video_id": <VIDEO_ID_2>,
            "image_hash": <VIDEO_THUMBNAIL_HASH_2>
          }
        ],
        "group_uuid": <GROUP_ID>
      }
    ]
  },
  "id": <AD_ID>}
```

# Get Started with Format Automation

This document shows you how to enable format automation so you can create a single ad that automatically delivers multiple optimized ad formats.

## Before You Start

Familiarize yourself with these topics to set up your ad campaigns for format automation:

- [Get Started with the Marketing API](#get-started-with-the-marketing-api)
- [Advantage+ Catalog Ads: Get Started](#advantage-catalog-ads)

**Permissions**

- `page_manage_ads`

**Limitations**

Format automation only supports carousel Advantage+ catalog ads.

## Create an Advantage+ Catalog Ad using Format Transformation

You can use the `format_transformation_spec` paramter to opt-in to different types of formats and data sources used to build the formats.

Not including the `format_transformation_spec` in the creative spec will result in the default system behavior.

**Example request**

```curl
curl -X POST \
  -F 'name="Ad Creative with Format Transformation Spec Sample"' \
  -F 'object_story_spec={
    "page_id": "<PAGE_ID>"
    ... // Fields to create a Advantage+ catalog ad carousel creative \
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'asset_feed_spec= {
    "ad_formats": [
      "CAROUSEL",
      "COLLECTION"
    ],
    "optimization_type": "FORMAT_AUTOMATION"
  }' \
  -F 'format_transformation_spec=[{
    "data_source": ["catalog"],
    "format": "da_collection"
  }]' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

| Parameters    |                                                                                                                        |
| :------------ | :--------------------------------------------------------------------------------------------------------------------- |
| `format`      | Required. Specifies the format transformation type. **Value:** `da_collection`                                         |
| `data_source` | Optional. Specifies the data used to assemble the format. **Values:**                                                  |
|               | `none`: Opts out of all data sources.                                                                                  |
|               | `catalog`: Opts into the catalog data source.                                                                          |
|               | **Note:** Not including the `data_source` field or leaving it empty indicates an opt-in to all data sources available. |

To opt into format automation, specify the format transformations `format`:

```json
"format_transformation_spec": [
  {
    "format": "da_collection", 
  }
]
```

To opt-out of all transformations and data sources, set the `data_source` parameter to `none`:

```json
"format_transformation_spec": [
  {
    "format": "da_collection", 
    "data_source": ["none"],
  }
]
```

To opt into the catalog data source set the `data_source` parameter to `catalog`:

```json
"format_transformation_spec": [
  {
    "format": "da_collection", 
    "data_source": ["catalog"]
  }
]
```

Leave the `data_source` field empty to opt into all `data_sources`:

```json
"format_transformation_spec": [
  {
    "format": "da_collection", 
    "data_source": []
  }
]
```

## Retrieve the Format Transformation

To check your ad, make an API call requesting the `format_transformation_spec`:

**Example request**

```curl
curl -G \
  -d 'fields=format_transformation_spec' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<CREATIVE_ID>
```

**Example response**

```json
{
  {
    "format_transformation_spec": [
    {
      "data_source": ["catalog"]
      "format": "da_collection"
    }]
  },
  "id": <AD_CREATIVE_ID>
}
```

## See Also

- [Ad Creative](https://developers.facebook.com/docs/marketing-api/reference/ad-creative)
- [Adgroup](https://developers.facebook.com/docs/marketing-api/reference/ad-set)
- [Advantage+ Catalog Ads](#advantage-catalog-ads)
- [Collection Ads](#collection-ads)
