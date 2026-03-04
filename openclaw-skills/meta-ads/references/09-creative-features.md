<\!-- Source: META-ADS-API-GUIDE.md, Lines 6116-9782 -->

# Creating Branded Content

Creators, celebrities, and media companies can share branded content on Facebook. Branded content posts are any content that features or is influenced by a advertiser or marketer for an exchange of value. To use this, you must comply with our [Branded Content Policy](https://www.facebook.com/policies/brandedcontent) and [Ads Policy](https://www.facebook.com/policies/ads). In addition, you must tag your business partner in the posts using the branded content tool or Marketing API.

Most people creating branded content posts already have access to the branded content tool and have verified Pages or Profiles. If the branded content tool is not available your Page, [submit an application for access](https://www.facebook.com/help/contact/308101416431940).

You can use [Marketing API](https://developers.facebook.com/docs/marketing-api) to create branded content posts. Or you can also use the branded content tool in [Ads Manager](https://www.facebook.com/ads/manager), and the [Mentions App](https://www.facebook.com/help/1297914800366679). See [Ads Help Center, Branded Content](https://www.facebook.com/business/help/162705141103282).

## Overview

Create branded content for different post formats listed in [Ads Help Center, Branded Content](https://www.facebook.com/business/help/162705141103282).

You call different endpoints per post format, and include `sponsor_tags` in the post. A sponsor tag points to a Facebook Page.

You can allow your business partners to directly boost your posts, by adding `direct_share_status` in the post. Set `direct_share_status = 1` to grant permission to a business partner to boost your post. Otherwise, set `direct_share_status = 0`.

## Create a Status Update

To start, you should post to a Page's feed endpoint to create a status update. The `POST` must contain values for the `sponsor_id`, `share_status`, and the `message` fields.

```curl
curl -X POST "https://graph.facebook.com/PAGE_ID/feed" 
  -F "access_token=TOKEN" 
  -F "message=Check out some beautiful products in this grocery store" 
  -F "direct_share_status=1"
  
  {"id":"ID"}
  
```

## Adding Photos

You can add photos to your post at a Page's photos endpoint. The `POST` must contain values for the `sponsor_id`, `share_status`, and the `message` fields.

Specify a `url` field to link to an existing photo. You can also upload the photo as an attachment to the post. See [Photo Upload](https://developers.facebook.com/docs/graph-api/reference/page/photos#Creating).

```curl
  curl -X POST "https://graph.facebook.com/PAGE_ID/feed" 
  -F "access_token=TOKEN" 
  -F "message=Check out some beautiful products in this grocery store" 
  -F "direct_share_status=1" 
  -F "url=https://xx.cdn.net/v/t31.0-8/13064650_505613696297499_6399089570275517473_o.jpg"
  
 {"id":"372501189608751_701886166670250"}
 
```

## Posting a Video

Posting a video with branded content requires several steps:

- Make a call to specify you want to upload video. The API returns a video object ID you can use to upload the video.
- Upload the video.
- Complete the video transfer by setting the share status. Also provide `sponsor_id` for the video, which adds branded content to the story.

See [Uploading Videos](https://developers.facebook.com/docs/graph-api/video-uploads).

In this example, we start a request, upload the video, and set `sponsor_id` and `direct_share_status`.

```curl
 curl -X POST "https://graph-video.facebook.com/VERSION/PAGE_ID/videos" 
  -F "access_token=$at" 
  -F "upload_phase=finish" 
  -F "upload_session_id=SESSION_ID" 
  -F "sponsor_id=ID" 
  **-F "direct_share_status=1"**
```

On success you see this:

`{"success":true}`

## Live Video

To create branded live video, you should:

- Create a live video object
- Update the live video object and add `sponsor_id`
- Start your video stream

To learn more about creating and managing live video streams, see our [Live Video API](https://developers.facebook.com/docs/live-video-api). You can query the list of live videos for a page and use a video ID to update `sponsor_id`. Alternately you can use the ID returned when you first create your live.

## Updating Branded Content

We do not support changes to post content with a brand ID on the web or on mobile devices. However you can use Marketing API to update a post to include or change a sponsor. You can change the sponsor by changing the value of the `sponsor_id` field on a post object.

To add a sponsor to a post, make `POST` on a Page post and specify a `sponsor_id`. To change the sponsor on a post, pass in the new `sponsor_id` field.

You can allow or prohibit a business partner directly boosting a post. Provide `sponsor_id` and your change to `direct_share_status`.

```curl
curl -X POST "https://graph.facebook.com/PAGE_POST_ID" 
  -F "access_token=TOKEN" 
  -F "direct_share_status=1"
  
 {"success":true}
 
```

# Asset Feed Spec

The `asset_feed_spec` field allows you to deliver different combinations of an ad's creative to different users. There are two ways to set up your combinations:

- **Automatically:** You provide the creative assets and we automatically deliver different combinations to different users. To use this option, see [Dynamic Creative API](#dynamic-creative).
- **Manually:** You provide the creative assets and you create rules on how to display those assets. To use this option, see [Asset Customization Rules](#asset-customization-rules).

The asset feed spec contains a collection of different creative elements, such as images, titles, bodies, and so on. You can specify multiple creative assets for each asset type. The spec's format is different for each use case. See also [Reference, Asset Feed Spec](https://developers.facebook.com/docs/marketing-api/reference/ad-asset-feed-spec).

## Create Asset Feed

You can use `asset_feed_spec` to provide multiple creative assets, with the following limitations:

- For all [Asset Customization Rules](#asset-customization-rules), include at least two target customization rules in `asset_feed_spec`.
- For [Dynamic Creative](#dynamic-creative), `asset_feed_spec` should not have customization rules. In this case, you can mix both images and videos across different placements by specifying `[“AUTOMATIC_FORMAT”]` under `ad_formats`.

For example, to create an `asset_feed_spec` for [Dynamic Creative](#dynamic-creative):

```curl
curl -X POST \
  -F 'name="Dynamic Ad Creative with Asset Feed Spec Sample"' \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>"
     }' \
  -F 'asset_feed_spec={
       "images": [
         {
           "hash": "<IMAGE_HASH>"
         }
       ],
       "bodies": [
         {
           "text": "Begin Your Adventure"
         },
         {
           "text": "Once a Trainer, always a Trainer."
         }
       ],
       "titles": [
         {
           "text": "Level Up"
         },
         {
           "text": "Swipe to evolve"
         }
       ],
       "descriptions": [
         {
           "text": "First Dynamic Ad Creative Sample"
         }
       ],
       "ad_formats": [
         "SINGLE_IMAGE"
       ],
       "call_to_action_types": [
         "SHOP_NOW"
       ],
       "link_urls": [
         {
           "website_url": "https://www.example.com/"
         }
       ],
       "videos": []
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

You can also create an `asset_feed_spec` with two alternate videos, bodies, and titles:

```curl
curl \-F 'object_story_spec={
       "page_id": "YOUR_PAGE_ID"
       "instagram_user_id" : "&lt;IG_USER_ID>",
    }' \-F "asset_feed_spec={'videos': [{'video_id':'2053108854721025', 'thumbnail_url':'<thumnail_url>', 'url_tags':'video=video1'},{'video_id':'2104406249780616', 'thumbnail_url':'<thumnail_url>','url_tags':'video=video2'}], 'bodies': [{'text':'Begin Your Adventure'}, {'text':'Once a Trainer, always a Trainer.'}], 'titles': [{'text':'Level Up'}, {'text':'Swipe to evolve'}], 'descriptions': [{'text':'Begin Your Adventure'}], 'ad_formats': ['SINGLE_IMAGE'], 'link_urls': [{'website_url':'<WEBSITE_URL>'}]}" \-F 'access_token=<ACCESS_TOKEN>'  \
https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/adcreatives
```

See all available options for [Asset Feed Spec](#asset-feed-spec-options).

## Read Asset Feed

To check your creative, read `asset_feed_spec`:

```curl
curl -X GET \
  -d 'fields="asset_feed_spec"' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v25.0/<CREATIVE_ID>/
```

If you have a [Dynamic Creative](#dynamic-creative) feed with multiple images and bodies, the response looks like this:

```json
{
  "asset_feed_spec": {
    "images": [
      {
        "url_tags": "image=image1",
        "hash": "785095162a2034666e0d0cc4ea1faf89"
      },
      {
        "url_tags": "image=image2",
        "hash": "3a24122c13923569599be35567ce4e9e"
      }
    ],
    "bodies": [
      {
        "text": "Begin Your Adventure"
      },
      {
        "text": "Once a Trainer, always a Trainer."
      }
    ],
    "call_to_action_types": ["LEARN_MORE"],
    "call_to_actions": [
      {
        "type": "LEARN_MORE"
      }
    ],
    "descriptions": [
      {
        "text": "Begin Your Adventure"
      }
    ],
    "link_urls": [
      {
        "website_url": "<WEBSITE_URL>"
      }
    ],
    "titles": [
      {
        "text": "Swipe to evolve"
      },
      {
        "text": "Level Up"
      }
    ],
    "ad_formats": ["SINGLE_IMAGE"],
    "optimization_type": "REGULAR"
  },
  "id": "<AD_CREATIVE_ID>"
}
```

If you have a [Dynamic Creative](#dynamic-creative) feed with multiple videos, bodies, and titles, the response looks like this:

```json
{
  "asset_feed_spec": {
    "videos": [
      {
        "url_tags": "video=video1",
        "video_id": "2053108854721025",
        "thumbnail_url": "<thumnail_url>",
        "thumbnail_hash": "<thumnail_hash>"
      },
      {
        "url_tags": "video=video2",
        "video_id": "2104406249780616",
        "thumbnail_url": "<thumnail_url>",
        "thumbnail_hash": "<thumnail_hash>"
      }
    ],
    "bodies": [
      {
        "text": "Begin Your Adventure"
      },
      {
        "text": "Once a Trainer, always a Trainer."
      }
    ],
    "call_to_action_types": ["LEARN_MORE"],
    "call_to_actions": [
      {
        "type": "LEARN_MORE"
      }
    ],
    "descriptions": [
      {
        "text": "Begin Your Adventure"
      }
    ],
    "link_urls": [
      {
        "website_url": "<WEBSITE_URL>"
      }
    ],
    "titles": [
      {
        "text": "Swipe to evolve"
      },
      {
        "text": "Level Up"
      }
    ],
    "ad_formats": ["SINGLE_VIDEO"],
    "optimization_type": "REGULAR"
  },
  "id": "<AD_CREATIVE_ID>"
}
```

## Edit Asset Feed

You can add, replace or remove any of the creative's assets. To do so, provide another creative with the new `asset_feed_spec`.

You can:

- Add assets.
- Remove existing assets.
- Replace assets with completely new ones.

You cannot:

- Change ad formats, such as from `SINGLE IMAGE` to `VIDEO`.
- Update an Asset Feed based creative ad to be a non-Dynamic Creative ad, which has no `asset_feed_spec`.

```curl
    curl \
      -F 'access_token=<ACCESS_TOKEN>' \
      -F 'creative={
          "creative_id": <CREATIVE_ID>,
       }' \
    https://graph.facebook.com/v24.0/<AD_ID>
    
```

When you create a new ad creative to replace an old one, you must still fulfill all restrictions that apply.

## Asset Feed Spec Options

You can use the following options in your `asset_feed_spec`. See [Ad Asset Feed Spec](https://developers.facebook.com/docs/marketing-api/reference/ad-asset-feed-spec) for more reference information.

| Property Name          | Description                                                                                                                                                                                                                                                                                                                |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `images`               | **type: array of list**                                                                                                                                                                                                                                                                                                    | Required for `SINGLE_IMAGE` and `CAROUSEL_IMAGE` format.                                           |
|                        | Array of eligible images. Images provided in this array should be included in the ad account's image library.                                                                                                                                                                                                              |
|                        | Provide this field as an array of list containing `{"url": "{IMAGE_URL}", "hash": "{IMAGE_HASH}", "url_tags": "{TAG}"}`. Either `url` or `hash` is required.                                                                                                                                                               |
| `videos`               | **type: array of list**                                                                                                                                                                                                                                                                                                    | Required for `SINGLE_VIDEO` format.                                                                |
|                        | Array of `video_ids`. The `video_ids` provided in this array should belong to the ad account.                                                                                                                                                                                                                              |
|                        | Provide this field as an array of list containing `{"video_id": "{VIDEO_ID}", "thumbnail_url": "{THUMBNAIL_URL}", "url_tags": "{TAG}"}`                                                                                                                                                                                    |
| `carousels`            | **type: array of list**                                                                                                                                                                                                                                                                                                    | Optional.                                                                                          |
|                        | An array of `child_attachments` along with the `multi_share_end_card` and `multi_share_optimized` Booleans, and `adlabels`. The `child_attachments` provided in this array should belong to the ad account.                                                                                                                |
|                        | Provide the `child_attachments` as an array of list containing `{"image_label": {"name": "{IMAGE_LABEL}"}, "video_label": {"name": "{VIDEO_LABEL}"}, "title_label": {"name": "{TITLE_LABEL}"}, "description_label": {"name": "{DESC_LABEL}", "link_url_label": {"name": "{LINK_URL}"}}}`.                                  |
|                        | **Note:** Either `image_label` or `video_label` is required.                                                                                                                                                                                                                                                               |
|                        | See [Field Specifications](#field-specification) for more information.                                                                                                                                                                                                                                                     |
| `bodies`               | **type: array of list**                                                                                                                                                                                                                                                                                                    | Optional.                                                                                          |
|                        | Array of bodies. The primary message or copy of the ad.                                                                                                                                                                                                                                                                    |
|                        | Provide this field as an array of list of `{"text": "{BODY_TEXT}", "url_tags": "{TAG}"}`.                                                                                                                                                                                                                                  |
| `call_to_action_types` | **type: array of list**                                                                                                                                                                                                                                                                                                    | Required for all objectives, except `OUTCOME_AWARENESS`.                                           |
|                        | Array of call-to-action-type values.                                                                                                                                                                                                                                                                                       |
|                        | Provide this field as an array of list of `{"{CALL_TO_ACTION}"}`. You can provide multiple values, up to five.                                                                                                                                                                                                             |
| `titles`               | **type: array of list**                                                                                                                                                                                                                                                                                                    | Optional.                                                                                          |
|                        | Array of titles. A title is a short headline in the ad, generally shown next to a link, image or video.                                                                                                                                                                                                                    |
|                        | Provide this field as an array of list of `{"text": "{TITLE}", "url_tags": "{TAG}"}`.                                                                                                                                                                                                                                      |
| `descriptions`         | **type: array of list**                                                                                                                                                                                                                                                                                                    | Optional.                                                                                          |
|                        | Array of secondary description text, displayed less prominently than bodies or titles. Generally appears next to a link, image or video. If not specified, Facebook scrapes the link you provided to generate it. Use an empty string with single space for blank description, if you do not want to use the scraped text. |
|                        | Provide this field as an array of list of `{"text": "{DESCRIPTION}", "url_tags": "{TAG}"}`.                                                                                                                                                                                                                                |
| `link_urls`            | **type: array of list**                                                                                                                                                                                                                                                                                                    | Required.                                                                                          |
|                        | Array of link URLs.                                                                                                                                                                                                                                                                                                        |
|                        | Provide this field as an array of list of `{"website_url": "{URL}"}`.                                                                                                                                                                                                                                                      |
| `ad_formats`           | **type: array of strings**                                                                                                                                                                                                                                                                                                 | Required.                                                                                          |
|                        | Array of Facebook ad formats we should create the ads in. Supported formats are: `SINGLE_IMAGE`, `CAROUSEL`, `SINGLE_VIDEO`, `AUTOMATIC_FORMAT`.                                                                                                                                                                           |
|                        | Provide this field as an array of strings `["{AD_FORMAT}"]`.                                                                                                                                                                                                                                                               |
| `optimization_type`    | **type: string**                                                                                                                                                                                                                                                                                                           | Optional.                                                                                          |
|                        | Optimization type used in asset feed. Possible values are `ASSET_CUSTOMIZATION`, `LANGUAGE`, `PLACEMENT`, and `REGULAR`.                                                                                                                                                                                                   |
| `message_extensions`   | **type: array of strings**                                                                                                                                                                                                                                                                                                 | Optional.                                                                                          |
|                        | Message extension type used in asset feed.                                                                                                                                                                                                                                                                                 |
|                        | Possible value: `whatsapp`                                                                                                                                                                                                                                                                                                 |
| `onsite_destinations`  | **type: array of list**                                                                                                                                                                                                                                                                                                    | Required for Shops Ads. Valid for Static Ads; `SINGLE_IMAGE`, `SINGLE_VIDEO` or `CAROUSEL` format. |
|                        | Provide this field as an array of list containing one of the following values to specify the landing destination for your onsite shop.                                                                                                                                                                                     |
|                        | `{"storefront_shop_id": "<SHOP_STOREFRONT_ID>"}`or `{"shop_collection_product_set_id": "<PRODUCT_SET_ID>"` or `{"details_page_product_id": "<PRODUCT_ID>"}`                                                                                                                                                                |
| `shops_bundle`         | **type: boolean**                                                                                                                                                                                                                                                                                                          | Required for Shops Ads. Valid for Advantage+ Catalog Ads.                                          |
|                        | Provide this field for shop optimization. Includes both `reasons_to_shop` and `automated_product_tags` shop optimization types.                                                                                                                                                                                            |
|                        | Possible values: `true`, `false`                                                                                                                                                                                                                                                                                           |
| `reasons_to_shop`      | **type: boolean**                                                                                                                                                                                                                                                                                                          | Required for Shops Ads. Valid for Advantage+ Catalog Ads.                                          |
|                        | Provide this field for shop optimization. Automatically highlights product information from your shop, like "Free shipping", "Trending" or "Low stock".                                                                                                                                                                    |
|                        | Possible values: `true`, `false`                                                                                                                                                                                                                                                                                           |

## Asset Feed Spec Restrictions

|                         |                                                                                                                                                                                     |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ad Formats**          | Supported `ad_formats`: `SINGLE_IMAGE`, `CAROUSEL`, `SINGLE_VIDEO`, and `AUTOMATIC_FORMAT`.                                                                                         |
|                         | Only one `ad_format` is allowed per asset feed.                                                                                                                                     |
|                         | `ad_format` counts as one asset in an asset feed.                                                                                                                                   |
| **Number of Assets:**   | Maximum of 30 total assets. For example, you have 28 assets with 10 images, 5 bodies, 5 titles, 5 description, 1 ad_format, 1 link_url, and 1 call_to_action_types.                 |
|                         | Total number of images: `<= 10`.                                                                                                                                                    |
|                         | Total number of videos: `<= 10`. If you use Instagram as your placement, only square videos or landscape videos allowed.                                                            |
|                         | Total number of bodies: `<= 5`.                                                                                                                                                     |
|                         | Total number of call-to-actions: `<= 5`.                                                                                                                                            |
|                         | Total number of titles: `<= 5`.                                                                                                                                                     |
|                         | Total number of links: `<= 5`.                                                                                                                                                      |
|                         | Total number of descriptions: `<= 5`.                                                                                                                                               |
| **Image requirements:** | Recommended image specs: `1.9:1`.                                                                                                                                                   |
|                         | Recommended image size: `1,200 x 628` pixels.                                                                                                                                       |
|                         | For `CAROUSEL_IMAGE` format, you must provide at least 2 images.                                                                                                                    |
|                         | If you use Instagram as your placement, use square images for better performance.                                                                                                   |
| **Text requirements:**  | Title and description text: maximum length of 255 characters.                                                                                                                       |
|                         | Body text: maximum length of 1024 characters.                                                                                                                                       |
|                         | If you do not specify any description, we scrape the link you provided to retrieve a description.                                                                                   |
|                         | For `CAROUSEL_IMAGE`, titles are optional.                                                                                                                                          |
|                         | `url_tags` are optional and only available for images, videos, bodies, descriptions, and titles. Facebook appends `url_tags` to the link URL as parameters for each asset in an ad. |
|                         | For example, a valid asset feed combination setup for `SINGLE_IMAGE` format is:                                                                                                     |
|                         | 5 images                                                                                                                                                                            |
|                         | 3 bodies                                                                                                                                                                            |
|                         | 3 titles                                                                                                                                                                            |
|                         | 3 descriptions                                                                                                                                                                      |
|                         | 1 format: `SINGLE_IMAGE`                                                                                                                                                            |
|                         | 2 link_urls                                                                                                                                                                         |
|                         | `"link_urls=[{'website_url':'<WEBSITE_URL>'}, {'website_url':'<WEBSITE_URL>'}]"`                                                                                                    |

## Use Deep Links

You can use deeplinks in asset feed specs for campaigns with the following objectives:

- `APP_INSTALLS`
- `CONVERSIONS`
- `LINK_CLICKS`

Add `deeplink_url` in `link_urls` when you create your `asset_feed_spec`.

```curl
curl \
  -F 'object_story_spec={
  	"page_id": "<PAGE_ID>"
  	"instagram_user_id" : "<IG_USER_ID>",
  }' \
  -F "asset_feed_spec={
  	'images': [{'hash':'<IMAGE_HASH>'}], 
  	'bodies': [{'text':'<BODY_1>'}, {'text':'<BODY_2>'}], 
  	'titles': [{'text':'<TITLE_1>'}, {'text':'<TITLE_2>'}], 
  	'descriptions': [{'text':'<DESCRIPTION>'}], 
  	'ad_formats': ['SINGLE_IMAGE'], 
  	'link_urls': [{'website_url':'<APP_OBJECT_STORE_URL>','deeplink_url':'<DEEPLINK_URL>'}]}" \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

## Website to WhatsApp Ads

You can create ads that send people to your website with a WhatsApp button appearing at the bottom of the screen, so they can contact you instantly. This will help people connect with you on WhatsApp while visiting your website.

Add the `message_extensions` parameter with `"type": "whatsapp"` when you create your `asset_feed_spec`.

```curl
curl \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>"
       "instagram_user_id" : "<IG_USER_ID>",
    }' \
  -F 'asset_feed_spec={
  	"images": [{"hash":"<IMAGE_HASH>"}], 
  	"bodies": [{"text":"<BODY_1>"}, {"text":"<BODY_2>"}],
  	"titles": [{"text":"<TITLE_1>"}, {"text":"<TITLE_2>"}], 
  	"descriptions": [{"text":"<DESCRIPTION>"}], 
  	"ad_formats": ["SINGLE_IMAGE"], 
  	"link_urls": [{"website_url":"<BUSINESS_URL>"}], 
  	"message_extensions": [{"type": "whatsapp"}]}' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

# Dynamic Creative

Dynamic Creative allows you to automatically deliver different combinations of an ad's creative to your users. It helps you find the best creative combination per impression and learns from the asset's performance across audiences.

This solution also improves your ability to explore a variety of creative asset combinations and audiences, so you can show the best images, titles, descriptions and other assets to your users.

You should use Dynamic Creative to:

- Automate the workflow used to test creative
- Use different audiences to learn how to pick the most effective combination of creative assets

Use this API for new and ongoing campaigns, as well as campaigns that run longer than five days. You should perform split testing with your existing campaigns to find the best approach for your needs.

## Get Started

- Step 1: Create Campaign and Ad Set
- Step 2: Provide the ad creative with `asset_feed_spec`
- Step 3: Create your ad
- Optional Step 4: Check your ad's review status.
- Get insights and analyze your results

## Step 1: Create Campaign and Ad Set

You can create a standard ad campaign for Dynamic Creative, but there are two limitations:

- Your objective must be one of the following: `OUTCOME_SALES`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, or `OUTCOME_APP_PROMOTION`.
- `buying_type` must be the default, which is `AUCTION`, or left blank.

For example, to create an ad campaign with the objective of `CONVERSIONS`:

```curl
curl \
  -F 'name=Dynamic Creative Sample Campaign'
  -F 'objective=OUTCOME_SALES'
  -F 'status=PAUSED'
  -F 'special_ad_categories=<SPECIAL_AD_CATEGORY>'
  -F access_token=<ACCESS_TOKEN>
  https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/campaigns   
```

Once you have your campaign, create an ad set by using the standard ad set endpoint.

You can use all `billing_events`, `targeting`, and `promoted_objects`, as long as they are compatible with the parent ad campaign's objective.

You must set the `optimization_goal` to `OFFSITE_CONVERSIONS` for `OUTCOME_SALES`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, and `OUTCOME_TRAFFIC` objectives.

Then set `is_dynamic_creative` to `true`.

To create an ad set in a campaign with `optimization_goal` set to conversions:

```curl
curl \
  -F 'status=PAUSED'
  -F 'name=Dynamic Creative Ad Set'
  -F 'campaign_id=<CAMPAIGN_ID>'
  -F 'optimization_goal=OFFSITE_CONVERSIONS'
  -F 'is_dynamic_creative=true'
  -F 'lifetime_budget=5000'
  -F 'promoted_object={"pixel_id": "<PIXEL_ID>", "custom_event_type": "PURCHASE"}'
  -F 'billing_event=IMPRESSIONS'
  -F 'bid_strategy=LOWEST_COST_WITHOUT_CAP'
  -F 'targeting={"geo_locations": {"countries": ["US"]}}'
  -F 'start_time=2024-04-09'
  -F 'end_time=2024-04-20'
  -F access_token=<ACCESS_TOKEN>
  https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/adsets
```

This returns a new ad set ID:

`{"id":"23842500259260001"}`

If you use `asset_feed_spec` with an ad set optimized for `APP_INSTALLS`, you should specify `link_url`, such as `http://www.abc.com`. The `link_url` should be the same as `object_store_url` in `promoted_object`. You should provide only one `link_url` parameter in `asset_feed_spec`.

```curl
curl -F "name=Dynamic Creative AdSet"-F "campaign_id=CAMPAIGN_ID"-F "optimization_goal=APP_INSTALLS"-F 'is_dynamic_creative=true'-F "billing_event=IMPRESSIONS"-F "is_autobid=true"-F "promoted_object={'object_store_url':'https://itunes.apple.com/us/app/facebook/id284882215','application_id':ADVERTISED_APP_ID}"  // object_store_url must match what is provided in asset feed's link_urls -F "lifetime_budget=20000"-F "end_time=1461974400"-F "targeting={
     'geo_locations':{'countries':['US']},
     'age_min':18,
     'age_max':24,
     'publisher_platforms':['facebook', 'audience_network'],
     'user_os':['ios']
   }"-F "access_token=ACCESS_TOKEN" 
https://graph.facebook.com/<API_VERSION>/act_AD_ACCOUNT_ID/adsets
```

## Step 2: Provide Ad Creative with asset_feed_spec

Provide your creative through the `asset_feed_spec` field, also known as [Asset Feed](#asset-feed-spec). In this field, you can specify multiple creative assets for each asset type. Some examples of asset types are images, videos, headlines and link descriptions. See the following:

- [Setup Your Asset Feed](#create-asset-feed)
- [Asset Feed Options](#asset-feed-spec-options)

Note you may also need to set `page_id` and `instagram_user_id`.

`asset_feed_id` is only supported in Marketing API v3.1 and earlier. You should use `asset_feed_spec` instead.

**Image Cropping**

Dynamic creative supports image cropping. Specify the image cropping parameter in your image spec. You can provide only one crop per image. We apply your crops to all placements of your image. See [Marketing API, Image Cropping](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/image-crop).

## Step 3: Create Your Ad

At this point, your ad set must be empty. When you create your ad, provide a reference to the creative ID. You can only create one ad per ad set. However, you can create additional Dynamic Creative ads in other, new ad sets.

```curl
curl 
  -F 'name=Dynamic Creative Ad' 
  -F 'adset_id=<ADSET_ID>' 
  -F 'access_token=<ACCESS_TOKEN>' 
  -F 'creative={
      "creative_id": <CREATIVE_ID>,
   }' 
https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/ads
```

After you create your ad:

- Your campaign appears in Ads Manager.
- Facebook reviews your ad and checks if it meets our Advertising Policies.

Once you create an ad for Dynamic Creative, you cannot delete or archive it. Instead, you should delete or archive the parent ad set.

Dynamic Creative supports all placements except `sponsored_messages` on Messenger.

**Carousel Ads**

Dynamic Creative delivers the best combination of assets in carousel ad format. If your feed has less than 10 images, the number of carousel cards is the same as the number of images. If you are using more than 10 images, we display a carousel with 10 cards. We recommend square sizes for images.

If you are using carousel with Dynamic Creative, you cannot use these features from carousel ads:

- `BODY_LABEL`
- `CALL_TO_ACTION_TYPE_LABEL`
- `LINK_URL_LABEL`
- `CAPTION_LABEL`
- `AD_FORMAT_LABEL`

In the asset insights breakdown, we aggregate impression based metrics for in-card assets for all cards to the assets in the first card. In-card assets include images, title, and description

For background information, see [Carousel ads](#carousel-ads).

## Optional Step 4: Check Review Status

After you create your campaign, ad set, and ad, check ad review status:

```curl
curl -G -d "access_token=<ACCESS_TOKEN>" -d 'fields=review_feedback' 
https://graph.facebook.com/<API_VERSION>/<ADSET_ID>
```

The result includes ad review feedback. An empty array means that your ad passed review:

```json
{
  "review_feedback": "[]",
  "id": "<ADSET_ID>"
}
```

If your ad does not pass review, you see:

```json
{
  "review_feedback": {
    {"id":23842500258220001,"text":"Body 1","reason":["ALCOHOL"]},
    {"id":23842500258160001,"text":"Title 1","reason":["ALCOHOL"]},
    {"id":23842500258170001,"text":"Title 2","reason":["ALCOHOL"]}
  }",
  "id": "<AD_ID>"  
}
```

# Asset Customization Rules

Use this solution to define which creative assets you want to display in your ads. At the time of ad creation, you can pick the combination of assets you want to display, based on your asset custom rules. Examples of creative assets are images, videos, text and body of an ad.

We offer three APIs that use asset customization rules:

- [Placement Asset Customization](#placement-asset-customization): Customize the creative assets displayed in different ad placements.
- [Multi-Language Ads](#multi-language-ads): Customize different parts of ad creative such as the image, video, text, and body of an ad to reach speakers of different language.
- [Segment Asset Customization](https://developers.facebook.com/docs/marketing-api/guides/asset-customization-rules/segment-asset-customization): Customize ad assets according to targeting types.

All ads using `asset_feed_spec` must contain at least two target customization rules. If your creative uses `asset_feed_spec` and includes less than two rules, you will not be able to create that ad.

## Get Started

- Step 1: Create ad campaign and ad set.
- Step 2: Provide the ad creative.
- Step 3: Create your ad.
- Step 4: Get insights and analyze your results.

## Step 1: Create Campaign and Ad Set

You can create a standard ad campaign for Asset Custom Rules, but there are limitations:

| API                                                                                                                                            | Supported campaign objectives                                                                               |
| :--------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| [Segment Asset Customization](https://developers.facebook.com/docs/marketing-api/guides/asset-customization-rules/segment-asset-customization) | `APP_INSTALLS`, `BRAND_AWARENESS`, `CONVERSIONS`, `LINK_CLICKS`, `REACH`, `VIDEO_VIEWS`.                    |
| [Placement Asset Customization](#placement-asset-customization)                                                                                | `APP_INSTALLS`, `BRAND_AWARENESS`, `CONVERSIONS`, `LEAD_GENERATION`, `LINK_CLICKS`, `REACH`, `VIDEO_VIEWS`. |
| [Multi-Language Ads](#multi-language-ads)                                                                                                      | `APP_INSTALLS`, `BRAND_AWARENESS`, `CONVERSIONS`, `LINK_CLICKS`, `REACH`, `VIDEO_VIEWS`.                    |

For the Ad Set, use the standard [ad set endpoint](https://developers.facebook.com/docs/marketing-api/guides/adsets) and set `is_dynamic_creative` to `false`.

To create an ad set in a campaign with `optimization_goal` set to conversions:

```curl
curl \
  -F 'status=PAUSED'
  -F 'name=Sample Ad Set'
  -F 'campaign_id=<CAMPAIGN_ID>'
  -F 'optimization_goal=OFFSITE_CONVERSIONS'
  -F 'is_dynamic_creative=false'
  -F 'lifetime_budget=1000'
  -F 'promoted_object={"pixel_id": "<PIXEL_ID>", "custom_event_type": "PURCHASE"}'
  -F 'billing_event=IMPRESSIONS'
  -F 'bid_strategy=LOWEST_COST_WITHOUT_CAP'
  -F 'targeting={"geo_locations": {"countries": ["US"]}}'
  -F 'start_time=2019-04-02'
  -F 'end_time=2019-04-09'
  -F 'access_token=<ACCESS_TOKEN>'
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

If you use `asset_feed_spec` with an ad set optimized for `APP_INSTALLS`, you should specify `link_url`, such as `http://www.abc.com`. The `link_url` should be the same as `object_store_url` in `promoted_object`. You should provide only one `link_url` parameter in `asset_feed_spec`.

`asset_feed_spec` provides creative for [Dynamic Creative](#dynamic-creative), [Placement Asset Customization](#placement-asset-customization), [Multi-Language Ads](#multi-language-ads), and [Segment Asset Customization](https://developers.facebook.com/docs/marketing-api/guides/asset-customization-rules/segment-asset-customization). The spec's format is different for each solution.

## Step 2: Provide the ad creative

Provide your creative through `asset_feed_spec`. An asset feed is a collection of different creative elements, such as image, titles, bodies, and so on. You can specify multiple creative assets for each asset type.

Create an `asset_feed_spec` at `/adcreative`. To apply customization options, set `asset_customization_rules` inside your `asset_feed_spec`.

- [Asset Feed Setup for Placement Asset Customization](#placement-asset-customization)
- [Asset Feed Setup for Multi-Language Ads](#multi-language-ads)
- [Asset Feed Setup for Segment Asset Customization](https://developers.facebook.com/docs/marketing-api/guides/asset-customization-rules/segment-asset-customization)

After setup, verify your `asset_feed_spec`:

```curl
curl -G -d "access_token=<ACCESS_TOKEN>"-d "fields=asset_feed_spec" 
https://graph.facebook.com/v24.0/<AD_CREATIVE_ID>
```

## Step 3: Create your ad

When you create your ad, provide a reference to the creative ID. You can create multiple ads per ad set.

```curl
curl 
      -F 'name=Asset Custom Rule Ad' 
      -F 'adset_id=<ADSET_ID>' 
      -F 'access_token=<ACCESS_TOKEN>' 
      -F 'creative={
          "creative_id": <CREATIVE_ID>,
       }' 
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

After creation:

- Your campaign appears in Ads Manager.
- Facebook reviews your ad and checks if it meets our Advertising Policies.

# Placement Asset Customization

Use this solution to customize the creative assets displayed in different ad placements. Maintain control over the creative, while using several different placements.

Placement Asset Customization is one of our three APIs that use [asset customization rules](#asset-customization-rules). Learn more about [Asset Customization Rules](#asset-customization-rules).

## Get Started

- Step 1: Create an ad campaign and ad set
- Step 2: Provide creative and customize assets
- Step 3: Create your ad
- Optional Step 4: Get insights and analyze results
- Optional Step 5: Read Ad Creative

Placement Asset Customization with existing posts is no longer supported via the API. You can only use this option in Ads Manager.

## Step 2: Provide Creative

Use `asset_feed_spec` to provide your creative. You can specify multiple creative assets for each asset type, including images, videos, carousels, headlines, and body text. Only provide one link description, since the link description cannot be customized per placement.

To apply customization:

- Set `asset_customization_rules` inside your `asset_feed_spec`.
- For each rule, add `customization_spec` and asset labels.
- For Placement Asset Customization, every `asset_feed_spec` needs to have more than one customization rule attached to it.

See [Asset Customization Rules](#asset-customization-rules).

**Supported Properties**

| Property Name        | Description                                                                                                                                                                                                                                                                                                          |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `customization_spec` | **type: [Supported Fields](#supported-fields-in-customization_spec)**                                                                                                                                                                                                                                                | Required.                           | Placements where you want to display the assets.                                                       |
| `image_label`        | **format:** `{"name": "{LABEL_NAME}"}`                                                                                                                                                                                                                                                                               | Required for `SINGLE_IMAGE` format. | Label of the image you want to display. It is attached to the image assets in `asset_feed_spec`.       |
| `video_label`        | **format:** `{"name": "{LABEL_NAME}"}`                                                                                                                                                                                                                                                                               | Required for `SINGLE_VIDEO` format. | Label of the video you want to display. It is attached to the video assets in `asset_feed_spec`.       |
| `carousel_label`     | **format:** `{"name": "{LABEL_NAME}"}`                                                                                                                                                                                                                                                                               | Required for `CAROUSELS` format.    | Label of the carousel you want to display. It is attached to the carousel assets in `asset_feed_spec`. |
|                      | **Note:** if providing carousels via Placement Asset Customization, all child attachments must be defined within the Asset Feed Spec and referenced via `adlabels`. Child attachments may not be defined inline. See [Asset Feed Spec Options](#asset-feed-spec-options) for more details on the `carousels` format. |

**Supported Fields in `customization_spec`**

| Property Name                | Description                                                                                                                             |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `publisher_platforms`        | Required.                                                                                                                               | Possible placements for your ad. Options are: `facebook`, `instagram`, `messenger`, `audience_network`, and `threads`.                      |
| `facebook_positions`         | Optional, but required if Facebook is selected in `publisher_platforms`.                                                                | Facebook specific placement. Options are: `feed`, `right_hand_column`, `marketplace`, `video_feeds`, `search`, `story`, and `notification`. |
| `instagram_positions`        | Optional, but required if Instagram is selected in `publisher_platforms`.                                                               | Instagram specific placements. Options are: `stream`, `story`, `explore`, `explore_home`, `profile_feed` and `ig_search`.                   |
|                              | **Note:** The `explore_home` placement only supports the `SINGLE_IMAGE` format.                                                         |
| `messenger_positions`        | Optional, but required if Messenger is selected in `publisher_platforms`.                                                               | Messenger specific placements. Options are: `sponsored_messages` and `story`.                                                               |
| `audience_network_positions` | Optional, but required if Audience Networks is selected in `publisher_platforms`.                                                       | Audience Network specific placement. Options are: `classic`, `instream_video`, and `rewarded_video`.                                        |
| `threads_positions`          | Optional, but required if Threads is selected in `publisher_platforms`.                                                                 | Threads specific placement: `threads_stream`                                                                                                |
|                              | **Note:** `publisher_platform: instagram` and `instagram_positions: stream` are required to select `threads_positions: threads_stream`. |

Learn more about our [available placement options](https://developers.facebook.com/docs/marketing-api/targeting-specs/v24.0#placement).

**Example — Feed Setup**

```curl
curl -X POST \
  -F 'object_story_spec={
      "page_id": "<PAGE_ID>",
      "instagram_user_id": "<IG_USER_ID>",
    }' \
  -F 'asset_feed_spec={
      "videos": [{
        "adlabels": [{"name": "labelfb"}],
        "video_id": "<VIDEO_ID>"
      },
      {
        "adlabels": [{"name": "labelig"}],
        "video_id": "<VIDEO_ID>"
      }],
      "bodies": [{"text": "Begin Your Adventure"}],
      "link_urls": [{
        "website_url": "<WEBSITE_URL>",
        "display_url": "<DISPLAY_URL>"
      }],
      "titles": [{"text": "Level Up"}],
      "ad_formats": ["SINGLE_VIDEO"],
      "call_to_action_types": ["WATCH_MORE"],
      "descriptions": [{"text": "Description"}],
      "asset_customization_rules": [{
        "customization_spec": {          
          "publisher_platforms": ["facebook"],
          "facebook_positions": ["feed","instream_video"]
        },
        "video_label": {
          "name": "labelfb"
        }
      },
      {
        "customization_spec": {
          "publisher_platforms": ["instagram"],
          "instagram_positions": ["stream"]
        },
        "video_label": {
          "name": "labelig"
        }
      }]
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Example — Instagram Explore home Asset Customization**

```curl
curl -X POST \
  -F 'object_story_spec={
      "page_id": "<PAG_-ID>",
      "instagram_user_id": "<INSTAGRAM_ID>",
    }' \
  -F 'asset_feed_spec={
    "ad_formats": ["SINGLE_IMAGE"],
    "asset_customization_rules": [{
      "image_label": {
        "name": "<IMAGE_LABEL>"
      },
      "customization_spec": {
        "publisher_platforms": ["instagram"],
        "instagram_positions": ["explore_home"]
      }
    }],
    "bodies": [{
      "text": "",
      "adlabels": [{
        "name": "adlabel1"
      },
      {
        "name": "adlabel2"
      }]
    }],
    "call_to_action_types": ["LEARN_MORE"],
    "images": [{
      "hash": "<IMAGE_HASH>",
      "adlabels": [{"name": "adlabel1"}]
    },
    {
      "hash": "<IMAGE_HASH>",
      "image_crops": {
        "100x100": [
          [
            604,
            0
          ],
          [
            1659,
            1055
          ]
        ]
      },
      "adlabels": [{"name": "adlabel2"}]
    }],
    "link_urls": [{
      "website_url": "<WEBSITE_URL>",
      "display_url": "<DISPLAY_URL>",
      "deeplink_url": "<DEEPLINK_URL>",
      "adlabels": [
        {
          "name": "adlabel1"
        },
        {
          "name": "adlabel2"
        }
      ]
    }],
    "optimization_type": "PLACEMENT",
    "titles": [{
      "text": "<TEXT>",
      "adlabels": [
        {
          "name": "adlabel1"
        },
        {
          "name": "adlabel2"
        }
      ]
      }]
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Example - Instagram search results Asset Customization**

```curl
curl -X POST \
  -F 'object_story_spec={
      "page_id": "<PAGE_ID>",
      "instagram_user_id": "<INSTAGRAM_ID>",
    }' \
  -F 'asset_feed_spec={
    "ad_formats": ["SINGLE_IMAGE"],
    "asset_customization_rules": [{
      "image_label": {
        "name": "placement_asset_f1048d832ecd558_1661539731099"
      },
      "customization_spec": {
        "publisher_platforms": ["instagram"],
        "instagram_positions": ["ig_search"]
      }
    }],
    "bodies": [{
      "text": "<TEXT>",
      "adlabels": [
        {
          "name": "adlabel1"
        },
        {
          "name": "adlabel2"
        }
      ]
    }],
    "call_to_action_types": ["LEARN_MORE"],
    "images": [{
      "hash": "9ffd7307eae1f9c6e5250fc8760d285f",
      "adlabels": [{"name": "adlabel1"}]
    },
    {
      "hash": "9ffd7307eae1f9c6e5250fc8760d285f",
      "image_crops": {
        "100x100": [
          [
            604,
            0
          ],
          [
            1659,
            1055
          ]
        ]
      },
      "adlabels": [{"name": "adlabel2"}]
    }],
    "link_urls": [{
      "website_url": "<WEBSITE_URL>",
      "display_url": "<DISPLAY_URL>",
      "deeplink_url": "<DEEPLINK_URL>",
      "adlabels": [
        {
          "name": "adlabel1"
        },
        {
          "name": "adlabel2"
        }
      ]
    }],
    "optimization_type": "PLACEMENT",
    "titles": [{
      "text": "",
      "adlabels": [
        {
          "name": "adlabel1"
        },
        {
          "name": "adlabel2"
        }
      ]
    }]
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Example — Threads Feed Setup**

```curl
curl -X POST \
  -F 'object_story_spec={
    "page_id": "<PAGE_ID>",
    "instagram_user_id": "<IG_USER_ID>",
    "threads_user_id" : "<THREADS_USER_ID>",
  }' \
  -F 'asset_feed_spec={
    "videos": [{
      "adlabels": [{"name": "labelfb"}],
      "video_id": "<VIDEO_ID>"
    },
    {
      "adlabels": [{"name": "labelig"}],
      "video_id": "<VIDEO_ID>"
    },
    {
      "adlabels": [{"name": "labelthreads"}],
      "video_id": "<VIDEO_ID>"
    }],
    "bodies": [{"text": "Begin Your Adventure"}],
    "link_urls": [{
      "website_url": "<WEBSITE_URL>",
      "display_url": "<DISPLAY_URL>"
    }],
    "titles": [{"text": "Level Up"}],
    "ad_formats": ["SINGLE_VIDEO"],
    "call_to_action_types": ["WATCH_MORE"],
    "descriptions": [{"text": "Description"}],
    "asset_customization_rules": [{
      "customization_spec": {          
        "publisher_platforms": ["instagram"],
        "instagram_positions": ["stream"]
      },
      "video_label": {
        "name": "labelig"
      }
    },
    { 
      "customization_spec": {
        "publisher_platforms": ["threads"],
        "threads_positions": ["threads_stream"]
      },
      "video_label": {
        "name": "labelthreads"
      }
    },
    {
      "customization_spec": {},
      "video_label": {
        "name": "labelfb"
      }
    }],
    "optimization_type": "PLACEMENT"
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v23.0/act_<AD_ACCOUNT_ID>/adcreatives
```

See all available options for [Asset Feed Spec](#asset-feed-spec-options).

## Optional Step 5: Read Ad Creative

For Placement Asset Customization ads, Instagram-related creative fields should be retrieved via `act_<AD_ACCOUNT_ID>/ads`. For example:

`https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads?fields=creative{effective_instagram_media_id,instagram_permalink_url}`

# Multi-Language Ads

Customize different parts of ad creative such as the image, video, text, and body of an ad to reach speakers of different language. Facebook optimizes your ad to show the right language version to the right people.

This helps you to easily set up an ad in multiple languages and deliver the most relevant language version in your ad to a viewer while retaining a broad targeting for the ad. This enables you to have personalized content based on a viewer's spoken language while maintaining cost-efficient ads.

For general information on this feature, see [Ads Help Center, Advertise to a multilingual audience](https://www.facebook.com/business/help/1288599478479574). See [supported ad campaign objectives](#asset-customization-rules).

Multi-Language Ads is one of our three APIs that use [asset customization rules](#asset-customization-rules).

## Get Started

Before you get started, check [restrictions for this product](#restrictions). If your use case meets our specifications, move on to the following steps:

- Step 1: Create an ad campaign and ad set
- Step 2: Provide creative via `asset_feed_spec` —see also [Available Languages](#available-languages).
- Step 3: Create an ad with `asset_feed_spec` in `creative_spec`
- Optional Step 4: Preview your ad

If you do not have the resources to manually translate your ad, check out our [automatic translation service](#automatic-translations).

## Step 2: Provide creative via asset_feed_spec

Multi-Language Ads creatives are specified using `asset_feed_specs`. An asset feed is a collection of different creative elements, such as image, titles, bodies, and so on. You create an `asset_feed_spec` at `/adcreative`.

To create an `asset_feed_spec`, provide an array of assets for each different language. Add a label to tag each asset to identify the language the asset belongs to. Facebook uses the labels in `asset_customization_rules` to group assets together by language. You should provide at least one asset per asset type.

**Available Parameters**

Parameters to provide in `asset_feed_spec` include:

| Property Name               | Description                                                                                                                                                                           |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------- |
| `images`                    | **type: array**                                                                                                                                                                       | Required for `SINGLE_IMAGE` ad format. Provide `url` or `hash`. |
|                             | Images as `url` or `hash`. You should provide images which are in the ad account's image library.                                                                                     |
|                             | Provide this field as an array of `{"url": "<IMAGE_URL>", "hash": "<IMAGE_HASH>", "url_tags": "<TAG>", "adlabels": [{name: "<LABEL>"}]}`.                                             |
| `videos`                    | **type: array**                                                                                                                                                                       | Required for `SINGLE_VIDEO` ad format.                          |
|                             | Array of `video_ids`. Videos should be in the ad account's video library.                                                                                                             |
|                             | Provide this field as an array of `{"video_id": "<VIDEO_ID>","thumbnail_url": "{<THUMBNAIL_URL>}", "url_tags": "{<TAG>}", "adlabels": [{"name": "<LABEL>"}]}`.                        |
| `bodies`                    | **type: array**                                                                                                                                                                       | Required, but `url_tags` are optional.                          |
|                             | Array of bodies containing primary message of ad.                                                                                                                                     |
|                             | Provide this field as an array of `{"text": "<BODY_TEXT>", "url_tags": "<TAG>", "adlabels": [{"name": "<LABEL>"}]}`.                                                                  |
| `titles`                    | **type: array**                                                                                                                                                                       | Required, but `url_tags` are optional.                          |
|                             | Array of titles. A short headline in the ad, generally shown next to a link, image or video.                                                                                          |
|                             | Provide this field as an array of `{"text": "<TITLE>", "url_tags": "<TAG>", "adlabels": [{"name": "<LABEL>"}]}`.                                                                      |
| `descriptions`              | **type: array**                                                                                                                                                                       | Required, but `url_tags` are optional.                          |
|                             | Array of secondary description text, displayed less prominently than bodies or titles.                                                                                                |
|                             | Provide this field as an array of `{"text": "<DESCRIPTION>", "url_tags": "<TAG>", "adlabels": [{"name": "<LABEL>"}]}`. Use an empty string with a single space for blank description. |
| `link_urls`                 | **type: array**                                                                                                                                                                       | Required, but `display_url` and `deeplink_url` are optional.    |
|                             | Array of link URLs.                                                                                                                                                                   |
|                             | Provide this field as an array of `{"website_url": "<URL>", "adlabels": [{"name": "<LABEL>"}], "deeplink_url": "<DEEPLINK>", "display_url": "<URL>"}`.                                |
| `call_to_action_types`      | **type: array**                                                                                                                                                                       | Required.                                                       |
|                             | Array of call-to-action-type values.                                                                                                                                                  |
|                             | Provide this field as an array of supported call to actions: `["<CALL_TO_ACTION>"]`.                                                                                                  |
| `ad_formats`                | Required.                                                                                                                                                                             |                                                                 |
|                             | Array of Facebook ad formats you want to create the ads in. Supported formats are: `SINGLE_IMAGE`, `SINGLE_VIDEO`.                                                                    |
|                             | Provide this field as an array of supported ad formats: `["{<AD_FORMAT>}"]`.                                                                                                          |
| `asset_customization_rules` | **type: see table below under [Asset Customization Rules](#asset-customization-rules-1)**                                                                                             | Required.                                                       | Array of asset customization rules. |

**Asset Customization Rules**

Define the assets that appear together for viewers who speak a particular language. Each rule has a `customization_spec` which defines the locales of people who view these assets during ad delivery.

Provide exactly one **default** rule. This rule must include the assets that Facebook displays if someone's preferred language does not match any locales specified in the asset feed. This helps prevent under-delivery of your ads.

| Property Name        | Description                                     |
| :------------------- | :---------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `customization_spec` | **type:** `{"locales": [<LOCALE1>, <LOCALE2>]}` | Required.                              | Define the locales where the assets in this rule should deliver. For supported locales, see [Available Languages](#available-languages). |
| `image_label`        | **type:** `{"name": "<LABEL>"}`                 | Required for `SINGLE_IMAGE` ad format. | Label attached to one of the image assets in the asset feed.                                                                             |
| `video_label`        | **type:** `{"name": "<LABEL>"}`                 | Required for `SINGLE_VIDEO` ad format. | Label attached to one of the video assets in the asset feed.                                                                             |
| `body_label`         | **type:** `{"name": "<LABEL>"}`                 | Required.                              | Label attached to one of the body assets in the asset feed.                                                                              |
| `title_label`        | **type:** `{"name": "<LABEL>"}`                 | Required.                              | Label attached to one of the title assets in the asset feed.                                                                             |
| `description_label`  | **type:** `{"name": "<LABEL>"}`                 | Required.                              | Label attached to one of the description assets in the asset feed.                                                                       |
| `link_url_label`     | **type:** `{"name": "<LABEL>"}`                 | Required.                              | Label attached to one of the link_url assets in the asset feed.                                                                          |
| `is_default`         | **type: boolean**                               | Required.                              | Boolean flag to identify the default rule. You should set exactly one rule with `is_default` flag as `true`.                             |

**Available Languages**

The locales you provide in `customization_spec` must be locale IDs supported in ads targeting. See [Targeting and Placement, Locales](https://developers.facebook.com/docs/marketing-api/targeting-search#locales). You can search for specific language using the `/search` endpoint. Use the `q` parameter to search for a specific language name. Leave this parameter blank to get the list of all supported languages:

```curl
curl -G \
  -d "type=adlocale" \
  -d "q=en" \
  -d "limit=2" \
  -d "access_token=<ACCESS_TOKEN>" \ 
  https://graph.facebook.com/v24.0/search
```

On success you get a list of languages:

```json
{
  "data": [
    {
      "key": 6,
      "name": "English (US)"
    },
    {
      "key": 24,
      "name": "English (UK)"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MAZDZD"
    }
  }
}
```

You should use the `keys` in these search results as locales in your asset customization rules. For more information, see [Targeting Search](https://developers.facebook.com/docs/marketing-api/targeting-search).

## Step 3: Create Ads using Asset Feed Specs

You can create an asset feed using the `asset_feed_spec` field in `POST ad_account_ID/adcreatives`:

```curl
curl \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>",
       "instagram_user_id": "<IG_USER_ID>",
     }' \
  -F 'asset_feed_spec={
       "ad_formats": ["SINGLE_IMAGE"],
       "bodies": [
         {
           "text": "Try our delicious guacamole recipe!",
           "adlabels": [{"name": "english"}],
         },
         {
           "text": "Essayez notre délicieuse recette de guacamole!",
           "adlabels": [{"name": "french"}],
         },
       ],
       "titles": [
         {
           "text": "Jaspers Market",
           "adlabels": [{"name": "english"}],
         },
         {
           "text": "Jaspers Market",
           "adlabels": [{"name": "french"}],
         },
       ],
       "descriptions": [
         {
           "text": "The best avocados!",
           "adlabels": [{"name": "english"}],
         },
         {
           "text": "Les meilleurs avocats!",
           "adlabels": [{"name": "french"}],
         },
       ],
       "link_urls": [
         {
           "website_url": "www.jaspersmarket.com/en",
           "adlabels": [{"name": "english"}],
         },
         {
           "website_url": "www.jaspersmarket.com/fr",
           "adlabels": [{"name": "french"}],
         },
       ],
       "images": [
         {
           "hash": "<IMAGE_HASH>",
         },
       ],
       "call_to_action_types": ["SHOP_NOW"],
       "asset_customization_rules": [
         {
           "customization_spec": {
             "locales": [9,44],
           },
           "title_label": {"name": "french"},
           "body_label": {"name": "french"},
           "description_label": {"name": "french"},
           "link_url_label": {"name": "french"},
         },
         {
             "is_default": true,
           "customization_spec": {
             "locales": [24]
           },
           "title_label": {"name": "english"},
           "body_label": {"name": "english"},
           "description_label": {"name": "english"},
           "link_url_label": {"name": "english"},
         },
       ]
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

On success, you get the ID for the ad creative:

`{"id":"238474593777777"}`

If your `asset_feed_spec` does meet the [restrictions](#restrictions) below, you see an error.

To create an ad with this ad creative ID, call `POST act_AD_ACCOUNT_ID/ads`. Alternatively, to display different languages in your ad, provide the `asset_feed_spec` and `object_story_spec` in the `creative` parameter for the ad.

To verify the new `asset_feed_spec`, you call `GET` on the ad ID or the ad creative ID:

```curl
curl -G \-d 'fields=object_story_spec,asset_feed_spec' \-d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<CREATIVE_ID>
```

## Optional Step 4: Preview Your Ad

Preview the different language versions of your ad using the `generatepreview` endpoint. Add a `dynamic_asset_label` field with an `adlabel` in a rule to view a specific language version.

For example, to preview the French version of the above creative:

```curl
curl -G \
  --data-urlencode 'creative={ 
    "object_story_spec": { 
      "page_id": "<PAGE_ID>" 
    },
    "asset_feed_spec": {
      ...
    }
  }' \
  -d 'ad_format=DESKTOP_FEED_STANDARD' \
  -d 'dynamic_asset_label=french'
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/generatepreviews
```

## Automatic Translations

You can use our automatic translation service, if you do not have the resources to manually translate your ad. This capability translates your default ad copy to additional languages, so you can reach a multilingual audience.

The source for the automatic translation can be found in the text assets specified by the default asset customization rule. Automatically translated ad copies are labeled as “Automatically Translated”.

To create an automatically translated version of your ad copy, add `autotranslate` to `asset_feed_spec`. Then, specify the languages you would like your copy to be translated to. See example:

```curl
curl \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>",
       "instagram_user_id": "<IG_USER_ID>",
     }' \
  -F 'asset_feed_spec={
       "ad_formats": ["SINGLE_IMAGE"],
       "autotranslate": ["fr_XX"],
       "bodies": [
         {
           "text": "Try our delicious guacamole recipe!",
           "adlabels": [{"name": "english"}],
         }
       ],
       "titles": [
         {
           "text": "Jaspers Market",
           "adlabels": [{"name": "english"}]
         }
       ],
       "descriptions": [
         {
           "text": "The best avocados!",
           "adlabels": [{"name": "english"}]
         }
       ],
       "link_urls": [
         {
           "website_url": "www.jaspersmarket.com",
           "adlabels": [{"name": "english"}]
         }
       ],
       "images": [
         {
           "hash": "<IMAGE_HASH>"
         },
       ],
       "call_to_action_types": ["SHOP_NOW"],
       "optimization_type": "LANGUAGE",
       "asset_customization_rules": [
         {
           "is_default": true,
           "customization_spec": {
             "locales": [6]
           },
           "title_label": {"name": "english"},
           "body_label": {"name": "english"},
           "description_label": {"name": "english"},
           "link_url_label": {"name": "english"}
         }
       ]
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

The automatically translated copies can be reviewed with a call to the `asset_feed_spec` field on the creative.

Any edits to the auto translated copies on the spec will be dropped if the same language is specified on the `autotranslate` field. These edits will be replaced by fresh translations from the default ad copy. If you absolutely need the edits, remove the language from the `autotranslate` field.

**link_urls**

You can add a custom link URL to the automatically translated ad version.

To do this, add an language-specific URL to the `link_urls` field along with an `adlabel` and add a new rule into `asset_customization_rules` with the associated locale codes and `link_url_label` for this language.

## Restrictions

The following are restrictions and limits on your asset feed.

|                                                |                                                                                                                                                                                                                                                      |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------- |
| **Ad Formats**                                 | Only one ad format per `asset_feed_spec`                                                                                                                                                                                                             |
|                                                | For `SINGLE_IMAGE` format, you must provide at least one image.                                                                                                                                                                                      |
|                                                | For `SINGLE_VIDEO` format, you must provide at least one video                                                                                                                                                                                       |
| **Assets, General**                            | You can provide at most 49 assets for every asset type except `call_to_action_types`.                                                                                                                                                                |
|                                                | You must provide exactly one `call_to_action_type` asset for all objectives.                                                                                                                                                                         |
| **Text Assets**                                | You must provide at least one text asset, such as `titles`, `bodies`, `descriptions` and `link_urls`, for every language version in the asset feed.                                                                                                  |
|                                                | All text assets should have the `adlabels` field.                                                                                                                                                                                                    |
|                                                | Maximum length: 255 characters for title, 4096 characters for body, and 10000 characters for description.                                                                                                                                            |
| **Image and Video Assets**                     | For recommended image sizes by placement and objective, see the [Ads Guide](https://www.facebook.com/business/ads-guide).                                                                                                                            |
|                                                | You can use up to one image or video asset without an `adlabel`. We use this image or video for all the language versions.                                                                                                                           |
|                                                | If you provide additional videos or images, you must include `adlabels` and provide these labels in your asset customization rule.                                                                                                                   |
| **Link URL Assets**                            | If you provide `url_tags`, we append them to the `link_url` as parameters for each asset in the ad.                                                                                                                                                  |
|                                                | If you use the `APP_INSTALLS` objective, your `link_url` should be the same as the ad set's `promoted_object.object_store_url`.                                                                                                                      |
| **Asset Customization Rules**                  | You should provide an asset customization rule for every language variant in `asset_feed_spec`.                                                                                                                                                      |
|                                                | You should provide one default rule. This is an asset customization rule with `is_default` set to `true`. This acts as a backup rule and enables ads to display even when someone's locale does not match any of the languages in `asset_feed_spec`. |
| **Placements**                                 | Multi-Language Ads supports all placements.                                                                                                                                                                                                          |
| **Available Objectives and Destination Types** | `LINK_CLICKS` - Website and apps, no Messenger.                                                                                                                                                                                                      |
|                                                | `APP_INSTALLS` - Desktop or mobile apps.                                                                                                                                                                                                             |
|                                                | `CONVERSIONS` - Website and apps, no Messenger.                                                                                                                                                                                                      |
|                                                | `REACH` - All destination types.                                                                                                                                                                                                                     |
|                                                | `BRAND_AWARENESS` - All destination types.                                                                                                                                                                                                           |
|                                                | `VIDEO_VIEWS` - All destination types                                                                                                                                                                                                                |
| **Supported Buying Types**                     | `REACH` - Reach and Frequency                                                                                                                                                                                                                        |
|                                                | `AUCTION`                                                                                                                                                                                                                                            |
| **Supported Translation Directions**           | The following translation directions are supported. Use the corresponding dialect code in the `autotranslate` field:                                                                                                                                 |
|                                                | **Source Language**                                                                                                                                                                                                                                  | **Target Translation Language** | **Dialect Code** |
|                                                | English                                                                                                                                                                                                                                              | Spanish                         | `es_XX`          |
|                                                | English                                                                                                                                                                                                                                              | French                          | `fr_XX`          |
|                                                | English                                                                                                                                                                                                                                              | German                          | `de_DE`          |
|                                                | English                                                                                                                                                                                                                                              | Portuguese                      | `pt_XX`          |
|                                                | English                                                                                                                                                                                                                                              | Italian                         | `it_IT`          |
|                                                | English                                                                                                                                                                                                                                              | Arabic                          | `ar_AR`          |
|                                                | English                                                                                                                                                                                                                                              | Dutch                           | `nl_XX`          |
|                                                | English                                                                                                                                                                                                                                              | Malay                           | `ms_MY`          |
|                                                | English                                                                                                                                                                                                                                              | Swedish                         | `sv_SE`          |
|                                                | English                                                                                                                                                                                                                                              | Indonesian                      | `id_ID`          |
|                                                | English                                                                                                                                                                                                                                              | Polish                          | `pl_PL`          |
|                                                | English                                                                                                                                                                                                                                              | Hindi                           | `hi_IN`          |
|                                                | English                                                                                                                                                                                                                                              | Danish                          | `da_DK`          |
|                                                | English                                                                                                                                                                                                                                              | Turkish                         | `tr_TR`          |
|                                                | English                                                                                                                                                                                                                                              | Tagalog                         | `tl_XX`          |
|                                                | English                                                                                                                                                                                                                                              | Romanian                        | `ro_RO`          |
|                                                | German                                                                                                                                                                                                                                               | English                         | `en_XX`          |
|                                                | Arabic                                                                                                                                                                                                                                               | English                         | `en_XX`          |
|                                                | Hebrew                                                                                                                                                                                                                                               | English                         | `en_XX`          |
|                                                | Spanish                                                                                                                                                                                                                                              | English                         | `en_XX`          |
|                                                | Japanese                                                                                                                                                                                                                                             | English                         | `en_XX`          |
|                                                | Norwegian                                                                                                                                                                                                                                            | English                         | `en_XX`          |
|                                                | French                                                                                                                                                                                                                                               | English                         | `en_XX`          |
|                                                | Dutch                                                                                                                                                                                                                                                | English                         | `en_XX`          |
|                                                | Swedish                                                                                                                                                                                                                                              | English                         | `en_XX`          |

## Insights

You can read insights for ad set and ad objects using Dynamic Creative, Placement Asset Customization and Segment Asset Customization.

In Ads Manager, you can view your asset level breakdowns. Using the API, you can get the following breakdowns:

- `body_asset`
- `description_asset`
- `image_asset`
- `title_asset`
- `call_to_action_asset`
- `link_url_asset`
- `video_asset`
- `ad_format_asset`

You can combine these in your results with these breakdowns:

- `age`
- `gender`
- `age`, `gender`

For Dynamic Creative, we currently show only creative-asset level breakdowns such as metrics by image, title, body, video. Insights on full delivered ads are found in Ads Manager under **By Dynamic Creative Asset**.

**Build Your Query**

Get the following fields in your query:

| Field         | Description                                                 |
| :------------ | :---------------------------------------------------------- |
| `actions`     | Number of actions taken on your ad, grouped by action type. |
| `clicks`      | Total number of clicks on your ad.                          |
| `impressions` | Number of times your ad was served.                         |

Facebook supports different values derived from the fields above. For example you can also retrieve `ctr` and `actions_per_impressions`.

**Examples**

To retrieve insights for an ad with the `body_asset` breakdown:

```curl
curl -G -d "breakdowns=body_asset" -d "fields=impressions" -d "access_token=<ACCESS_TOKEN>" 
https://graph.facebook.com/<API_VERSION>/<AD_ID>/insights
```

A sample response looks like this:

```json
{
  "data": [
    {
      "impressions": "8801",
      "date_start": "2016-04-29",
      "date_stop": "2016-05-13",
      "body_asset": {
        "text": "Test text",
        "id": "6051732675652"
      }
    },
    {
      "impressions": "7558",
      "date_start": "2016-04-29",
      "date_stop": "2016-05-13",
      "body_asset": {
        "text": "Test ext new",
        "id": "6051732676452"
      }
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MgZDZD"
    }
  }
}
```

To retrieve insights for an ad set broken down by `image_asset` and `age`:

```curl
curl -G -d "breakdowns=image_asset,age" -d "fields=impressions" -d "access_token=<ACCESS_TOKEN>" 
https://graph.facebook.com/<API_VERSION>/<ADSET_ID>/insights
```

A sample response looks like this:

```json
{
  "data": [
    {
      "impressions": "5497",
      "date_start": "2016-04-29",
      "date_stop": "2016-05-13",
      "image_asset": {
        "hash": "<REDACTED>",
        "url": "<REDACTED>",
        "id": "6051732672052"
      }
    },
    {
      "impressions": "5962",
      "date_start": "2016-04-29",
      "date_stop": "2016-05-13",
      "image_asset": {
        "hash": "<REDACTED>",
        "url": "<REDACTED>",
        "id": "6051732672652"
      }
    },
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MwZDZD"
    }
```

# Advantage+ Catalog Ads

With Advantage+ catalog ads, you can promote relevant items from an entire catalog across any device. Display ads for thousands of items to the right audience and automate the process. The solution has three major elements:

- Create a feed from your catalog to automatically deliver images, descriptions, prices in your ads.
- Set up App Events or Meta Pixel to measure actions, such as purchases, and profile target audiences for ads.
- Create and deliver ads based on your catalog; they display relevant items from your catalog feed and target your audience.

Once those are set up, you can see how people on Facebook are engaging with your ads and use debugging tools to diagnose and resolve problems.

## Get Started with Advantage+ Catalog Ads

Advantage+ catalog ads enables you to create personalized ads that target to the right audiences based on a set of products.

Advertisers running ads concerning housing, employment, credit or issues, elections, and politics have different sets of restrictions. See [Special Ad Categories](https://developers.facebook.com/docs/marketing-api/guides/special-ad-categories) for more information.

### Before You Start

To create an Advantage+ catalog ads campaign, you need:

- A Facebook Page representing the advertiser, and optionally, an Instagram Account if running this campaign on Instagram.
- An ad account with registered payment information.
- A catalog, such as a product catalog available in your [Business Manager account](https://www.facebook.com/business/tools/business-manager).
- Optionally, you can set up a dynamic product audience, but you are not required to involve product set inclusions or exclusions in your targeting settings.

### Step 1: Create an Ad Campaign

See the [Ad Campaign documentation](https://developers.facebook.com/docs/marketing-api/guides/campaigns) to learn how to create an ad campagn.

At this level, you must set your advertising goal through the `objective` field. For Advantage+ catalog ads, supported objectives are `PRODUCT_CATALOG_SALES`, `CONVERSIONS`, `LINK_CLICKS`, or `APP_INSTALLS`. If the objective you provide is `CONVERSIONS`, `LINK_CLICKS`, or `APP_INSTALLS`, then the `promoted_object` field is not required.

```curl
curl \
  -F 'name=Product Catalog Sales Campaign' \
  -F 'objective=PRODUCT_CATALOG_SALES' \
  -F 'promoted_object={"product_catalog_id":"<PRODUCT_CATALOG_ID>"}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns
```

### Step 2: Create an Ad Set

For Advantage+ catalog ads, you must specify the `product_set_id` in `promoted_object` for your ad set level to promote products from that product set.

In addition, you can also define your own conversion event for that product set by specifying `custom_event_type` in `promoted_object` when the `optimization_goal` is `OFFSITE_CONVERSIONS`. This targets your ads to people who performed that event in your app or site.

For example, if you set this to `ADD_TO_CART`, it means an Add to Cart event is the conversion event. By default `custom_event_type` is set to `PURCHASE`. Learn more about standard events and values for `custom_event_type` at [Meta Pixel Conversion Tracking](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/pixel-setup-guide).

If you want to optimize for offsite conversions, including conversions from both app events and Facebook Pixel, and to be billed on impressions:

- Set the `optimization_goal` to `OFFSITE_CONVERSIONS`
- Set the `billing_event` to `IMPRESSIONS`

More details on valid `optimization_goal` and `billing_event` combinations can be found in [Optimization Goal and Billing Events](https://developers.facebook.com/docs/marketing-api/reference/ad-set#billing-event-and-optimization-goal).

**Example of creating an ad set that is billed on `IMPRESSIONS` and optimizes for `OFFSITE_CONVERSIONS`:**

```curl
curl \
  -F 'name=Product Catalog Sales Adset' \
  -F 'bid_amount=3000' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'optimization_goal=OFFSITE_CONVERSIONS' \
  -F 'daily_budget=15000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ "geo_locations": {"countries":["US"]}, 
    "dynamic_audience_ids": ["<DYNAMIC_AUDIENCE_ID>"] 
  }' \
  -F 'promoted_object={"product_set_id":"<PRODUCT_SET_ID>"}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

The `DYNAMIC_AUDIENCE_ID` refers to a [product audience](https://developers.facebook.com/docs/marketing-api/reference/custom-audience). Optionally, you can omit `dynamic_audience_ids` from the call.

For e-commerce use cases, you can omit `dynamic_audience_ids` from the call and instead send the behavioral targeting information as part of `product_audience_specs` or `excluded_product_audience_specs` parameters. These specs are defined by the same parameters you use to create a [product audience](https://developers.facebook.com/docs/marketing-api/reference/custom-audience).

| Parameters                     |                  |
| :----------------------------- | :--------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `product_set_id`               | `numeric string` | Required.                            | The product set to target with this audience.                                                                |
| `inclusions`                   | `JSON object`    | Required.                            | A set of events to target. At least one inclusion is required. Each inclusion should have exactly one event. |
| `inclusions.retention_seconds` | `int`            | Required.                            | The number of seconds to keep the Accounts Center account in the audience.                                   |
| `inclusions.rule`              | `object[]`       | Required.                            | Website Custom Audience Rule referencing one event.                                                          |
| `exclusions`                   | `JSON object`    | Optional.                            | A set of events that remove an Accounts Center account from targeting.                                       |
| `exclusions.retention_seconds` | `int`            | Required, if exclusion is specified. | The number seconds to retain the exclusion.                                                                  |
| `exclusions.rule`              | `object[]`       | Required, if exclusion is specified. | Website Custom Audience Rule referencing one event.                                                          |

Each rule must include an event with the `eq` operator either as a top-level rule or as part of a top-level `and` rule.

**Retargeting**

In this example, we target people that viewed products in the last 3-5 days, but did not make a purchase. The ads placements are on mobile feed and Audience Network. To create this audience:

```curl
curl \
  -F 'name=Product Catalog Sales Adset' \
  -F 'bid_amount=3000' \
  -F 'billing_event=LINK_CLICKS' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'daily_budget=15000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "publisher_platforms": ["facebook","audience_network"], 
    "device_platforms": ["mobile"], 
    "geo_locations": {"countries":["US"]}, 
    "product_audience_specs": [ 
      { 
        "product_set_id": "<PRODUCT_SET_ID>", 
        "inclusions": [{"retention_seconds":432000,"rule":{"event":{"eq":"ViewContent"}}}], 
        "exclusions": [{"retention_seconds":432000,"rule":{"event":{"eq":"Purchase"}}}] 
      } 
    ], 
    "excluded_product_audience_specs": [ 
      { 
        "product_set_id": "<PRODUCT_SET_ID>", 
        "inclusions": [{"retention_seconds":259200,"rule":{"event":{"eq":"ViewContent"}}}] 
      } 
    ] 
  }' \
  -F 'promoted_object={"product_set_id":<PRODUCT_SET_ID>"}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

**Cross-Sell or Upsell**

Example for advertising products that the user has not looked at:

```curl
curl \
-F 'name=Case 1 Adset' \
-F 'bid_amount=3000' \
-F 'billing_event=IMPRESSIONS' \
-F 'status=ACTIVE' \
-F 'daily_budget=15000' \
-F 'campaign_id=<CAMPAIGN_ID>' \
-F 'targeting= { \
            "geo_locations": { \
            "countries":["US"], \
             }, \
            "interests":[ \
                {"id":6003397425735,"name":"Tennis"}, \
            ], \
        }' \
-F 'promoted_object={"product_set_id”:<PRODUCT_SET_ID>}' \
-F 'access_token=<ACCESS_TOKEN>’ \
https://graph.facebook.com/<API_VERSION>/act_<ACCOUNT_ID>/adsets
```

To cross-sell between product sets:

- Provide the product audience with event rules related to product set A.
- Show products from product set B in the ad by setting the `product_set_id` to product set B at the ad creative level.

For example, a business wants to increase the sale of handbags in `PRODUCT_SET_1` by targeting an ad to existing users who have shown interest in shoes that belong in `PRODUCT_SET_2`. Set the `product_set_id` in `product_audience_specs` to `PRODUCT_SET_2`'s ID or shoes and the `product_set_id` in `promoted_object` to `PRODUCT_SET_1`'s ID or handbags.

```curl
curl \
  -F 'name=My cross sell ad set' \
  -F 'bid_amount=3000' \
  -F 'billing_event=LINK_CLICKS' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'daily_budget=15000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "product_audience_specs": [ 
      { 
        "product_set_id": "<PRODUCT_SET_2_ID>", 
        "inclusions": [{"retention_seconds":432000,"rule":{"event":{"eq":"ViewContent"}}}], 
        "exclusions": [{"retention_seconds":432000,"rule":{"event":{"eq":"Purchase"}}}] 
      } 
    ], 
    "excluded_product_audience_specs": [ 
      { 
        "product_set_id": "<PRODUCT_SET_2_ID>", 
        "inclusions": [{"retention_seconds":259200,"rule":{"event":{"eq":"ViewContent"}}}] 
      } 
    ] 
  }' \
  -F 'promoted_object={"product_set_id":"<PRODUCT_SET_1_ID>"}' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets  
```

And set `product_set_id` in the creative as `PRODUCT_SET_1`'s ID.

```curl
  curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "description": "Description {{product.description}}", 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Broad Audience Targeting**

In addition to retargeting and cross-selling to existing customers, Advantage+ catalog ads may be used to target broad audiences, utilizing age, gender and other demographic targeting, with relevant products from your product catalog. By utilizing broadly targeted audiences combined with bidding for offsite conversions, Advantage+ catalog ads enable you to greatly expand the reach of your ads efficiently.

To target broad audiences:

- Create an audience using basic demographic targeting such as women in the US over 18.
- Include custom
- Optimize for `OFFSITE_CONVERSIONS` with stronger intent signals such as Purchase or InitiateCheckout.

In this example, we create an adset targeted at women age 30-65 in the US, excluding customers who have purchased in the past 10 days. We will bid $8, using `OFFSITE_CONVERSIONS` for `PURCHASE` events.

```curl
curl \
  -F 'name=Broad Audience Targeting' \
  -F 'bid_amount=800' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'daily_budget=15000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "age_max": 65, 
    "age_min": 30, 
    "geo_locations": {"countries":["US"]}, 
    "genders": [2], 
    "excluded_product_audience_specs": [ 
      { 
        "product_set_id": "<PRODUCT_SET_ID>", 
        "inclusions": [{"retention_seconds":864000,"rule":{"event":{"eq":"Purchase"}}}] 
      } 
    ] 
  }' \
  -F 'promoted_object={"product_set_id":"<PRODUCT_SET_ID>","custom_event_type":"PURCHASE"}' \
  -F 'optimization_goal=OFFSITE_CONVERSIONS' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

**Categories for Advantage+ Catalog Ads**

Advertisers running ads concerning housing, employment, credit or issues, elections, and politics have different sets of restrictions. See [Special Ad Categories](https://developers.facebook.com/docs/marketing-api/guides/special-ad-categories) for more information.

Categories for Advantage+ catalog ads introduces two new creative options for the Advantage+ catalog ads platform, both of which can be used to personalize creative for shoppers who are earlier in their decision journey. With this feature, you can create what is effectively a second, smaller creative catalog of images that represent each category (in addition to the catalog you already have of product imagery), and we will match product categories to people in your ads the same way we match products to people.

Categories for Advantage+ catalog ads can be used with any targeting option in the traffic, conversion, or catalog sales objective. If you don't have a high-quality image representative of each category or brand, Facebook can auto-generate a 2x2 collage of top products for each group of products.

When mapping this new imagery to existing product catalogs, you can use one of three columns in your feed to group items: `brand`, `product type`, and `Google product category`.

In the example catalog below, the `Product Type` column has five unique values. The advertiser can provide up to five collages or lifestyle images — one for each unique value in `product_type`. The product type is the category's categorization criteria, which is the catalog field name used to define the categories. The catalog field's value is the category's criteria value.

A category can be uniquely identified by:

- Product catalog ID
- Categorization criteria (`brand`, `product type`, or `Google product product category`)
- Criteria value (pulled from the catalog)

| RetailerID | Name              | Price   | Product Type  | Brand   | Category   |
| :--------- | :---------------- | :------ | :------------ | :------ | :--------- |
| `prod_1`   | T-Shirt           | USD 25  | Clothes       | Brand A | Category A |
| `prod_2`   | FB Hoodie         | USD 30  | Clothes       | Brand B | Category A |
| `prod_3`   | iPhone 6          | USD 800 | Phone         | Brand C | Category B |
| `prod_4`   | Samsung Galaxy S5 | USD 750 | Phone         | Brand C | Category B |
| `prod_5`   | Rice cooker       | USD 120 | Appliance     | Brand C | Category C |
| `prod_6`   | Parker Sofa       | USD 500 | Appliance     | Brand D | Category D |
| `prod_7`   | Sunscreen         | USD 14  | Personal Care | Brand E | Category E |

You can associate each category (for example, each group of products as defined by unique values in one of the columns specified above) with assets:

- **Name** — A user-facing short name of the category (up to 40 characters).
- **Description** — A user-facing description of the category (up to 20 characters).
- **destination_uri** — The URL of the landing page when a user clicks the category.
- **image_url** — Optional. The URL of a life style image representing the category. If no `image_url` is provided, we will auto-generate a collage of top products from that category.

During ads delivery time, we dynamically match each Accounts Center account with the categories they are most likely to respond to based using the same machine learning models that power Advantage+ catalog ads today.

**Categories Management API**

Categories information is stored at the catalog level, meaning that different ads promoting the categories from the same catalog would share assets, the same as ads promoting products would share assets defined in catalogs. We do support different creative options to customize category ads.

Below are the APIs to get and update categories information.

**Reading**

- **Request**

  ```curl
    curl -G \
      -d 'fields=["criteria_value","name","description","destination_uri","image_url"]' \
      -d 'categorization_criteria=product_type' \
      -d 'filter={"price_amount":{"gt":1500}}' \ # optional
      -d 'access_token=<ACCESS_TOKEN>' \
      https://graph.facebook.com/v24.0/<PRODUCT_CATALOG_ID>/categories
  ```

  We query for all products (the optional filter is supported) and find the top 1,000 categories (ordered by number of products).

- **Sample response**

  ```json
  {
    "data": [
      {
        "criteria_value": "clothes",
        "name": "Awesome clothes",
        "description": "Check out these awesome clothes!",
        "destination_uri": "http://www.example.com/clothes",
        "image_url": "http://www.example.com/clothes.jpg"
      },
      ...
      {
        "criteria_value": "shoes",
        "name": "Awesome shoes",
        "description": "Check out these awesome shoes!",
        "destination_uri": "http://www.example.com/shoes",
        "image_url": "http://www.example.com/shoes.jpg"
      }
    ]
  }
  ```

**Updating**

You can specify multiple categories information in `data`. For each category, `categorization_criteria` and `criteria_value` are required, while the `name`, `description`, `destination_uri`, and `image_url` fields are optional. When updating the information of a category for the first time, you must specify the `destination_uri`. If you want to skip delivery of a category, simply set its `destination_uri` to be empty.

**Note:** Deleting a category is not supported at this time.

- **Request**

  ```curl
  curl \
    -F 'data=[{"categorization_criteria":"product_type","criteria_value":"product_type_value","name":"Name","description":"Description","destination_uri":"http://www.example.com/","image_url":"<IMAGE_URL>"}]' \
    -F 'access_token=<ACCESS_TOKEN>' \
    https://graph.facebook.com/v24.0/<lPRODUCT_CATALOG_ID>/categories
  ```

**Ads Creation**

Categories for Advantage+ catalog ads ad creation is similar to ad creation for other Advantage+ catalog ads, but the creative selection is slightly different. You are still promoting a product set with dynamic category ads; the difference is that we're showing category creatives instead.

```curl
curl \
  -F "name=Dynamic Category Ad Creative" \
  -F 'object_story_spec={"page_id": "<PAGE_ID>", "template_data": {"description": "{{category.description}}", "link": "https://www.example.com/", "message": "<MESSAGE>", "name": "{{category.name}}"}}' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'categorization_criteria=brand' \
  -F 'category_media_source=MIXED' \ # optional
  -F access_token=<ACCESS_TOKEN> \
  https://graph.facebook.com/v24.0/act_<ACCOUNT_ID>/adcreatives
```

This creates a category ad creative rendered in a carousel format:

**Category Tokens**

Supported category tokens:

- `category.name` — The category name within the promoted product set.
- `category.description` — The category description within the promoted product set.
- `category.destination_uri` — The category destination URI.
- `category.min_price` — The minimum price for this category within the promoted product set. This information is pulled from the catalog.

| Parameters                |                                                                                      |
| :------------------------ | :----------------------------------------------------------------------------------- |
| `categorization_criteria` | Specifies which category type to use.                                                |
|                           | **Values:**                                                                          |
|                           | `brand`                                                                              |
|                           | `product_type`                                                                       |
|                           | `google_product_category`                                                            |
| `category_media_source`   | Specifies how to render the category carousel card.                                  |
|                           | **Values:**                                                                          |
|                           | `mixed` (default)                                                                    |
|                           | Uses the category's image if exists; otherwise, falls back to `products_collage`.    |
|                           | `category`                                                                           |
|                           | Uses the category's image. Skip this category if this category doesn't have a image. |
|                           | `products_collage`                                                                   |
|                           | Generates a 2x2 collage of product images from this category.                        |
|                           | `products_slideshow`                                                                 |
|                           | Renders a slideshow of products from this category.                                  |

During the category ad creative creation, we search for possible renderable categories.

**Note:** We filter out categories without a name or destination URL. We also filter out categories without images if `category_media_source = category`.

**Common Errors**

Creative creation fails if there are less than four eligible categories (for example, to use categories for Advantage+ catalog ads as your creative for a given campaign, there must be at least four unique values in a given column from your data feed file).

### Step 3: Provide an Ad Creative

Advantage+ catalog ads templates use inline page posts for creating Advantage+ catalog template creatives.

**Build a Template Creative**

Creating an Advantage+ catalog ads template creative is similar to creating other ad creatives. The difference is that you can add template parameters that properly render at runtime based on data in your data feed file.

Build the template based on the `template_data` object of the `object_story_spec` and use the following fields:

| Name                   | Description                          | Accepts Template Parameters                                                                        |
| :--------------------- | :----------------------------------- | :------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| `call_to_action`       | `object`                             | Call to Action object.                                                                             | The `value` field should be omitted.                                                                                                                                                                                                                                                                                          | No                                                                                                                                                                                                                             |
| `message`              | `string`                             | Message for your ad, visible on Instagram.                                                         | Yes                                                                                                                                                                                                                                                                                                                           |
| `link`                 | `string`                             | Link to your website, used to generate the caption of the ad.                                      | This field will always be replaced with the link field from your data feed file, except for the end card of carousel ads, which will link to this.                                                                                                                                                                            | **Note:** This cannot be a Facebook URL.                                                                                                                                                                                       | No  |
| `name`                 | `string`                             | Name or title for your ad, visible on Instagram.                                                   | Yes                                                                                                                                                                                                                                                                                                                           |
| `description`          | `string`                             | Description for your ad, not visible on Instagram.                                                 | Yes                                                                                                                                                                                                                                                                                                                           |
| `force_single_link`    | `boolean`                            | Optional.                                                                                          | Force to render a single link format.                                                                                                                                                                                                                                                                                         | When set to `true`, the creative will be a link page post ad showing a single product. When left out, the resulting ad will be a carousel ad. Facebook will choose the number of cards to optimize the performance of your ad. | No  |
| `show_multiple_images` | `boolean`                            | Show multiple images in the carousel for a single product.                                         | **Note:** `force_single_link` and `multi_share_end_card` must be set to `true` and `false` respectively.                                                                                                                                                                                                                      | No                                                                                                                                                                                                                             |
| `multi_share_end_card` | `boolean`                            | Optional.                                                                                          | Default is `true`.                                                                                                                                                                                                                                                                                                            | Use this in carousel format. If set to `false`, it will remove the end card that displays the page icon.                                                                                                                       | No  |
| `child_attachments`    | `array`                              | Enables you to provide one or more static cards in Advantage+ catalog ads for the carousel format. | The static cards appear either before or after all Advantage+ catalog ads. Provide the `static_card` field set to `true` for each static card under `child_attachments`.                                                                                                                                                      | No                                                                                                                                                                                                                             |
| `image_layer_specs`    | `AdCreativeLinkDataImageLayerSpecs`  | Specifies how to transform the images when they are delivered to users in the ad.                  | One `AdCreativeLinkDataImageOverlaySpec` is needed for each layer to define how to render the layer. The layers will be rendered in the order they appear in the list.                                                                                                                                                        | **Note:** `AdCreativeLinkDataImageLayerSpec` is available on a limited basis. Please contact your Facebook representative for more details.                                                                                    | No  |
| `image_overlay_spec`   | `AdCreativeLinkDataImageOverlaySpec` | Specifies how to render overlays on an image for a dynamic item.                                   | No                                                                                                                                                                                                                                                                                                                            |
| `preferred_image_tags` | `array`                              | Selects which image to use, if you have added tags to your images.                                 | For any item, we choose the image as follows: we get the first tag in `preferred_image_tags` that has at least one image for the item, then render the first image for that tag. If no tags correspond to an image, we serve the first image.                                                                                 | No                                                                                                                                                                                                                             |
| `preferred_video_tags` |                                      | Selects which video to use, if you have added tags to your videos.                                 | For any item, we choose the video as follows: we get the first tag in `preferred_video_tags` that has at least one video for the item, then render the most performant video for that tag and placement. If no tags correspond to a video, we serve the first video. If there are no videos, we fall back to image rendering. | **Note:** `preferred_video_tags` will only be applied if your ad is opted into [Dynamic Media](#dynamic-media).                                                                                                                | No  |

**Examples**

**Create a carousel Advantage+ catalog ads template**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "description": "Description {{product.description}}", 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives  
```

**Use a Advantage+ catalog ads template with image overlays**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "call_to_action": {"type":"SHOP_NOW"}, 
      "description": "Description {{product.description}}", 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}",
      "image_layer_specs": [
        {
          "layer_type": "image",
          "image_source": "catalog"
        },
        {
          "layer_type": "frame_overlay",
          "blending_mode": "lighten",
          "frame_image_hash": "<HASH>",
          "frame_source": "custom",
          "opacity": 100,
          "overlay_position": "center",
          "scale": 100
        },
        {
          "layer_type": "text_overlay",
          "content": {
            "type": "price",
            "auto_show_enroll_status": "OPT_IN"
          },
          "opacity": 100,
          "overlay_position": "top_left",
          "overlay_shape": "rectangle",
          "shape_color": "DF0005",
          "text_color": "FFFFFF",
          "text_font": "open_sans_bold"
        }
      ]
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/act_<AD_ACCOUNT_ID>/adcreatives
```

**Create a single product Advantage+ catalog ads template with a call to action**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "call_to_action": {"type":"SHOP_NOW"}, 
      "description": "Description {{product.description}}", 
      "force_single_link": true, 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives  
```

**Create a carousel Advantage+ catalog ads template for a single product where each image comes from additional images array in the catalog**

```curl -X POST \
     -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
     -F 'object_story_spec={
           "page_id": <PAGE_ID>,
           "template_data": {
             "message": "Test {{product.name | titleize}}",
             "link": "<YOUR_LINK_URL>",
             "name": "Headline {{product.price}}",
             "description": "Description {{product.description}}",
             "multi_share_end_card": false,
             "force_single_link": true,
             "show_multiple_images": true,
           }
         }' \
     -F 'product_set_id=<PRODUCT_SET_ID>' \
     -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Create a carousel Advantage+ catalog ads template with the first card as a coupon static card**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "child_attachments": [ 
        { 
          "call_to_action": {"type":"SHOP_NOW"}, 
          "description": "30% off", 
          "image_hash": "<IMAGE_HASH>", 
          "link": "https:\/\/www.link.com\/coupon", 
          "name": "Coupon Static Card", 
          "static_card": true 
        }, 
        { 
          "call_to_action": {"type":"SHOP_NOW"}, 
          "description": "Description {{product.description}}", 
          "name": "Headline {{product.price}}" 
        } 
      ], 
      "link": "<LINK>", 
      "message": "Test Message" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives  
```

**Create a carousel slideshow from an Advantage+ catalog ads template**

We render each dynamic card in the carousel as a slideshow. Each slideshow displays images from one dynamic item if the item has multiple images. If the dynamic item only has one image, we render a card as a static image.

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={
    "page_id": "PAGE_ID",
    "template_data": {
      "call_to_action": {"type":"SHOP_NOW"},
      "description": "Description {{product.description}}",
      "link": "LINK",
      "message": "Test {{product.name | titleize}}",
      "name": "Headline {{product.price}}",
      "format_option": "carousel_slideshows"
    }
  }' \
  -F 'product_set_id=PRODUCT_SET_ID' \
  -F 'access_token=ACCESS_TOKEN' \
  https://graph.facebook.com/v24.0/AD_ACCOUNT_ID/adcreatives
```

The response to these calls is the ID of a new Advantage+ catalog ads template creative.

`{"id":"creative_id"}`

**Upload a catalog**

When uploading a catalog, you can specify arbitrary alphanumeric string tags for each image in each property.

```xml
<listing>
 <hotel_id>hotel_1</hotel_id>
 ...
 <image>
 <url>https://media-cdn.tripadvisor.com/media/photo-o/05/ca/40/af/the-epiphany-a-joie-de.jpg (https://l.facebook.com/l.php?u=https%3A%2F%2Fmedia-cdn.tripadvisor.com%2Fmedia%2Fphoto-o%2F05%2Fca%2F40%2Faf%2Fthe-epiphany-a-joie-de.jpg&h=ATPTuLcCa7Vsnmn07cEVa0YseTFl1C2hOax9NezejmXDbR48w3CLdjLlwlpuGCRDQmuafQvk03ybGqfhk-2mBcH7xtuKAsnuuq9xKwBd8DwfuBMZkq3n1qX5MdychRKGy2bo2ax9BZQzgqVDY_AvC1EqE6aAdUEc)</url>
 <tag>exterior</tag>
 <tag>first image</tag>
 <tag>tree</tag>
 </image>
 <image>
 <url>http://www3.hilton.com/resources/media/hi/DFWANHH/en_US/img/shared/full_page_image_gallery/main/HH_exteriorview001_1270x560_FitToBoxSmallDimension_Center.jpg (http://l.facebook.com/l.php?u=http%3A%2F%2Fwww3.hilton.com%2Fresources%2Fmedia%2Fhi%2FDFWANHH%2Fen_US%2Fimg%2Fshared%2Ffull_page_image_gallery%2Fmain%2FHH_exteriorview001_1270x560_FitToBoxSmallDimension_Center.jpg&h=ATPTuLcCa7Vsnmn07cEVa0YseTFl1C2hOax9NezejmXDbR48w3CLdjLlwlpuGCRDQmuafQvk03ybGqfhk-2mBcH7xtuKAsnuuq9xKwBd8DwfuBMZkq3n1qX5MdychRKGy2bo2ax9BZQzgqVDY_AvC1EqE6aAdUEc)</url>
 <tag>skyline</tag>
 ...
 </image>
 ...</listing>
```

**Create an ad creative**

When creating an ad creative, an array of `preferred_image_tags` can be passed in the `object_story_spec`.

```curl
 -F 'name=Ad Creative Test'\
 -F 'object_story_spec={
     "page_id": '<PAGE_ID>',
     "template_data": {
       "preferred_image_tags": ["skyline","exterior"],
       "preferred_video_tags": ["landscape","city"],
       "call_to_action": {"type":"BOOK_TRAVEL"},
       "description": "{{hotel.description}}",
       "link": "<URL>",
        "message": "Book your stay in {{hotel.city}}",
        "name": "{{hotel.name | titleize}}"
     }
    }' \
 -F 'product_set_id=<PRODUCT_SET_ID>' \
 -F 'access_token=<ACCESS_TOKEN>' \
 https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Enable Video for Advantage+ Catalog Ads**

The main steps for creating Advantage+ catalog ads still holds the same. To enable video, you need to include video data and provide that data inside the catalog.

**Step 1: Set up a catalog**

This example uses an XML file; other formats should be similar.

When you add video to the listing, the `url` and `tag` fields are supported. Currently, only one video is supported for each product.

```xml
<?xml version="1.0" encoding="utf-8"?><listings>
  <title>Test hotel feed</title>
  <listing>
    <hotel_id>hotel_1</hotel_id>
    <name>Test Hotel 1</name>
    <description>A very nice hotel</description>
    <brand>Facebook</brand>
    <address format="simple">
      <component name="addr1">180 Hamilton Ave</component>
      <component name="city">Palo Alto</component>
      <component name="city_id">12345</component>
      <component name="region">California</component>
      <component name="postal_code">94301</component>
      <component name="country">United States</component>
    </address>
    <latitude>37.4435997</latitude>
    <longitude>-122.1615219</longitude>
    <neighborhood>Palo Alto</neighborhood>
    <neighborhood>Silicon Valley</neighborhood>
    <margin_level>8</margin_level>
    <base_price>200.5 USD</base_price>
    <phone>+1 650 666-3311</phone>
    <star_rating>2.5</star_rating>
    <guest_rating>
      <score>7.8</score>
      <rating_system>tripAdvisor</rating_system>
      <number_of_reviewers>300</number_of_reviewers>
    </guest_rating>
    <guest_rating>
      <score>9.8</score>
      <rating_system>Hotels.com</rating_system>
      <number_of_reviewers>35000</number_of_reviewers>
    </guest_rating>
    <image>
      <url>https://media-cdn.tripadvisor.com/media/photo-o/05/ca/40/af/the-epiphany-a-joie-de.jpg</url>
      <tag>front view</tag>
      <tag>first image</tag>
    </image>
    <image>
      <url>http://www.jdvhotels.com/content/uploads/2014/06/72-1200x800.jpg</url>
      <tag>room</tag>
      <tag>bed</tag>
    </image>
    <loyalty_program>Starwood</loyalty_program>
    <url>http://www.jdvhotels.com/hotels/california/silicon-valley-hotels/the-epiphany-hotel/</url>
    <applink property="ios_url" content="example-ios://electronic"/>
    <applink property="ios_app_store_id" content="42"/>
    <applink property="ios_app_name" content="Electronic Example iOS"/>
*    <video>
      <url>http://example.com/some_video1.mp4</url>
      <tag>City</tag>
      <tag>Package</tag>
    </video>*
  </listing></listings>
```

**Video specs**

|                   |                                                                                                                                                         |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Max duration**  | 60 seconds                                                                                                                                              |
| **Max size**      | 200MB                                                                                                                                                   |
| **Video formats** | 3g2, 3gp, 3gpp, asf, avi, dat, divx, dv, f4v, flv, gif, m2ts, m4v, mkv, mod, mov, mp4, mpe, mpeg, mpeg4, mpg, mts, nsv, ogm, ogv, qt, tod, ts, vob, wmv |

**Step 2: Use the API to get video metadata for troubleshooting**

You can use the API to check the uploaded data. For Marketing API v23.0 and above, use the `videos` field to access video metadata. For earlier versions, use `videos_metadata`. We recommend upgrading to v23.0 or above and using the `videos` field.

- **Request**

  ```curl
  curl -i -X GET \
  "https://graph.facebook.com/v24.0/1234567890?fields=videos&access_token=<ACCESS TOKEN>"
  ```

- **Sample response**

  ```json
  {
    "videos": [
      {
        "content_type": "video/mp4",
        "url": "http://example.com/some_video1.mp4",
        "tag": ["City", "Package"]
      }
    ],
    "id": "1234567890"
  }
  ```

**Step 3: Enable the video in the creative or ad**

To enable product-level video content in ads, see the [Create Ads with Dynamic Media](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads/dynamic-media#create-ads-with-dynamic-media) documentation.

**Click Tracking and Templates**

If you track link clicks through a third-party click tracker before redirecting to the final product URL, you can use the `template_url_spec` field in the ad creative. This allows adding a click tracker template to the ad level without the need to hard code it in your data feed file. You can also use this field to create templates for deep linking.

In this field, you may use dynamic fields such as product URL or ID, and those should be url-encoded if their values can contain characters that make the URL invalid.

**Example**

To create a carousel Advantage+ catalog ads template with the `template_url_spec` setting:

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "description": "Description {{product.description}}", 
      "link": "<URL>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'template_url_spec={ 
    "ios": { 
      "app_store_id": "123", 
      "url": "example:\/\/link\/?nav=item.view&id={{product.retailer_id | urlencode}}&referrer=http:\/\/rover.example.com\/rover\/1\/711-198453-24755-9\/16%3Fitemid={{product.retailer_id | urlencode | urlencode}}" 
    }, 
    "web": { 
      "url": "http:\/\/clicktrack.com\/cm325?id={{product.retailer_id | urlencode}}&redirect_url={{product.url | urlencode | urlencode}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives  
```

**Use Data Feed File Data in Your Template**

When an ad is displayed, Facebook replaces the content in the `{{ }}` section with the proper values from your data feed file. Available template values are:

| Name             | Description                                                                                                                                                                                                                                                                                                  |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`          | The item's brand value from your data feed file.                                                                                                                                                                                                                                                             |
| `current_price`  | The formatted sale price if the product has a specified sale price. Optionally you can specify sale start and end dates for a product and `current_price` will show the sale price while the item is on sale. If no sale price is specified or the sale dates have passed, this will show the `price` field. |
| `description`    | The item's description value from your data feed file.                                                                                                                                                                                                                                                       |
| `name`           | The item's title value from your data feed file.                                                                                                                                                                                                                                                             |
| `price`          | The formatted price column (like $1,234.56).                                                                                                                                                                                                                                                                 |
| `retailer_id`    | The item's id value from your data feed file.                                                                                                                                                                                                                                                                |
| `url`            | The item's link value from your data feed file.                                                                                                                                                                                                                                                              |
| `custom_label_0` | The item's custom_label_0 value from your data feed file.                                                                                                                                                                                                                                                    |
| `custom_label_1` | The item's custom_label_1 value from your data feed file.                                                                                                                                                                                                                                                    |
| `custom_label_2` | The item's custom_label_2 value from your data feed file.                                                                                                                                                                                                                                                    |
| `custom_label_3` | The item's custom_label_3 value from your data feed file.                                                                                                                                                                                                                                                    |
| `custom_label_4` | The item's custom_label_4 value from your data feed file.                                                                                                                                                                                                                                                    |

**Options**

Some template values may receive options, in any order, in the following format:

`{{field option1 option2 ...}}`

The following options are available:

| Option          | Description                                                       | Supported by     |
| :-------------- | :---------------------------------------------------------------- | :--------------- |
| `raw`           | Omits the currency symbol                                         | `price`          |
| `current_price` |                                                                   |
| `strip_zeros`   | Omits the cents part in currency if cents are zeros               | `price`          |
| `current_price` |                                                                   |
| `round`         | Omits the cent amount of the currency while rounding up the price | All price fields |

**Transformations**

You can use template values with transformations, which adjust your value based on this format:

`{{field | transform}}`

Use one of these transformations:

| Transformations | Description                                                                                                                                                                                                         |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `number_format` | Format the number in a default format, using a comma (",") as thousand separator, rounded to the nearest integer (e.g., 1234.56->"1,235"). The value to format must be an unformatted number ("1234", not "1,234"). |
| `titleize`      | Capitalize the words for a better looking title (e.g., "box" -> "Box").                                                                                                                                             |
| `urlencode`     | Encode the value for URL.                                                                                                                                                                                           |

**Specify Desired Behavior of Ads Click from Mobile**

When you display a dynamic creative, you can specify the desired behavior when a someone clicks on the ad in the native Facebook app. There are two requirements to be able to use deep linking:

- The native mobile app where the user should be sent to supports deep linking (iOS or Android).
- The deep link information has been included in the data feed file or deep link information is available through App Links.

If both these requirements are fulfilled, you can use the `applink_treatment` field while creating an ad creative to specify the desired behavior when a user clicks on an ad.

| Name                              | Description                                                                                                                                                                                                                                     |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web_only`                        | Always send the user to the given web URL.                                                                                                                                                                                                      |
| `deeplink_with_web_fallback`      | If the app is installed on the user's phone and we have corresponding deep link information, send the user to the app. If one of these conditions is not met, send them to the website.                                                         |
| `deeplink_with_appstore_fallback` | Default when app links are present for the product. If the app is installed on the user's phone and we have corresponding deep link information, send the user to the app. If the app is not installed, send them to the app store for the app. |

**Examples**

**Creating a carousel Advantage+ catalog ads template with a call to action that will deep link into a native app if available or fall back to the web:**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'applink_treatment=deeplink_with_web_fallback' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "call_to_action": {"type":"SHOP_NOW"}, 
      "description": "Description {{product.description}}", 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives  
```

**Creating a carousel Advantage+ catalog ads template with URL tags enabled that will deep link into a native app if available or fall back to app store for the app:**

```curl
curl \
  -F 'name=Advantage+ Catalog Ads Template Creative Sample' \
  -F 'applink_treatment=deeplink_with_appstore_fallback' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "template_data": { 
      "call_to_action": {"type":"SHOP_NOW"}, 
      "description": "Description {{product.description}}", 
      "link": "<LINK>", 
      "message": "Test {{product.name | titleize}}", 
      "name": "Headline {{product.price}}" 
    } 
  }' \
  -F 'product_set_id=<PRODUCT_SET_ID>' \
  -F 'access_token<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Create a Localized Catalog for Advantage+ Catalog Ads**

See details in [Localized Catalog for Advantage+ Catalog Ads](https://developers.facebook.com/docs/marketing-api/guides/localized-catalog-for-advantage-catalog-ads).

**Automated Product Tags**

Automated product tags are designed to improve your ad performance and help people discover your products from ads more easily.

We may automatically tag products in your Advantage+ catalog ads. To opt-in to automated product tags, set `automated_product_tags` to `true` in the `template_data` of the `object_story_spec`. You must also provide a product set ID.

**Example**

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

### Step 4: Create an Ad

Finally, you can create an ad. The ad references an ad creative.

**Example**

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

Congratulations! You have created your first Advantage+ catalog ad. Feel free to unpause it to start delivery.

When published as an Instagram Stories' ad, Advantage+ catalog ads are cropped to 1:1 regardless of the dimensions of the original image.

### Next Steps

**Preview Advantage+ Catalog Ads**

You can generate previews of your dynamic creative with the [Ad Previews endpoint](https://developers.facebook.com/docs/marketing-api/ad-preview). Specify the `product_item_ids` parameter or specify multiple `product_item_ids` to preview a carousel ad.

```curl
curl -X GET \
  -d 'ad_format="DESKTOP_FEED_STANDARD"' \
  -d 'product_item_ids=[
       "<PRODUCT_ITEM_ID>"
     ]' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<CREATIVE_ID>/previews
```

| Parameters         |                                                                                  |
| :----------------- | :------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `product_item_ids` | `array[string]`                                                                  | List of product FBIDs or Base64 URL-encoded product ID tokens. |
|                    | Each token is of the form `catalog:{catalog_id}:{base64urlencode(retailer_id)}`. |

**Fetch Product Ad Statistics**

You can fetch statistics per product by making a `GET` call to the `insights` endpoint. Add `product_id` to the `fields` parameter.

This shows statistics for all products in an account's product sets displayed in Advantage+ catalog ads.

- **Example**

      This example reports clicks, actions, and impressions for each `product_id`.

      **Request**

      ```curl
      curl -G \
        -d 'date_preset=last_week' \
        -d 'action_breakdowns=["action_type"]' \
        -d 'breakdowns=["product_id"]' \
        -d 'fields=account_name,impressions,actions' \
        -d 'access_token=<ACCESS_TOKEN>' \
      https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights
      ```

      **Response**

      ```json
      {
       "data": [ 
         {
            "account_id": "123456", 
      ```json

        "product_id": "60750", 
        "date_start": "2015-02-03", 
        "date_stop": "2015-02-03", 
        "impressions": 880, 
        "clicks": 8, 
        "actions": [ 
          {
            "action_type": "link_click", 
            "value": 6
          }, 
          {
            "action_type": "offsite_conversion.other", 
            "value": 5
          },  
          {
            "action_type": "offsite_conversion", 
            "value": 5
          }
        ], 
        "account_name": "My Account"
      }, 
   ], 
  ...
  }

````

**Fetch Comments and Likes**

You can retrieve the comments, likes, and the `product_id` for an Advantage+ catalog ads post. Make a `GET` call as follows with a `post_id`. The `post_id` is the `effective_object_story_id` of an ad creative, in the format of `PageID_PostID`.

**Note:** You cannot use this endpoint to retrieve comments from Instagram.

```curl
curl -G \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<POST_ID>/dynamic_posts
````

This endpoint returns dynamic post objects.

Once you get dynamic posts, you can fetch comments, likes, `product_id`, and `child_attachments` for carousel format, if applicable.

Placement Asset Customization ads will not be returned by the `dynamic_posts` edge.

**Learn More**

- [Set Up Catalog](https://developers.facebook.com/docs/marketing-api/guides/catalog)
- [Build Audiences](https://developers.facebook.com/docs/marketing-api/guides/audiences)
- [Ad Set Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-set)
- [Ad Creative Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative)
- [Meta Blueprint course: Prepare and Set Up Catalog for Advantage+ Catalog Ads](https://www.facebook.com/blueprint/courses/prepare-and-set-up-catalog-for-advantage-catalog-ads)
- [Meta Blueprint course: Troubleshoot Catalog for Advantage+ Catalog Ads](https://www.facebook.com/blueprint/courses/troubleshoot-catalog-for-advantage-catalog-ads)
- [Meta Blueprint live training: Troubleshoot Catalog for Advantage+ Catalog Ads](https://www.facebook.com/blueprint/live-training/troubleshoot-catalog-for-advantage-catalog-ads)

### Dynamic Media

Starting September 2025, we will be updating dynamic media to be opt-in by default for Advantage+ catalog ads. You may notice that videos are showing more frequently in ads. You may continue to use `media_type_automation` to control whether videos surface in ads and set to `OPT_OUT` as needed.

Dynamic media allows advertisers to deliver video assets from their catalog in their Advantage+ catalog ads.

**Before You Begin**

You will need:

- A product catalog with existing products
- A video for each product item in a downloadable video URL format

See the [Advantage+ catalog ads documentation](#advantage-catalog-ads) to learn more about how they work.

**Limitations**

- We recommend a minimum of 20 products, but there are no required minimums.
- Each video size should not exceed 200MB. There are no length restrictions.
- Videos must be in one of the following formats: `3g2`, `3gp`, `3gpp`, `asf`, `avi`, `dat`, `divx`, `dv`, `f4v`, `flv`, `gif`, `m2ts`, `m4v`, `mkv`, `mod`, `mov`, `mp4`, `mpe`, `mpeg`, `mpeg4`, `mpg`, `mts`, `nsv`, `ogm`, `ogv`, `qt`, `tod`, `ts`, `vob`, or `wmv`.
- The `video_fetch_status` may show as `NO_STATUS` until the video is used in an ad or another event that requires the video is triggered.

**Add Videos to Your Catalog**

There are 3 ways to add videos to product items in your catalog: catalog feed file, catalog batch API, and manual upload via your Commerce Manager.

**Add videos with the catalog feed file**

**Step 1. Prepare Your Catalog Feed File**

You can use one of the following processes to implement your catalog feed file.

- **Process 1: Change the main feed**

  Add a `video[0].url` column to your existing catalog feed file, populate the video URL to only the selected products, and leave it empty for other product rows.

  Additional videos for the same product can be added with additional columns: `video[1].url`, `video[2].url`, `video[3].url`, etc.

  Tags may be added to the videos by including the tags in separate columns. For example: `video[0].tag[0]`, `video[0].tag[1]`, `video[1].tag[0]`, and so on.

- **Process 2: Supplemental feed**

  Prepare a supplementary catalog feed file to supplement an existing feed upload. This supplemental feed can only add or replace videos to already existing product items. Add a `video[0].url` column and an ID column to associate the video with the product item ID.

  Optional:
  - Instead of the `video[0].url` column, you can create a column called `video` and add tags to the video. The video column can contain multiple video URLs per product and multiple tags per URL encoded in a JSON format. If you choose to use a tag column for the product set filter, you’ll need to add this column to the feed file too.

  **Example video column format:**

  ```json
  [
    {
      "url": "http://www.jaspersmarket-example1.com/video-file.avi",
      "tag": ["Optional Tag1", "Optional Tag2"]
    },
    {
      "url": "http://www.jaspersmarket-example2.com/video-file.avi",
      "tag": ["Optional Tag1", "Optional Tag2"]
    }
  ]
  ```

  For an XML feed, video URLs can be added using `<video>` tags like:

  ```xml
  <video>
      <url>https://{URL1}</url>
      <tag>video_product_set1</tag>
      <tag>video_product_set2 </tag></video><video>
      <url>https://{URL2}</url>
      <tag>video_product_set1</tag></video>
  ```

**Query video data from the product item API**

The `videos`, `videos_metadata`, and `video_fetch_status` fields are available on the catalog APIs to retrieve catalog product video details.

`curl -i GET \
  "http://graph.facebook.com/v24.0/<PRODUCT_ITEM_ID>?fields=videos,videos_metadata,video_fetch_status"`

For more details on video information, see the [Product Item details](https://developers.facebook.com/docs/marketing-api/reference/product-item).

**Add videos with the catalog batch API**

Updates to product items are supported using the `/{product_catalog_id}/items_batch` endpoint. You can make a `POST` API call with the `video` field, which is an array of URLs.

```curl
curl \
  -d @body.json \
  -H "Content-Type: application/json"> cat body.json{
  "access_token": "<ACCESS_TOKEN>",
  "item_type": "PRODUCT_ITEM",
  "requests": [
    {
      "method": "CREATE",
      "data": {
        "id": "retailer-2",
        "availability": "in stock",
        "brand": "BrandName",
        "google_product_category": "t-shirts",
        "description": "product description",
        "image_link": "http://www.images.example.com/t-shirts/1.png",
        "title": "product name",
        "price": "10.00 USD",
        "shipping": [
          {
            "shipping_country": "US",
            "shipping_region": "CA",
            "shipping_service": "service",
            "shipping_price_value": "10",
            "shipping_price_currency": "USD"
          }
        ],
        "condition": "new",
        "link": "http://www.images.example.com/t-shirts/1.png",
        "item_group_id": "product-group-1",
        "video": [
          {"url": "http://www.jaspersmarket-example1.com/video-file.avi", "tag": ["Optional Tag1", "Optional Tag2"]}, 
          {"url": "http://www.jaspersmarket-example2.com/video-file.avi", "tag": ["Optional Tag1", "Optional Tag2"]}
        ]
      }
    },
    {
      "method": "UPDATE",
      "data": {
        "availability": "out of stock",
        "id": "retailer-3",
        "video": [
          {
            "url": "https://yourvideo.com/demo.mp4?q=1411"
          },
          {
            "url": "https://yourvideo.com/demo.mp4?q=1421"
          }
        ]
      }
    }
  ]}
```

See this example in the [Graph API Explorer](https://developers.facebook.com/tools/explorer).

**Create Ads with Dynamic Media**

When creating ads, there are three types of options that leverage video from the catalog:

- Carousel/Collection dynamic media (recommended)
- Show video when available (only available for single video format)
- Single image opted into dynamic media

**Note:** Selecting the dynamic media type with the API is similar to selecting the **Dynamic Media** options in Ads Manager. With changes starting in September 2025, Advantage+ catalog ads will be opted into using dynamic media by default.

**Dynamic media type ads**

When creating an ad creative object with the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint
Starting September 2025, Advantage+ catalog ads will begin delivering catalog product videos by default. You may set `media_type_automation` to `OPT_out` to turn off catalog product videos from surfacing in ads.

The `media_type_automation` key works with Carousel, Collection, and Single Image formats.

```curl
curl -X POST \
-F 'name=Dynamic Media Ad Creative' \
-F 'object_story_spec={
    ...
  }' \
-F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "media_type_automation": {
        "enroll_status": "OPT_IN"
      }
    }
  }' \
-F 'product_set_id=<PRODUCT_SET_ID>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

Likewise, if creating an Advantage+ catalog ad object with the `act_<AD_ACCOUNT_ID>/ads` endpoint, the ad will begin delivering available catalog product videos by default. You may set the `media_type_automation` key to `OPT_out` to turn off catalog product videos from surfacing in ads.

```curl
curl -X POST \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
    "name": "Dynamic Media Adgroup",
    "object_story_spec": {
      ...
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "media_type_automation": {
          "enroll_status": "OPT_IN"
        }
      }
    },
    "product_set_id": "<PRODUCT_SET_ID>"
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Dynamic media ads (with Collection format)**

Dynamic media only replaces hero media. Product thumbnails in pre-click experience and in Instant Experiences will always be images.

If opted into dynamic media and if the product video is available, we will replace the dynamic video hero media with a product video. Advantage+ catalog ads in Collection format will be opted into dynamic media by default and begin delivering catalog product videos starting September 2025. You may continue to set `media_type_automation` to `OPT_OUT` to turn off catalog product videos from surfacing in ads.

Dynamic media only replaces dynamic video hero media when opted-in. Currently a static hero image and video won’t be replaced by a product video, i.e., The image slideshow experience is replaced with a product video.

**Example Creative Spec for Collection with Dynamic Media**

```curl
curl -X POST \
-F 'name=Dynamic Media Ad Creative' \
-F 'object_story_spec={
      "template_data": {
          ...
          "format_option": "collection_video",
          "link": "https://fb.com/canvas_doc/<CANVAS_ID>",
          "message": "Your Collection Ad",
          ...
    }
  }' \
-F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "media_type_automation": {
        "enroll_status": "OPT_IN"
      }
    }
  }' \
-F 'product_set_id=<PRODUCT_SET_ID>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Dynamic media ads (Show videos when available)**

In the `object_story_spec`, change `format_option` to `single_video`. This is only available for single image/video format.

```curl
curl -X POST \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
    "name": "Dynamic Media Ad Creative",
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "template_data": {
        ...
        "format_option": "single_video",
        ...
      }
    },
    "product_set_id": "<PRODUCT_SET_ID>"
    }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Dynamic media ads (Single image opted into dynamic media)**

In the `object_story_spec`, the `format_option` of `single_image` will show dynamic media when opted into `media_type_automation`.

Starting September 2025, Advantage+ catalog ads using `format_option` of `single_image` will be opted into dynamic media by default and will surface available catalog product videos in ads. You may set `media_type_automation` to `OPT_OUT` to turn off catalog product videos from surfacing in ads.

```curl
curl -X POST \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
 "name": "Dynamic Media Ad Creative",
 "object_story_spec": {
   "page_id": "<PAGE_ID>",
   "template_data": {
     "format_option": "single_image"
   }
 },
 "degrees_of_freedom_spec": {
   "creative_features_spec": {
     "media_type_automation": {
       "enroll_status": "OPT_IN"
     }
   }
 }
},
    "product_set_id": "<PRODUCT_SET_ID>"
    }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Optional: Opt into or out of automatic video cropping**

Use the `video_crop_style` field to control automatic video cropping. The available values are `AUTO` or `NONE`.

To opt out of automatic video cropping, set `video_crop_style` to `NONE`, or remove customizations from the `media_type_automation` settings.

```curl
curl -X POST \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
    "name": "Dynamic Media Ad Creative",
    "object_story_spec": {
      ...
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "media_type_automation": {
          "customizations": {
            "video_crop_style": "NONE"
          },
          "enroll_status": "OPT_IN"
        }
      }
    },
  "product_set_id": "<PRODUCT_SET_ID>"
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

Auto-crop only applies to videos that don't meet the placement size requirements, and auto-crop is currently designed to primarily fit the video into the player's viewport.

If there is a video that matches the aspect ratio for the ad placement, that video will be returned. If all the aspect ratios of a given product video are provided, auto-crop will not be applied. Otherwise, the ad will select a video of the item and check the auto-crop setting: `AUTO` returns the auto-cropped video and `NONE` returns the original video.

**Dynamic Media Insights**

Video Engagement metrics from the Ads Manager can also be queried on the API. Use the following chart for comparison.

| Ads Manager metric                            | Ads Insights API field                              |
| :-------------------------------------------- | :-------------------------------------------------- |
| Impressions                                   | `impressions`                                       |
| 2-second continuous video plays               | `video_continuous_2_sec_watched_actions:video_view` |
| Cost per 2-second continuous video play (BRL) | `cost_per_2_sec_continuous_video_view:video_view`   |
| 3-second video plays                          | `actions:video_view`                                |
| Cost per 3-second video play (BRL)            | `cost_per_action_type:video_view`                   |
| ThruPlays                                     | `video_thruplay_watched_actions:video_view`         |
| Cost per ThruPlay (BRL)                       | `cost_per_thruplay:video_view`                      |
| Reach                                         | `reach`                                             |
| Amount spent (BRL)                            | `spend`                                             |
| Video plays at 25%                            | `video_p25_watched_actions:video_view`              |
| Video plays at 50%                            | `video_p50_watched_actions:video_view`              |
| Video plays at 75%                            | `video_p75_watched_actions:video_view`              |
| Video plays at 95%                            | `video_p95_watched_actions:video_view`              |
| Video plays at 100%                           | `video_p100_watched_actions:video_view`             |
| Video plays                                   | `video_play_actions:video_view`                     |

**Example Request**

```curl
curl GET \
  -d 'access_token=<ACCESS_TOKEN>' \
  -d 'fields=impressions,video_continuous_2_sec_watched_actions,actions,video_thruplay_watched_actions' \
https://graph.facebook.com/v24.0/<AD_ID>/insights
```

For more information, see the [Insights API documentation](https://developers.facebook.com/docs/marketing-api/insights).

### Managing Multiple Aspect Ratio Images in Advantage+ Catalog Ads

Catalog feed supports uploading multiple images for one product, and there are different options to select which image is going to be displayed to the customer.

**Image selection by tag**

You can use image tags in your feed to select the image you want to display. Some tags are automatically matched based on the placement of the ads.

| Tag                           | Placement                                                                            |
| :---------------------------- | :----------------------------------------------------------------------------------- |
| `INSTAGRAM_PREFERRED`         | Used on Instagram (e.g., to display different images between Instagram and Facebook) |
| `STORY_PREFERRED`             | Used for Facebook and Instagram Stories (9:16 ratio)                                 |
| `REELS_PREFERRED`             | Used for Facebook and Instagram reels (9:16 ratio)                                   |
| `ASPECT_RATIO_4_5_PREFERRED`  | Used if the placement is eligible to display 4:5 images                              |
| `ASPECT_RATIO_9_16_PREFERRED` | Used if the placement is eligible to display 9:16 images                             |

There are 2 different tags for 9:16 placements because the safe zone for Stories and Reels is different and you may want to upload different 9:16 images for each placement.

You can also use custom tags (for example, to select different images depending on the ad displayed) using the `preferred_image_tags` parameter.

Other legacy image selections, such as by index, are discouraged and will be eventually removed.

**9:16 aspect ratio images**

9:16 aspect ratio images can be displayed full screen to customers on Stories and Reels for carousel and single image ads.

To activate the full screen display, you need to activate the **Adapt to placement** option in the Advantage+ catalog ads optimizations in Ads Manager or use the `adapt_to_placement` field in the `creative_spec` parameter.

When adapt to placement is activated, we try to go through all the images of your product to find a matching one for 9:16 placements. For example, if you have a 1:1 image and 9:16 image, the 9:16 image will be used for 9:16 placements. It is recommended to review the 9:16 images available in your catalog before activating the option.

You can also use tags in your feed to select the image yourself if you have multiple 9:16 images. The tagged image must be 9:16 aspect-ratio to be selected (otherwise we'll fallback to the first available 9:16 image, if any).

Once activated, adapt to placement also provides an option to deactivate the showcase card in Instagram Stories, which displays a thumbnail of 4 products in one card, in order to display the first selected product full screen instead.

**Note:** On Stories, the title and caption of the product are currently not displayed if the image is displayed full screen.

**Fallback**

If you activate the adapt to placement option and none of the products to be displayed in the carousel have 9:16 images, we will use the default display. If at least one of the products has a 9:16 image, we will fill the rest of the image with the image background color.

**`preferred_image_tags` multi-ratio support**

You can combine the selection of different images for different ads with multi-ratio support. Instead of providing a simple tag, you can replace the tag with serialized (and escaped) JSON that may provide different tags for different aspect ratios.

The deserialized JSON should be this format (each ratio is optional):

```json
{
  "DEFAULT": "my-tag",
  "4_5": "my-tag-4-5",
  "9_16": "my-tag-9-16"
}
```

**Example**

`preferred_image_tags: ["{\"DEFAULT\":\"my_default_tag_1\",\"9_16\":\"my_9_16_tag_1\"}","{\"DEFAULT\":\"my_default_tag_2\",\"9_16\":\"my_9_16_tag_2\"}"]`

In this case, an image with tag `my_9_16_tag_1` or `my_9_16_tag_2` will be used for 9:16 placements and an image with `my_default_tag_1` or `my_default_tag_2` will be used otherwise.

# Get Started with Advantage+ Creative

This guide covers creating ads and ad creatives with opted-in Advantage+ Creative features.

Previously, Advantage+ Creative was only supported through standard enhancements, a bundle of Advantage+ Creative features. Starting with Marketing API v22.0 and applying to all subsequent versions, the opt-in and preview functionality for standard enhancements will be deprecated. Instead, you can opt-in to or preview individual Advantage+ Creative features by following the guidelines outlined in this document.

Note that the support for automatic removal of ineligible features and preview are gradually rolling out to all API versions, and will be available to all developers by February 2025.

## Before You Begin

Set up your ad campaigns using the following instructions:

- [Create an ad campaign](#create-an-ad-campaign)
- [Create an ad set](#create-an-ad-set)

## Step 1: Create an ad or ad creative opted-in to Advantage+ Creative features

You can create an ad through the `/ads` endpoint or create a standalone creative through the `/adcreatives` endpoint. In either approach, specify the individual features to opt-in within the `creative_features_spec`.

**Example**

To opt-in features `image_touchups`, `inline_comment`, and `image_templates`:

```curl
// creative example
curl -X POST \
  -F 'name=Advantage+ Creative Creative' \
  -F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "image_touchups": {
        "enroll_status": "OPT_IN"
      },
     "inline_comment": {
        "enroll_status": "OPT_IN"
      },
     "image_template": {
        "enroll_status": "OPT_IN"
      }
    }
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
  
// ad example
curl -X POST \
  -F 'adset_id=<ADSET_ID>' \
  -F 'creative={
    "name": "Advantage+ Creative Adgroup",
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
        "image_touchups": {
          "enroll_status": "OPT_IN"
        },
       "inline_comment": {
          "enroll_status": "OPT_IN"
        },
       "image_template": {
          "enroll_status": "OPT_IN"
        }
      }
    }
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Features**

The Advantage+ Creative features that can be opted-in within the `creative_features_spec` parameter.

| Name                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text_translation`              | Optional. Opt-in if you want your ad to be translated to different languages on Facebook and Instagram. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Translate Text** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `inline_comment`                | Optional. Opt-in if you want the most relevant comment to be displayed below your ad on Facebook and Instagram. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Relevant comments** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `image_templates`               | Optional. Opt-in if you want overlays added that show text you have provided along with your selected ad creative when it is likely to improve performance. This feature is generated with AI. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Add overlays** in Ads Manager.                                                                                                                                                                                                                                                                                                                           |
| `image_touchups`                | Optional. Opt-in if you want your chosen media to be automatically cropped and expanded to fit more placements. Only applicable to image ads. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Visual-touch ups** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                        |
| `video_auto_crop`               | Optional. Opt-in if you want your chosen media to be automatically cropped and expanded to fit more placements. Only applicable to video ads. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Visual-touch ups** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                        |
| `image_brightness_and_contrast` | Optional. Opt-in if you want the brightness and contrast of your image to be adjusted when likely to improve performance. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Adjust brightness and contrast** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                              |
| `enhance_cta`                   | Optional. Opt-in if you want keyphrases from your ad sources to be paired with your CTA. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. The `customizations` field can be set to below to use potential high-performing phrases identified by AI:                                                                                                                                                                                                                                                                                                                                                                                          |
|                                 | `{`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | `    "text_extraction": {`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|                                 | `        "enroll_status": "OPT_IN"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | `}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | **Note:** This feature is labeled **Enhance CTA** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `text_optimizations`            | Optional. Opt-in if you want text options you provide appear as primary text, headline or description when it’s likely to improve performance. We may add a caption introduction from your headline options and highlight key sentences when it’s likely to improve performance. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. The `customizations` field can be set to below to use potential high-performing phrases identified by AI:                                                                                                                                                                                                  |
|                                 | `{`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | `    "text_extraction": {`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|                                 | `        "enroll_status": "OPT_IN"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | `}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | **Note:** This feature is labeled **Text improvements** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `image_background_gen`          | Optional. Opt-in if you want different backgrounds for eligible product images to be created and the version that your audience is most likely to respond to delivered. This feature is generated with AI. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Generate backgrounds** in Ads Manager.                                                                                                                                                                                                                                                                                                       |
| `image_uncrop`                  | Optional. Opt-in if you want your image to be automatically expanded to fit more placements. This feature is generated with AI. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Expand image** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                                                          |
| `adapt_to_placement`            | Optional. Opt-in if you want 9:16 images in your catalog to be displayed in supported placements (Instagram Stories/Instagram Reels/Facebook Stories/Facebook Reels). The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Adapt to placement** in Ads Manager.                                                                                                                                                                                                                                                                                                                                              |
| `media_type_automation`         | Optional. Opt-in if you want videos from your catalog to be displayed (along with images) in supported placements. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Dynamic media** in Ads Manager. See [Dynamic Media](#dynamic-media) for more information.                                                                                                                                                                                                                                                                                                                                            |
| `product_extensions`            | Optional. Opt-in if you want items from your catalog to be shown next to your selected media when it’s likely to improve performance. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Add catalog items** in Ads Manager. See [Product Extensions (Add Catalog Items) Features on Marketing API](#product-extensions-for-advantage-creative) for more details.                                                                                                                                                                                                                                          |
| `description_automation`        | Optional. For Advantage+ catalog ads, opt-in if you want item information from your catalog to be used for your ad's description based on what each person who views your ad is likely to engage with. For static carousel ads, opt-in if you want your carousel description to be dynamically chosen when to show. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. For Advantage+ catalog ads, the `customizations` field can be set as below to use AI to identify product names and selling points from your catalog. We will show them in your ad footer's headline and description when we predict it will make your ad more engaging. |
|                                 | `{`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|                                 | `  "text_extraction": {`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|                                 | `    "enroll_status": "OPT_IN"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|                                 | `  }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|                                 | `}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `add_text_overlay`              | Optional. This feature is labeled ‘Add Dynamic Overlays’ in Ads Manager.Opt-in if you want to add information from catalog items as visually-unique overlays The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. If you want to have manual control on how the overlay is rendered, see the [Ad Creative Link Data Image Layer Spec reference documentation](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data-image-layer-spec) for more details.                                                                                                                                                             |
| `creative_stickers`             | Optional. Opt-in if you want to add AI-generated stickers to help tell your story better and make your call-to-actions easier to understand. We'll automatically place CTA stickers based on where they're likely to perform best. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Create sticker CTA** in Ads Manager.                                                                                                                                                                                                                                                                                 |
| `reveal_details_over_time`      | Optional. Opt-in if you want information from your website or app store product page to be revealed when people spend a few seconds looking at your ad. This can help people feel more confident before they click your call-to-action. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Reveal details over time** in Ads Manager.                                                                                                                                                                                                                                                                      |
| `pac_relaxation`                | Optional. Opt-in if you want to show media you chose for a specific aspect ratio across all placements when it's likely to improve performance. The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. **Note:** This feature is labeled **Flex media** or **Flexible media** in Ads Manager.                                                                                                                                                                                                                                                                                                                                                      |

Features specified as `OPT_IN` but ineligible for the given ad setup will be automatically removed from `creative_features_spec`. For example, '`image_templates`' (or Add Overlays) is not eligible to be applied to video format creatives — if you opt in to this feature on a video ad, it is ineligible and thus will be automatically removed. To confirm the final outcome, you can send a `GET` request to retrieve the `creative_features_spec` field.

Do not worry if you see `standard_enhancements` and some standard enhancements sub-features appended to `creative_features_spec` when you retrieve it. As long as these sub-features are not set to `OPT_IN`, they will not be applied. We are in the process of deprecating standard enhancements and this behavior will be phased out once the deprecation is complete.

Most Advantage+ Creative features can be opted-in through `creative_features_spec`, with the exception of the **music** feature, which is opted-in through `asset_feed_spec`.

**Example**

```curl
curl -X POST \
  -F 'name="Advantage+ Creative Music"' \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>"
     }' \
  -F 'asset_feed_spec={
       "audios": [
         {
           "type": "random"
         }
       ]
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

If the features opted-in include features generated with AI, it's necessary to create the ad with a `PAUSED` status, then follow [Step 2](#step-2-preview-for-advantage-creative) and [Step 3](#step-3-set-the-ad-status-to-active) below to complete the publishing process. When creating an ad through the `/ads` endpoint, the `status` field on the ad is set to `PAUSED` by default. On the other hand, if no AI-generated features are included, Step 2 and Step 3 are optional and you can directly create the ad with an `ACTIVE` status.

## Step 2: Preview for Advantage+ Creative

See the [Ad Previews reference](https://developers.facebook.com/docs/marketing-api/ad-preview) for more information on the existing functionality of previews.

To preview an Advantage+ Creative feature, add the `creative_feature` parameter to your existing preview request and specify the desired feature name.

Features that support preview include `image_templates`, `image_touchups`, `video_auto_crop`, `enhance_cta`, `text_optimizations`, `image_background_gen`, `image_uncrop`, `description_automation`, `creative_stickers`, and `text_translation`.

**Example request**

```curl
curl -X GET -G \
  -d 'ad_format="DESKTOP_FEED_STANDARD"' \
  -d 'creative_feature=<FEATURE_NAME> \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<AD_ID>/previews
```

**Example response**

```json
{
  "data": [
    {
      "body": "<iframe src='<PREVIEW_URL>'></iframe>",
      "transformation_spec": {
        "<FEATURE_NAME>": [
          {
            "body": "<iframe src='<PREVIEW_URL>'></iframe>",
            "status": "eligible"
          }
        ]
      }
    }
  ]
}
```

Click on the link to see the previews.

**Note:** If a `transformation_spec` node is not shown, that means the creative is not eligible for the Advantage+ Creative feature on the given placement, and therefore the feature will not be applied.

Once the previews have been reviewed and appear acceptable to publish, move on to [Step 3](#step-3-set-the-ad-status-to-active) to set the ad to `ACTIVE` if it is not already. If any of the previews are not acceptable, create a new ad or creative without opt-in to the corresponding features.

## Step 3: Set the ad status to ACTIVE

After you have verified the previews, you can set the `status` of the ad to `ACTIVE`.

**Example**

```curl
curl -X POST \
  -F 'status=ACTIVE' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_ID>
```

## Learn More

Some Advantage+ Creative features have already been covered in other Marketing API docs:

- `adapt_to_placement` and `media_type_automation`: [Advantage+ Creative for Catalog](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative/advantage-catalog-ads)
- `product_extensions`: [Product Extensions (Add Catalog Items) Features on Marketing API](#product-extensions-for-advantage-creative)
- `image_background_gen` and `image_uncrop`: [Get Started with the Generative AI Features on Marketing API](#get-started-with-the-generative-ai-features-on-marketing-api)

Advantage+ Creative was previously available as standard enhancements on Marketing API:

- [Standard Enhancements for Advantage+ Creative](#standard-enhancements-for-advantage-creative)
- [Advantage+ Creative Preview API](#standard-enhancements-preview)
- [Others](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative)

# Add Site Links Feature

The Add site links feature in Ads Manager is an Advantage+ Creative optimization that showcases additional URLs below your static or dynamic single media (only on Facebook feed) when it's likely to improve performance. This guide covers using the Add site links feature using the Marketing API.

## Eligibility Criteria

To be eligible to use this feature, your ad campaign must have:

- Either Traffic, Engagement, Leads or Sales as your ad objective.
- Website as your conversion location.
- Single image or video ad format.

## Before You Begin

Set up your ad campaigns using the following instructions:

- [Create an ad campaign](#create-an-ad-campaign)
- [Create an ad set](#create-an-ad-set)

## Create an Ad Creative and Ad

**Standalone Creative Creation**

**Before**

```curl
curl -X POST \
  -F 'name=Creative With Site Links' \
  -F 'object_story_spec={
      "link_data": {
         "link": "<URL>",
      },
      "page_id": "<PAGE_ID>",
      "instagram_actor_id": "<INSTAGRAM_ACTOR_ID>",
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**After**

New fields are highlighted in **bold**.

```curl
curl -X POST \
  -F 'name=Creative With Site Links' \
  -F 'object_story_spec={
    "link_data": {
      "link": "<URL>",
    },
    "page_id": "<PAGE_ID>",
    "instagram_actor_id": "<INSTAGRAM_ACTOR_ID>",
    }' \
  -F 'creative_sourcing_spec={
    "site_links_spec": [{
      "site_link_title": "<SITE_LINK_TITLE>",
      "site_link_url" : "<SITE_LINK_URL>",
    },
    {
      "site_link_title": "<SITE_LINK_TITLE>",
      "site_link_url" : "<SITE_LINK_URL>",
    },
    {
      "site_link_title": "<SITE_LINK_TITLE>",
      "site_link_url" : "<SITE_LINK_URL>",
    },
    {
      "site_link_title": "<SITE_LINK_TITLE>",
      "site_link_url" : "<SITE_LINK_URL>",
    }],
  }' \
  -F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "site_extensions": {
        "enroll_status": "OPT_IN",
      },
    },
  }' \ 
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Ad Creation**

**Before**

```curl
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**After**

New fields are highlighted in **bold**.

```curl
curl -X POST \
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
    "creative_sourcing_spec": {
      "site_links_spec": [{
        "site_link_title": "<SITE_LINK_TITLE>",
        "site_link_url" : "<SITE_LINK_URL>",
      },
      {
        "site_link_title": "<SITE_LINK_TITLE>",
        "site_link_url" : "<SITE_LINK_URL>",
      },
      {
        "site_link_title": "<SITE_LINK_TITLE>",
        "site_link_url" : "<SITE_LINK_URL>",
      },
      {
        "site_link_title": "<SITE_LINK_TITLE>",
        "site_link_url" : "<SITE_LINK_URL>",
      }],
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "site_extensions": {
          "enroll_status": "OPT_IN",
        }
      }
    }
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

| Name                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `site_link_title`      | Specifies the display label of the site link. It can be added in `site_links_spec`, see [Ad Creative Site Links Spec, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-site-links-spec).                                                                                                                                                                                                                             |
| `site_link_url`        | Specifies the url of the site link. It can be added in `site_links_spec`, see [Ad Creative Site Links Spec, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-site-links-spec).                                                                                                                                                                                                                                       |
| `site_link_image_hash` | Specifies the image of the site link. Use either `site_link_image_hash` or `site_link_image_url`. When both exist, `site_link_image_url` will be prioritized. It can be added in `site_links_spec`, see [Ad Creative Site Links Spec, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-site-links-spec).                                                                                                             |
| `site_link_image_url`  | Specifies the image of the site link. Use either `site_link_image_hash` or `site_link_image_url`. When both exist, `site_link_image_url` will be prioritized. It can be added in `site_links_spec`, see [Ad Creative Site Links Spec, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-site-links-spec).                                                                                                             |
| `site_extensions`      | “Add site links”, an Advantage+ Creative optimization that showcases additional URLs below your static single media or dynamic single media when it's likely to improve performance. Set the `enroll_status` field with `OPT_IN` to enable it. It can be added in `creative_features_spec`. For more details, see [Ad Creative Features Details, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-features-details). |

## Learn More

**Business Help Center**

- [Create ads with site links in Meta Ads Manager](https://www.facebook.com/business/help/645167520630806)

**Marketing API Reference**

- [Ad Creative](https://developers.facebook.com/docs/marketing-api/reference/ad-creative)
- [Ad Creative Sourcing Spec](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-sourcing-spec)
- [Ad Creative Site Links Spec](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-site-links-spec)

# Product Extensions for Advantage+ Creative

Product extensions (the "Add catalog items" feature in Meta Ads Manager) is an Advantage+ creative optimization that showcases products from your catalog below your static single media when it's likely to improve performance. This document shows you how to use product extensions features for ads.

## API Support for Product Extensions

Product extension creative creation is supported in all versions of the Marketing API, but beginning with v20.0, all ad creation requests that are eligible for product extensions must specify if the ad opts in to use it or not. The `enroll_status` field must be provided with either an `OPT_IN` or `OPT_OUT` value.

## Eligibility Criteria

- Campaign with `SALES` or `TRAFFIC` objective
- Single image or video ad format
- A catalog

## Before You Begin

Follow the steps below to set up your ad campaigns.

- [Create a campaign](#create-an-ad-campaign)
- [Create an ad set](#create-an-ad-set)

**Standalone Creative Creation**

**Before**

```curl
curl -X POST \
  -F 'name=Product Extension Creative' \
  -F 'object_story_spec={
      "link_data": {
         "link": "<URL>",
      },
      "page_id": "<PAGE_ID>",
      "instagram_actor_id": "<INSTAGRAM_ACTOR_ID>",
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**After**

(new fields are highlighted in **bold**)

```curl
curl -X POST \
  -F 'name=Product Extension Creative' \
  -F 'object_story_spec={
      "link_data": {
         "link": "<URL>",
      },
      "page_id": "<PAGE_ID>",
      "instagram_actor_id": "<INSTAGRAM_ACTOR_ID>",
  }' \
  -F 'creative_sourcing_spec={
    "associated_product_set_id": "<PRODUCT_SET_ID>",
  }' \
  -F 'degrees_of_freedom_spec={
    "creative_features_spec": {
      "product_extensions": {
        "enroll_status": "OPT_IN",
        "action_metadata": {
           "type": "MANUAL",
        },
      },
    },
  }' \ 
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Ad Creation**

**Before**

```curl
curl -X POST \
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**After**

(new fields are in **bold**)

```curl
curl -X POST \
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
    "creative_sourcing_spec": {
      "associated_product_set_id": "<PRODUCT_SET_ID>",
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "product_extensions": {
          "enroll_status": "OPT_IN",
          "action_metadata": {
            "type": "MANUAL"
          },
        }
      }
    }
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

| Name                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product_extensions`        | Product extensions is an Advantage+ creative optimization that showcases products from your catalog below your static single media when it's likely to improve performance. Please set the `enroll_status` field with `OPT_IN` to enable it. It can be added in `creative_features_spec`. For more details, see the [Ad Creative Features Details reference documentation](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-features-details). |
| `associated_product_set_id` | Specifies the product set ID for product extensions in Advantage+ creative optimization. This product set will be shown below your single media. It can be added in the `creative_sourcing_spec`. See the [Ad Creative Sourcing Spec reference documentation](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-sourcing-spec) for more details.                                                                                                |

# Standard Enhancements for Advantage+ Creative

Starting with Marketing API v22.0, opting in or out of standard enhancements will no longer be available. Instead, you can opt in or out of individual Advantage+ Creative features by following the instructions in [Get Started with Advantage+ Creative](#get-started-with-advantage-creative). Opting in or out of sub-features within the standard enhancements bundle will have the same effect as previously opting in or out of standard enhancements.

The sub-features within the standard enhancement bundle for single image ads include `image_template`, `image_touchups`, `text_optimizations`, and `inline_comment`. For single video ads, the sub-features are `video_auto_crop`, `text_optimizations`, and `inline_comment`.

Standard enhancements is for ads using a single image, video, or carousel. It automatically creates multiple variations of your ad and shows a personalized variation to each Account Center account based on what they're most likely to respond to. You can create ads with standard enhancements using the `TRAFFIC` or `CONVERSIONS` objectives to help drive performance and deliver more tailored ads to each Account Center account. For more information, please see [About Advantage+ creative](https://www.facebook.com/business/help/1098651080332840).

## API Support for Standard Enhancements

**Standalone Creative Creation**

**Before:**

```curl
curl -X POST \
  -F 'name="My creative title"' \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>",
       "instagram_user_id": "<IG_USER_ID>",
       "link_data": {
             "link": "www.google.com",
      }
     }' \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**After** (new fields are in **bold**):

```curl
curl -X POST \
  -F 'name="My creative title"' \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>",
       "instagram_user_id": "<IG_USER_ID>",
       "link_data": {
             "link": "www.google.com",
      }
     }' \
  -F 'degrees_of_freedom_spec={
      "creative_features_spec": {
        "standard_enhancements": {
          "enroll_status": "OPT_IN"
        }
      }
    }' \ 
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Ad Creation**

**Before:**

```curl
curl -X POST \
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**After** (new fields are in **bold**):

```curl
curl -X POST \
  -F 'creative={
    "object_story_spec": {
      "page_id": "<PAGE_ID>",
      "link_data": {
        "link": "<WEBSITE_URL>",
      }
    },
    "degrees_of_freedom_spec": {
      "creative_features_spec": {
        "standard_enhancements": {
          "enroll_status": "OPT_IN"
        }
      }
    }
  }' \
  -F "adset_id=<ADSET_ID>" \
  -F "name=New Ad" \
  -F "status=PAUSED" \
  -F "access_token=<ACCESS_TOKEN>" \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

For more details, see [Ad Creative](https://developers.facebook.com/docs/marketing-api/reference/ad-creative).

| Parameters                |                                                                                                                                                                                                                                                               |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `degrees_of_freedom_spec` | Specifies the types of transformations that are enabled for the given creative. For more information, see [Ad Creative Degrees Of Freedom Spec, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-degrees-of-freedom-spec). |
|                           | The following features can be opted in the `creative_features_spec`:                                                                                                                                                                                          |
| `standard_enhancements`   | Basic set of enhancements to optimize your ad creative and improve performance. This can include:                                                                                                                                                             |
|                           | \* Automatically adjusting the aspect ratio of your image or video                                                                                                                                                                                            |
|                           | \* Applying a template to your image to help it better fit certain ad placements                                                                                                                                                                              |
|                           | \* Displaying relevant Meta comments below your ad.                                                                                                                                                                                                           |
|                           | The `enroll_status` field can be set to `OPT_IN` or `OPT_OUT`. For more details, see [Ad Creative Features Details, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-features-details).                                    |

# Standard Enhancements Preview

Starting with Marketing API v22.0, previews for standard enhancements will no longer be available. Instead, you can get the previews of individual Advantage+ Creative features by following the instructions in [Get Started with Advantage+ Creative](#get-started-with-advantage-creative).

The sub-features within the standard enhancement bundle for single image ads include `image_template`, `image_touchups`, `text_optimizations`, and `inline_comment`. For single video ads, the sub-features are `video_auto_crop`, `text_optimizations`, and `inline_comment`.

The Advantage+ Creative Preview API supports generating previews for ads both before and after publishing the ad.

- Provide the creative ID or ad ID to see previews of published ads
- Provide the creative spec to see previews of unpublished ads

## Existing Functionality

See the [Ad Preview documentation](https://developers.facebook.com/docs/marketing-api/ad-preview) for more information on the existing functionality.

**Provide the creative or ad ID and placement**

```curl
curl -X GET \
  -d 'ad_format="DESKTOP_FEED_STANDARD"' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<CREATIVE_ID>/previews
```

**Receive the iframe response.**

```json
{
  "data": [
    {
      "body": "<PREVIEW_LINK>"
    }
  ]
}
```

Click on the link to see the previews.

## Updated Functionality

**Provide the creative or ad ID and placement with new parameters.**

```curl
curl -X GET \
  -d 'ad_format="DESKTOP_FEED_STANDARD"' \
  -d 'access_token=<ACCESS_TOKEN>' \
  -d 'creative_feature=standard_enhancements' \
  https://graph.facebook.com/v24.0/<CREATIVE_ID>/previews
```

**Receive the iframe response.**

```json
{
  "data": [
    {
      "body": "<preview link>",
      "transformation_spec": {
        "standard_enhancements": [
          {
            "body": "<preview link>",
            "optimization_type_description": "Vary image aspect ratio",
            "status": "eligible"
          },
          {
            "body": "<preview link>",
            "optimization_type_description": "Image templates for Feed",
            "status": "eligible"
          }
        ]
      }
    }
  ]
}
```

Click on the link to see the previews.

| Parameters             |                                                                                    |
| :--------------------- | :--------------------------------------------------------------------------------- |
| **`creative_feature`** | Creative feature to apply to preview. **Possible values:** `standard_enhancements` |

**Limitations**

- Advantage+ Creative previews are currently only supported on the `MOBILE_FEED_STANDARD`, `INSTAGRAM_STANDARD`, `INSTAGRAM_REELS` and `INSTAGRAM_STORY` placements.

- Image ad previews on `MOBILE_FEED_STANDARD` may appear cropped, even without manual crops, because the placement supports a limited range of aspect ratios. See [Aspect ratios supported by placements in Meta Ads Manager](https://www.facebook.com/business/help/1288599478479574) for more information about aspect ratio support for each placement.

- The following transformations in Standard Enhancements do not have preview support:
  - Inline Comment
  - Text Liquidity
