<\!-- Source: META-ADS-API-GUIDE.md, Lines 715-879 -->

# Basic Ad Creation

Creating ads using the Marketing API involves a systematic approach that includes setting up campaigns, ad sets, and ad creatives. This document provides detailed guidance on programmatically creating these components, along with code samples to illustrate the implementation process.

## Ad Creation Endpoints

The Marketing API offers a variety of key endpoints that serve as essential tools for developers to create, manage, and analyze advertising campaigns. The primary creation endpoints include campaigns, adsets, and ads. Understanding these endpoints and their functionalities is crucial for both new and experienced developers looking to optimize their advertising strategies.

### The campaigns endpoint

The `campaigns` endpoint is used to create and manage advertising campaigns. This endpoint allows users to set the overall objectives for their marketing efforts, such as brand awareness or conversions.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns \
  -F 'name=My Campaign' \
  -F 'objective=LINK_CLICKS' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>'
```

### The adsets endpoint

The `adsets` endpoint organizes ads within campaigns based on specific targeting criteria and budget allocation. This allows for more granular control over audience targeting and spending.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets \
  -F 'name=My Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'daily_budget=1000' \
  -F 'targeting={"geo_locations":{"countries":["US"]}}' \
  -F 'access_token=<ACCESS_TOKEN>'
```

### The ads endpoint

The `ads` endpoint is where the actual advertisements are created, allowing you to define creative elements and link them to the appropriate ad set.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads \
  -F 'name=My Ad' \
  -F 'adset_id=<AD_SET_ID>' \
  -F 'creative={"creative_id": "<CREATIVE_ID>"}' \
  -F 'status=ACTIVE' \
  -F 'access_token=<ACCESS_TOKEN>'
```

# Create an Ad Campaign

The first step in launching an ad campaign is to create the campaign itself using the API.

To create an ad campaign, send a `POST` request to the `/act_<AD_ACCOUNT_ID>/campaigns` endpoint with key parameters including the campaign's `name`, `objective`, and `status`.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns \
  -F 'name=My Campaign' \
  -F 'objective=LINK_CLICKS' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>'
```

## Required Parameters

| Name        | Description                                                                     |
| :---------- | :------------------------------------------------------------------------------ |
| `name`      | The name of the campaign.                                                       |
| `objective` | The goal of the campaign, for example, `LINK_CLICKS`.                           |
| `status`    | The initial status of the campaign, usually set to `PAUSED` when first created. |

**Learn More**

- [Ad Account Ad Campaigns Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-account/ad-campaigns)
- [Ad Campaign Reference](https://developers.facebook.com/docs/marketing-api/reference/campaign)

# Create an Ad Set

After creating your ad campaign, the next step is to create an ad set to be a part of it. The ad set contains the bidding, targeting, and budget information for your campaign.

To create an ad set within your campaign, send a `POST` request to the `/act_<AD_ACCOUNT_ID>/adsets` endpoint. Important parameters include the `name` of the ad set, the associated `campaign_id`, `targeting` specifications, and `daily_budget` details.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets \
  -F 'name=My Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'daily_budget=1000' \
  -F 'targeting={"geo_locations":{"countries":["US"]}}' \
  -F 'access_token=<ACCESS_TOKEN>'
```

## Required Parameters

| Name           | Description                                         |
| :------------- | :-------------------------------------------------- |
| `campaign_id`  | The ID of the campaign to which the ad set belongs. |
| `daily_budget` | The daily budget specified in cents.                |
| `targeting`    | The target audience based on geographic locations.  |

# Create an Ad Creative

Creating an ad creative involves defining the visual and textual elements that will be displayed in your ad. This important step requires specifying the ad format, which can include options such as image, video, or carousel. Each format comes with its own set of design considerations and requirements. By carefully crafting your ad creatives, you can create compelling ads that effectively communicate your message and drive user engagement.

To construct your ad creative, send a `POST` request to the `/act_<AD_ACCOUNT_ID>/adcreatives` endpoint. The important parameters include the `name` of the ad, `message`, image or video URLs, call_to_action (CTA) buttons, and destination URLs.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives \
  -F 'name=Sample Creative' \
  -F 'object_story_spec={
      "page_id": "YOUR_PAGE_ID",
      "link_data": {
        "message": "Check out our new product!",
        "link": "https://www.example.com/product",
        "caption": "Our New Product",
        "picture": "https://www.example.com/image.jpg",
        "call_to_action": {
          "type": "SHOP_NOW"
        }
      }
    }' \
  -F 'access_token=<ACCESS_TOKEN>'
```

In this payload, the `object_story_spec` specifies the format being used for the ad story and includes linking details for a link ad, along with associated metadata.

## Required Parameters

| Name                | Description                            |
| :------------------ | :------------------------------------- |
| `name`              | The name of the ad.                    |
| `object_story_spec` | The specifications of the ad creative. |

# Create an Ad

The ad set and the ad creative come together to create the ad itself.

You create the ad by sending a `POST` request to the `/act_<AD_ACCOUNT_ID>/ads` endpoint along with parameters such as the `adset_id` and creative details.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads \
  -F 'name=My Ad' \
  -F 'adset_id=AD_SET_ID' \
  -F 'creative={"creative_id": "<CREATIVE_ID>"}' \
  -F 'status=ACTIVE' \
  -F 'access_token=<ACCESS_TOKEN>'
```

## Required Parameters

| Name       | Description                                       |
| :--------- | :------------------------------------------------ |
| `adset_id` | The ID of the ad set under which the ad will run. |
| `creative` | Contains the creative ID for the ad.              |
| `status`   | Set to `ACTIVE` to launch the ad immediately.     |
