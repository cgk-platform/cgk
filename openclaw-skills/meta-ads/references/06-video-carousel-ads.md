<\!-- Source: META-ADS-API-GUIDE.md, Lines 1206-3049 -->

# Video and Carousel Ads

You can easily create, measure, and optimize video and carousel ads on Facebook through the API. See [Facebook for Business, Carousel Ads](https://www.facebook.com/business/help/1628178667448842). For supported video formats for ads, see [Advertiser Help Center, Videos](https://www.facebook.com/business/help/1206103632737674).

## Limitations

The `video_id` must be associated with the ad account.

## Video Ads

To create a video ad in a `VIDEO_VIEWS` objective and optimize the bid for reach, follow these steps:

- Step 1: Provide ad creatives
- Step 2: Create ad campaign
- Step 3: Create an ad set
- Step 4: Create an ad

### Step 1: Provide ad creatives

Create a video ad using an existing video ID and a video uploaded to Facebook.
You will need:

- `pages_read_engagement` and `ads_management` permissions
- a video uploaded to either the `act_{ad-account-id}/advideos` endpoint

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'object_story_spec={ 
  "page_id": "<PAGE_ID>", 
  "video_data": {"image_url":"<THUMBNAIL_URL>","video_id":"<VIDEO_ID>"} 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

### Step 2: Create ad campaign

Set objective to `VIDEO_VIEWS`:

```curl
curl -X POST \
  -F 'name="Video Views campaign"' \
  -F 'objective="OUTCOME_ENGAGEMENT"' \
  -F 'status="PAUSED"' \
  -F 'special_ad_categories=[]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/campaigns
```

See [Reference: Campaign](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign), [AdObjectives in PHP](https://github.com/facebook/facebook-php-ads-sdk/blob/master/src/FacebookAds/Constants/AdObjectives.php) and [AdObjectives in Python](https://github.com/facebook/facebook-python-ads-sdk/blob/master/facebook_business/insights/helpers.py).

### Step 3: Create an ad set

If your goal is lowest cost-per-view possible, you should pair the video view campaign objective with an ad set's `optimization_goal=THRUPLAY`. You can set `bidding_event` to `IMPRESSIONS` or `THRUPLAY`, to pay per impression or per video view. See [CPV bidding](https://www.facebook.com/business/help/185800055416040).

```curl
curl \
  -F 'name=A CPV Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'daily_budget=500' \
  -F 'start_time=2024-05-06T04:45:29+0000' \
  -F 'end_time=2024-06-06T04:45:29+0000' \
  -F 'billing_event=THRUPLAY' \
  -F 'optimization_goal=THRUPLAY' \
  -F 'bid_amount=100' \
  -F 'targeting={ 
  "device_platforms": ["mobile"], 
  "geo_locations": {"countries":["US"]}, 
  "publisher_platforms": ["facebook"] 
  }' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

Cost-per-view rates are lower for ad sets with `optimization_goal=THRUPLAY` compared to CPVs from Reach and Frequency buying optimized for video views.The end date must be in the future. See [Reference: Ad Set](https://developers.facebook.com/docs/marketing-api/reference/ad-set).

### Step 4: Create an ad

Use the existing ad set and ad creative:

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

When a campaign objective is `VIDEO_VIEWS`, by default the ad gets the right tracking specs which define actions tracked for an ad. For example, video views:

`{'action.type':'video_view','post':'POST_ID','post.wall':'PAGE_ID'}`

See [Ads Manager: My Campaigns](https://www.facebook.com/ads/manager/campaigns/campaigns) and [Reference: Ad](https://developers.facebook.com/docs/marketing-api/reference/ad).

### Example Brand Awareness

To create a video ad for brand awareness, see [brand awareness blog](https://developers.facebook.com/blog/post/2015/05/29/brand-awareness-video-views/).

### Example Reach and Frequency

To extend the reach of a video to more people, use the video view campaign objective with Reach and Frequency. You will need to create a prediction, reserve it, and assign it to your ad set.

Follow the video view creation, but apply Reach and Frequency to your ad set. Specify these additional parameters:

`-F "rf_prediction_id=<RESERVATION_ID>"`

### Video for Direct Response

To encourage people to move from awareness to action, see [Video Creative in the Carousel Format](https://www.facebook.com/business/news/carousel-ads-video-support-and-more-tools-for-dynamic-ads).

- Reach people who watched a video. From awareness to affinity and consideration. See [remarketing](#remarketing).
- Engage with brand and products. Add a call-to-action to visit a specific page on your website. See [call to action](#call-to-action).

## Remarketing

Video ads remarketing provides support for advertisers to target certain custom audiences from organic or paid videos on both Facebook and Instagram. Use this feature to move people from awareness to deeper funnel objectives such as affinity and consideration. See [Research: Creative Combinations that Work](https://www.facebook.com/business/news/power-of-creative-combinations).

You need advertiser permission for the page containing a video to create an audience for that video.

For the audience, set `subtype=ENGAGEMENT`. Then write rules for the audience you want to create. Each rule has an `object_id`, such as video ID, and `event_name`. The `event_name` is one of:

- `video_watched`: the number of times your video was watched for an aggregate of at least 3 seconds, or for nearly its total length, whichever happened first.
- `video_completed`: the number of times your video was watched at 95% of its length, including watches that skipped to this point.
- `video_view_10s`: the number of times your video was watched for an aggregate of at least 10 seconds, or for nearly its total length, whichever happened first.
- `video_view_15s`: the number of times your video was watched for an aggregate of at least 15 seconds, or for nearly its total length, whichever happened first.
- `video_view_25_percent`: the number of times your video was watched at 25% of its length, including watches that skipped to this point.
- `video_view_50_percent`: the number of times your video was watched at 50% of its length, including watches that skipped to this point.
- `video_view_75_percent`: the number of times your video was watched at 75% of its length, including watches that skipped to this point.

You can combine videos to create an audience based on various videos and actions. For example, an audience could contain 3 second views from video A, and completes from video B and C.

This creates an audience from the past 14 days of 3s+ video viewers of video 1 and completed video viewers of video 2. The audience also autofills for viewers prior to audience creation with `prefill=true`.

```curl
curl \
  -F 'name=Video Ads Engagement Audience' \
  -F 'subtype=ENGAGEMENT' \
  -F 'description=Users who watched my video' \
  -F 'prefill=1' \
  -F 'rule=[ 
  {"object_id":"%video_id_1","event_name":"video_watched"}, 
  {"object_id":"%video_id_2","event_name":"video_completed"} 
  ]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/customaudiences
```

Backfill is supported for video views after October 16th, 2015.

## Call to Action

Video with Call to Action (CTA) prompts people to learn more and visit a specific page on a website. Improve performance when your primary objective is driving video views or brand awareness and your secondary objective is driving offsite clicks. You should use a video link ad for the latter. How CTAs render:

- For Mobile and Desktop, shown as part of the post. When the video is paused, it displays next to the **Resume** option.
- For Mobile, when someone clicks a video to watch in full screen, a floating CTA appears as a video overlay.
- External video link posts do not display CTAs.

You can use video with CTAs only with the following campaign objectives:

- `PAGE_LIKES`
- `LEAD_GENERATION`
- `LOCAL_AWARENESS`
- `LINK_CLICKS`
- `CONVERSIONS`
- `APP_INSTALLS`
- `VIDEO_VIEWS`
- `BRAND_AWARENESS`
- `Mobile app engagement`

See [Video expansion to Additional Objectives](https://developers.facebook.com/blog/post/2015/07/21/call-to-action-video-ads-for-more-objectives). This creates a video ad with `GET_DIRECTIONS` call to action:

```curl
curl \
  -F 'object_story_spec={ 
  "page_id": "<PAGE_ID>", 
  "video_data": { 
  "call_to_action": { 
  "type": "GET_DIRECTIONS", 
  "value": { 
  "link": "fbgeo:\/\/37.48327, -122.15033, \"1601 Willow Rd Menlo Park CA\"" 
  } 
  }, 
  "image_url": "<THUMBNAIL_URL>", 
  "link_description": "Come check out our new store in Menlo Park!", 
  "video_id": "<VIDEO_ID>" 
  } 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
   https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

## Video Metrics

### Video Post Insights, Organic

Learn more about how your videos perform on Facebook and make more informed decisions about video content. Currently we only provide metrics when someone starts watching videos. This includes video views, unique video views, the average duration of the video view, and audience retention. See where people drop off in your videos and parts people may find most interesting.

### Video Ad Insights, Paid

Use the [Ad Insights API](https://developers.facebook.com/docs/marketing-api/insights). The response contains various video metrics.

### Video Type

Retrieve video ad stats grouped by video type such as auto-play, click-to-play. Include `action_video_type` in `action_breakdowns`. Expected values for `action_video_type` are `total`, `click_to_play`, and `auto_play`.

We are currently in limited testing for the `action_video_type` option. To identify clients with the breakdown, check `CAN_USE_VIDEO_METRICS_BREAKDOWN` for the ad account.

```curl
curl -G \
  -d 'action_breakdowns=action_video_type' \
  -d 'date_preset=last_30_days' \
  -d 'fields=actions,video_avg_pct_watched_actions,video_complete_watched_actions' \
  -d 'access_token= <ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights
```

The response includes objects with `action_type` as `video_view` and contain a key `action_video_type`:

```json
{
  "data": [
    {
      "actions": [
        ...
        {
          "action_type": "video_play", 
          "value": 9898
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "total", 
          "value": 921129
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "auto_play", 
          "value": 915971
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "click_to_play", 
          "value": 5158
        }
      ], 
      "video_avg_pct_watched_actions": [
        {
          "action_type": "video_view", 
          "action_video_type": "total", 
          "value": 60.59
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "auto_play", 
          "value": 60.47
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "click_to_play", 
          "value": 80.63
        }
      ], 
      "video_complete_watched_actions": [
        {
          "action_type": "video_view", 
          "action_video_type": "total", 
          "value": 156372
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "auto_play", 
          "value": 154015
        }, 
        {
          "action_type": "video_view", 
          "action_video_type": "click_to_play", 
          "value": 2357
        }
      ], 
      "date_start": "2014-12-26", 
      "date_stop": "2015-03-25"
    }
  ], 
  "paging": {
    "cursors": {
      "before": "MA==", 
      "after": "MA=="
    }
  }}
```

See [Ad Insights API](https://developers.facebook.com/docs/marketing-api/insights).

## Carousel Ads

Get more creative real-estate in Feed and drive people to your website or mobile app to convert. Create a carousel ad two ways:

- Create an ad and unpublished page post in one call: [ad creative API](https://developers.facebook.com/docs/marketing-api/reference/ad-creative).
- Create an unpublished Page post then create an ad creative using the post (not available for video carousel).

Carousel ads is not supported for Facebook Stories.

### Create Inline

Create a carousel ad page post while creating an ad creative. Specify the page post content in `object_story_spec`, which creates an unpublished page post from `adcreatives`. See [ad creatives](https://developers.facebook.com/docs/marketing-api/reference/ad-creative). For example:

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'object_story_spec={ 
    "link_data": { 
      "child_attachments": [ 
        { 
          "description": "$8.99", 
          "image_hash": "<IMAGE_HASH>", 
          "link": "https:\/\/www.link.com\/product1", 
          "name": "Product 1", 
          "video_id": "<VIDEO_ID>" 
        }, 
        { 
          "description": "$9.99", 
          "image_hash": "<IMAGE_HASH>", 
          "link": "https:\/\/www.link.com\/product2", 
          "name": "Product 2", 
          "video_id": "<VIDEO_ID>" 
        }, 
        { 
          "description": "$10.99", 
          "image_hash": "<IMAGE_HASH>", 
          "link": "https:\/\/www.link.com\/product3", 
          "name": "Product 3" 
        } 
      ], 
      "link": "<URL>" 
    }, 
    "page_id": "<PAGE_ID>" 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

The response is a creative ID:

`{"id":"<CREATIVE_ID>"}`

### Create Post, then Ad

Create an unpublished Page post. `child_attachments` is an array of link objects. On each link object, `picture`, `name` and `description` are optional. You can post these as by the Page only with a Page access token.

```curl
curl -X GET \
  -d 'message="Browse our latest products"' \
  -d 'published=0' \
  -d 'child_attachments=[
       {
         "link": "<APP_STORE_URL>",
         "name": "Product 1",
         "description": "$4.99",
         "image_hash": "<IMAGE_HASH>"
       },
       {
         "link": "<APP_STORE_URL>",
         "name": "Product 2",
         "description": "$4.99",
         "image_hash": "<IMAGE_HASH>"
       },
       {
         "link": "<APP_STORE_URL>",
         "name": "Product 3",
         "description": "$4.99",
         "image_hash": "<IMAGE_HASH>"
       },
       {
         "link": "<APP_STORE_URL>",
         "name": "Product 4",
         "description": "$4.99",
         "image_hash": "<IMAGE_HASH>"
       }
     ]' \
  -d 'caption="WWW.EXAMPLE.COM"' \
  -d 'link="http://www.example.com/products"' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<PAGE_ID>/posts
```

Then, provide ad creative with the unpublished Page post. Use the `id` for the `object_story_id` in your ad creative.

```curl
curl -X POST \
  -F 'object_story_id="<PAGE_ID>_<POST_ID>"' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

### Create Video Carousel Ad

Video carousel ads can have 'caption' in the child attachment to customize the display URL on the end screen:

```
"child_attachments": [
 {
   "link": "https://www.facebookmarketingdevelopers.com/",
   "name": "Facebook Marketing Developers",
   "description": "Facebook Marketing Developers",
   "call_to_action": {
     "type": "APPLY_NOW",
     "value": {
      "link_title": "Facebook Marketing Developers"
     }
   },
   "video_id": "123",
   "caption": "mycustomlinkcaption.com"
  },]
```

To get child attachments details, use ID and call Graph API, [Video, Reference](https://developers.facebook.com/docs/graph-api/reference/video).

### Create Mobile App Ad

Limitations:

- Carousel mobile app ads support only one app
- Minimum of 3 images compared to 2 on non-app ad carousel ads
- Carousel mobile app ads must have a call to action
- The end card which typically displays the page's profile photo will not display for carousel mobile app ads. Note that you should specify the same app store link in each `child_attachment`. You do not have to specify the link again in the `call_to_action:{'value':{'link':... }}}`

For example, to create a carousel ad for mobile app installs:

```curl
curl -X POST \
  -F 'name="Carousel app ad"' \
  -F 'object_story_spec={
       "page_id": "<PAGE_ID>",
       "link_data": {
         "message": "My message",
         "link": "http://www.example.com/appstoreurl",
         "caption": "WWW.ITUNES.COM",
         "name": "The link name",
         "description": "The link description",
         "child_attachments": [
           {
             "link": "http://www.example.com/appstoreurl",
             "image_hash": "<IMAGE_HASH>",
             "call_to_action": {
               "type": "USE_MOBILE_APP",
               "value": {
                 "app_link": "<DEEP_LINK>"
               }
             }
           },
           {
             "link": "http://www.example.com/appstoreurl",
             "image_hash": "<IMAGE_HASH>",
             "call_to_action": {
               "type": "USE_MOBILE_APP",
               "value": {
                 "app_link": "<DEEP_LINK>"
               }
             }
           },
           {
             "link": "http://www.example.com/appstoreurl",
             "image_hash": "<IMAGE_HASH>",
             "call_to_action": {
               "type": "USE_MOBILE_APP",
               "value": {
                 "app_link": "<DEEP_LINK>"
               }
             }
           },
           {
             "link": "http://www.example.com/appstoreurl",
             "image_hash": "<IMAGE_HASH>",
             "call_to_action": {
               "type": "USE_MOBILE_APP",
               "value": {
                 "app_link": "<DEEP_LINK>"
               }
             }
           }
         ],
         "multi_share_optimized": true
       }
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

You can only publish your post as the Facebook Page associated with the mobile app. And you must use a Page access token.

```curl
curl \
  -F 'message=My description' \
  -F 'link=<APP_STORE_URL>' \
  -F 'caption=WWW.ITUNES.COM' \
  -F 'child_attachments=[ 
    { 
      "link": "<APP_STORE_URL>", 
      "image_hash": "<IMAGE_HASH_I>", 
      "call_to_action": { 
        "type": "USE_MOBILE_APP", 
        "value": {"app_link":"<DEEP_LINK_I>","link_title":"<LINK_TITLE_I>"} 
      } 
    }, 
    { 
      "link": "<APP_STORE_URL>", 
      "image_hash": "<IMAGE_HASH_I>", 
      "call_to_action": { 
        "type": "USE_MOBILE_APP", 
        "value": {"app_link":"<DEEP_LINK_I>","link_title":"<LINK_TITLE_I>"} 
      } 
    }, 
    { 
      "link": "<APP_STORE_URL>", 
      "image_hash": "<IMAGE_HASH_I>", 
      "call_to_action": { 
        "type": "USE_MOBILE_APP", 
        "value": {"app_link":"<DEEP_LINK_I>","link_title":"<LINK_TITLE_I>"} 
      } 
    }, 
    { 
      "link": "<APP_STORE_URL>", 
      "image_hash": "<IMAGE_HASH_I>", 
      "call_to_action": { 
        "type": "USE_MOBILE_APP", 
        "value": {"app_link":"<DEEP_LINK_I>","link_title":"<LINK_TITLE_I>"} 
      } 
    } 
  ]' \
  -F 'multi_share_optimized=1' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<PAGE_ID>/feed
```

Use the `id` from the response to create the `AdCreative`:

```curl
curl -X POST \
  -F 'object_story_id="<PAGE_ID>_<POST_ID>"' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

## Field Specification

This is a Carousel Ad on iOS, showing how fields described are used.

| Name                               | Description                                                                                                                                                                                                                                                    |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `child_attachments`                | **type: object** A 2-10 element array of link objects required for carousel ads. You should use at least 3 objects for optimal performance; 2 objects is for enabling lightweight integrations and using 2 objects can result in sub-optimal campaign results. |
| `child_attachments.link`           | **type: string** Link URL or app store URL attached to the post. Required.                                                                                                                                                                                     |
| `child_attachments.picture`        | **type: URL** Preview image associated with the link. 1:1 aspect ratio and a minimum of 458 x 458 px for best display. Either `picture` or `image_hash` must be specified.                                                                                     |
| `child_attachments.image_hash`     | **type: string** Hash of preview image associated with the link from your image library; use 1:1 aspect ratio and a minimum of 458 x 458 px for best display. Either `picture` or `image_hash` must be specified.                                              |
| `child_attachments.name`           | **type: string** Title of link preview. If not specified, title of the linked page used. Typically truncated after 35 characters. You should set a unique name, since Facebook interfaces show actions reported by name.                                       |
| `child_attachments.description`    | **type: string** Either a price, discount or website domain. If not specified, content from the linked page is extracted and used. Typically truncated after 30 characters.                                                                                    |
| `child_attachments.call_to_action` | **type: object** Optional call to action. See [Call To Action](#call-to-action). You do not have to specify the link again in `call_to_action:{'value':{'link':... }}}`                                                                                        |
| `child_attachments.video_id`       | **type: string** ID of the ad video. Can be used in any child-element. If specified, must also set `image_hash` or `picture`.                                                                                                                                  |
| `message`                          | **type: string** Main body of post, also called the status message.                                                                                                                                                                                            |
| `link`                             | **type: string** URL of a link to "See more". Required.                                                                                                                                                                                                        |
| `caption`                          | **type: string** URL to display in the "See more" link. Not applicable for carousel mobile app ads                                                                                                                                                             |
| `multi_share_optimized`            | **type: boolean** If set to `true`, automatically select and order images and links. Otherwise use original order of child elements. Defaults to `true`.                                                                                                       |
| `multi_share_end_card`             | **type: boolean** If set to `false`, removes the end card which displays the page icon. Default is `true`.                                                                                                                                                     |

## Per-Product Ad Statistics

Group actions for Carousel ads by each product with `actions_breakdown=['action_carousel_card_id', 'action_carousel_card_name']`. Each child_attachment has a different card ID. `action_carousel_card_id` and `action_carousel_card_name` is only for Carousel ads.

Get the following stats per card:

- `website_ctr`: available when specifying `fields=['website_ctr']`
- `app_install`, `app_use`, `apps.uses`, `credit_spent`, `mobile_app_install`, `tab_view`, `link_click`, `mobile_app_install`, `app_custom_event.*`, `offsite_conversion.*`: available when specifying `fields=['actions']`. Other actions are not available with a card breakdown.

```curl
curl -G \
  -d 'action_breakdowns=["action_type","action_carousel_card_id"]' \
  -d 'level=ad' \
  -d 'date_preset=last_30_days' \
  -d 'time_increment=all_days' \
  -d 'breakdowns=placement' \
  --data-urlencode 'filtering=[ 
    { 
      "field": "action_type", 
      "operator": "IN", 
      "value": ["link_click"] 
    } 
  ]' \
  -d 'fields=impressions,inline_link_clicks,actions,website_ctr' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights
```

Response:

```json
{...
   "website_ctr": [
      {
         "action_carousel_card_id": "1",
         "action_type": "link_click",
         "value": 51.401869158878
      },
      {
         "action_carousel_card_id": "2",
         "action_type": "link_click",
         "value": 50.980392156863
      }
   ],
   "placement": "mobile_feed",
   "date_start": "2015-05-25",
   "date_stop": "2015-05-28"}
```

You can also request `cost_per_action_type` for a breakdown of costs by action type:

```curl
curl -G \
  -d 'action_breakdowns=["action_type","action_carousel_card_name"]' \
  -d 'level=ad' \
  -d 'breakdowns=placement' \
  -d 'fields=impressions,campaign_name,cost_per_action_type' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/insights
```

Sample response:

```json
{
   "data": [
      {
         "impressions": "1862555",
         "campaign_name": "My Campaign",
         "cost_per_action_type": [
            {
               "action_carousel_card_name": "My Carousel Card 1",
               "action_type": "app_custom_event.fb_mobile_activate_app",
               "value": 0.093347346315861
            },
            {
               "action_carousel_card_name": "My Carousel Card 2",
               "action_type": "app_custom_event.fb_mobile_activate_app",
               "value": 0.38324089579301
            },
            ...
         ],
      }
   ]}
```

Carousel breakdown metrics for `action_report_time=impression` are inaccurate before June 20th, 2015.

Carousel breakdown metrics for `action_report_time=conversion` are inaccurate before July 20th, 2015.

## Placements

If you only select `right_hand_column` as your placement, you can only use a single-video or carousel format in your ad group. We do not support the video format with a only a `right_hand_column` placement selected. See [Advanced Targeting and Placement](https://www.facebook.com/business/help/1288599478479574).

For example, create an ad set with `right_hand_column` as your only placement:

```curl
curl \
  -F 'name=RHS only Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'daily_budget=500' \
  -F 'start_time=2017-11-21T15:41:36+0000' \
  -F 'end_time=2017-11-28T15:41:36+0000' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'bid_amount=100' \
  -F 'targeting={ 
    "device_platforms": ["mobile"], 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["facebook"] ,
    "facebook_positions": ["right_hand_column"] ,  
  }' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

Provide an ad creative with video:

```curl
curl \
  -F 'name=Sample Creative' \
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "video_data": {"image_url":"<THUMBNAIL_URL>","video_id":"<VIDEO_ID>"} 
  }' \
  -F 'access_token=ACCESS_TOKEN' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

Or provide a canvas ad format for ad creative:

```curl
curl \
  -F 'image_hash=<IMAGE_HASH>' \
  -F 'object_story_spec={ 
    "link_data": { 
      "call_to_action": {"type":"LEARN_MORE"}, 
      "image_hash": "<IMAGE_HASH>", 
      "link": "CANVAS_LINK", 
      "name": "Creative message" 
    }, 
    "page_id": "<PAGE_ID>" 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

If you try to create an ad with the ad set and ad creative:

```curl
curl \
  -F 'name=My Ad' \
  -F 'adset_id=<AD_SET_ID>' \
  -F 'creative={"creative_id":"<CREATIVE_ID>"}' \
  -F 'status=ACTIVE' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

In case you get an error code, you should provide a supported creative or change your targeting.

# Publishing

The Video API allows you to publish Videos and Reels on Facebook Pages.

## Requirements

To publish a video on a Page you will need:

- A Page access token requested by a person who can perform the `CREATE_CONTENT` task on the Page
- The person requesting the token must grant your app access to the following permissions via Facebook Login:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- A video handle
  - This handle is received when you upload your video file to Meta servers using the [Resumable Upload API](#upload-a-file)

## Publish a video

To publish a video send a `POST` request to the `/<PAGE_ID>/videos` endpoint with

```curl
curl -X POST \
  "https://graph-video.facebook.com/v24.0/<PAGE_ID>/videos" \
  -F "access_token=<PAGE_ACCESS_TOKEN>" \
  -F "title=<VIDEO_TITLE>" \
  -F "description=<VIDEO_DESCRIPTION>" \ 
  -F "fbuploader_video_file_chunk=<UPLOADED_FILE_HANDLE>"
```

On success, your app receives a JSON response with the Video ID.

```json
{
  "id": "<VIDEO_ID>"
}
```

## Upload a video file

The following content is from the [Resumable Upload API documentation](https://developers.facebook.com/docs/graph-api/guides/upload/#resumable-upload).

### Upload a file

The Resumable Upload API allows you to upload large files to Meta's social graph and resume interrupted upload sessions without having to start over. Once you have uploaded your file, you can publish it.

References for endpoints that support uploaded file handles will indicate if the endpoints support handles returned by the Resumable Upload API.

#### Before you start

This guide assumes you have read the [Graph API Overview](https://developers.facebook.com/docs/graph-api/overview/) and the [Meta Development guides](https://developers.facebook.com/docs/development/) and performed the necessary actions needed to develop with Meta.

You will need:

- A Meta app ID
- A file in one of the following formats:
  - `pdf`
  - `jpeg`
  - `jpg`
  - `png`
  - `mp4`
- A User access token

#### Step 1: Start an upload session

To start an upload session send a `POST` request to the `/<APP_ID>/uploads` endpoint, where `<APP_ID>` is your app's Meta ID, with the following required parameters:

- `file_name` - the name of your file
- `file_length` - file size in bytes
- `file_type` - The file's MIME type. Valid values are: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, and `video/mp4`

**Request Syntax**

Formatted for readability.

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/<APP_ID>/uploads
  ?file_name=<FILE_NAME>
  &file_length=<FILE_LENGTH>
  &file_type=<FILE_TYPE>
  &access_token=<USER_ACCESS_TOKEN>"
```

Upon success, your app will receive a JSON response with the upload session ID.

```json
{
  "id": "upload:<UPLOAD_SESSION_ID>"
}
```

#### Step 2: Start the upload

Start uploading the file by sending a `POST` request to the `/upload:<UPLOAD_SESSION_ID>` endpoint with the following `file_offset` set to `0`.

**Request Syntax**

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
  --header "file_offset: 0"
  --data-binary @<FILE_NAME>
```

You must include the access token in the header or the call will fail.

On success, your app receives the file handle which you will use in your API calls to publish the file to your endpoint.

```json
{
  "h": "<UPLOADED_FILE_HANDLE>"
}
```

**Sample Response**

```json
{
  "h": "2:c2FtcGxl..."
}
```

#### Resume an interrupted upload

If you have initiated an upload session but it is taking longer than expected or has been interrupted, send a `GET` request to the `/upload:<UPLOAD_SESSION_ID>` endpoint from Step 1.

```curl
curl -i -X GET "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
```

Upon success, your app will receive a JSON response with the `file_offset` value that you can use to resume the upload process from the point of interruption.

```json
{
  "id": "upload:<UPLOAD_SESSION_ID>"
  "file_offset": "<FILE_OFFSET>"}
```

Send another `POST` request, like the you sent in Step 2, with `file_offset` set to this `file_offset` value you just received. This will resume the upload process from the point of interruption.

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
  --header "file_offset: <FILE_OFFSET>"
  --data-binary @<FILE_NAME>
```

### Next Steps

Visit the [Video API documentation](#publishing-1) to publish a video to a Facebook Page.

# Publishing

The Video API allows you to publish Videos and Reels on Facebook Pages.

## Requirements

To publish a video on a Page you will need:

- A Page access token requested by a person who can perform the `CREATE_CONTENT` task on the Page
- The person requesting the token must grant your app access to the following permissions via Facebook Login:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- A video handle
  - This handle is received when you upload your video file to Meta servers using the [Resumable Upload API](#upload-a-file-1)

## Publish a video

To publish a video send a `POST` request to the `/<PAGE_ID>/videos` endpoint with

```curl
curl -X POST \
  "https://graph-video.facebook.com/v24.0/<PAGE_ID>/videos" \
  -F "access_token=<PAGE_ACCESS_TOKEN>" \
  -F "title=<VIDEO_TITLE>" \
  -F "description=<VIDEO_DESCRIPTION>" \ 
  -F "fbuploader_video_file_chunk=<UPLOADED_FILE_HANDLE>"
```

On success, your app receives a JSON response with the Video ID.

```json
{
  "id": "<VIDEO_ID>"
}
```

## Upload a video file

The following content is from the [Resumable Upload API documentation](https://developers.facebook.com/docs/graph-api/guides/upload/#resumable-upload).

### Upload a file

The Resumable Upload API allows you to upload large files to Meta's social graph and resume interrupted upload sessions without having to start over. Once you have uploaded your file, you can publish it.

References for endpoints that support uploaded file handles will indicate if the endpoints support handles returned by the Resumable Upload API.

#### Before you start

This guide assumes you have read the [Graph API Overview](https://developers.facebook.com/docs/graph-api/overview/) and the [Meta Development guides](https://developers.facebook.com/docs/development/) and performed the necessary actions needed to develop with Meta.

You will need:

- A Meta app ID
- A file in one of the following formats:
  - `pdf`
  - `jpeg`
  - `jpg`
  - `png`
  - `mp4`
- A User access token

#### Step 1: Start an upload session

To start an upload session send a `POST` request to the `/<APP_ID>/uploads` endpoint, where `<APP_ID>` is your app's Meta ID, with the following required parameters:

- `file_name` - the name of your file
- `file_length` - file size in bytes
- `file_type` - The file's MIME type. Valid values are: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, and `video/mp4`

**Request Syntax**

Formatted for readability.

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/<APP_ID>/uploads
  ?file_name=<FILE_NAME>
  &file_length=<FILE_LENGTH>
  &file_type=<FILE_TYPE>
  &access_token=<USER_ACCESS_TOKEN>"
```

Upon success, your app will receive a JSON response with the upload session ID.

```json
{
  "id": "upload:<UPLOAD_SESSION_ID>"
}
```

#### Step 2: Start the upload

Start uploading the file by sending a `POST` request to the `/upload:<UPLOAD_SESSION_ID>` endpoint with the following `file_offset` set to `0`.

**Request Syntax**

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
  --header "file_offset: 0"
  --data-binary @<FILE_NAME>
```

You must include the access token in the header or the call will fail.

On success, your app receives the file handle which you will use in your API calls to publish the file to your endpoint.

```json
{
  "h": "<UPLOADED_FILE_HANDLE>"
}
```

**Sample Response**

```json
{
  "h": "2:c2FtcGxl..."
}
```

#### Resume an interrupted upload

If you have initiated an upload session but it is taking longer than expected or has been interrupted, send a `GET` request to the `/upload:<UPLOAD_SESSION_ID>` endpoint from Step 1.

```curl
curl -i -X GET "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
```

Upon success, your app will receive a JSON response with the `file_offset` value that you can use to resume the upload process from the point of interruption.

```json
{
  "id": "upload:<UPLOAD_SESSION_ID>"
  "file_offset": "<FILE_OFFSET>"}
```

Send another `POST` request, like the you sent in Step 2, with `file_offset` set to this `file_offset` value you just received. This will resume the upload process from the point of interruption.

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
  --header "file_offset: <FILE_OFFSET>"
  --data-binary @<FILE_NAME>
```

# Get Facebook Videos using the Facebook Video API

This document shows you how to get Video data, such as IDs, description, and updated times, for videos published on Facebook Pages or User Feeds.

## Get Page Videos

### Before You Start

For Pages on which you are able to perform the `MANAGE` task, you will need:

- A Page access token requested by a person who can perform the `MANAGE` task on the Page
- The `pages_read_engagement` permission

For published Pages, which you are not able to perform the `MANAGE` task, you will need:

- A User access token
- The [Page Public Content Access](https://developers.facebook.com/docs/pages/access-api#page_public_content_access)

Send a `GET` request to the `/<PAGE_ID>/videos` endpoint to get a list of all videos of a Page.

```curl
curl -i -X GET "https://graph.facebook.com/&lt;PAGE_ID>/videos?access_token=&lt;PAGE_ACCESS_TOKEN>"
```

On success, your app receives the following response:

```json
{
  "data": [
    {
      "description": "Clouds",
      "updated_time": "2019-09-25T17:18:30+0000",
      "id": "2153206464921154"
    },
    {
      "updated_time": "2020-03-26T23:45:11+0000",
      "id": "2232477747039197"
    },
    ...
  ],
  "paging": {
    "cursors": {
      "before": "MjE1MzIwNjQ2NDkyMTE1NAZDZD",
      "after": "MTQwOTU5MTg4NTc2MzM0MwZDZD"
    }
  }}
```

## Get User Videos

### Before You Start

You will need:

- A User access token requested by the User who owns the video
- The `user_videos` permission

Send a `GET` request to the `/{user-id}/videos?type=uploaded` to get all videos a person has uploaded or `/{user-id}/videos?type=tagged` to get all videos a person has been tagged in.

```curl
curl -i -X GET "https://graph.facebook.com/{user-id}/videos
  ?type=uploaded
  &access_token={user-access-token}"
```

On success, your app receives the following response:

```json
{
  "data": [
    {
      "description": "Rain",
      "updated_time": "2020-05-18T20:07:47+0000",
      "id": "{video-id-1}"
    },
    {
      "updated_time": "2020-05-20T12:26:19+0000",
      "id": "{video-id-2}"
    },
    ...
  ]
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    }
  }}
```

### Limitations

By default, a `GET` request without a `type` specified will return videos a person was tagged in.

If no description is returned, the video post contained no accompanying text.

# FB Video Ads

## Prerequisites

Publishing a video to an Ad Market account requires an appropriate access token and permissions. While testing you can easily generate tokens and grant your app permissions by using the Graph API Explorer. Refer to our [Get Started guide](#get-started-with-the-marketing-api) for this.

When your app is ready for production, implement [Facebook Login](https://developers.facebook.com/docs/facebook-login) to get tokens and permissions from your app users. This guide assumes you have implemented the required components and successfully followed the Get Started guide.

For a user who can perform tasks on an ad account, you will need to implement [Facebook Login](https://developers.facebook.com/docs/facebook-login) to ask for the following permissions and receive a user access token:

- `ads_read`
- `ads_management`

If using a business system user in your API requests, note that uploading videos to business accounts is not yet supported.

Your app user must be able to perform the `CREATE_CONTENT` task on the ad account in the API requests.

## Best Practices

When testing an API call, you can include the `access_token` parameter set to your access token. However, when making secure calls from your app, use the access token class.

## Upload Video Ads

Publishing video ads involves the Resumable (non-chunking) protocol.

Only uploading videos to ad accounts is supported. Uploading videos to business accounts is not supported yet.

| Step       | API                                                      |
| :--------- | :------------------------------------------------------- |
| Initialize | `act_<PAYMENT_ACCOUNT_ID>/video_ads?upload_phase=start`  |
| Upload     | `rupload.facebook.com/video-ads-upload/v24.0/<VIDEO_ID>` |
| Status     | `/<VIDEO_ID>?fields=status`                              |
| Publish    | `act_<PAYMENT_ACCOUNT_ID>/video_ads?upload_phase=finish` |

### Video Specifications

| Property              | Specification                                                                                 |
| :-------------------- | :-------------------------------------------------------------------------------------------- |
| **File Type**         | MP4 (recommended)                                                                             |
| **Aspect Ratio**      | 16:9 (Landscape) to 9:16 (Portrait)                                                           |
| **Maximum File Size** | Up to 10 GB recommended. Larger file sizes may experience longer upload and processing times. |
| **Minimum Width**     | 1200 pixels                                                                                   |
| **Resolution**        | 1280x720 (recommended)                                                                        |
| **Frame Rate**        | 24 to 60 frames per second                                                                    |
| **Video Settings**    | Chroma subsampling 4:2:0                                                                      |
|                       | Closed GOP (2-5 seconds)                                                                      |
|                       | Compression – H.264, H.265 (VP9, AV1 are also supported)                                      |
|                       | Fixed frame rate                                                                              |
|                       | Progressive scan                                                                              |
| **Audio Settings**    | Audio bitrate – 128kbs+                                                                       |
|                       | Channels – Stereo                                                                             |
|                       | Codec – AAC Low Complexity                                                                    |
|                       | Sample rate – 48kHz                                                                           |

### Step 1: Initialize Upload Session

To initialize a video upload session, send a `POST` request to the `act_<PAYMENT_ACCOUNT_ID>/video_ads` endpoint with the `upload_phase` parameter set to `start`.

**Example Request**

```curl
curl -X POST "https://graph.facebook.com/v24.0/act_<PAYMENT_ACCOUNT_ID>/video_ads" \
  -F "upload_phase=start" \
  -F "access_token=<ACCESS_TOKEN>"
```

On success, your app receives a JSON response with the ID for the video and the Facebook URL for uploading the video. This video ID will be used in subsequent steps.

**Example Response**

```json
{
  "video_id": "<VIDEO_ID>",
  "upload_url": "https://rupload.facebook.com/video-ads-upload/v24.0/<VIDEO_ID>"
}
```

### Step 2: Upload Video

The video you want to upload can either be a local file on your device or a URL. If using a URL, it must be hosted on a public facing http/https server, such as a CDN.

#### Upload a local file

To upload a local file, send a `POST` request to the `upload_url` endpoint you received in step 1 with the following parameters:

- `offset` set to `0`
- `file_size` set to the total size in bytes of the video being uploaded

**Example Request**

```curl
curl -X POST "https://rupload.facebook.com/video-ads-upload/v24.0/<VIDEO_ID>" \
  -H "Authorization: OAuth <ACCESS_TOKEN>" \
  -H "offset: 0" \
  -H "file_size: 73400320" \
  --data-binary "@/path/to/file/my_video_file.mp4"
```

On success, your app receives a JSON response with the ID for the video and the Facebook URL for uploading the video. This video ID will be used in subsequent steps.

**Example Response**

```json
{
  "success": true
}
```

**Headers**

| Name            | Description                                                                                                                                                                                                       |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorization` | Should contain `OAuth {access-token}`                                                                                                                                                                             |
| `offset`        | The byte offset of the first byte being uploaded in this request. Generally should be set to 0, unless resuming an interrupted upload. If resuming an interrupted upload, set to the offset returned by `/status` |
| `file_size`     | The total size in bytes of the video being uploaded                                                                                                                                                               |
| `file_url`      | The url for the publicly hosted video. Supported protocols are http and https. Other protocols, and urls requiring authentication are not currently supported.                                                    |

#### Resume Interrupted File Upload

If the video upload is interrupted, it can be resumed by repeating the `POST` request with `offset` set to the `bytes_transfered` value from a `GET /status` endpoint. You can also restart the upload by setting the offset to `0`. This can be done by first retrieving the upload byte offset from the status endpoint, and then uploading the remaining bytes using the upload URL.

The `offset` header should be set to the offset/bytes_transferred value received from the status endpoint, or set to 0 to restart from the beginning of the upload. The file bytes sent in the subsequent request should start with the byte at “offset” (zero-based).

#### Upload Hosted Files

This method can be used when the video to upload is hosted on a public facing http/https server, such as a CDN.

**Example Request**

```curl
curl -X POST "https://rupload.facebook.com/video-ads-upload/v24.0/<VIDEO_ID>" \
  -H "Authorization: OAuth <ACCESS_TOKEN>" \
  -H "file_url: https://some.cdn.url/video.mp4"
```

### Step 3: Retrieve Upload Session Status (Optional)

You can retrieve the status of a publishing operation by sending a `GET` request for the `status` field on the video.

- **Host:** `graph.facebook.com`
- **Endpoint:** `/v24.0/<VIDEO_ID>?fields=status`

**Response**

The response will be a JSON object that includes a `status` field. The `status` field will include the following nested fields:

| Name               | Description                                                                                                                                                                                          |
| :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `video_status`     | The overall status of the upload and processing.                                                                                                                                                     |
| `uploading_phase`  | This structure contains information about progress through the uploading phase.The `bytes_transferred` field can be used in conjunction with the upload endpoint to resume an interrupted upload.    |
| `processing_phase` | This structure contains information about progress through the processing phase. This phase encompasses generating alternate media encodings, thumbnails, and other assets necessary for publishing. |
| `publishing_phase` | This structure contains information about progress through the publishing phase. This phase encompasses adding the video to the ad account.                                                          |

**Example Request**

```curl
curl -X GET "https://graph.facebook.com/v24.0/<VIDEO_ID>" \
  -H "Authorization: OAuth <ACCESS_TOKEN" \
  -d "fields=status"
```

**Example Response**

```json
{
  "status": {
    "video_status": "processing", // ready, processing, expired, error
    "uploading_phase": {
      "status": "in_progress", // not_started, in_progress, complete, error
      "bytes_transfered": 50002  // bytes received (also 'offset')
    },
    "processing_phase": {
      "status": "not_started"
    }
    "publishing_phase": {
      "status": "not_started",
      "publish_status": "publish",
      "publish_time": 234523452 // publish time (unix)
    }
  }
}
```

### Step 4: Publish Video to Ad Account

When you end the upload session, we will encode the video and publish it to the ad account. To end the upload session and publish your video, send a `POST` request to `video_ads` endpoint on the corresponding ad account node.

- **Host:** `graph.facebook.com`
- **Endpoint:** `/v24.0/act_<PAYMENT_ACCOUNT_ID>/video_ads`

The response will be a JSON object that indicates whether the request was successful.

| Field          | Required | Comments                                              |
| :------------- | :------- | :---------------------------------------------------- |
| `video_id`     | yes      | Values: `{video-id}` as returned from Initialize step |
| `upload_phase` | yes      | Values: `finish`                                      |

**Example Request**

```curl
curl -X POST "https://graph.facebook.com/video-ads-upload/v24.0/act_<PAYMENT_ACCOUNT_ID>/video_ads" \
  -F "upload_phase=finish" \
  -F 'video_id=<VIDEO_ID>' \
  -F "access_token=<ACCESS_TOKEN>"
```

**Example Response**

```json
{
  "success": true
}
```

## Get Video Ads

To get a list of all videos for an ad account, send a `GET` request to the `act_<PAYMENT_ACCOUNT_ID>/video_ads` endpoint where `PAYMENT_ACCOUNT_ID` is the ID for the payment account you want to view.

**Example Request**

```curl
curl -X GET "https://graph.facebook.com/v24.0/act_<PAYMENT_ACCOUNT_ID>/video_ads" \
  -F "access_token=<ACCESS_TOKEN>"
```

**Example Response**

```json
{
  "data": [
    {
      "updated_time": "unix_timestamp",
      "id": "video_id"
    }
  ]
}
```

### Filters (Optional)

| Name    | Description                                                                                       |
| :------ | :------------------------------------------------------------------------------------------------ |
| `since` | Start date/time for querying reels for a particular timestamp.                                    |
|         | **Permitted formats:**                                                                            |
|         | Epoch timestamps such as `1676057525`                                                             |
|         | Dates such as `dd mmm yyyy` (10 jan 2023), `yyyy-mm-dd` (2023-01-10), `dd-mmm-yyyy` (10-jan-2023) |
|         | Words like `today`, `yesterday`, etc.                                                             |
| `until` | End date/time for querying reels for a particular timestamp.                                      |
|         | **Permitted formats:**                                                                            |
|         | Epoch timestamps such as `1676057525`                                                             |
|         | Dates such as `dd mmm yyyy` (10 jan 2023), `yyyy-mm-dd` (2023-01-10), `dd-mmm-yyyy` (10-jan-2023) |
|         | Words like `today`, `yesterday`, etc.                                                             |

# Collection Ads

The collection ad format includes an Instant Experience and makes it easier for people to discover, browse, and purchase products and services from their mobile device in a visual and immersive way. The in-feed ad will feature three products under a hero image or video that opens into a full-screen Instant Experience when someone interacts with your ad.

You can create an ad with the collection format by building an Instant Experience. Start with a template or choose your own customized layout.

You can also include Facebook's ad creation user interfaces for the collection format in your website using the [JavaScript SDK](https://developers.facebook.com/docs/javascript) to create a [Collections Ads Dialog](#collection-ads-dialog).

To create collections used in Shops or to add metadata to a product set, see [Commerce Platform: Product Set Collection API](https://developers.facebook.com/docs/commerce_platforms/reference/product_set_collection).

Consider all references of "Canvas" to represent Instant Experience as Canvas is the previous name for this format.

## Supported Objectives and Placements

**Objectives**

You can use collection ads with the following objectives:

- Traffic
- Conversions
- Product Catalog Sales (Supported when you use collections with a product set.)
- Store Visits (Supported when you use collections with a product set.)
- Brand Awareness
- Reach

For Traffic and Conversions objectives, you can also use slideshow videos. See [How to choose the right ad objective in Meta Ads Manager](https://www.facebook.com/business/help/1638361099719361) for more information.

**Placements**

The following placements are supported:

- Facebook Feed
- Facebook Reels
- Instagram Feed
- Instagram Stories

For more information about placements, see [About ad placements across Meta technologies](https://www.facebook.com/business/help/105436669809983) and [Available ad placements and ad formats by ad objectives](https://www.facebook.com/business/help/1701355410141643).

## Standard Collection Ads Creatives

You can use a template as a quick way to create an Instant Experience for a specific business goal. The layout for each template is fixed; however, you can replace the default content with your own images, videos, products, text and links.

There are two types of collection ads with Instant Experiences: image-based and video-based, depending on the asset you provide. Once you have an ad creative, you can create an ad.

### Create an Image-Based Ad Creative

```curl
curl 
  -F 'name=Instant Experiences Collection Sample Image Creative' 
  -F 'object_story_spec={ 
    "link_data": {
      "link": "https://fb.com/canvas_doc/<ELIGIBLE_CANVAS_ID>", 
      "message": "<AD_MESSAGE>", 
      "name": "<NAME>", 
      "picture": "<IMAGE_URL>", 
      "collection_thumbnails": [
        {"element_crops": {"100x100": [[0, 0], [100, 100]]},"element_id": "<PHOTO_ELEMENT_WITH_PRODUCT_TAGS_ID>",},
        {"element_child_index": 0,"element_id": "",},
        {"element_child_index": 1,"element_id": "<PRODUCT_LIST_ELEMENT_ID>",},
      ],
    }, 
    "page_id": "<PAGE_ID>" 
  }' 
  -F 'access_token=<ACCESS_TOKEN>' 
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

### Create a Video-Based Ad Creative

```curl
curl 
  -F 'name=Instant Experiences Collection Sample Video Creative' 
  -F 'object_story_spec={ 
    "page_id": "<PAGE_ID>", 
    "video_data": { 
      "call_to_action": {
        "type":"LEARN_MORE",
        "value":{
          "link":"https://fb.com/canvas_doc/<ELIGIBLE_CANVAS_ID>"
        }
      }, 
      "image_url": "<IMAGE_URL>",
      "collection_thumbnails": [
        {"element_crops": {"100x100": [[0, 0], [100, 100]]},"element_id": "<PHOTO_ELEMENT_NO_PRODUCT_TAGS_ID>",},
        {"element_child_index": 0,"element_id": "<PHOTO_ELEMENT_WITH_PRODUCT_TAGS_ID>",},
        {"element_child_index": 1,"element_id": "<PRODUCT_LIST_ELEMENT_ID>",},
      ],
      "title": "<VIDEO_TITLE>", 
      "video_id": "<VIDEO_ID>" 
    } 
  }' 
  -F 'access_token=<ACCESS_TOKEN>' 
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

### Parameters

| Name                    | Description |
| :---------------------- | :---------- | -------- | ----------------------------------------------------- |
| `link`                  | `string`    | Required | Redirects the viewer to an Instant Experience.        |
| `collection_thumbnails` | `array`     | Required | An array of thumbnails. Four thumbnails are required. |

**The `collection_thumbnails` fields**

| Name                  | Description      |
| :-------------------- | :--------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element_id`          | `numeric string` | Required                                                                | The Canvas photo element ID or the product list element ID. The Canvas photo needs to be associated with the Instant Experience attached to this collection ad. An image associated with this ID appears in the Instant Experience after someone clicks the ad. **Note:** A hero image element ID is invalid. |
| `element_child_index` | `integer`        | Required for a photo element with product tags and product list element | The product index from an array of photo element IDs with product tags. Or a product index from an array of `product_id_list`, which contains the product list elements. **Note:** Must be a positive integer.                                                                                                |
| `element_crops`       | `AdsImageCrops`  | Required for a photo element                                            | A JSON object defining crop dimensions for the image specified. **Note:** Only `100x100` crop key is allowed.                                                                                                                                                                                                 |

## Product Sets

Before you create a collection ad, you need to provide an ad creative and an Instant Experience. You must provide at least four elements that represent photos or products with product tags to be shown in rotation. Child photo elements in a carousel element are also valid.

The collection ad appears in Feed, and people can see more in a full-screen Instant Experience that opens when they tap on the ad.

To use a product set, you should be familiar with [Advantage+ catalog ads](https://developers.facebook.com/docs/marketing-api/guides/advantage-catalog-ads) and already have a product catalog set up.

### Create a collection ad from a product set

When you create a collection ad from a product set, you must also explicitly create an Instant Experience with the correct elements. When you use this Instant Experience in a collection ad, Meta automatically generates the collection ad.

Your Instant Experience should contain:

- An image, as either a [Canvas Photo](https://developers.facebook.com/docs/marketing-api/reference/canvas-photo), [Canvas Video](https://developers.facebook.com/docs/marketing-api/reference/canvas-video), or [Canvas Template Video](https://developers.facebook.com/docs/marketing-api/reference/canvas-template-video).
- A [product set](https://developers.facebook.com/docs/marketing-api/reference/canvas-product-set) with `show_in_feed` set to `true`.
- A [footer](https://developers.facebook.com/docs/marketing-api/reference/canvas-footer)

#### Step 1: Create the Instant Experience image

**Example requests**

**Create an Instant Experience with an image**

```curl
curl \
  -F 'canvas_photo={ 
    "photo_id": "<PHOTO_ID>", 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

**Create an Instant Experience with a video**

```curl
curl \
  -F 'canvas_video={ 
    "video_id": "<VIDEO_ID>", 
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

**Create an Instant Experience with a template video**

```curl
curl -X POST \
  -F canvas_template_video={
    "name": "Cover Image or Video",
    "bottom_padding": "0",
    "top_padding": "0",
    "product_set_id": <Product_Set_ID>,
    "template_video_spec": {
      "customization": {
        "text_color": "FFFFFF",
	      "text_background_color": "000000",
		    "name_template": "{{product.name}}",
		    "body_template": "{{product.current_price strip_zeros}}"
      },
    }
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

#### Step 2: Create the Instant Experience product set

Create a `canvas_product_set` with a `product_set_id` from your product catalog. You must set `show_in_feed` to `true` to create a collection ad.

**Example request**

```curl
curl -X POST \
  -F 'canvas_product_set={ 
    "max_items": 50,
    "product_set_id": "<PRODUCT_SET_ID>",
    "item_headline": "{{product.name}}",
    "item_description": "{{product.current_price}}"
    "image_overlay_spec": {
      "overlay_template": "pill_with_text",
      "text_type": "price",
      "text_font": "dynads_hybrid_bold",
      "position": "top_left",
      "theme_color": "background_e50900_text_ffffff",
      "float_with_margin": true,
    },
    "storefront_setting": {
      "enable_sections": true,
      "customized_section_titles": [
      {
        "title_id": "popular", "customized_title": "My Populars" 
      },
      {
        "title_id": "favorites", "customized_title": "My Favorites" 
      }],
      "product_set_layout": {
        "layout_type": "GRID_3COL"
      }
    },
    "retailer_item_ids": [0, 0, 0],
    "show_in_feed": true
  }' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

**Note:** The `item_headline`, `item_description`, `image_overlay_spec`, `storefront_setting`, and `retailer_item_ids` parameters are all optional fields.

Provide any required fields in the `image_overlay_spec` parameter.

The `storefront_setting` parameter supports the `product_set_layout`, `enable_sections`, and `customized_section_titles` fields.

**The `product_set_layout` field**

| Name          | Description |
| :------------ | :---------- | --------- | ---------------------------------------------------------------- |
| `layout_type` | `string`    | Required. | How the product set will be displayed.                           |
|               |             |           | **Values:** `GRID_2COL`, `GRID_3COL`, `CAROUSEL`, `HSCROLL_LIST` |

**The `customized_section_titles` field**

In order to use `customized_section_titles`, the `enable_sections` parameter must be set to `true`.

| Name               | Description |
| :----------------- | :---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title_id`         | `string`    | Required. | Enum string representing the default section title string that you would like to replace.                                                                                                                                                                                     |
|                    |             |           | **Values:** `keep_shopping`, `take_another_look`, `you_may_also_like`, `related_products`, `trending`, `popular`, `top_items`, `favorites`, `most_viewed`, `top_picks_for_you`, `suggested_for_you`, `featured_favorites`, `just_for_you`, `explore_more`, `shop_by_category` |
| `customized_title` | `string`    | Required. | Alternative custom string that the viewer should see as the section title.                                                                                                                                                                                                    |

#### Step 3: Create the Instant Experience footer

Create the Instant Experience footer with a link.

**Example requests**

```curl
curl \
  -F 'canvas_button={ 
    "rich_text": {
      "plain_text": "See more at www.abc.com."
    },
    "open_url_action": {
      "url": "https://www.abc.com"
    }
  }' \
 -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

You can also create a button to use in the footer.

```curl
curl \
  -F 'canvas_footer={ 
    "child_elements": <BUTTON_ELEMENT_ID>
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

#### Step 4: Create the complete Instant Experience

**Example requests**

**Basic Instant Experience**

```curl
curl -X POST \
  -F 'body_element_ids=[
    <PHOTO_OR_VIDEO_ELEMENT_ID>,
    <PRODUCT_SET_ELEMENT_ID>,
    <FOOTER_ELEMENT_ID>
  ]' \
  -F 'is_published=true' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<PAGE_ID>/canvases
```

To create the Instant Experience with a template video, product set, button, store location and optional footer, include the `source_template_id` parameter.

```curl
curl \
  -F 'body_element_ids=[
    <TEMPLATE_VIDEO_ELEMENT_ID>,
    <PRODUCT_SET_ELEMENT_ID>,
    <FOOTER_ELEMENT_ID>
  ]' \
  -F 'name="Dynamic Video Instant Experience"' \
  -F 'source_template_id="1932289657009030"' \
  -F 'is_published=true' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvases
```

For a storefront template, you need to specify `source_template_id = 1932289657009030`, it is defined in [Instance Experiences: Using templates](https://developers.facebook.com/docs/marketing-api/guides/instant-experiences/templates). The layout for each template is fixed; however, you can replace the default content with your own dynamic videos, products, text and links.

#### Step 5: Create the collection ad with the Instant Experience

If the first element of your Instant Experience is a photo, you must set `object_type` to `SHARE`.

```curl
curl \
  -F 'name=Collection Sample Image Creative' \
  -F 'object_story_spec={ 
    "link_data": { 
      "link": "https://fb.com/canvas_doc/<CANVAS_ID>", 
      "message": "<AD_MESSAGE>",
      "name": "<AD_HEADLINE>", 
    }, 
    "page_id": "<PAGE_ID>" 
  }' \
  -F 'object_type=SHARE' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

If the first element of your Instant Experience is a video, you must set `object_type` to `VIDEO`.

```curl
curl \
  -F 'name=Collection Sample Video Creative' \
  -F 'object_story_spec={ 
    "video_data": {
      "call_to_action": {
        "type":"LEARN_MORE",
        "value":{
          "link":"https://fb.com/canvas_doc/<CANVAS_ID>",
        }
      },
      "image_url": "<THUMBNAIL_IMAGE_URL>",
      "message": "<AD_MESSAGE>",
      "title": "<AD_HEADLINE>", 
    }, 
    "page_id": "<PAGE_ID>" 
  }' \
  -F 'object_type=VIDEO' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

If the first element of your Instant Experience is a template video, the request should look as follows:

```curl
curl -X POST \
  -F 'name="Dynamic Video Collection Ad"' \
  -F 'adset_id=<ADSET_ID>' \
  -F 'status=PAUSED' \
  -F 'creative={
       "object_story_spec": {
         "instagram_user_id": "<INSTAGRAM_PAGE_ID>",
         "page_id": "<MAIN_PAGE_ID>",
         "template_data":{
           "call_to_action":{
             "type":"LEARN_MORE"
           },
           "format_option":"collection_video",
           "link":"https://fb.com/canvas_doc/<CANVAS_ID>",   
           "name":"Test Dynamic Ads with dynamic video",
           "retailer_item_ids":[
             "0",
             "0",
             "0",
             "0"
           ]
         }
       },
       "object_type": "SHARE",
     }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/ads
```

**Ad previews**

You can provide an `ad_format` and User access token to generate previews based on your ad or ad creative.

```curl
curl -X GET \
  -d 'ad_format="MOBILE_FEED_STANDARD"' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<CREATIVE_ID>/previews
```

**Note:** For template video Instant Experience ads, the supported formats are `BIZ_DISCO_FEED_MOBILE`, `GROUPS_MOBILE`, `MOBILE_FEED_STANDARD`, `SUGGESTED_VIDEO_DESKTOP`, `SUGGESTED_VIDEO_MOBILE`, `WATCH_FEED_MOBILE`.

See [Ad Previews](https://developers.facebook.com/docs/marketing-api/ad-preview) for more information.

## Collection Ads Dialog

Collection ads are based on Instant Experiences with a template. Therefore, to create a collection ad using a dialog, you will use the [Instant Experiences dialog](https://developers.facebook.com/docs/marketing-api/guides/instant-experiences/dialogs) with additonal parameters. This will provide the Facebook collection ad creation UI flow in your website. For details about the UI component, see [Dialogs](https://developers.facebook.com/docs/dialogs).

To set up the Facebook SDK for JavaScript, see:

- [Quickstart guide](https://developers.facebook.com/docs/javascript/quickstart/)
- [Initialization reference](https://developers.facebook.com/docs/javascript/reference/FB.init)

The JavaScript SDK relies on the logged in user's permissions to create Instant Experiences. If the user does not have the necessary permissions to create an Instant Experience for the supplied page and business, the dialog will show an error. The user must also have access to the product catalogs and sets. In order to ensure no errors, the user must have access to the Business Manager and have permissions to create ads for the page.

Then you can trigger the collection ads dialog.

```javascript
FB.ui({         
  display: 'popup',
  method: 'instant_experiences_builder',
  account_id: 'AD_ACCOUNT_ID'.
  business_id: 'BUSINESS_ID',
  page_id: 'PAGE_ID',
  template_id: 'TEMPLATE_ID'}, function(response) {
  // callback});
```

### Settings

| Name                 | Description                                                                                                                                                                                                                                                                      |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `display`            | Required. **Value:** `popup`                                                                                                                                                                                                                                                     |
| `method`             | Required. **Value:** `instant_experiences_builder`                                                                                                                                                                                                                               |
| `account_id`         | Required. Your ad account ID.                                                                                                                                                                                                                                                    |
| `business_id`        | Required. Your business ID.                                                                                                                                                                                                                                                      |
| `page_id`            | Required. The Page ID you want to associate with the Instant Experience.                                                                                                                                                                                                         |
| `template_id`        | Required. The ID of the template you want to use.                                                                                                                                                                                                                                |
| `product_catalog_id` | Required, if `product_set_id` is provided. The ID of the product catalog to be used in the collection. **Note:** Once provided, you will not be able to change the collection in the UI. If the parameter is not provided, you can select the catalog and product set in the UI. |
| `product_set_id`     | Optional. The ID of the product set to be used in the collection. **Note:** Once provided, you will not be able to change the collection in the UI. If the parameter is not provided, you can select the catalog and product set in the UI.                                      |

All valid template types and the corresponding ID can be found in [Instant Experiences: Use a Template](https://developers.facebook.com/docs/marketing-api/guides/instant-experiences/templates).

To preview a collection ad, we recommend using the [Instant Experiences Preview Dialog](https://developers.facebook.com/docs/marketing-api/guides/instant-experiences/dialogs/#preview).

### Example response

```json
{
  "success": true,
  "id": "<CANVAS_ID>"
}
```

The `id` returned will be an unpublished Instant Experience. It needs to be published before it can be used in ad campaigns.

If there is no response or an `undefined` response is returned, it means the dialog was closed before finishing the Instant Experience set up or that the user saved the Instant Experience but did not finished it. You can query to see all the Instant Experiences that belong to a page and see if any are unfinished Instant Experiences.

## Including Destination Catalogs

You can show ad creatives from a destination catalog in a collection ad's hero image. You can also display a carousel of hotel images at that destination. To do this, you must provide a fallback image that displays at the hero image in case there is no corresponding destination for hotels in the carousel. For more information, see [Destination Catalog](https://developers.facebook.com/docs/marketing-api/guides/travel-catalog/destination-catalog).

Note these limitations:

- Video creative is not supported.
- Only the display of destination and hotel catalog images combined is supported.
- The display of other catalog combinations is not allowed.

To use this feature, add the `destination_set_id` parameter when creating your `canvas_photo` element, then follow the other standard steps to create your Instant Experience and collection ad.

**Example request**

```curl
curl -X POST \
  -F 'canvas_photo={ 
    "photo_id": "<PHOTO_ID>", 
    "destination_set_id": "<DESTINATION_SET_ID>",
  }' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<PAGE_ID>/canvas_elements
```

## Create Engagement Audiences

You can automatically create audiences for people who interacted with your collection ad. This is similar to engagement audiences for standard Instant Experiences. For more information, see [Instant Experiences, Engagement Audiences](https://developers.facebook.com/docs/marketing-api/guides/instant-experiences/engagement-audiences).

You can target your Instant Experience ads with a full-screen view for people who tapped on your collection ad. This type of audience is called a **Fullscreen Experience engagement audience**. Build this audience by creating a custom audience, set `object_id` to `CANVAS_ID`, and make a rule to track one of the events.

**Create an audience of people that opened an Instant Experience**

```curl
curl -X POST \
  -F 'name=Collection Engagement Audience' \
  -F 'description=People who opened this Instant Experience' \
  -F 'rule=[{
    "object_id":"<CANVAS_ID>",
    "event_name":"instant_shopping_document_open"
  }]' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/customaudiences
```

**Create an audience of people that clicked on a collection ad**

```curl
curl -X POST \
  -F 'name=Collection Engagement Audience' \
  -F 'description=People who clicked any links in this Instant Experience' \
  -F 'rule=[{
    "object_id":"<CANVAS_ID>",
    "event_name":"instant_shopping_element_click"
  }]' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/customaudiences
```
