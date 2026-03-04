<\!-- Source: META-ADS-API-GUIDE.md, Lines 1061-1205 -->

# Conversions API

The Conversions API is designed to create a connection between marketing data from an advertiser’s server, website platform, mobile app, or CRM to Meta systems that optimize ad targeting, decrease cost per result and measure outcomes.

Rather than maintaining separate connection points for each data source, advertisers are able to leverage the Conversions API to send multiple event types and simplify their technology stack.

To learn more about the Conversions API, see the documentation [here](https://developers.facebook.com/docs/marketing-api/conversions-api).

# Ad Creative

Use Facebook ads with your existing customers and to reach new ones. Each guide describes Facebook ads products to help meet your advertising goals. There are several types of ad units with a variety of appearances, placement and creative options. For guidelines on ads units as creative content, see [Facebook Ads Guide](https://www.facebook.com/business/help/1288599478479574).

## Creative

An ad creative is an object that contains all the data for visually rendering the ad itself. In the API, there are different types of ads that you can create on Facebook, all listed here.

If you have a campaign with the **Page Post Engagement** Objective, you can now create an ad that promotes a post made by the page. This is considered a **Page post ad**. Page post ads require a field called `object_story_id`, which is the `id` property of a Page post. [Learn more about Ad Creative, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative).

An ad creative has three parts:

- Ad creative itself, defined by the visual attributes of the creative object
- Placement that the ad runs on
- Preview of the unit itself, per placement

To create the ad creative object, make the following call:

```curl
curl -X POST \
  -F 'name="Sample Promoted Post"' \
  -F 'object_story_id="<PAGE_ID>_<POST_ID>"' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

The response to the API call is the `id` of the creative object. Store this; you need it for the ad object:

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

## Limits

There are limits on the creative's text, image size, image aspect ratio and other aspects of the creative. See the [Ads Guide](https://www.facebook.com/business/help/1288599478479574).

## Read

In the Ads API, each field you want to retrieve needs to be asked for explicitly, except for `id`. Each object's [Reference](https://developers.facebook.com/docs/marketing-api/reference/ad-creative) has a section for reading back the object and lists what fields are readable. For the creative, it's the same fields as specified when creating the object, and `id`.

```curl
curl -G \
  -d 'fields=name,object_story_id' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<CREATIVE_ID>
```

# Placements

A placement is where your ad is shown on Facebook, such as on Feed on desktop, Feed on a mobile device or on the right column. See [Ads Product Guide](https://www.facebook.com/business/products/ads).

We encourage you to run ads across the full range of available placements. Facebook’s ad auction is designed to deliver ad impressions to the placement most likely to drive campaign results at the lowest possible cost.

The easiest way to take advantage of this optimization is to leave this field blank. You can also select specific placements in an ad set’s `target_spec`.

This example has a page post ad. The available placements are Mobile Feed, Desktop Feed and Right column of Facebook. In the API, see [Placement Options](https://developers.facebook.com/docs/marketing-api/targeting-specs/v24.0#placement). If you choose `desktopfeed` and `rightcolumn` as the `page_type`, the ad runs on Desktop Feed and Right column placements. Any ad created below this ad set has only the desktop placement.

```curl
curl -X POST \
  -F 'name=Desktop Ad Set' \
  -F 'campaign_id=<CAMPAIGN_ID>' \
  -F 'daily_budget=10000' \
  -F 'targeting={ 
    "geo_locations": {"countries":["US"]}, 
    "publisher_platforms": ["facebook","audience_network"] 
  }' \
  -F 'optimization_goal=LINK_CLICKS' \
  -F 'billing_event=IMPRESSIONS' \
  -F 'bid_amount=1000' \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adsets
```

# Preview an Ad

You preview an ad in one of two ways—with [ad preview API](https://developers.facebook.com/docs/marketing-api/ad-preview) or the ad preview plugin.

There are three ways to generate a preview with the API:

- By ad ID
- By ad creative ID
- By supplying a creative spec

Following the reference docs for the preview API, the minimum required API call is:

```curl
curl -G \
  --data-urlencode 'creative="<CREATIVE_SPEC>"' \
  -d 'ad_format="<AD_FORMAT>"' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/generatepreviews
```

The creative spec is an array of each field and value required to create the ad creative.

Currently, our ad creative call looks like this:

```curl
curl -X POST \
  -F 'name="Sample Promoted Post"' \
  -F 'object_story_id="<PAGE_ID>_<POST_ID>"' \
  -F 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/adcreatives
```

Take `object_story_id` and use it in the preview API call:

```curl
curl -G \
  -d 'creative={"object_story_id":"<PAGE_ID>_<POST_ID>"}' \
  -d 'ad_format=<AD_FORMAT>' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/generatepreviews
```

The available values for `ad_format` differ a bit from `page_types`. But, in this scenario, **Desktop Feed** and **Right column of Facebook** are selected. This requires you to make two API calls to generate the previews for each placement:

```curl
curl -G \
  -d 'creative={"object_story_id":"<PAGE_ID>_<POST_ID>"}' \
  -d 'ad_format=DESKTOP_FEED_STANDARD' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/generatepreviews
curl -G \
  -d 'creative={"object_story_id":"<PAGE_ID>_<POST_ID>"}' \
  -d 'ad_format=RIGHT_COLUMN_STANDARD' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/generatepreviews
```

The response is an iFrame that's valid for 24 hrs.
