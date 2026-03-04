<\!-- Source: META-ADS-API-GUIDE.md, Lines 3050-4789 -->

# Instagram Ads API

Learn how to create and publish ads on Instagram using the Instagram Ads API.

## Documentation Contents

|                                                                                                     |                                                                                                            |
| :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| [Get Started](#get-started-1)                                                                       | Five steps to get you running ads on Instagram.                                                            |
| [Guides](https://developers.facebook.com/docs/instagram/ads-api/guides)                             | Use case based guides to help you perform specific actions.                                                |
| [Reference](https://developers.facebook.com/docs/instagram/ads-api/reference)                       | Requirements and features of Instagram ad creatives.                                                       |
| [Instagram Post Moderation API](https://developers.facebook.com/docs/instagram/post-moderation-api) | Use the API to access posts, add new comments, check the comments by viewers, and delete certain comments. |

## Get Started

With Marketing API you can create, measure, and optimize ads on Instagram in the main Stream, in Stories, the Explore tab, and in Reels. To create your ads:

- Step 1: Get Instagram account ID
- Step 2: Create campaign
- Step 3: Create ad set - Pick a placement that includes Instagram. We recommend including both Facebook and Instagram, so our system automatically delivers ads to the best audiences on both platforms.
- Step 4: Provide ad creative
- Step 5: Schedule Delivery

Be aware that:

- Instagram ads do not support all Facebook ads objectives.
- Not all creative formats supported by Facebook work on Instagram.
- To use Instagram and Facebook posts as ads, see our [guide](https://developers.facebook.com/docs/instagram/ads-api/guides/promoted-posts).

### Step 1: Get Instagram Account ID

You need to know your Instagram account’s ID before you start creating ads. Depending on your account’s type, you have different ways of getting an account ID:

| Type of Instagram Account                                                   | How To Find Account ID                                                                                                                                                                                                                                                                                                              |
| :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Business Manager Instagram Account (Recommended) - Implementation Guide** | See [Set Up Instagram Accounts On Business Manager](https://developers.facebook.com/docs/marketing-api/instagram-accounts/business-manager-setup), [Get Associated Accounts](https://developers.facebook.com/docs/marketing-api/instagram-accounts/business-manager-setup#get-associated-accounts). Save the ID to use in your ads. |
| **Page-Connected Instagram Accounts - Implementation Guide**                | See [Set Up Instagram Accounts With Pages](https://developers.facebook.com/docs/marketing-api/instagram-accounts/page-setup), [Get Account ID](https://developers.facebook.com/docs/marketing-api/instagram-accounts/page-setup#get-id). Save the ID to use in your ads.                                                            |
| **Page-Backed Instagram Account - Implementation Guide**                    | See [Set Up Instagram Accounts With Pages](https://developers.facebook.com/docs/marketing-api/instagram-accounts/page-setup), [Read Read PBIA](https://developers.facebook.com/docs/marketing-api/instagram-accounts/page-setup#read-pbia). Save the ID to use in your ads.                                                         |

### Step 2: Create Ad Campaign

Creating ad objects for Instagram is the same is it is for Facebook ads. To start, create a Facebook [Ad Campaign](https://developers.facebook.com/docs/marketing-api/guides/campaigns) and specify your objective.

Instagram compatible objectives vary according to your chosen ad placement:

| Ad Placement                    | Compatible Objectives                                                                                                                                                                   |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ads in Explore                  | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `APP_INSTALLS`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `MESSAGES`, `CONVERSIONS`, and `PRODUCT_CATALOG_SALES`                  |
| Ads in Instagram Explore home   | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `APP_INSTALLS`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `MESSAGES` and `CONVERSIONS`.                                                              |
| Ads in Instagram profile feed   | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `APP_INSTALLS`, `VIDEO_VIEWS`, `MESSAGES`, `CONVERSIONS`, and `STORE_TRAFFIC`                                             |
| Ads in Instagram search results | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `APP_INSTALLS`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `CONVERSIONS`, and `PRODUCT_CATALOG_SALES`                              |
| Reels ads                       | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `APP_INSTALLS`, `VIDEO_VIEWS`, `MESSAGES` and `CONVERSIONS`                                                                                  |
| Story ads                       | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `APP_INSTALLS`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `MESSAGES`, `CONVERSIONS`, `PRODUCT_CATALOG_SALES`, and `STORE_TRAFFIC`                    |
| Stream ads                      | `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `APP_INSTALLS`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `MESSAGES`, `CONVERSIONS`, `PRODUCT_CATALOG_SALES`, and `STORE_TRAFFIC` |

The minimum spend budget on Instagram is the same as the one for Facebook self-serve ads, with different limits per currency and limits based on `bid_amount`.

Learn about default placements for your ads and `instagram_positions`.

For Reach And Frequency campaigns, see [Instagram Reach And Frequency](https://developers.facebook.com/docs/marketing-api/guides/reach-and-frequency/instagram-reach-and-frequency).

### Step 3: Create Ad Set

Create an ad set with the desired:

- **Optimization Goal:** Your goal options depend on the objective set at the campaign level. Check our [validation rules](https://developers.facebook.com/docs/marketing-api/reference/ad-set/index#targeting-specs-reference).
- **Targeting Options:** You can use all Facebook [targeting options](https://developers.facebook.com/docs/marketing-api/targeting-specs) for Instagram campaigns, including Facebook's native basic targeting options, Custom Audiences, and Lookalike Audiences.
- **Budget**
- **Billing Event:** The `billing_event` depends on which `optimization_goal` you choose. Check our [validation rules](https://developers.facebook.com/docs/marketing-api/reference/ad-set#billing-event-and-optimization-goal).
- **Schedule**

For `APP_INSTALLS` and `CONVERSIONS` campaigns, a `promoted_object` is also required at the ad set level.

If you create a Reach and Frequency ad set, set `rf_prediction_id`. The `destination_ids` of the Reach Frequency Prediction must contain the Instagram account ID.

**Placement**

To deliver ads to Instagram, include `instagram` under `publisher_platforms` in your ad set. You can use Instagram `stream`, `story`, `explore`, `reels`, `explore_home`, and `ig_search` placements, or you can enable multiple platforms including Instagram's placements. If you choose multiple platforms, Facebook optimizes delivery based on your target audience on each platform with [Placement Optimization](https://www.facebook.com/business/help/105436669809983).

To show ads exclusively in Stream or Stories specify `stream` or `story` in the `instagram_positions` field.

Ads using `"instagram_positions":["story"]` will be displayed in both the Instagram Desktop and Mobile web feeds.

If you want to display your ads in Instagram's Explore tab you must include both `stream` and `explore` as placements.

If you want to display your ads on Instagram's Explore home placement you must include both `stream` and `explore` as placements.

If you want to display your ads on Instagram's search results placement you must include `stream` as a placement.

Instagram Web Feeds ads use the `stream` placement and are checked for web eligibility to be delivered to both desktop and mobile web feeds. The compatible objectives are `BRAND_AWARENESS`, `REACH`, `LINK_CLICKS`, `POST_ENGAGEMENT`, `VIDEO_VIEWS`, and `CONVERSIONS`.

If `instagram_positions` is not specified, we deliver ads to all four possible Instagram placements.

To deliver ads only to Instagram Stories, use `story` only inside `instagram_positions`. In this case, you should also have `instagram` as the only value for `publisher_platforms`.

**Examples**

**Create an ad set with Instagram as placement:**

```curl
curl \
  -F 'name=Instagram Adset' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=2' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["instagram"], 
    "user_os": ["iOS"] 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets    
```

**Create an ad set with Instagram Explore home as a targeted placement:**

```curl
curl \
  -F 'name=Instagram Adset' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=2' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["instagram"],
    "instagram_positions": ["stream", "explore", "explore_home"],  
    "user_os": ["iOS"] 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets 
```

**Create an ad set with Instagram search results as a targeted placement:**

```curl
curl \
  -F 'name=Instagram Adset' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=2' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["instagram"],
    "instagram_positions": ["stream", "ig_search"],  
    "user_os": ["iOS"] 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

### Step 4: Provide Ad Creative

At this point, you should provide your [ad creative](https://developers.facebook.com/docs/marketing-api/guides/ad-creative). For creatives to be used on Instagram only or mixed placements, you need to supply your Instagram account ID and your Facebook Page ID —your page information does not appear anywhere on your Instagram ad. If the Instagram account is connected to a Page, or is a Page-backed Instagram Account, the same Page needs to be used.

When you provide ad creative, we create an unpublished post. You can see the unpublished post from the page when you query [promotable feed](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/promoted-posts) using the Page ID.

**Relevant Guides**

- [Use Posts as Instagram Ads](https://developers.facebook.com/docs/instagram/ads-api/guides/promoted-posts)
- [Add Optional Call-To-Action](https://developers.facebook.com/docs/instagram/ads-api/guides/call-to-action)
- [Get Ad Preview](https://developers.facebook.com/docs/marketing-api/ad-preview)
- [Instagram Advantage+ Catalog Ads](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads/instagram-advantage-catalog-ads)
- [Carousel Ads](https://developers.facebook.com/docs/marketing-api/guides/carousel-ads): You can create carousel ads with [Ads Manager](https://www.facebook.com/business/help/1628178667448842) as well as the API.
- [Customize Stories](https://developers.facebook.com/docs/instagram/ads-api/guides/customize-stories)
- [Add Interactive Elements](https://developers.facebook.com/docs/instagram/ads-api/guides/interactive-elements)

### Step 5: Schedule Delivery

Create your Ad object to link your creative to your ad set.

**Ad Review Process**

The ad review policies are the same for Facebook and Instagram. As we make Instagram available to more businesses, we want the same high-quality ad experience on Instagram that we have on Facebook.

This requires understanding more about how the community interacts with different kinds of advertiser content on Instagram. Since it takes time to build the same kind of models that drive Facebook ads, we currently rely on human review to filter out a small percentage of ads and provide suggestions for improvement.

Our ultimate goal is to make running a campaign across Facebook and Instagram a seamless experience and to make ads a relevant, valuable part of the Instagram product.

# Threads Ads

To run ads on Threads, you need a Threads account ID. You have two options for obtaining one:

- **Instagram-connected Threads account:** An Instagram account is used to create the Threads account.
- **Instagram-backed Threads account:** An Instagram account runs ads on behalf of a Threads account created for that purpose.

Make sure your Instagram account has the [proper setup for Instagram ads](https://developers.facebook.com/docs/instagram/ads-api/get-started).

## Permissions

To make API calls with an Instagram-connected Threads account you need a user access token with the following permissions:

- `instagram_basic`
- `threads_business_basic`
- `pages_read_engagement`

If the app user was granted a role via the Business Manager on the Page connected to your app user's Instagram professional account, your app will also need one of:

- `ads_management`
- `ads_read`

**Note:** Anyone with access to create Instagram ads from the Instagram account can create Threads ads from the Instagram-connected Threads account.

## Limitations

- You cannot run ads on Threads without an Instagram-connected or Instagram-backed Threads account, and you cannot run ads on Threads if the associated Instagram account cannot run ads on Instagram.
- You need to have at least an **Advertiser** role on the Page that is linked to your Instagram account; **Manager** or **Content Creator** also work. Or you need to have the Instagram account connected to a business account where you have appropriate roles.
- An Instagram account can have only one Instagram-connected Threads account, as well as only one Instagram-backed Threads account. Verify whether a specific Instagram account has an Instagram-connected Threads account or an Instagram-backed Threads account before attempting to create a new one. If an account of the type you want to use already exists, use that one.
- We are keeping the volume of ads in Threads intentionally low as we test and learn, therefore expect that delivery to Threads will be low. You will see this reflected in your placement breakdown reporting if your campaign delivers on Threads.
- Threads ads creation only supports images and videos as the media format.
- Ads cannot be created from an existing Threads post.

## Instagram-connected Threads accounts

### Before you begin

You need the following:

- A business with the [proper setup for Instagram ads advertiser identities](https://developers.facebook.com/docs/marketing-api/instagram-accounts/business-manager-setup).
- An Instagram account with a profile image that is not a Private Account and has the appropriate advertiser permissions (See [How do I connect my Facebook Page and Instagram account?](https://www.facebook.com/business/help/316380618483864)).
- A Threads account connected to an Instagram account. You can set this up in the Threads app.

### Get the Threads account ID

Once you connect an Threads account to a valid Instagram account, you can call the `/<IG_USER_ID>/connected_threads_user` endpoint to get the Threads account ID.

**Example request**

```curl
curl -G \
  -d "access_token=<ACCESS_TOKEN>"\
  -d "fields=threads_user_id" \
"https://graph.facebook.com/v24.0/<IG_USER_ID>/connected_threads_user"
```

The result should be a Threads account object containing only the `threads_user_id`. Save this `threads_user_id` to use in your ads.

## Instagram-backed Threads accounts

If you don’t have a Threads profile, you can still create and deliver ads in Threads using an Instagram-backed Threads account.

These accounts are created with the API, and function as if you are running ads for a Threads account, however a mock Threads account is created specifically to run those ads.

You cannot log into Threads accounts created this way to manage posts.

### Create an Instagram-backed Threads account

You can create an Instagram-backed Threads account by sending a `POST` request to the `/<IG_USER_ID>/instagram_backed_threads_user` endpoint.

**Example request**

```curl
curl \
  -F "access_token=<ACCESS_TOKEN>"\
"https://graph.facebook.com/v24.0/<IG_USER_ID>/instagram_backed_threads_user"
```

This returns a Threads account ID on success. If an Instagram account is already has a Instagram-backed Threads account, the call returns the existing Instagram-backed Threads account ID. Save the returned ID to run your ads.

### Get the Threads account ID

To see if an Instagram account has an Instagram-backed Threads account, send a `GET` request to the `/<IG_USER_ID>/instagram_backed_threads_user` endpoint.

**Example request**

```curl
curl -G \
  -d "access_token=<ACCESS_TOKEN>"\
  -d "fields=threads_user_id" \
"https://graph.facebook.com/v24.0/<IG_USER_ID>/instagram_backed_threads_user"
```

This returns a Threads account object, if there is one. The object includes a `threads_user_id` that can be used to run Threads ads. If there is no Instagram-backed Threads account already set up, the API returns an empty response.

## Ad Creatives with Threads Accounts

### Using Instagram-connected Threads accounts in ads

You can use any ad account, either owned by an individual or by a business, as far as you have access, to create ads for Instagram-connected Threads accounts.

When creating an ad creative, you should provide the `threads_user_id` and the `instagram_user_id` . The `instagram_user_id` of your ad creative must be for the Instagram account associated with this Instagram-connected Threads account. You cannot use an Instagram-connected Threads account with another Instagram account in an ad creative.

### Using Instagram-backed Threads accounts in ads

You do not need to assign ad accounts to the Instagram-backed Threads account. When you provide an ad creative using a Instagram-backed Threads account, you can use any ad accounts that you have access to.

Once an Instagram-backed Threads account is created, you can use its ID as the `threads_user_id` in your ad creative, as you do with other types of Instagram accounts. The `instagram_user_id` of your ad creative must be for the Instagram account associated with this Instagram-backed Threads account.

### Examples

While the `instagram_user_id` must be included in the `object_story_spec` field, the `threads_user_id` can be included either in the `object_story_spec` field or on a higher level of the API call.

**Included in the `object_story_spec` field**

```curl
curl -X POST \
  -F {
    "name": "test",
    "object_story_spec": {
      "link_data": {
        "link": "<LINK_URL>",
        "call_to_action": {
          "type": "WATCH_MORE",
          "value": {}
        },
        "message": "<MESSAGE_TEXT>",
        "image_hash": "<IMAGE_HASH>"
      },
      "instagram_user_id": "<IG_USER_ID>",
      "threads_user_id": "<THREADS_USER_ID>",
      "page_id": "<PAGE_ID>"
    }
  } \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Included at a higher level**

```curl
curl -X POST \
  - F {
    "name": "test",
    "object_story_spec": {
      "link_data": {
        "link": "<LINK_URL>",
        "call_to_action": {
          "type": "WATCH_MORE",
          "value": {}
        },
        "message": "<MESSAGE_TEXT>",
        "image_hash": "<IMAGE_HASH>"
      },
      "instagram_user_id": "<IG_USER_ID>",
      "page_id": "<PAGE_ID>"
    },
    "threads_user_id": "<THREADS_USER_ID>"
  } \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

## Threads Ads Creation

With Marketing API you can create, measure, and optimize ads on Threads in the main feed. To create your ads:

- Step 1: Get a Threads account ID
- Step 2: Create an ad campaign
- Step 3: Create an ad set — Pick a placement that includes Threads. Adding Instagram stream is a prerequisite if you want to select Threads threads_stream as a placement.
- Step 4: Provide an ad creative
- Step 5: Schedule ad delivery

### Limitations

- There is a 1000 character limit on captions for ads targeting Threads. If your ad is over this limit, the request to create an ad will succeed for Instagram, but it will not be delivered on Threads.
- Threads images must be at least 500px in width.
- There is a limit of 30 hashtags per ad.

### Step 1: Get a Threads account ID

You need to know your Threads account's ID before you start creating ads. Depending on your account's type, you have different ways of getting an account ID:

- **Instagram-connected Threads account** — Set up a connection from the Threads app via OAuth flow and get the Threads account ID. Save the returned ID to use in your ads.
- **Instagram-backed Threads account** — Set up the Threads account using the API, then get the Threads account ID. Save the returned ID to use in your ads.

### Step 2: Create an ad campaign

Creating ad objects for Threads is the same as it is for Instagram and Facebook ads. To start, create an [ad campaign](https://developers.facebook.com/docs/marketing-api/guides/campaigns) and specify your objective.

Threads compatible objectives vary according to your chosen ad placement:

| Ad Placement                           | Compatible Objectives                                                         |
| :------------------------------------- | :---------------------------------------------------------------------------- |
| Ads in Threads Feed (`threads_stream`) | `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_SALES` |

### Step 3: Create an ad set

Create an ad set with the desired:

- **Optimization goal:** Your goal options depend on the objective set at the campaign level. Check the [validation rules](https://developers.facebook.com/docs/marketing-api/reference/ad-set/index#targeting-specs-reference).
- **Targeting options:** You can use all the [standard targeting options](https://developers.facebook.com/docs/marketing-api/targeting-specs) for your campaigns, including the native basic targeting options, custom audiences, and lookalike audiences.
- **Budget**
- **Billing event:** The `billing_event` depends on which `optimization_goal` you choose. Check the [validation rules](https://developers.facebook.com/docs/marketing-api/reference/ad-set#billing-event-and-optimization-goal).
- **Schedule ad delivery**

**Placement**

To deliver ads to Threads, include both `instagram` and `threads` under `publisher_platforms` in your ad set. Then, use the Threads `threads_stream` placement; remember you must select the Instagram `stream` placement too. If you choose multiple platforms, Meta optimizes delivery based on your target audience on each platform with [placement optimization](https://www.facebook.com/business/help/105436669809983).

**Examples**

**Create an ad set with Threads as a placement**

```curl
curl \
  -F 'name=Threads Adset' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=2' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["instagram", "threads"], 
    "user_os": ["iOS"] 
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets  
```

**Create an ad set with Threads `threads_stream` as a targeted placement**

```curl
curl \
  -F 'name=Threads Adset' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=2' \
  -F 'daily_budget=1000' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["instagram", "threads"],
    "instagram_positions": ["stream"], 
    "threads_positions": ["threads_stream"],  
    "user_os": ["iOS"] 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

### Step 4: Provide an ad creative

For creatives to be used with a Threads placement and the required Instagram placement, you need to supply your Instagram account ID and your Threads account ID and your Facebook Page ID. **Note:** Your Page information does not appear anywhere on your Threads ad.

If the Threads account is connected to an Instagram account or is a Instagram-backed Threads Account, that Instagram account needs to be used.

When you provide the ad creative, we create an unpublished post. You can see the unpublished post from the Page when you query the [promotable feed](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/promoted-posts) using the Page ID.

**Note:** Threads ads support image, video, and carousel image ads creation (with the same steps as Instagram ads creation). See [Media requirements](https://developers.facebook.com/docs/threads/ads-api/media) for more information. When new media setups and ad formats become compatible with Threads, both existing and newly created campaigns using them will automatically leverage your Threads profile or Instagram account to deliver to the `threads_stream` if that placement is included. You can review and update your ad placements at any time.

**Hashtags**

**Note:** There is a limit of 30 hashtags per ad.

**Media requirements**

|                           |                                                                                                                                                                                                                                                                                                           |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Captions**              | There is a 1000 character limit on captions for ads targeting Threads. If your ad is over this limit, the request to create an ad will succeed for Instagram, but it will not be delivered on Threads. 80 to 160 characters is recommended. **Note:** Hashtags and URLs are not supported in the caption. |
| **Image Requirements**    | **Aspect Ratio**                                                                                                                                                                                                                                                                                          |
|                           | 1.91:1 to 9:16 are supported. Images with a taller ratio than 4:5 will be cropped and vertically centered to 4:5. Images with a ratio of 1.91:1 to 4:5 will not be cropped or altered.                                                                                                                    |
|                           | **Size**                                                                                                                                                                                                                                                                                                  |
|                           | Threads images must be at least 500px in width.                                                                                                                                                                                                                                                           |
| **Video Requirements**    | **Aspect Ratio**                                                                                                                                                                                                                                                                                          |
|                           | 1.91:1 to 9:16 are supported. Videos with a taller ratio than 4:5 will be cropped and centered to 4:5. Images with a ratio of 1.91:1 to 4:5 will not be cropped or altered.                                                                                                                               |
| **Carousel Requirements** | **Aspect Ratio for images**                                                                                                                                                                                                                                                                               |
|                           | 1.91:1 to 9:16 are supported. Images with a ratio outside of 1:1 will be center cropped to 1:1. Images with a ratio of 1:1 will not be cropped or altered.                                                                                                                                                |

### Step 5: Schedule ad delivery

Create your Ad object to link your creative to your ad set.

## Threads Carousel Ads

To create carousel ads, provide an ad creative with multiple `child_attachments` in `link_data` for `threads_stream`. You need to provide the `threads_user_id` and only use [objectives supported in Threads ads](https://developers.facebook.com/docs/threads/ads-api/get-started#threads-compatible-objectives).

There are some differences between Threads and Instagram carousel ads. These differences only happen with the Threads placement. If you have an ad set with Facebook, Instagram, and Threads placements enabled, what works on Facebook and/or Instagram may be different from that on Threads.

- Each attachment must have a link specified, which is the destination of the image click.
- There is no call to action button on the ad. If a headline or name is provided for an attachment, it will overwrite the call To action text. If no headline or name is provided, the call to action text will be used for the attachment.
- Only 10 children are allowed for inline creation.

### Image Cards

Each attachment must have either a `picture` or `image_hash` set. We do not default the image from `link_data`.

See the [media requirements](https://developers.facebook.com/docs/threads/ads-api/media#image-requirements) for supported image specifications.

### Create an Threads Image Carousel Ad Creative

**Example request**

```curl
curl -X POST \
  -F 'name=Threads Carousel Creative' \
  -F 'object_story_spec={
      "instagram_user_id": "<IG_USER_ID>",
      "threads_user_id": "<THREADS_USER_ID>",
      "page_id": "<PAGE_ID>",
      "link_data": {
        "child_attachments": [
          {
            "link": "<LINK_1>",
            "image_hash": "<IMAGE_HASH_1>",
            "description": "$8.99", 
            "name": "Product 1" 
          },
          {
            "link": "<LINK_2>",
            "image_hash": "<IMAGE_HASH_2>",
            "description": "$9.99", 
            "name": "Product 2" 
          },
          {
            "link": "<LINK_3>",
            "image_hash": "<IMAGE_HASH_3>",
            "call_to_action": {
              "type": "LEARN_MORE"
            }
          }
        ],
        "message": "<MESSAGE_TEXT>"
      }
    }
' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

# Partnership Ads API

Branded content ads are now called **partnership ads**.

Partnership ads allow advertisers to run ads from a creator or other partner's handle to scale their collaborations. Using a creator's voice with partnership ads is the most performant way to run creator content on our platforms.

These topics discuss how to use the Partnership Ads API to automate partnership ad campaign features and permissions. It assumes that you already have a business, a creator, and a media plan for the two of them. It will walk you through the technical steps of setting up permissions so that you can then promote these posts via the API.

- The **Post-Level Permissioning API** allows brands to add, remove and check creators who are on their approved list for tagging them in the paid partnership label on branded content posts. It also allows creators to give businesses permission to promote their organic branded content posts as partnership ads.
- The **Account-Level Permissioning API** allows brands to request partnership ad permission from creators and validate the status of these requests. With account-level permissions, advertisers can promote the creator's content that tags them in branded content (via the paid partnership label) or other non-branded content (@mentions, people tags, product tags, or Instagram Collab posts), as well as create new partnership ads without an existing organic post, without assigning permissions at the post-level.

For more information, see the following topics:

- [Post-Level Permissioning](#post-level-permissioning)
- [Account-Level Permissioning](#account-level-permissioning)
- [Partnership Ads Creation](#partnership-ads-creation)

## Post-Level Permissioning

Branded content ads are now called **partnership ads**.

Post-Level Permissioning allows brands to add, remove and check creators who are on their approved list for tagging them in the paid partnership label on branded content posts. It also allows creators to give businesses permission to promote their organic branded content posts as partnership ads.

### Permissions

In order to use this API, you must have a [Facebook User access token](https://developers.facebook.com/docs/facebook-login/access-tokens) with the following:

- [Advanced Access](https://developers.facebook.com/docs/development/release/access-levels#advanced-access) access level
- Permissions:
  - `instagram_basic`
  - `instagram_branded_content_brand` (for the `/branded_content_tag_approval` endpoint)
  - `instagram_branded_content_creator` (for the `/branded_content_partner_promote` endpoint)

### How it Works

The general flow for enabling post-level permissions is:

- Businesses can see which creators are approved to tag them in the paid partnership label on branded content posts.
- Businesses can add creator user IDs to the approved list.
- Businesses can remove creator user IDs from the approved list.
- Creators can check which businesses they have given permission to promote a given organic post as a partnership ad.
- Creators can give a business permission to promote the given organic post as a partnership ad.

### Approve Creators

Business accounts have the option to restrict who can tag them in the paid partnership label on branded content posts. If restrictions are turned on, the business can allow users to tag them in branded content posts by adding them to their approved creator allowlist.

This endpoint allows business accounts to add, remove, and view the creators in their approved accounts list, if approval is required.

**Reading**

**Approval List**

Queries the approval list for the existence of a set of creator account types and returns a list of approved user IDs.

- **Request**

  `Access Token = BUSINESS_ACCESS_TOKEN`

  ```curl
  curl -G \
    -d 'user_ids=<USER_ID1, USER_ID2, ...>' // creator user IDs
    -d 'access_token=<ACCESS_TOKEN>''https://graph.facebook.com/v24.0/<USER_ID>/branded_content_tag_approval'
  ```

  | Name       | Description |
  | :--------- | :---------- | --------------------------------------------------------------------------------------------------------------------- |
  | `user_ids` | Required.   | A comma-separated list of users IDs to check against the permission list. At most 100 IDs can be queried per request. |

- **Response**

  This endpoint will return a list of approved creators, filtered by the account IDs provided.

  ```json
  {
    "data": [
      {
        "id": "<USER_ID>"
      }
    ]
  }
  ```

**Updating**

Adds users to the approval list and returns a Boolean.

- **Request**

  `Access Token = BRAND_ACCESS_TOKEN`

  ```curl
  curl -X \
    -d 'user_ids=<USER_ID5, USER_ID10, USER_ID15, ...>' // creator user IDs
    -d 'access_token=<ACCESS_TOKEN>''https://graph.facebook.com/v24.0/<USER_ID>/branded_content_tag_approval'
  ```

  | Name       | Description |
  | :--------- | :---------- | ------------------------------------ |
  | `user_ids` | Required.   | Users to add to the permission list. |

- **Response**

  ```json
  {
    "success": true 
    // false is returned if one or more IDs fail to update; in that case, no IDs will be added}
  ```

**Deleting**

Removes users from the approval list and returns a Boolean.

- **Request**

  `Access Token = BUSINESS_ACCESS_TOKEN`

  ```curl
  curl -X DELETE\
    -d 'user_ids=<USER_ID3, USER_ID5, ...>' // creator user IDs
    -d 'access_token=<ACCESS_TOKEN>''https://graph.facebook.com/v24.0/<USER_ID>/branded_content_tag_approval'
  ```

  | Name       | Description |
  | :--------- | :---------- | ------------------------------------- |
  | `user_ids` | Required.   | Users to remove from permission list. |

- **Response**

  ```json
  {
    "success": true 
    // false is returned if one or more IDs fail to be deleted; in that case, no IDs will be deleted}
  ```

### Allow Brand Partner to Boost

In order for a business to promote a branded content post that they are tagged in with the "paid partnerships" tag as partnership ads, the creator must first give the business permission for individual posts.

**Business partner promotion status**

This API call allows the creator to get the list of businesses that are approved to promote a given branded content post that they are tagged in.

- **Request**

  `Access Token = CREATOR_ACCESS_TOKEN`

  ```curl
  curl -G \
    -d  'access_token=<ACCESS_TOKEN>''https://graph.facebook.com/v24.0/<IG_MEDIA_ID>/branded_content_partner_promote'
  ```

- **Response**

  ```json
  {
    "approved": {comma-separated list of approved user IDs}}
  ```

**Allow brand partner to boost setting**

This API call allows the creator to turn on the **Allow brand partner to boost** setting outside of the Instagram app.

**Note:** Creators will create their post and tag the brand partner via the Instagram platform.

- **Request**

  `Access Token = CREATOR_ACCESS_TOKEN`

  ```curl
  curl -X \ POST
    -d  'sponsor_id=<USER_ID>' // User_ID of the business the creator is granting, or revoking, promotion permissions
    -d  'permission=true | false'
    -d  'access_token=<ACCESS_TOKEN>''https://graph.facebook.com/v24.0/<IG_MEDIA_ID>/branded_content_partner_promote'
  ```

  | Name         | Description |
  | :----------- | :---------- | ---------------------------------------------------------------------------- |
  | `permission` | Required.   | Set to `true` if permission is given to the tagged brand, or `false` if not. |

- **Response**

  ```json
  {
    "success": true 
    // false is returned on error; permission will not be granted}
  ```

## Account-Level Permissioning

Branded content ads are now called **partnership ads**.

The Account-Level Permissioning API allows brands to request partnership ad permission from creators and validate the status of these requests. With account-level permissions, advertisers can promote the creator's content that tags them in branded content (via the paid partnership label) or other non-branded content (@mentions, people tags, product tags, or Instagram Collab posts), as well as create new partnership ads without an existing organic post, without assigning permissions at the post-level.

- **Request Partnership Ad Permissions:** Allows third-party platforms to request account-level partnership ad permissions from creators on behalf of brands.
- **View Partnership Ad Permissions:** Allows third-party platforms to list existing partnership ad permissions for a brand.

When a creator accepts an advertiser's account-level permission request in the Instagram app, advertisers can:

- Create partnership ads from the creator's handle without a pre-existing post.
- Create partnership ads from any of the creator's existing posts that tag the advertiser (Note: the advertiser must be tagged using the paid partnership label, @mentions\*, people tags\*, product tags\*, or Instagram Collabs\*).
- Include or exclude the creator's audience in their partnership ad campaign.

Creators can:

- Tag the advertiser in the paid partnership label when making branded content posts.
  - \* Instagram only

### Send Partnership Ad Permission Request to Creator

Apps can request partnership ad permissions from creators on behalf of brands.

`POST /<BRAND_IG_ID>/branded_content_ad_permissions`

| **Inputs**            |                                     |
| :-------------------- | :---------------------------------- |
| `BRAND_IG_ID`         | — Instagram user ID of the brand    |
| `CREATOR_IG_ID`       | — Instagram user ID of the creator  |
| `CREATOR_IG_USERNAME` | — Instagram username of the creator |
| `ACCESS_TOKEN`        | — User access token                 |

| **Permissions**                                               |     |
| :------------------------------------------------------------ | :-- |
| `instagram_branded_content_ads_brand` scoped on `BRAND_IG_ID` |     |
| `instagram_basic`                                             |     |
| `business_management`                                         |     |

The `BRAND_IG_ID` must be owned or shared with the business. You must have at least advertiser permissions for the `BRAND_IG_ID`.

- **Request**

  You can either request the permission using the `CREATOR_IG_ID` or `CREATOR_IG_USERNAME`.

  ```curl
  curl \
    -F 'access_token=<ACCESS_TOKEN>' \
    -F 'creator_instagram_account=<CREATOR_IG_ID>' \// OR 
    -F 'creator_instagram_username=<CREATOR_IG_USERNAME>' \'https://graph.facebook.com/v24.0/<BRAND_IG_ID>/branded_content_ad_permissions'
  ```

- **Response**

  ```json
  {
    "id": "<id_of_permission>"
  }
  ```

### View Partnership Ad Permission for a Brand

Apps can list existing partnership ad permissions (including pending) for a brand.

`GET /<BRAND_IG_ID>/branded_content_ad_permissions`

| **Inputs**     |                                               |
| :------------- | :-------------------------------------------- |
| `BRAND_IG_ID`  | — Instagram user ID of the brand              |
| `ACCESS_TOKEN` | — User access token, will have the brand data |

| **Permissions**                                               |     |
| :------------------------------------------------------------ | :-- |
| `instagram_branded_content_ads_brand` scoped on `BRAND_IG_ID` |     |
| `business_management`                                         |     |

- **Request**

  ```curl
  curl -G \
    -d 'access_token=<ACCESS_TOKEN>' \'https://graph.facebook.com/v24.0/<BRAND_IG_ID>/branded_content_ad_permissions'
  ```

- **Response**

  ```json
  {
    "data": [
      {
        "creator_username": "jaspersmarket",
        "creator_id": "123",
       "creator_fb_page": "123",
  		"brand_ig_user": {
          "id": "1234"
        }
        "permission_status": "APPROVED", // Creator approval status: REVOKED, PENDING, etc.
        "id": "<ID_OF_PERMISSION>",
      }
    ],
    "paging": {
      "cursors": {
        "before": "MTM4OTY1MDkwNzkyMTE4NQ==",
        "after": "MTAyMzMxNzA5NzY5MjU4NA=="
      }
    }
  ```

### Revoking a Permission

Apps can revoke partnership ad permissions from creators on behalf of brands.

`POST /<BRAND_IG_ID>/branded_content_ad_permissions`

| **Inputs**      |                                    |
| :-------------- | :--------------------------------- |
| `BRAND_IG_ID`   | — Instagram user ID of the brand   |
| `CREATOR_IG_ID` | — Instagram user ID of the creator |
| `ACCESS_TOKEN`  | — User access token                |

| **Permissions**                                               |     |
| :------------------------------------------------------------ | :-- |
| `instagram_branded_content_ads_brand` scoped on `BRAND_IG_ID` |     |
| `Business_management`                                         |     |

The `BRAND_IG_ID` must be owned or shared with the business. You must have at least advertiser permissions for the `BRAND_IG_ID`.

- **Request**

  ```curl
  curl \
    -F 'access_token=<ACCESS_TOKEN>'\
    -F 'creator_instagram_account=<CREATOR_IG_ID>'\
    -F 'revoke=true''https://graph.facebook.com/v24.0/<BRAND_IG_ID>/branded_content_ad_permissions'
  ```

- **Response**

  ```json
  {
    "id": "<id_of_permission>"
  }
  ```

## Partnership Ads Creation

Branded content ads are now called **partnership ads**.

Partnership ads allow advertisers to run ads with creators, brands, and other businesses. The advertiser and partner accounts are featured in the ad’s header and the ads leverage signals from both accounts for improved ranking and incremental performance.

Creators or partners must have a [professional account on Instagram](https://help.instagram.com/502981923235522) to use partnership ads and must meet our [eligibility requirements for Instagram partnership ads and branded content](https://www.facebook.com/business/help/271168173406325) and [Facebook partnership ads](https://www.facebook.com/business/help/271168173406325).

Through the partnership ads account level permissions APIs, advertisers can manage partnership ad relationships with their partners at the account level and run partnership ads without additional permissions at the content level.

**Note:** If two Instagram or Facebook accounts are owned by the same business and an employee has ads access to both assets, they will be able to run partnership ads without partnership ad permissions.

If an account level permission does not exist between the advertiser and the partner (See [Post-Level Permissioning](#post-level-permissioning) for more information):

- Use a partnership ad code to create an ad using the ads creation APIs
- Request creators to give advertisers permission to promote their organic branded content posts as partnership ads (applicable to only organic branded content posts).

### Before You Start

You will need:

- The ID for the [Instagram Professional account](https://www.facebook.com/business/help/502981923235522) for your brand
- The username for the [Instagram Professional account](https://www.facebook.com/business/help/502981923235522) (Instagram handle) - Optional
- A Page access token requested from a person who can perform the `ADVERTISE` task on the Page linked to the Instagram Professional account
- The following permissions:
  - `ads_management`
  - `business_management`
  - `instagram_basic`
  - `instagram_branded_content_ads_brand`
  - `pages_read_engagement`
  - `pages_show_list`
- To get media and create ads on behalf of an Instagram Professional Account that you do not own or administer, you will need [Advanced Access](https://developers.facebook.com/docs/development/release/access-levels#advanced-access) for all permissions
- In order to create ads, the advertiser would need `create_ads` permissions on the IG account that is creating the ad
- The creator must have approved partnership ads account level permissions in order for the ad to deliver
- If the advertiser publishes the ad without existing permissions, the ad would be published, but in a pending delivery state. The creator would receive a permission request from the brand to approve the permissions. Once approved, the ad would begin delivering.

### Requirements

The creator of the branded content must have enabled the media for ads creation

**OR**

The brand has approved the account level permission with the creator

### Create Partnership Ads by Boosting an Existing Post

Branded content ads are now called **partnership ads**.

Advertisers can now boost more types of organic Instagram content as partnership ads, including branded content with the paid partnership label, Instagram Collab posts, @mentions, people tags, product tags, and other content without the paid partnership label, but advertisers can still use the ad code or an existing media ID to create partnership ads for all types of contents.

This document shows you how to:

- [Fetch branded content media](#fetch-the-branded-content-media)
- [Fetch creator content recommendations that Meta predicts will be the best performing partnership ads for objectives](#fetch-creator-content-recommendations)
- [Create partnership ads using the branded content media](#create-an-ad-creative)
- [Create partnership ads using the partnership ad code](#using-a-partnership-ad-code)

**Before You Start**

Review the [requirements](#requirements-2) for creating partnership ads.

**Limitations**

[Recommendations](#fetch-creator-content-recommendations) are currently only available for partnership ads posts that have explicitly used the **Paid Partnership Label**.

#### Fetch the Branded Content Media

To get all media that an advertiser is tagged in, that are available to be used in an ad, send a `GET` request to the `/<INSTAGRAM_ID>/branded_content_advertisable_medias` endpoint where the `INSTAGRAM_ID` is the ID for the Instagram Professional account for your brand.

| Name                             | Dexcription |
| :------------------------------- | :---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creator_username`               | Optional.   | To find branded content for a specific creator for the brand, include the `creator_username` field set to the username for the creator.                                                                                                                                                                                                                                                         |
| `permalinks`                     | Optional.   | An array of IG media permalinks that can be obtained from the creator that the advertiser is working with.                                                                                                                                                                                                                                                                                      |
|                                  |             | **Example:** `[‘Cw7zyQ5BdEE’,’Cw7zyQ5BdEh’]`                                                                                                                                                                                                                                                                                                                                                    |
| `only_fetch_allowlisted`         | Optional.   | Only fetch media from creators that have been allowlisted by the advertiser. **Note:** The default has been changed to `false` to allow advertisers to fetch more data and for API performance.                                                                                                                                                                                                 |
| `only_fetch_recommended_content` | Optional.   | Only fetch recommended content to boost if set to `true`. The default is `false`. **Note:** Recommended content to boost are organic partnership ads, which a brand has tagged as approved for promotion, that Meta predicts may perform well, including suggested ad campaign objectives.                                                                                                      |
| `ad_code`                        | Optional.   | The ad code shared by the creator the advertiser is working with.                                                                                                                                                                                                                                                                                                                               |
| `media_relationship`             | Optional.   | Any array of value(s) that specifies whether to fetch tagged and/or owned media. **Note:** When `media_relationship=['OWNED']`, the `creator_username`, `only_fetch_allowlisted`, and `only_fetch_recommended_content` parameters are disabled, since they are only applicable to tagged media. When `media_relationship` is specified, the `ad_code` and `permalinks` parameters are disabled. |
|                                  |             | **Values:**                                                                                                                                                                                                                                                                                                                                                                                     |
|                                  |             | `IS_TAGGED` — Fetches collaborated/branded content media where the advertiser is tagged as a collaborator or partner.                                                                                                                                                                                                                                                                           |
|                                  |             | `OWNED` — Fetches collaborated/branded content media that the advertiser owns.                                                                                                                                                                                                                                                                                                                  |

**Sample Request**

Formatted for readability.

```curl
curl -i -X GET \
  -d 'creator_username=<CREATOR_USERNAME>' \
  -d 'access_token=<PAGE_ACCESS_TOKEN>' \
  -d 'permalinks=[<’PERMALINK1’,’PERMALINK2’>]' \
  -d 'only_fetch_allowlisted=<BOOLEAN>' \
  -d 'only_fetch_recommended_content=<BOOLEAN>' \
  -d 'ad_code=<CREATOR_AD_CODE>' \
'https://graph.facebook.com/v24.0/<INSTAGRAM_ACCOUNT_ID>/branded_content_advertisable_medias?fields=eligibility_errors,owner_id,permalink,id&access_token=<ACCESS_TOKEN>,has_permission_for_partnership_ad'
```

**Sample Response**

Upon success, your app will receive a list of media containing the media id, eligibility errors (if any), permalink, if advertiser has permissions to boost the post and owner ID of the media that can be used in ads.

```json
{
 "data": [
 	{
     "eligibility_errors": [
        "Cannot use Reels containing tappable elements can't be used for ads. Choose a different post to create an ad."
      ],
      "recommended_campaign_objectives": [
        "OUTCOME_ENGAGEMENT",
        "OUTCOME_TRAFFIC",
        "OUTCOME_LEADS"
      ],
      "has_permission_for_partnership_ad":true
      "owner_id": "16502228360082",
      "permalink": "https://www.instagram.com/reel/CzboAd3R91-/",
      "id": "16502230933174"
    },
    {
      "owner_id": "90010135660647",
      "permalink": "https://www.instagram.com/p/CywLmKWu6Zs/",
      "id": "90013017840068",
      "has_permission_for_partnership_a":true
    },
    {
      "owner_id": "90010489752294",
      "permalink": "https://www.instagram.com/p/CyWe6-ExB7p/",
      "id": "90012928652981",
      "has_permission_for_partnership_ad":false
    },
    {
      "eligibility_errors": [
        "Can’t use GIF stickersRemove or choose a different sticker."
      ],
      "owner_id": "90010135660647",
      "permalink": "https://www.instagram.com/reel/CyEb6q4OuoN/",
      "id": "90012872006248"
    },
  ...
 ],
 "paging": {
    "cursors": {
      "before": "QVFIUkR6amZAhLVVVWGpfTlRBenRsOUJCQ3lR==",
      "after": "QVFIUlhBX1hoQzI4SkVFaTRoeEpTdEpJMFdIUh=="
    }}
}
```

#### Fetch creator content recommendations

The API responds to a `only_fetch_recommended_content` request with `recommended_campaign_objectives`. When reviewing recommendations, remember that different ad objectives have distinct recommendations.

To help you understand the mapping, here is a breakdown of the equivalent campaign objectives in Ads Manager:

| Ads Manager Campaign Objectives | Recommended for impressions |
| :------------------------------ | :-------------------------- |
| `OUTCOME_AWARENESS`             |                             |
| Recommended for engagement      | `OUTCOME_ENGAGEMENT`        |
| `OUTCOME_TRAFFIC`               |                             |
| `OUTCOME_LEADS`                 |                             |
| Recommended for conversion      | `OUTCOME_APP_PROMOTION`     |
| `OUTCOME_SALES`                 |                             |

**Note:** The same content is eligible to be recommended for multiple objectives.

You may encounter content without any associated recommendations. This could be due to the following reasons:

- Recommendations require a 3-day lag to generate, allowing organic engagement metrics to stabilize.
- Recommendations are only available for content published within the last 60 days.

If no recommendations are available, there will be no associated information displayed.

#### Owned and tagged media

Use the `media_relationship` parameter to fetch the owned and tagged media of an Instagram account.

**Example requests**

**Fetch all tagged media of a specific Instagram account**

```curl
curl -i -X GET \
  -F 'media_relationship=["IS_TAGGED"]' \
  -F 'access_token=<ACCESS_TOKEN>' \
'https://graph.facebook.com/v24.0/<INSTAGRAM_ACCOUNT_ID>/branded_content_advertisable_medias'
```

**Fetch all owned media of a specific Instagram account**

```curl
curl -i -X GET \
  -F 'media_relationship=["OWNED"]' \
  -F 'access_token=<ACCESS_TOKEN>' \
'https://graph.facebook.com/v24.0/<INSTAGRAM_ACCOUNT_ID>/branded_content_advertisable_medias'
```

**Fetch all owned and tagged media of a specific Instagram account**

```curl
curl -i -X GET \
  -F 'media_relationship=["OWNED","IS_TAGGED"]' \
  -F 'access_token=<ACCESS_TOKEN>' \
'https://graph.facebook.com/v24.0/<INSTAGRAM_ACCOUNT_ID>/branded_content_advertisable_medias'
```

**Fetch tagged media, filtered to only return media by the specified creator, and all owned media**

```curl
curl -i -X GET \
  -F 'creator_username=<CREATOR_USERNAME>' \
  -F 'media_relationship=["OWNED","IS_TAGGED"]' \
  -F 'access_token=<ACCESS_TOKEN>' \
'https://graph.facebook.com/v24.0/<INSTAGRAM_ACCOUNT_ID>/branded_content_advertisable_medias'
```

### Create an Ad Creative

| Name                        | Description                   |
| :-------------------------- | :---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `object_id`                 | `int`                         | Facebook Page ID for the brand.                                                                                                                                                                  |
| `object_story_id`           | `string`                      | A combination of the Creator's FB Delegate Page ID and Post ID delimited by an `_`. To be used only for creating ads from Facebook content.                                                      |
|                             |                               | Eg: `"<CREATOR_PAGE_ID>_<CREATOR_POST_ID>"`                                                                                                                                                      |
| `branded_content`           | `JSON object`                 | Object containing information about the partnership ad.                                                                                                                                          |
|                             |                               | Use `instagram_boost_post_access_token` when using a partnership ad code to create the ad.                                                                                                       |
|                             |                               | The `ad_format` parameter sets the identities to display in the ad.                                                                                                                              |
|                             |                               | **Values:**                                                                                                                                                                                      |
|                             |                               | `1` (default): Renders both provided identities. This is the default value if nothing is passed in.                                                                                              |
|                             |                               | `2`: Renders only the first identity provided.                                                                                                                                                   |
|                             |                               | `3`: Allows the system to automatically optimize for the most performant option between between single identity (2) and dual identity (1). **Note:** This currently only optimizes on Instagram. |
| `facebook_branded_content`  | `JSON object`                 | Object containing the required parameters for Facebook partnership ads.                                                                                                                          |
| `instagram_branded_content` | `JSON object`                 | Object containing the required parameters for Instagram partnership ads.                                                                                                                         |
| `source_instagram_media_id` | `numeric string` or `integer` | Instagram media ID to use in the ad. Use this parameter when using an Instagram post to create the ad.                                                                                           |

#### Using the Instagram Media ID

To create ads, you will use the [Marketing API](https://developers.facebook.com/docs/marketing-api) as you normally would for ads creation.

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint with the `object_id` field set to the ID for the Facebook Page for your brand and the `source_instagram_media_id` field set to the ID for the Instagram Post for the branded content you want to use in your ad.

- **Request**

  Formatted for readability.

  ```curl
  curl -X POST \
    -F 'object_id=<PAGE_ID>' \
    -F 'source_instagram_media_id=<IG_MEDIA_ID>' \
    -F 'access_token=<ACCESS_TOKEN>' \
    -F 'facebook_branded_content={
      "sponsor_page_id": "<ADVERTISER_FB_PAGE_ID>"
    }' \
    -F 'instagram_branded_content={
      "sponsor_id": "<ADVERTISER_IG_ID>"
    }' \
    -F 'branded_content={
      "ad_format": "<AD_FORMAT_TYPE>"
    }' \'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives'
  ```

- **Response**

  Upon success, your app will receive an ID for the ad creative.

  ```json
  {
    "id": "<CREATIVE_ID>"
  }
  ```

#### Using the Facebook Post ID

Ads can similarly be created from facebook posts with some minor changes to the API payload. Instead of the `source_instagram_media_id`, facebook content requires the `object_story_id` which is a combination of the creator's FB profile, post IDs.

- **Request**

  Formatted for readability.

  ```curl
  curl -X POST \
    -F 'object_story_id="<CREATOR_PAGE_ID>_<CREATOR_POST_ID>' \
    -F 'access_token=<ACCESS_TOKEN>' \
    -F 'facebook_branded_content={
      "sponsor_page_id": "<ADVERTISER_FB_PAGE_ID>"
    }' \
    -F 'instagram_branded_content={
      "sponsor_id": "<ADVERTISER_IG_ID>"
    }' \
    -F 'branded_content'={
      "ad_format": "<AD_FORMAT_TYPE>"
    }' \
  'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives'
  ```

- **Response**

  Similarly upon success, your app will receive an ID for the ad creative.

  ```json
  {
    "id": "<CREATIVE_ID>"
  }
  ```

#### Using a Partnership Ad Code

To create ads using a Partnership Ad Code, you will use the [Marketing API](https://developers.facebook.com/docs/marketing-api) as you normally would for ads creation.

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint with the `object_id` field (creator Facebook Page ID) set to the ID for the Facebook Page for your brand and the `instagram_boost_post_access_token` given by the creator.

**Request for using Instagram Media**

These are the required fields to be passed in the API call (example in JavaScript):

```curl
curl -X POST \
  -F 'object_id=<BRAND_PAGE_ID>' \
  -F 'branded_content ={
       "instagram_boost_post_access_token": "<AD_CODE>",
       "ad_format": "<AD_FORMAT_TYPE>"
   }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  -F 'facebook_branded_content={
    "sponsor_page_id": "<ADVERTISER_FB_PAGE_ID>"
  }' \
  -F 'instagram_branded_content={
    "sponsor_id": "<ADVERTISER_IG_ID>"
  }' \'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives'
```

**Request for using Facebook Post**

```curl
curl -X POST \
  -F 'branded_content ={
       "facebook_boost_post_access_token" : "<AD_CODE>",
       "ad_format": "<AD_FORMAT_TYPE>"
   }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  -F 'facebook_branded_content={
    "sponsor_page_id": "<ADVERTISER_FB_PAGE_ID>"
  }' \
  -F 'instagram_branded_content={
    "sponsor_id": "<ADVERTISER_IG_ID>"
  }' \'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives'
```

- **Response**

  Upon success, your app will receive an ID for the ad creative.

  ```json
  {
    "id": "<CREATIVE_ID>"
  }
  ```

### Create an Ad

Next, you will use the ad creative, to create the ad.

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/ads` endpoint with the `name` field set to the name for your ad, the `adset_id` field set to the ID for your ad set, the `creative` field with the `creative_id` parameter set to the ID for your ad creative, and the `status` intially set `PAUSED`.

This will work for ad creatives created from both Instagram media and Facebook posts.

- **Request**

  ```curl
  curl -X POST \
    -F 'name": "Ad Name"' \
    -F 'adset_id: <ADSET_ID>' \
    -F 'creative: {"creative_id": <CREATIVE_ID>}' \
    -F 'status: "PAUSED"' \
    -F 'access_token=<ACCESS_TOKEN>' \'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads'
  ```

- **Response**

  Upon success, your app will receive an ID for the ad.

  ```json
  { "id": "<AD_ID>" }
  ```

You can use this ad ID to publish your ad.

### Troubleshooting

#### Uploading an Instagram Video to Facebook

If you are working on boosting video media, you might encounter the error "Instagram Video Must Be Uploaded To Facebook".

If you have the partnership ad code, you may leverage the following workaround using the the `partnership_ad_ad_code` parameter to upload the video asset to the Facebook video ad library, instead of resorting to source file information:

- `partnership_ad_ad_code` – Partnership ad code (numerical). Use this parameter to include a partnership ad code, bypassing the need to know source file information.
- `is_partnership_ad` – \[Optional] Use this parameter to identify that the ad will be a partnership ad.

```curl
curl -X POST \
  -F 'source_instagram_media_id=<MEDIA-ID>' \
  -F 'partnership_ad_ad_code=<PARTNERSHIP_AD_AD_CODE>' \
  -F 'is_partnership_ad=true' \'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/advideos'
```

Upon success, your app will receive an ID for the video.

```json
{
  "id": "<VIDEO-ID>"
}
```

If you don't have a partnership ad code, refer to the [Ad Videos](https://developers.facebook.com/docs/marketing-api/guides/video-ads/ad-videos/) documentation.

## Create Partnership Ads by Uploading a New Creative

Branded content ads are now called **partnership ads**.

You can use branded content media, such as a post tagged as branded content by a creator, to create partnership ads using the Marketing API. This document shows you how to:

- [Create Partnership Ads by uploading a new creative](#upload-a-new-creative)
- [Creating an Ad with Advertiser as the primary identity and Creator as secondary identity](#creating-an-ad-with-the-advertiser-as-the-primary-identity)
- [Creating an Ad with Creator as the primary identity and Advertiser as secondary identity](#creating-an-ad-with-the-creator-as-the-primary-identity)

### Before You Start

Review the [requirements](#requirements-2) for creating partnership ads.

### Upload a New Creative

Upload and manage images to later use in an ad creative. Image formats, sizes and design guidelines depend upon your type of ad; see [Ads Guide](https://www.facebook.com/business/ads-guide) and [Image Crop](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/image-crop) for more information.

To upload videos, follow the [Video API publishing guidelines](https://developers.facebook.com/docs/marketing-api/guides/video-ads/ad-videos).

### Fetch the Creator's ID

**Facebook Page ID**

A creator's Facebook Page ID can be fetched using the [Pages Search API](https://developers.facebook.com/docs/graph-api/reference/page-search).

A Page ID can also be fetched by requesting the creator to send over their FaceBook Page's ID.

Another way to obtain a Page ID is to go on to the Facebook Page and find it within the **Page Transparency** section under the Page's **About** information.

**Instagram ID**

To fetch the creator’s Instagram ID, we recommend using [Business Discovery](https://developers.facebook.com/docs/instagram-api/reference/ig-user/business_discovery).

This sample query shows how to get the creator Instagram ID of the Blue Bottle Coffee Instagram Account. Notice that business discovery queries are performed on the Instagram Business or Creator Account's ID (in this case, `17841405309211844`), not the username of the Instagram Business or Creator Account that you are attempting to get data about (`bluebottle` in this example).

- **Request**

  ```curl
  curl -i -X GET \ 
    "https://graph.facebook.com/v24.0/17841405309211844?fields=business_discovery.username(bluebottle)&access_token=<ACCESS_TOKEN>"
  ```

- **Response**

  ```json
  {
    "business_discovery": {"id": "17841401441775531" // Blue Bottle's Instagram Account ID }}
  ```

### Creating an Ad with the Advertiser as the Primary Identity

**Option 1**

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint with the `page_id` field set to the ID for the Facebook Page for your brand; you would also need to pass the `sponsor_id` (Instagram) and the `sponsor_page_id` (Facebook) fields. The fields that you enter here will be the second identity of your partnership ad.

**Note:** The Instagram actor ID will automatically be derived from the FaceBook page passed in the `object_story_spec` field.

- **Request**

  ```json
  {
    "degrees_of_freedom_spec": {
      // required field to be passed
      "creative_features_spec": {
        "standard_enhancements": {
          // required field to be passed
          "action_metadata": {
            "type": "DEFAULT"
          },
          "enroll_status": "OPT_IN"
        }
      },
      "degrees_of_freedom_type": "USER_ENROLLED_AUTOFLOW"
    },
    "facebook_branded_content": {
      "sponsor_page_id": "255033446395141" // Creator Page ID (test rithiky brand)
    },
    "instagram_branded_content": {
      "sponsor_id": "90010551992170" // Creator IG ID (test_rithiky_brand)
    },
    "object_story_spec": {
      "page_id": "110001241469329", // Advertiser Page ID (test vitaan brand new)
      "link_data": {
        "attachment_style": "link",
        "call_to_action": {
          "type": "LEARN_MORE"
        },
        "link": "www.instagram.com", // sample url
        "image_hash": "1b7a65956006e9941608b3914d3964f5" //sample image hash
      }
    }
  }
  ```

- **Response**

  ```json
  {
    "id": <CREATIVE_ID>}
  ```

- **Examples**

  Here is how the above sample request would output the ad.

  **Instagram Feed**

  ![Instagram Feed ad preview showing Advertiser as primary identity and Creator as secondary identity.](https://developers.facebook.com/docs/marketing-api/guides/partnership-ads/assets/Advertiser_Primary_IG_Feed.png)

  **Facebook Feed**

  ![Facebook Feed ad preview showing Advertiser as primary identity and Creator as secondary identity.](https://developers.facebook.com/docs/marketing-api/guides/partnership-ads/assets/Advertiser_Primary_FB_Feed.png)

**Option 2**

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint with the `page_id` field set to the ID for the Facebook Page for your brand. You can choose to only pass the `sponsor_id` (Instagram) field or the `sponsor_page_id` (Facebook) field; the fields that you enter here will be the second identity of your partnership ad. Our backend implementation will automatically update the connected FaceBook Page and deliver the same ad as seen above on both FaceBook and Instagram.

**Note:** If there is no hard link between the Instagram and Facebook accounts, the ad will not be delivered to that specific platform, if either one of the fields (`facebook_branded_content` or `instagram_branded_content`) is passed.

- **Request**

  ```json
  {...
    "facebook_branded_content": {
      "sponsor_page_id": "255033446395141" // Creator Page ID (test rithiky brand)
    } // OR
    "instagram_branded_content": {
      "sponsor_id": "90010551992170" // Creator IG ID (test_rithiky_brand)
    },...}
  ```

- **Response**

  ```json
  {
    "id": <CREATIVE_ID>}
  ```

### Creating an Ad with the Creator as the Primary Identity

To create ads, you will use the [Marketing API](https://developers.facebook.com/docs/marketing-api) as you normally would for ads creation.

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/adcreatives` endpoint with the `page_id` field set to the ID for the Facebook Page of the creator.

If the creator does not have an existing Facebook Page, we can pass the Advertiser Page ID as the `page_id` field. But one thing to note would be that the ad will not be delivered to Facebook.

**Note:** The Instagram actor ID will automatically be derived from the FaceBook Page passed in the `object_story_spec` field.

- **Request**

  ```json
  {
    "degrees_of_freedom_spec": {
      // required field to be passed
      "creative_features_spec": {
        "standard_enhancements": {
          // required field to be passed
          "action_metadata": {
            "type": "DEFAULT"
          },
          "enroll_status": "OPT_IN"
        }
      },
      "degrees_of_freedom_type": "USER_ENROLLED_AUTOFLOW"
    },
    "facebook_branded_content": {
      "sponsor_page_id": "255033446395141" // Advertiser Page ID (test vitaan brand)
    },
    "instagram_branded_content": {
      "sponsor_id": "35302227070484" // Advertiser IG ID (test_vitaan_brand)
    },
    "object_story_spec": {
      "page_id": "255033446395141", // Creator Page ID (test rithiky brand)
      "link_data": {
        "attachment_style": "link",
        "call_to_action": {
          "type": "LEARN_MORE"
        },
        "link": "www.instagram.com", // sample url
        "image_hash": "1b7a65956006e9941608b3914d3964f5" //sample image hash
      }
    }
  }
  ```

- **Response**

  ```json
  {
    "id": <CREATIVE_ID>}
  ```

- **Examples**

  Here is how the above sample request would output the ad.

  **Instagram Feed**

  ![Instagram Feed ad preview showing Creator as primary identity and Advertiser as secondary identity.](https://developers.facebook.com/docs/marketing-api/guides/partnership-ads/assets/Creator_Primary_IG_Feed.png)

  **Facebook Feed**

  ![Facebook Feed ad preview showing Creator as primary identity and Advertiser as secondary identity.](https://developers.facebook.com/docs/marketing-api/guides/partnership-ads/assets/Creator_Primary_FB_Feed.png)

### Create an Ad

Next, you will use the ad creative, to create the ad.

Send a `POST` request to the `act_<AD_ACCOUNT_ID>/ads` endpoint with the `name` field set to the name for your ad, the `adset_id` field set to the ID for your ad set, the `creative` field with the `creative_id` parameter set to the ID for your ad creative, and the `status` initially set `PAUSED`.

- **Request**

  ```curl
  curl -X POST \
    -F 'name": "My Ad's Name"' \
    -F 'adset_id: <ADSET_ID>' \
    -F 'creative: {"creative_id": <CREATIVE_ID>}' \
    -F 'status: "PAUSED"' \
    -F 'access_token=<ACCESS_TOKEN>'\  
  'https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads'
  ```

- **Response**

  Upon success, your app will receive an ID for the ad.

  ```json
  {
    "id": <AD_ID>}
  ```

You can use this ad ID to publish your ad.

## Supported Partnership Ads Configurations

The Instagram Partnership Ads API has several features to enhance the creation of partnership ads.

### Placement Asset Customization

Boost existing Instagram posts as partnership ads with [Placement Asset Customization](https://developers.facebook.com/docs/marketing-api/guides/asset-customization-rules/placement-asset-customization).

**Example request**

```curl
curl -X POST \
  -F "name=My creative title" \
  -F "object_id=<FB_PAGE_ID>" \
  -F "source_instagram_media_id=<IG_MEDIA_ID>" \
  -F "facebook_branded_content={
    "sponsor_page_id": "<FB_SPONSOR_PAGE_ID>"
  }" \
  -F "instagram_branded_content={
    "sponsor_id": "<IG_SPONSOR_ID>"
  }" \
  -F "asset_feed_spec={
    "optimization_type": "PLACEMENT",
    "asset_customization_rules": [
      {
        "image_label": {
          "name": "<IMAGE_LABEL>"
        },
        "customization_spec": {
          "publisher_platforms": [
            "instagram"
          ],
          "instagram_positions": [
            "stream"
          ]
        }
      }
    ]
    // other asset feed spec fields
  }" \
  -F "access_token=<ACCESS_TOKEN>"
"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives"
```

**Example response**

```json
{
  "id": "<CREATIVE_ID>"
}
```

### Partnership Ads with Advantage+ Creative

**Standard Enhancements**

**Example request**

```curl
curl -X POST \
  -F "name=My creative title" \
  -F "object_id=<FB_PAGE_ID>" \
  -F "source_instagram_media_id=<IG_MEDIA_ID>" \
  -F "facebook_branded_content={
    "sponsor_page_id": "<FB_SPONSOR_PAGE_ID>"
  }" \
  -F "instagram_branded_content={
    "sponsor_id": "<IG_SPONSOR_ID>"
  }" \
  -F "degrees_of_freedom_spec={
    "creative_features_spec": {
      "standard_enhancements": {
        "enroll_status": "OPT_IN"
      }
    }
  }" \
  -F "access_token=<ACCESS_TOKEN>"
"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives"
```

**Example response**

```json
{
  "id": "<CREATIVE_ID>"
}
```

**Product Extensions**

**Example request**

```curl
curl -X POST \
  -F "name=Product Extension Creative" \
  -F "object_id=<PAGE_ID>" \
  -F "source_instagram_media_id=<IG_MEDIA_ID>" \
  -F "facebook_branded_content={
    "sponsor_page_id": "<FB_SPONSOR_PAGE_ID>"
  }" \
  -F "instagram_branded_content={
    "sponsor_id": "<IG_SPONSOR_ID>"
  }" \
  -F "creative_sourcing_spec={
    "associated_product_set_id": "<PRODUCT_SET_ID>"
  }" \
  -F "degrees_of_freedom_spec={
    "creative_features_spec": {
      "product_extensions": {
        "enroll_status": "OPT_IN",
        "action_metadata": {
          "type": "MANUAL"
        }
      }
    }
  }" \
  -F "access_token=<ACCESS_TOKEN>"
"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives"
```

**Example response**

```json
{
  "id": "<CREATIVE_ID>"
}
```

**Learn More**

[Product Extensions (Add Catalog Items) Features on Marketing API](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative/product-extensions)

### Partnership Ads with Advantage+ Catalog Ads

Partnership ads enable advertisers to collaborate with creators or partners, leveraging their handle to increase engagement and generate interest in the ad. Advantage+ catalog ads are a type of personalized ad that automatically shows relevant products from a catalog to viewers based on their interests and actions. This document describes

how to create a partnership ad using a Advantage+ catalog ad with either a carousel or collection format.

**Permissions**

You will need the following permissions:

- `ads_management`
- `business_management`
- `instagram_basic`
- `instagram_manage_comments`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_ads`
- `pages_manage_posts`
- `instagram_branded_content_ads_brand`

**Collection Format Only**

**Step 1: Create an Instant Experience body element with existing media as the hero asset**

The `canvas_existing_post` field takes in an existing Facebook or Instagram media ID (either a photo or video) and creates a body element with the media set as the hero asset of the element.

| Parameters             |                                                                                                   |
| :--------------------- | :------------------------------------------------------------------------------------------------ |
| `canvas_existing_post` | Uses an existing post as the hero asset for the element.                                          |
|                        | **Values:**                                                                                       |
|                        | `source_instagram_media_id` — Specifies the Instagram media that is being used as the hero asset. |
|                        | `source_facebook_post_id` — Specifies the Facebook post that is being used as the hero asset.     |

**Example requests**

**Using existing Instagram media**

```curl
curl -X POST \
  -F 'canvas_existing_post={ 
    "source_instagram_media_id":<IG_MEDIA_ID>
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

**Note:** When using an Instagram post that is a video, call the `/advideos` endpoint to ensure that the video is fully processed.

**Using existing Facebook media**

```curl
curl -X POST \
  -F 'canvas_existing_post={ 
    "source_facebook_post_id":<FB_MEDIA_ID>
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

**Step 2: Create the Instant Experience product set and footer**

Create the product set and footer as you would for any [collection ad](#product-sets).

**Step 3: Create an Instant Experience with existing media as the hero asset**

The `hero_asset_facebook_post_id` and `hero_asset_instagram_media_id` fields take in an existing Facebook or Instagram media ID and creates an Instant Experience with the media set as the hero asset of the canvas.

**Note:** If the hero asset is already set in the body element and a hero asset field is then passed in:

- If the passed-in hero asset is `null`, the body element's hero asset overrides it.
- If the passed-in hero asset is different from the body element's hero asset, you will receive an error.

| Parameters                      |                                                                     |
| :------------------------------ | :------------------------------------------------------------------ |
| `hero_asset_instagram_media_id` | Specifies the Instagram media that is being used as the hero asset. |
| `hero_asset_facebook_post_id`   | Specifies the Facebook post that is being used as the hero asset.   |

**Example requests**

**Using existing Instagram media**

```curl
curl -X POST \
  -F 'body_element_ids=[
    <BODY_ELEM_ID_1>,
    <BODY_ELEM_ID_2>,
    ...
  ]' \
  -F 'is_published=true' \
  -F 'hero_asset_instagram_media_id=<IG_MEDIA_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvases
```

**Using existing Facebook media**

```curl
curl -X POST \
  -F 'body_element_ids=[
    <BODY_ELEM_ID_1>,
    <BODY_ELEM_ID_2>,
    ...
  ]' \
  -F 'is_published=true' \
  -F 'hero_asset_facebook_post_id=<FB_MEDIA_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvases
```

**Collection and Carousel Formats**

**Create an ad creative with an existing post as the parent source**

The `parent_source_instagram_media_id` and `parent_source_facebook_post_id` fields of `branded_content` take in an existing Facebook or Instagram media ID and creates an ad creative with the media set as the parent source of the element.

| Parameters        |                                                                                                                                           |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `branded_content` | Object containing information about the partnership ad.                                                                                   |
|                   | **Values:**                                                                                                                               |
|                   | `parent_source_instagram_media_id` — Specifies the Instagram media that is being used as the parent source media shown as the intro card. |
|                   | `parent_source_facebook_post_id` — Specifies the Facebook post that is being used as the parent source media shown as the intro card.     |

**Example requests**

**Using existing Instagram media**

```curl
curl -X POST \
  ... //other parameters for the ad creative \
  -F 'branded_content={ 
    "parent_source_instagram_media_id":<IG_MEDIA_ID>
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Note:** When using an Instagram post that is a video, call the `/advideos` endpoint to ensure that the video is fully processed.

**Using existing Facebook media**

```curl
curl \
  ... //other parameters for the ad creative \
  -F 'branded_content={ 
    "parent_source_facebook_post_id":<FB_MEDIA_ID>
  }' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

**Note:** You only need to pass in `branded_content.parent_source_instagram_media_id` or `branded_content.parent_source_facebook_post_id` when using a canvas with an existing post. Whether the format is a collection or a carousel depends on other parameters passed in, which are omitted in these code samples.
