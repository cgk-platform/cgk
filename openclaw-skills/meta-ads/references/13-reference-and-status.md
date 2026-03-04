<\!-- Source: META-ADS-API-GUIDE.md, Lines 16225-19959 -->

# Secure Graph API Calls

Almost every Graph API call requires an [access token](#get-an-access-token-for-ad-accounts-you-manage). Malicious developers can steal access tokens and use them to send spam from your app. Meta has automated systems to detect this, but you can help us secure your app. This document covers some of the ways you can improve security in your app.

## Meta Crawler

A number of platform services such as Social Plugins and Open Graph require our systems to be able to reach your web pages. We recognize that there are situations where you might not want these pages on the public web, during testing or for other security reasons.

We've provided information on [IP allow lists and User Agent strings for Meta's crawlers](https://developers.facebook.com/docs/sharing/webmasters/crawler) in our [Meta Crawler guide](https://developers.facebook.com/docs/sharing/webmasters/crawler).

## Login Security

There are a large number of settings you can change to improve the security of your app. Please see our [Login Security documentation](https://developers.facebook.com/docs/facebook-login/security) for a checklist of things you can do.

It's also worth looking at our [access token documentation](https://developers.facebook.com/docs/facebook-login/access-tokens) which covers various architectures and the security trade-offs that you should consider.

## Server Allow List

We also enable you to restrict some of your API calls to come from a list of servers that you have allowed to make calls. Learn more in our [login security documentation](https://developers.facebook.com/docs/facebook-login/security/#server-allow-list).

## Social Plugin Confirmation Steps

In order to protect users from unintentionally liking content around the web, our systems will occasionally require them to confirm that they intended to interact with one of our Social Plugins via a "confirm" dialog. This is expected behavior and once the system has verified your site as a good actor, the step will be removed automatically.

## Encryption

When connecting to our servers your client must use TLS and be able to verify a certificate signed using `sha256WithRSAEncryption`.

Graph API supports TLS 1.2 and 1.3 and non-static RSA cipher suites. We are currently deprecating support for older TLS versions and static RSA cipher suites. Version 16.0 no longer supports TLS versions older than 1.1 or static RSA cipher suites. This change will apply to all API versions on May 3, 2023.

## Verify Graph API Calls with appsecret_proof

[Access tokens](#get-an-access-token-for-ad-accounts-you-manage) are portable. It's possible to take an access token generated on a client by Meta's SDK, send it to a server and then make calls from that server on behalf of the client. An access token can also be stolen by malicious software on a person's computer or a man in the middle attack. Then that access token can be used from an entirely different system that's not the client and not your server, generating spam or stealing data.

Calls from a server can be better secured by adding a parameter called `appsecret_proof`. The app secret proof is a `sha256` hash of your access token, using your app secret as the key. The app secret can be found in your app dashboard in **Settings > Basic**.

If you're using the official PHP SDK, the `appsecret_proof` parameter is automatically added.

**Generate the Proof**

The following code example is what the call looks like in PHP:

`$appsecret_proof= hash_hmac('sha256', $access_token, $app_secret); `

**Add the Proof**

You add the result as an `appsecret_proof` parameter to each call you make:

```curl
curl \
  -F 'access_token=<access_token>' \
  -F 'appsecret_proof=<app secret proof>' \
  -F 'batch=[{"method":"GET", "relative_url":"me"},{"method":"GET", "relative_url":"me/friends?limit=50"}]' \
  https://graph.facebook.com
```

**Require the Proof**

To enable **Require App Secret** for all your API calls, go to the Meta App Dashboard and click **App Settings > Advanced** in the left side menu. Scroll to the **Security** section, and click the **Require App Secret** toggle.

If this setting is enabled, all client-initiated calls must be proxied through your backend where the `appsecret_proof` parameter can be added to the request before sending it to the Graph API, or the call will fail.

## Upload a file

The Resumable Upload API allows you to upload large files to Meta's social graph and resume interrupted upload sessions without having to start over. Once you have uploaded your file, you can publish it.

References for endpoints that support uploaded file handles will indicate if the endpoints support handles returned by the Resumable Upload API.

**Before you start**

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

**Step 1: Start an upload session**

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

`{ "id": "upload:<UPLOAD_SESSION_ID>"}`

**Step 2: Start the upload**

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

`{ "h": "<UPLOADED_FILE_HANDLE>"}`

**Sample Response**

`{     "h": "2:c2FtcGxl..."}`

**Resume an interrupted upload**

If you have initiated an upload session but it is taking longer than expected or has been interrupted, send a `GET` request to the `/upload:<UPLOAD_SESSION_ID>` endpoint from Step 1.

```curl
curl -i -X GET "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
```

Upon success, your app will receive a JSON response with the `file_offset` value that you can use to resume the upload process from the point of interruption.

`{ "id": "upload:<UPLOAD_SESSION_ID>"   "file_offset": "<FILE_OFFSET>"}`

Send another `POST` request, like the you sent in Step 2, with `file_offset` set to this `file_offset` value you just received. This will resume the upload process from the point of interruption.

```curl
curl -i -X POST "https://graph.facebook.com/v24.0/upload:<UPLOAD_SESSION_ID>"
  --header "Authorization: OAuth <USER_ACCESS_TOKEN>"
  --header "file_offset: <FILE_OFFSET>"
  --data-binary @<FILE_NAME>
```

**Next Steps**

Visit the [Video API documentation](#publishing-2) to publish a video to a Facebook Page.

## Publishing

The Video API allows you to publish Videos and Reels on Facebook Pages.

**Requirements**

To publish a video on a Page you will need:

- A Page access token requested by a person who can perform the `CREATE_CONTENT` task on the Page
- The person requesting the token must grant your app access to the following permissions via Facebook Login:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- A video handle
  - This handle is received when you upload your video file to Meta servers using the [Resumable Upload API](#upload-a-file)

**Publish a video**

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

`{ "id":"<VIDEO_ID>"}`

## Opportunity score and Recommendations

Opportunity score and recommendations enable advertisers to discover and implement best practices that can optimize their ad campaigns with Meta. This guide will help you understand the components of opportunity score and how to integrate them with your application.

Opportunity score is a tool for understanding how well optimized an ad account is for achieving optimal performance, and generates recommendations that could improve performance. It consists of two parts:

- **Your opportunity score (range: 0–100)** — Reflects how optimized your ad account is. A higher score indicates better optimality and a greater likelihood of improved performance over time.
  - Opportunity score is provided as a field of an ad account.
  - Opportunity score is updated in near real-time in response to campaign changes and the application of available recommendations.
- **Recommendations** – Experimentally-proven best practices that are personalized to each ad account. They may relate to your campaigns, ad sets, or ads, and have been rigorously tested to show they can deliver statistically significant performance improvements.\*
  - Implementing recommendations will improve setup and increase opportunity score
  - Recommendations have assigned point values based on how much each is expected to improve your campaign performance.\*
  - You may see recommendations related to a variety of categories including campaign objectives and goals, audience, automation, creative and placements, budget and bidding, or signals.

\*Note: Meta is frequently testing new types of recommendations on the Ads Manager Web UI. Under certain circumstances, there could be fewer recommendations returned by the API versus what is shown in Ads Manager.

By applying performance recommendations from Meta, you agree to the [Facebook Terms of Service](https://www.facebook.com/policies/terms) including your obligation to comply with the [Self-serve ad terms](https://www.facebook.com/legal/self_service_ads_terms), the [Commercial terms](https://www.facebook.com/legal/commercial_terms), and the [Facebook Advertising Policies](https://www.facebook.com/policies/ads).

## Supported Inventory and APIs

**Fetching recommendations**

To fetch all the recommendations available for your ad account, make a `GET` request to the `/act_<AD_ACCOUNT_ID>/recommendations` endpoint where `<AD_ACCOUNT_ID>` is the ID for your Meta ad account.

- **Example request**

  ```curl
  curl -G \
    -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/recommendations   
  ```

- **Example response**

      On success, your app receives a list of recommendations that Meta has generated. If this list is empty, Meta has not identified any changes that can be made to increase the ads performance in your ad account.

      ```json
      {

    "data": [
      {
        "recommendations": [
         {
           "recommendation_signature": "1234567",
           "type": "AUTOFLOW_OPT_IN",
           "object_ids": ["7656787679008", "2345678765423", ...],
           "recommendation_content": {
          "lift_estimate": "Up to 3% more Traffic",
          "body": "2 of your ad sets have similar objectives and creatives..",
          "opportunity_score_lift": "14"
          },
           "url": "https://adsmanager.facebook.com/adsmanager/...."
        }
      ],
     }
    ]...
  ```

| Parameters                 |                                                                                                                                                                                                                 |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recommendation_signature` | Unique identifier for this recommendation. Required to refer to this recommendation in the recommendation application API. For recommendations that cannot be resolved in API, this value will not be returned. |
| `type`                     | Enum value denoting what type of recommendation this is. Description of what each possible value means and what applying them entails is provided below in this documentation.                                  |
| `object_ids`               | List of ads objects that pertain to this recommendation. May be a campaign, ad set, or ad.                                                                                                                      |
| `lift_estimate`            | Describes the improvement an advertiser could see in accepting a given recommendation.                                                                                                                          |
| `body`                     | This is a description of the recommendation similar to the description that you would see in the "performance recommendation type" table of this document.                                                      |
| `opportunity_score_lift`   | This is the lift in opportunity score that would be expected from applying this recommendation.                                                                                                                 |
| `url`                      | This is the URL that links directly to the user flow in Ads Manager to apply the recommendation.                                                                                                                |

**Applying recommendations**

To apply a recommendation for your ad account, make a `POST` request to the `/act_<AD_ACCOUNT_ID>/recommendations` endpoint where `<AD_ACCOUNT_ID>` is the ID for your Meta ad account.

| Parameters                 |          |
| :------------------------- | :------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `recommendation_signature` | `string` | Required. | Signature provided in the recommendation fetching API, which corresponds to a unique recommendation. |
| `music_parameters`         | `object` | Optional. | Music recommendation parameters. Specific parameters are listed below.                               |
| `autoflow_parameters`      | `object` | Optional. | Autoflow opt-in recommendation parameters. Specific parameters are listed below.                     |
| `fragmentation_parameters` | `object` | Optional. | Fragmentation recommendation parameters. Specific parameters are listed below.                       |

| music_parameters   |                            |
| :----------------- | :------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `object_selection` | `array of numeric strings` | Optional. | A list of ad IDs to apply the music recommendation to. List must be a subset of provided IDs in `object_ids`. |

| autoflow_parameters |                            |
| :------------------ | :------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `object_selection`  | `array of numeric strings` | Optional. | A list of ad IDs to apply the autoflow opt-in recommendation to. List must be a subset of provided IDs in `object_ids`. |

| fragmentation_parameters |                            |
| :----------------------- | :------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `object_selection`       | `array of numeric strings` | Optional. | A list of ad set IDs to apply the fragmentation recommendation to. List must be a subset of provided IDs in `object_ids`. |

- **Example request**

  ```curl
  curl -X POST \
    -d 'access_token=<ACCESS_TOKEN>' \
    -d 'recommendation_signature="1234567"' \
    -d 'music_parameters={"object_selection": ["7656787679008"]}' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/recommendations   
  ```

- **Example response**

  On success, your app receives a Boolean value denoting whether the recommendation was successfully applied. If it was not successfully applied, your ad objects will remain unchanged.

  `{ "success": true}`

## Performance recommendation types

Here are the currently supported performance recommendation types and what will happen when the recommendation is applied.

| Name                                  | Description                                                                                                                                                                                                                                                                                                  |
| :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MUSIC`                               | Allow Meta to automatically select and add music to your ads, at no cost to you, based on their content.                                                                                                                                                                                                     |
|                                       | Applying this recommendation will enable this functionality for the selected ads objects. If no selection is provided, it will be enabled for all listed ads objects.                                                                                                                                        |
|                                       | Use of music in your ads is subject to the [Sound Collection Terms](https://www.facebook.com/legal/sound_collection_terms).                                                                                                                                                                                  |
| `AUTOFLOW_OPT_IN`                     | Enable standard enhancements, which leverages Meta's data to deliver different variations of your ad when likely to improve performance.                                                                                                                                                                     |
|                                       | Applying this recommendation will enable this functionality for the selected ads objects. If no selection is provided, it will be enabled for all listed ads objects.                                                                                                                                        |
| `AUTOMATIC_PLACEMENTS`                | Allow Meta to automatically select additional placements for your ad sets while making the most of your budget. Learn more about [Advantage+ Placements](https://www.facebook.com/business/help/1288599478479574).                                                                                           |
| `UNCROP_IMAGE`                        | Expand your images to fit more placements. You can use generated images that expand the aspect ratios of your media, which can fit your ad into new placements and show them to more people.                                                                                                                 |
|                                       | Applying this recommendation will enable this functionality for the selected ads objects. If no selection is provided, it will be enabled for all listed ads objects.                                                                                                                                        |
| `FRAGMENTATION`                       | Some of your ad sets have similar setups and creatives, but different audiences. As a result, they may take longer to exit the learning phase and spend more budget before performance has optimized. To optimize your ads spending, combine your similar ad sets into one ad set.                           |
|                                       | Applying this recommendation will perform the following changes:                                                                                                                                                                                                                                             |
|                                       | \* The top performing ad set will remain on, while the rest are turned off. The top performing ad set will be the one listed in `object_ids`.                                                                                                                                                                |
|                                       | \* Targeting selections from the ad sets which are turned off will be merged into top performing ad set. For example, if Ad Set 1 targeted 18-25 year olds and Ad Set 2 targeted 35-40 year olds, your combined ad set would target 18-40 year olds. Your audience changes will include: Locations included. |
|                                       | \* Ads from the ad sets which are turned off will be included in the top performing ad set.                                                                                                                                                                                                                  |
|                                       | \* Budgets from the ad sets which are turned off will be added to the budget of the top performing ad set.                                                                                                                                                                                                   |
| `CREATIVE_FATIGUE`                    | Cost per result for this ad set may be higher than ads you ran in the past because its image or ide has been show to parts of your audience too many times.                                                                                                                                                  |
|                                       | Applying this recommendation requires an ad ID and creative ID, and will create a copy of the provided ad, except with the provided new creative.                                                                                                                                                            |
| `CREATIVE_LIMITED`                    | Cost per result for this ad set may be higher than ads you ran in the past because its image or ide has been show to parts of your audience too many times.                                                                                                                                                  |
|                                       | Applying this recommendation requires an ad ID and creative ID, and will create a copy of the provided ad, except with the provided new creative.                                                                                                                                                            |
| `SIGNALS_GROWTH_CAPI`                 | By integrating the Conversions API, you can get more accurate data about the conversions from your Meta ads, which will improve audience targeting and help lower your cost per result.                                                                                                                      |
|                                       | [Get started with the Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api).                                                                                                                                                                                                  |
|                                       | **Note:** This recommendation currently cannot be applied through Marketing API.                                                                                                                                                                                                                             |
| `CAPI_PERFORMANCE_MATCH_KEY`          | Your ads performance can benefit from sending additional fields within your existing conversions reporting.                                                                                                                                                                                                  |
|                                       | Please review your Meta Pixel integration in [Events Manager](https://www.facebook.com/events_manager).                                                                                                                                                                                                      |
|                                       | **Note:** This recommendation currently cannot be applied through Marketing API.                                                                                                                                                                                                                             |
| `SCALE_GOOD_CAMPAIGN`                 | Some ad sets or campaigns have had stable delivery and a lower cost per result compared to ad sets and campaigns with the same optimization goal that you or your peers have run. Increase their budgets to further scale your results.                                                                      |
| `SHOPS_ADS`                           | Multiple ad sets in your account use the website conversion location. Help improve your ad performance by selecting website and shop for their conversion location. This lets you automatically send traffic either to your website or shop on Facebook or Instagram.                                        |
| `ADVANTAGE_PLUS_AUDIENCE`             | Leverage Advantage+ audiences to let Meta automatically identify and target the most relevant audience segments for your ad sets, optimizing your budget for maximum impact. Learn more about [Advantage+ Audiences](https://www.facebook.com/business/help/1288599478479574).                               |
| `AD_LIFT_RECALL_OPTIMIZATION_GOAL`    | Create a new awareness campaign with the performance goal **Maximize ad recall lift** to help more people remember your brand.                                                                                                                                                                               |
| `ADVANTAGE_PLUS_CATALOG_ADS`          | Create a campaign using [Advantage+ catalog](https://www.facebook.com/business/help/1288599478479574) to deliver personalized ads to new and existing interested shoppers based on their behaviors, interests, and intent.                                                                                   |
| `BACKGROUND_GENERATION`               | Help your products stand out by using AI-generated backgrounds with eligible product images to show the version thats likely to perform best.                                                                                                                                                                |
| `BUDGET_LIMITED`                      | Your current budget may be limiting the performance of your campaigns. You could get more results by increasing the budget.                                                                                                                                                                                  |
| `CAPI_CRM_GUIDANCE`                   | Connect your CRM with the Conversions API to help optimize the quality of your leads, which can lead to more conversions.                                                                                                                                                                                    |
| `CONVERSION_LEADS_OPTIMIZATION`       | Choose **Maximize number of conversion leads** as your performance goal to help lower the cost of reaching people most likely to convert.                                                                                                                                                                    |
| `CTX_CREATION_PACKAGE`                | Use a **Tailored messages** campaign to simplify campaign creation and help get more messages at the best value.                                                                                                                                                                                             |
| `CTX_HVS`                             | Duplicate your campaign as an **Engagement** campaign with **Maximize number of conversations** as the performance goal to help drive more conversations at a lower cost.                                                                                                                                    |
| `DELIVERY_ERROR`                      | None of the ad sets within this campaign are running. Each ad set has at least one error that needs to be resolved.                                                                                                                                                                                          |
| `DYNAMIC_ADVANTAGE_CAMPAIGN_BUDGET`   | Spend less of your budget on underperforming ad sets and more on ad sets with the best opportunities. You can set limits or scheduling for each ad set.                                                                                                                                                      |
| `LANDING_PAGE_VIEW_OPTIMIZATION_GOAL` | Create a campaign with the performance goal of **Maximize landing page views** to deliver ads to audiences who are most likely to visit your website.                                                                                                                                                        |
| `LEAD_ADS_GUIDANCE`                   | Lower your cost per lead and create your campaign in fewer steps using a **tailored leads** campaign, a preset with built-in best practices to help you get more leads at the best value.                                                                                                                    |
| `MESSAGING_EVENTS`                    | Set up your purchase events through WhatsApp or a messaging partner, and then select the **Maximize purchases** optimization through the **Messaging** performance goal to help lower costs.                                                                                                                 |
| `MESSAGING_PARTNERS`                  | Work with a messaging partner to help manage incoming messages, generate leads, and provide extensive analytics to optimize your conversations and conversions.                                                                                                                                              |
| `MIXED_FORMATS`                       | Use a mix of videos and images in your campaign to reach users in different ways.                                                                                                                                                                                                                            |
| `MULTI_TEXT`                          | Select more text options so they can be mixed and matched to create different versions of your ad. The version that may perform best will be shown for each placement.                                                                                                                                       |
| `OFFSITE_CONVERSION`                  | Select the **Maximize number of conversions** performance goal to help drive new customers to your website and lower your cost per result.                                                                                                                                                                   |
| `PERFORMANT_CREATIVE_REELS_OPT_IN`    | Select **Reels** placements for ads already using media that works well in Reels placements, so people are more likely to interact with them.                                                                                                                                                                |
| `PIXEL_OPTIMIZATION_HIE`              | Set up **Purchase** events with pixel, which helps deliver ads to the people most likely to convert and can lower your cost per purchase.                                                                                                                                                                    |
| `PIXEL_UPSELL`                        | Connect your website using the Meta Pixel to help improve audience targeting, better understand your conversions, and help reduce your cost per result over time.                                                                                                                                            |
| `PIXELLESS_LPV_OPTIMIZATION_GOAL`     | Update your performance goal to **Maximize number of landing page views**, which no longer requires a Meta Pixel integration, to deliver your ads to audiences who are most likely to visit your website.                                                                                                    |
| `SCALE_GOOD_CTX_CAMPAIGN`             | These messaging ad sets and campaigns have had stable delivery and better performance compared to your ad sets and campaigns with the same goals. Consider increasing their budgets to scale the results further.                                                                                            |
| `REELS_PC_RECOMMENDATION`             | Include a fullscreen vertical video (9:16) with audio in your Reels ads to improve performance.                                                                                                                                                                                                              |
| `SHOPS_ADS_SAOFF`                     | Improve your ad performance by selecting **Website and Shop** conversion location for ad sets currently using the **Website** conversion location. This lets you automatically send traffic either to your website or shop on Facebook or Instagram.                                                         |
| `UNIFIED_INBOX`                       | Answer unread customer messages within 5 hours of receipt to help increase their value.                                                                                                                                                                                                                      |
| `VALUE_OPTIMIZATION_GOAL`             | Reach people more likely to generate higher value for your business by focusing on key events across the customer journey, like **Add to cart**. Use the **Maximize value of conversions** performance goal to get started.                                                                                  |
| `WA_MESSAGING_PARTNERS`               | Work with a messaging partner to help manage incoming messages, generate leads, and provide extensive analytics to optimize your conversations and conversions.                                                                                                                                              |

# Omni Optimal Technical Setup Guide: Best Practices and Requirements

## Event Setup

An optimal event setup allows for the collection of high-quality data, which is essential for the ad system's performance. This high-quality data helps in accurately targeting and delivering ads, which can lead to better engagement, higher conversion rates, and ultimately, a better return on investment.

**Mandatory/Recommended Parameters**

This list consists of all the required/recommended event data parameters and additional data parameters advertisers need to pass back to Meta via the Meta Pixel/Conversions API to use for ads attribution and delivery optimization.

| Event Parameters                                 |     |
| :----------------------------------------------- | :-- |
| Event Name                                       |     |
| Event Time                                       |     |
| Client_user_agent (web only)                     |     |
| Action_source                                    |     |
| Event_source_url (web only)                      |     |
| Custom Data (Highly Recommended for Dynamic Ads) |     |
| Content IDs                                      |     |
| Content Type                                     |     |
| Contents                                         |     |
| Quantity                                         |     |
| Currency (mandatory for purchase events)         |     |
| Value (mandatory for purchase events)            |     |
| Customer Information Parameters                  |     |
| Email                                            |     |
| Phone Number                                     |     |
| First Name                                       |     |
| Last Name                                        |     |
| IP Address (web only)                            |     |
| User Agent (web only)                            |     |
| Fbc (web only)                                   |     |
| Fbp (web only)                                   |     |

**Note:** A full list of customer information parameters and hashing requirements can be found [here](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters).

## Event Match Quality (EMQ) and Match Rates

**EMQ Scores (Web Events Only)**

Event Match Quality (EMQ) scores are a metric used to assess the effectiveness of an advertiser's Conversions API integration in matching events to Meta users. The scores range from 1 to 10, with higher scores indicating a more effective match. Some of the highest weighted PII information parameters are:

- Email
- Phone Number
- IP Address
- User Agent
- FBP
- FBC
- First Name
- Last Name

**Offline Data Quality (ODQ) Score**

The offline data quality score evaluates how well your offline events align with Meta's advertising requirements, focusing on event coverage to enhance performance and measurement accuracy.

**How Offline Data Quality Is Calculated**

To calculate the offline data quality score, we consider factors such as data freshness, frequency and attribution:

- **Frequency:** The number of days the event is in the partitions (that is, offline events are passed to Meta) over the last 14 days.
- **Freshness:** The average time between an event occurring and an event being sent over the last 28 days.
- **Match Key Coverage:** The number of events that have certain amounts of strong match keys of email, phone, mobiles ads device ID divided by the total number of events over the last 28 days.
- **Offline Event Volume:** The number of product purchases over the last 28 days and having at least one ad connected to the data source ID in the last 28 days.
- **Offline Like:** The proportion of in-store purchases that are sent back within minutes after the impression, depicting online transaction behavior.
- **Valid Purchase Values:** Valid purchase values (purchases that have a price > 0) out of total events over the last 28 days
- **Basket Splitting:** Purchase events should not be split into multiple events (multiple items in a single purchase event are preferred). To be measured by items to purchase ratio over the last 2 days.
- **Attribution:** Whether or not your ads **Automatically Track Offline Events** for reporting.
- **Accuracy:** Whether or not you pass offline data with no errors/inconsistencies (Note: you should not pass website data as an offline event).

These factors, each weighted differently, combine to give a score out of 10.

**What the Score Means**

- **High Scores (8-10):** Indicate strong matching, effective user identification, and improved ad attribution.
- **Medium Scores (4-7):** Suggest partial matches, indicating room for improvement.
- **Low Scores (0-3):** Indicate poor matching, with most offline events not sent to Meta, reducing data quality and ad attribution.

**Checking EMQ and ODQ Scores:**

Go to **Events Manager > Select Pixel ID > Select Event Name > View Details > Event Quality**

As an alternative to Events Manager, you can use the [Integration Quality API](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/integration-quality-api) to check EMQ scores. For more about this API and how to maximize EMQ, see the documentation [here](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/integration-quality-api).

**Benefits of Offline Data Quality**

Improving offline data quality is crucial for enhancing your omnichannel ads, optimized for both online and in-store sales.

The value of offline data quality in enabling omnichannel ads.
Focusing on offline data quality is valuable for your omnichannel advertising strategy:

- **Enhanced ad performance:** High scores ensure accurate, up-to-date data for precise targeting across channels.
- **Accurate measurement:** Robust scores enable precise attribution of offline conversions, crucial for understanding ad impact and refining strategies.
- **Optimized campaigns:** Scores of 8.5 or higher allow confident use of omnichannel ads, ensuring ads reach the right audience at the right time.

**Example: Improving offline data quality in retail**

A retailer with a score of 6 out of 10 can improve by:

- **Increasing data upload frequency:** Upload data more regularly.
- **Improving data accuracy:** Reduce errors and inconsistencies
- **Enhancing attribution:** Provide all recommended match keys to maximize offline conversion measurement accuracy

Addressing these areas can boost the score, leading to better advertising results, such as increased purchases and improved targeting.

Meta provides personalized recommendations in Events Manager to improve your offline data quality score.

**Improve Offline Data Quality**

To improve your offline data quality metric:

- Upload fresh data regularly for accurate targeting and measurement.
  - Upload data daily
  - Ensure offline transaction data is not stale (older than 3 days)
- Implement robust data validation processes to minimize errors and inconsistencies.
  - Pass correct purchase prices (for example, no zero or negative values).
  - Avoid linking incorrect dataset IDs to omni campaigns. Note: Use only one offline signal source for omni campaign optimization. For measurement (ad tracking level), an advertiser can attach multiple offline signal sources, but not for ad set level optimization.
- Enable automatic tracking for offline events to accurately attribute offline conversions loads
- Monitor your data collection and processing procedures to maintain high-quality data.
- Regularly review your offline data quality scores in Events Manager and follow your personalized recommendations to improve your offline data quality score.

## Data Freshness

Prioritize sharing events in real time for better campaign optimization. Ensure there is little to no delay from when your events occur to when you share them with Meta. This will help to:

- Run ads that are better optimized by having real-time data to update your. audiences
- See the results of an ad campaign closer to real time in Meta Ads Manager.

**Website Events**

For web events, it is essential to transmit data in real-time for optimal performance. The Meta Pixel and the Conversions API are the most effective methods for sending event data in real-time.

To assess your current status, navigate to **Events Manager > Pixel ID > Event Name > View Details > Data Freshness > Website**

**Offline Events**

For offline events, it is recommended to send data as frequently as possible as it would help our algorithms to drive performance real/near realtimes. Recommendation is to pass back offline data at least daily and preferably on an hourly basis. To assess your current status, navigate to **Events Manager > Pixel ID > Event Name > View Details > Data Freshness > Offline Activity**.

## Deduplication

The Meta Pixel and the Conversions API let you share standard and custom events with us so that you can measure and optimize ad performance. The pixel lets you share web events from a web browser, while the Conversions API lets you share web events directly from your server.

If you connect website activity using both the pixel and the Conversions API, we may receive the same events from the browser and the server. If we know that the events are the same and therefore redundant, we can keep one and discard the rest. This is called deduplication.

It is highly recommended to include deduplication parameters with your events to ensure that our systems can accurately identify and process events only once. This is crucial for accurate attribution and measurement purposes.

**Web Events**

When sending redundant events using the Meta Pixel and Conversions API, ensure that both events use the identical `event_name` and that either `event_id` or a combination of `external_id` and `fbp` are included. We recommend including all of these parameters to help Meta properly deduplicate events and reduce double reporting of identical events. Maximum deduplication window is 48 hours.

**Offline Events**

Unlike deduplication set up across the Conversions API and Meta Pixel events, offline events can only be deduplicated against other offline events. We support two methods of deduplication:

- `order_id` based
- `user` based

The deduplication uses the combination of fields: `dataset_id`, `event_time`, `event_name`, `item_number`, and either `order_id` or user information as the “key field” based on method in the given event’s payload.

The default deduplication uses `order_id` with a combination of the fields above. If `order_id` is not present in the payload, the user based deduplication logic will be used. The maximum deduplication window is 7 days. You can learn more about offline event deduplication on our [developer documentation site](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/offline-events-deduplication).

It's recommended not to split your order into multiple events instead of sending one event to represent the whole order.

For example, where there are two orders with identical `event_time`, `event_name` having the same `order_id` or same set of Customer Information Parameters without `order_id`, we will consider them duplicate events and take the first event. The user-based deduplication method only works with the same Customer Information Parameters fields in the two payloads.

Another way to to maximize PII capture rate is in your store. By sending email transactions that capture PII (including receipts), you can increase the event volume to power performant optimization on Meta’s platforms.

## Event Quality

Event quality measures the correctness of the parameters in events received from event sources connected to a catalog. Low Event Quality impacts match rate, availability, and can result in longer learning phases and suboptimal campaign optimisation. Please note that these parameters are highly recommended to be passed back via Web and Offline events.

Some of the important parameters that need to be passed are:

1.  **Content IDs**

    Tell Meta the specific content ID for a product or product group. The content ID must exactly match either the product ID or the product group ID for that item in your catalog, depending which `content_type` you entered. The match indicates it's the same product or group as the one in your catalog. Example: `['123','456']`

2.  **Contents (recommended way of sending content details)**

    Tell Meta the specific content ID, which must match the product ID for that item in your catalog. If you use `contents` in your parameter, you must also include the following in a sub-object: the product id or ids, and the quantity (number of items added to cart or purchased).

    Example: `[{id: '123', quantity: 2}, {id: '456', quantity: 1}]`. This is our recommended way of passing this information back.

3.  **Content Type**

    Should be set to `product` or `product_group`:
    - Use `product` if the keys you send represent products. Sent keys could be `content_ids` or `contents`.
    - Use `product_group` if the keys you send in `content_ids` represent product groups. Product groups are used to distinguish products that are identical but have variations such as color, material, size or pattern.

4.  **Currency**

    Required for purchase events. The currency for the value specified, if applicable. Currency must be a valid ISO 4217 three-digit currency code.

5.  **Value**

    Required for purchase events. A numeric value associated with this event. Please make sure that value >= 0.

## Catalog Setup

A catalog is a container that holds information about all the items advertisers want to advertise or sell on Facebook and Instagram. Catalogs are a fundamental building block of several of our available products, including (but not limited to):

- Advantage+ Shopping Campaigns
- Collaborative ads
- Collection ads
- Carousel ads
- Shops

To ensure a quality setup for your catalog for omnichannel ads, please ensure the following areas are covered and optimal:

**Catalog Match Rates**

A catalog match occurs when an event has been matched with a product. The success rate of this is known as the catalog match rate. Optimal catalog match rates are > 90%

**Website Events**

To check catalog match rates for web events go to **Commerce Manager > Select Catalog > Events > Select datasource (dataset or app)**.

**Offline Events**

Offline events should be integrated through the API (manual uploading is available but in order to use Omnichannel Ads Beta, CAPI or OCAPI integration is required).

- **Frequency of upload:**
  - Upload data daily, at least 12 times in the previous 14 days.
  - Ensure offline transaction data is not stale (older than 3 days).
- Offline events data must be passed for the past 14 days to be eligible for Omnichannel Ads.
- Avoid basket splitting your offline events integration by ensuring you pass all items from the same transaction as the same row / basket. This ensures measurement accuracy of Average Order Value and Cost Per Purchase.

**Connecting Catalog with Dataset**

Please verify that the data source (dataset/app) is properly linked to the catalog. If not, please follow the steps below to establish a connection between the dataset/app and the catalog.

- Go to **Commerce Manager**
- Select **events**
- Click on **Manage Connections**
- Select the dataset ID/app
- Click **Save**

**Enabling Auto-Tracking for Dataset**

Auto tracking for dataset allows any future campaigns in that ad account to be automatically tracked via dataset. This is important for campaign attribution. To enable auto tracking please follow these steps.

To add dataset tracking to existing campaigns, go to ad setup and enable tracking inside tracking specs.

## Omni Audience

Omni Audience is a special targeting solution that allows advertisers to create audiences based on user activity across multiple channels.

For example, if an advertiser wants to create an audience of people who viewed a product on their website and then went to the store to purchase, it's possible using this type of audience.

**Best Practices and Requirements**

- **Match Rates:** Event match rates are crucial in determining the audience size. It is essential to have high match rates for offline events and optimal EMQ scores for web events to ensure decent audience size.
- **Data Freshness:** As Omni Audiences are created based on user actions happening across channels, getting data with less delay would make the audience more recent and accurate.

# Manage Your Ad Object's Status

Ad Campaign, Ad Set and Ads have one of following status types:

- Live
- Archived
- Deleted

For background see [Ads Developer Blog, Deleted versus Archived](https://developers.facebook.com/blog/post/2012/06/18/deleted-versus-archived-ads/).

## Live

Live ad objects can have the following status:

- `ACTIVE`
- `PAUSED`
- `PENDING_REVIEW`
- `CREDIT_CARD_NEEDED`
- `PREAPPROVED`
- `DISABLED`
- `PENDING_PROCESS`
- `WITH_ISSUES`

## Archived

Set the ad object to `ARCHIVED` by setting `status` field to `ARCHIVED`. When an object status is set to `ARCHIVED`, you can continue to query the details and stats based on the object id. However there is a maximum limit on the number of objects you can archive. So you should respect this limit and change status to `DELETED` when you no longer need an object.

An `ARCHIVED` object has only 2 fields you can change: `name` and `status`. You can also only change status to `DELETED`.

## Deleted

Set the ad object to `DELETED` by either setting `status` field to `DELETED` or sending an `HTTP DELETE` to that object. Once an object status is set to `DELETED`, you cannot set it back to `ARCHIVED`.

If you keep the deleted object ID, you can continue to retrieve stats or object details by querying the object ID. However you cannot retrieve the deleted objects as a connection object from a non deleted node or object. For example, `API_VERSION/<AD_ID>/insights` works for a deleted object but `API_VERSION/act_<AD_ACCOUNT_ID>/insights?level=ad` does not return stats for the deleted object.

After you delete an ad, it may still track impressions, clicks, and actions for 28 days after the date of last delivery. You can query insights for `DELETED` objects using the `ad.effective_status` filter.

If you have an ad set with 2 ads in it, and you delete one ad, the following 2 queries do not return the same results:

- `https://graph.facebook.com/v24.0/<AD_SET_ID>/insights`
- `https://graph.facebook.com/v24.0/<AD_ID>/insights`

The ad set returns stats for both the deleted and the non-deleted ads in it. However when you query for ads in the ad set, you only see one ad:

- `https://graph.facebook.com/v24.0/<AD_SET_ID>/ads`

To avoid this scenario, you should delete ads 28 days after their last date of delivery to ensure stats no longer change. Also you should store the stats or ids of those objects in your own system before you delete them. This recommendation is optional:

- If your application does not show the breakdown of stats, or
- You do not care if the sum of breakdowns of stats do not match that of the parent object, due to some deleted child objects.

You cannot change any field, except `name`, for a `DELETED` object.

## Manage Status

This is how you typically manage object status:

- You create ad objects, they run and start delivering
- When you delete an object, we automatically delete it
- When you reach the limit for achieved objects, you can no longer archive more objects.
- You should move archived deleted objects to the deleted state to reduce the limit.

The status on ad objects works this way for the hierarchy of ad objects:

- If the status of a campaign is set to `with_issues`, `paused`, `archived`, or `deleted` for a campaign, all the objects below it automatically inherit that status.
- If you set an ad campaign to `deleted`, you cannot retrieve the ad sets or ads below that campaign without explicitly specifying the IDs.
- If the status of an ad is set to `with_issues`, `paused`, `archived`, or `deleted`, the ad set or ad campaign containing that ad keep its original status and is available for retrieval.

The following limits apply to `ARCHIVED` objects for given ad account:

- 100,000 for Ad Campaigns
- 100,000 for Ad Sets
- 100,000 for Ads

If you read archived edges, you must specifically filter for the archived objects since we do not return them by default. If you read stats for an ad object, we include the stats of all children objects, no matter if the child is active, archived, or deleted. Therefore you need no filter for insights on child objects.

## Comparisons of Different Statuses

Objects with statuses such as `ACTIVE`, `PAUSED` differ from those with `ARCHIVED` status, and `DELETED`. Here are the major differences.

| Query                                                                                              | Live                                              | ARCHIVED                                          | DELETED                                                               |
| :------------------------------------------------------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------ | :-------------------------------------------------------------------- |
| Exists in database                                                                                 | Yes                                               | Yes                                               | Yes                                                                   |
| Maximum number per ad account                                                                      | With limits                                       | 100,000                                           | No limit                                                              |
| Query as edges without filter                                                                      | Yes                                               | No                                                | No                                                                    |
| Query as edges with status filter                                                                  | Yes for objects of status contained in the filter | Yes if status filter contains `ARCHIVED`.         | No if status filter does not contain `DELETED`, and error if it does. |
| Query by its own ID                                                                                | Yes                                               | Yes                                               | Yes                                                                   |
| Stats aggregated in `/<PARENT_OBJECT_ID>/insights`                                                 | Yes                                               | Yes                                               | Yes                                                                   |
| Stats included in the result list of `/<PARENT_OBJECT_ID>/insights?level=<OBJECT_LEVEL>`           | Yes                                               | No                                                | No                                                                    |
| Stats included in the result list of `/<PARENT_OBJECT_ID>/insights` with `delivery_info` filtering | Yes for objects of status contained in the filter | Yes for objects of status contained in the filter | No                                                                    |
| Insights shown with `/<OBJECT_ID>/insights`                                                        | Yes                                               | Yes                                               | Yes                                                                   |
| Status can be changed to                                                                           | Any valid status                                  | `DELETED`                                         | Cannot change                                                         |

To set an ad to be archived:

```curl
curl -X POST \
  -d "status=ARCHIVED" \
  -d "access_token=<ACCESS_TOKEN>" \
https://graph.facebook.com/v24.0/<AD_ID>
```

To delete an ad:

```curl
curl -X POST \
  -d "status=DELETED" \
  -d "access_token=<ACCESS_TOKEN>" \
https://graph.facebook.com/v24.0/<AD_ID>
```

To retrieve live subobjects of a live object, for example, all live ads of an ad campaign, not including `ARCHIVED` or `DELETED` ads:

```curl
curl -X GET \
  -d 'fields="name"' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<AD_CAMPAIGN_ID>/ads
```

To retrieve `ARCHIVED` subobjects of a live object, for example, all `ARCHIVED` ads of an ad set, requires the status filter:

```curl
curl -X GET \
  -d 'effective_status=[
       "ARCHIVED"
     ]' \
  -d 'fields="name"' \
  -d 'access_token=<ACCESS_TOKEN>' \
https://graph.facebook.com/v24.0/<AD_CAMPAIGN_ID>/ads
```

## Asynchronous and Batch Requests

Use asynchronous requests to create ads and send numerous ads requests without having to block. Either specify a URL to call after requests complete or check the status of the request. See [Ad, Reference](https://developers.facebook.com/docs/marketing-api/reference/ad).

The most efficient way to manage ads is via batched requests. Use it to perform some of the more common requests.

**Asynchronous Requests**

For example, get the status of the asynchronous request set:

```curl
curl -G \
  -d 'fields=name,success_count,error_count,is_completed' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>    
```

This returns the overall status for the async request set as a JSON object. Not all fields appear by default. If you want your query to include non-default fields, specify them in `fields`, such as `fields=id,owner_id,name,total_count,success_count,error_count,is_completed`.

| Name                | Description       |
| :------------------ | :---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | **type: int**     | Shown by default.     | The id of current async request set.                                                                                                    |
| `owner_id`          | **type: int**     | Shown by default.     | Which object owns this async request set. For async requests on ads, `owner_id` is the account id.                                      |
| `name`              | **type: string**  | Shown by default.     | Name of this async request set.                                                                                                         |
| `is_completed`      | **type: boolean** | Shown by default.     | Async requests in this set complete                                                                                                     |
| `total_count`       | **type: int**     | Not shown by default. | Total requests count of this request set                                                                                                |
| `initial_count`     | **type: int**     | Not shown by default. | Number of requests not yet served.                                                                                                      |
| `in_progress_count` | **type: int**     | Not shown by default. | Number of requests in progress.                                                                                                         |
| `success_count`     | **type: int**     | Not shown by default. | Number of requests finished and successful.                                                                                             |
| `error_count`       | **type: int**     | Not shown by default. | Number of requests finished and failed.                                                                                                 |
| `canceled_count`    | **type: int**     | Not shown by default. | Number of requests canceled by user                                                                                                     |
| `notification_uri`  | **type: string**  | Not shown by default. | Notification URI for this async request set.                                                                                            |
| `notification_mode` | **type: string**  | Not shown by default. | Way to receive notification. Valid values include: `OFF` – No notifications, `ON_COMPLETE` – Send notification when whole set finished. |

After you get the overall status of the async request set, get details of each request:

```curl
curl -G \
  -d 'fields=id,status' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>/requests   
```

This returns status and details of each request inside the async request set. For async ad creation, make one request to create one ad. The `status` param is used to filter requests by its own status and can be any combination of following values: `initial` – Not processed yet, `in_progress` – Request is processing, `success` – Request finished and succeeds, `error` – Request finished and failed, `canceled` – Request canceled by user.

The response is a JSON array with default fields. To include any non-default field, specify it in `fields`, such as `fields=id,scope_object_id,status,result,input,async_request_set`.

| Name                | Description      |
| :------------------ | :--------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | **type: int**    | Shown by default.     | Individual async request ID                                                                                                                                                                                                                                                                                 |
| `scope_object_id`   | **type: int**    | Shown by default.     | Parent id of object this request creates. If you create an ad, this is ad set ID for the new ad.                                                                                                                                                                                                            |
| `status`            | **type: string** | Shown by default.     | Status of this async request. Options: `Initial` – Not processed yet, `In_progress` – Request is processing, `Success` – Request finished and succeeds, `Error` – Request finished and failed, `Canceled` – Request is canceled by user                                                                     |
| `result`            | **type: array**  | Not shown by default. | If request is finished, shows result of the request. On success, the result is the same as a non-async request. For example, if you create an ad, the result for each request is the ID of the new ad. For errors, it will be array of: `error_code` – Error code returned, `error_message` – Error message |
| `input`             | **type: object** | Not shown by default. | Original input for this async request. If you create an ad, the input is `adgroup_spec`.                                                                                                                                                                                                                    |
| `async_request_set` | **type: object** | Not shown by default. | Async request set that contains this individual request                                                                                                                                                                                                                                                     |

**Get Request Details**

To get details of a specific async request, make this call:

```curl
curl -G \
  -d 'fields=id,status' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>/requests   
```

This returns a JSON object with fields listed above.

**List Request Sets for an Account**

You can create multiple async ad request sets. To query all async ad request sets for an ad account:

```curl
curl -G \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/asyncadrequestsets  
```

This returns a JSON array of async request set objects. Each object is the same as specified in async request set section. You can filter results with `is_completed`. If `is_completed=true`, you see only completed async request set.

**List Requests for an Ad Set**

You can make an async call to create ads in different ad sets. To get the status for each ad set, get all ad creation requests for one ad set:

```curl
curl -G \
  -d 'fields=id,status' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<AD_SET_ID>/asyncadrequests
```

This returns a JSON array of async request objects. The status, fields filter and async request fields are the same as `https://graph.facebook.com/&lt;API_VERSION>/&lt;REQUEST_SET_ID>/requests` API.

**Update Request Sets**

You can change `name`, `notification_uri` and `notification_mode`for an async request set.

```curl
curl \
  -F 'name=New Name' \
  -F 'notification_mode=OFF' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

This return true on successful update. You can only change `notification_uri` and `notification_mode` before the notification is sent.

**Cancel Request**

You can cancel an async request, but the request can only be cancelled if it is not processed yet.

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_ID>
```

Returns true on successful cancellation. You can also cancel unprocessed requests in the async request set:

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

Returns true on successful cancellation.

**Async Examples**

**Getting status of a specific async request:**

```curl
//pretty=true for command line readable output
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/"
```

Return values:

```json
{
  "id": "6012384857989",
  "owner_id": 12345,
  "name": "testasyncset",
  "is_completed": true
}
```

**Get results of requests:**

```curl
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "fields=result" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/requests"
```

Returns:

```json
{
  "data": [
    {
      "result": {
        "id": "6012384860989"
      },
      "id": "6012384858389"
    },
    {
      "result": {
        "id": "6012384858789"
      },
      "id": "6012384858189"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Get list of request sets for an ad account:**

```curl
curl -G \-d "is_completed=1" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/act_71597454/asyncadrequestsets"
```

Returns:

```json
{
  "data": [
    {
      "id": "6012384253789",
      "owner_id": 71597454,
      "name": "testasyncset",
      "is_completed": true
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Getting a list of requests for a campaign:**

```curl
curl -G \-d "status=SUCCESS,ERROR" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/6008248529789/asyncadrequests"
```

Returns:

```json
{
  "data": [
    {
      "id": "6012384951789",
      "scope_object_id": 6008248529789,
      "status": "SUCCESS"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Batch Requests**

With batched requests, combine a number of Graph API calls into the one HTTP request. Marketing API split this request into its constituent requests. This makes batched requests the most efficient way of interacting with the Marketing API. For even greater efficiency you can make parallel batch requests using separate processing threads.

Each batched request can contain a maximum of 50 requests. For ad creation you should only have 10 or less ads per batch.

Batch requests for ads, adcreatives and ad sets are very similar so we don't discuss them separately here. For more information, see [Graph API batch requests](https://developers.facebook.com/docs/graph-api/making-multiple-requests) and [ETags](#etags).

**Create Ads**

You can provide adcreative and other ad objects in a batched request. For example, you can create three ads using one adcreative and three different targeting specs. Define your Ad Creative first then reference it when you create each ad:

```curl
curl -F 'access_token=______' 
  -F 'test1=@./test1.jpg'  
  -F 'batch=[
             {
              "method": "POST",
              "name": "create_adimage",
              "relative_url": "<API_VERSION>/act_187687683/adimages",
              "attached_files": "test1"
             },
             {
              "method": "POST",
              "name": "create_creative",
              "relative_url": "<API_VERSION>/act_187687683/adcreatives",
              "attached_files": "test1",
              "body": "name=sample creative&object_story_spec={\"link_data\": {\"image_hash\": \"{result=create_adimage:$.images.*.hash}\", \"link\": \"https://www.test12345.com\", \"message\": \"this is a sample message\"}, \"page_id\":\"12345678\"}&degrees_of_freedom_spec={\"creative_features_spec\": {\"standard_enhancements\": {\"enroll_status\": \"OPT_OUT\"}}}"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test1"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test2"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test3"
             }
            ]' https://graph.facebook.com/
```

The response includes individual response codes for each request and the standard Graph API response. For details, see [Making Multiple API Requests](#batch-requests).

The batched request process uses the [JSONPath expression](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) format to reference the previous requests.

**Update Ads**

You can update ads with batch requests. To updates bids for three ads:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715639",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": <API_VERSION>/v6004251716039",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715839",
              "body": "redownload=1&name=new name"
             }
            ]' https://graph.facebook.com
```

If you include `redownload=1` in the relative URL, you get full ad details including the ad ID. This help identify which ads you updated.

To update ad creative, specify the entire creative, or provide a new creative ID. This is because Ad Creatives cannot be edited after they have been created except for `name` and run status.

**Read Ads**

If you have a large number of ads, split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/?ids=6003356308839,6004164369439&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356307839/ads&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/ads?adset_ids=[6003356307839, 6004164259439]&fields=<comma separated list of fields>"
             }
            ]' https://graph.facebook.com
```

`6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

**Ad Insights**

If you have a large number of Ad Insights split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_19643108/insights?filtering=[{field:'ad.id',operator:'IN',value:[6003356308839,6004164369439]}]"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356308839/insights"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/insights?filtering=[{field:'adset.id',operator:'IN',value:[6003356307839, 6004164259439]}]"
             }
            ]' https://graph.facebook.com
```

In this example `6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

For Ad accounts with a large number of ads using `act_<account_ID>/adgroupstats` is not recommended as it may cause the request to timeout.

**Batch requests for Reach Estimate**

You can request up to 50 reach estimates in a single batched request. The following example shows the reach estimate being requested for 2 different targeting specs:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['US']}}"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['FR']}}"
             }
            ]' https://graph.facebook.com
```

**Batch API**

Batch API enables you batch requests and send them asynchronously. Group several Graph API calls into one HTTP request, and execute them asynchronously without having to block. You can also specify dependencies between related operations.

Facebook processes each independent operation in parallel processes and your dependent operations sequentially. Each API call can have a maximum of 1000 requests.

**Make a Batch API call**

To make a Batch API call:

`curl \-F "access_token=___" \-F "name=asyncbatchreqs" \-F "adbatch=<an array of requests>"\"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_batch_requests"`

Provide an array of HTTP POST requests as JSON arrays. Each request has:

- `name`
- `relative_url` - portion of URL after `graph.facebook.com`
- `body`

The API returns an `id` you use to query the progress of requests.

For example, create a campaign with an ad set with [JSONPath Format](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) to reference the previous requests:

```curl
curl \-F "access_token=___" \-F "name=batchapiexample" \-F "adbatch=[
  {
    'name': 'create-campaign',
    'relative_url': 'act_123456/campaigns',
    'body': 'name%3DTest+Campaign%26objective%3DLINK_CLICKS%26status%3DPAUSED%26buying_type%3DAUCTION',
  },
  {
    'name': 'create-adset',
    'relative_url': 'act_123456/adsets',
    'body': 'targeting%3D%7B%22geo_locations%22%3A%7B%22countries%22%3A%5B%22US%22%5D%7D%7D%26daily_budget%3D5000%26campaign_id%3D%7Bresult%3Dcreate-campaign%3A%24.id%7D%26bid_amount%3D2%26name%3DFirst%2BAd%2BSet%20Test%26billing_event%3DLINK_CLICKS',
  },
]" \
https://graph.facebook.com/<API_VERSION>/act_123456/async_batch_requests
```

To get a request set status:

`curl –G \-d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>"`

This returns overall status for async request sets as JSON objects. Not all fields are returned by default. To include them, specify the `fields`, such as `fields=id,owner_id,name,total_count,success_count,error_count,is_completed`.

| Name                  | Description       |
| :-------------------- | :---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | **type: int**     | Shown by default.     | id of current async request set.                                                                                                 |
| `owner_id`            | **type: int**     | Shown by default.     | Object that owns this async request set. If you create ads, `owner_id` is the ad account id.                                     |
| `name`                | **type: string**  | Shown by default.     | Name of this async request set                                                                                                   |
| `is_completed`        | **type: boolean** | Shown by default.     | All async requests in set complete                                                                                               |
| `total_count`         | **type: int**     | Not shown by default. | Total requests count for this request set                                                                                        |
| `initial_count`       | **type: int**     | Not shown by default. | Number of requests not served yet                                                                                                |
| `in_progress_count`   | **type: int**     | Not shown by default. | Number of requests in progress                                                                                                   |
| `success_count`       | **type: int**     | Not shown by default. | Number of requests finished and successful                                                                                       |
| `error_count`         | **type: int**     | Not shown by default. | Number of requests finished and failed                                                                                           |
| `canceled_count`      | **type: int**     | Not shown by default. | Number of requests canceled by user                                                                                              |
| `notification_uri`    | **type: string**  | Not shown by default. | Notification URI for this async request set.                                                                                     |
| `notification_mode`   | **type: string**  | Not shown by default. | Ways to receive notification. Valid values: `OFF` – No notifications, `ON_COMPLETE` – Send notification when the whole set done. |
| `notification_result` | **type: string**  | Not shown by default. | Result of sending notification.                                                                                                  |
| `notification_status` | **type: string**  | Not shown by default. | Notification status: `not_sent`, `sending`, or `sent`                                                                            |

After you get overall status, you can get details for each request:

`curl –G \   -d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>/requests"`

This returns details as a JSON array. To include non-default fields, specify it in `fields`, such as `fields=id,scope_object_id,status,result,input,async_request_set`.

| Name                | Description      |
| :------------------ | :--------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | **type: int**    | Shown by default.     | ID of individual async request                                                                                                                                                                                                      |
| `scope_object_id`   | **type: int**    | Shown by default.     | Parent ID of the object this request creates. If you create ads, this is ad set ID for the new ad.                                                                                                                                  |
| `status`            | **type: string** | Shown by default.     | Status of this async request: `Initial` – Not processed yet, `In_progress` – Request is processing, `Success` – Request finished and successful, `Error` – Request finished and failed, `Canceled` – Request canceled by user       |
| `result`            | **type: array**  | Not shown by default. | If request finishes, show result. For success, the result is same as non-async API. For example, if you create an ad creation, result is new ad ID. For errors: `error_code` – Error code returned, `error_message` – Error message |
| `input`             | **type: object** | Not shown by default. | Original input for this request. If you create an ad, the input is `adgroup_spec`.                                                                                                                                                  |
| `async_request_set` | **type: object** | Not shown by default. | Async request set containing this request.                                                                                                                                                                                          |

**List Batch API Requests for Ad Account**

You can create multiple Batch API request sets. To query all request sets under an ad account:

`curl –G \ -d "access_token=___" \"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_requests"`

This returns a JSON array of async request set objects. Each object is the same as specified in async request set section. You can filter results with `is_completed`. If `is_completed=true`, you see only completed async request set.

**Update Request Sets**

You can change `name`, `notification_uri` and `notification_mode`for an async request set.

```curl
curl \
  -F 'name=New Name' \
  -F 'notification_mode=OFF' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

This return true on successful update. You can only change `notification_uri` and `notification_mode` before the notification is sent.

**Cancel Request**

You can cancel an async request, but the request can only be cancelled if it is not processed yet.

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_ID>
```

Returns true on successful cancellation. You can also cancel unprocessed requests in the async request set:

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

Returns true on successful cancellation.

**Async Examples**

**Getting status of a specific async request:**

```curl
//pretty=true for command line readable output
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/"
```

Return values:

```json
{
  "id": "6012384857989",
  "owner_id": 12345,
  "name": "testasyncset",
  "is_completed": true
}
```

**Get results of requests:**

```curl
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "fields=result" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/requests"
```

Returns:

```json
{
  "data": [
    {
      "result": {
        "id": "6012384860989"
      },
      "id": "6012384858389"
    },
    {
      "result": {
        "id": "6012384858789"
      },
      "id": "6012384858189"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Get list of request sets for an ad account:**

```curl
curl -G \-d "is_completed=1" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/act_71597454/asyncadrequestsets"
```

Returns:

```json
{
  "data": [
    {
      "id": "6012384253789",
      "owner_id": 71597454,
      "name": "testasyncset",
      "is_completed": true
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Getting a list of requests for a campaign:**

```curl
curl -G \-d "status=SUCCESS,ERROR" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/6008248529789/asyncadrequests"
```

Return values:

```json
{
  "data": [
    {
      "id": "6012384951789",
      "scope_object_id": 6008248529789,
      "status": "SUCCESS"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Batch Requests**

With batched requests, combine a number of Graph API calls into the one HTTP request. Marketing API split this request into its constituent requests. This makes batched requests the most efficient way of interacting with the Marketing API. For even greater efficiency you can make parallel batch requests using separate processing threads.

Each batched request can contain a maximum of 50 requests. For ad creation you should only have 10 or less ads per batch.

Batch requests for ads, adcreatives and ad sets are very similar so we don't discuss them separately here. For more information, see [Graph API batch requests](https://developers.facebook.com/docs/graph-api/making-multiple-requests) and [ETags](#etags).

**Create Ads**

You can provide adcreative and other ad objects in a batched request. For example, you can create three ads using one adcreative and three different targeting specs. Define your Ad Creative first then reference it when you create each ad:

```curl
curl -F 'access_token=______' 
  -F 'test1=@./test1.jpg'  
  -F 'batch=[
             {
              "method": "POST",
              "name": "create_adimage",
              "relative_url": "<API_VERSION>/act_187687683/adimages",
              "attached_files": "test1"
             },
             {
              "method": "POST",
              "name": "create_creative",
              "relative_url": "<API_VERSION>/act_187687683/adcreatives",
              "attached_files": "test1",
              "body": "name=sample creative&object_story_spec={\"link_data\": {\"image_hash\": \"{result=create_adimage:$.images.*.hash}\", \"link\": \"https://www.test12345.com\", \"message\": \"this is a sample message\"}, \"page_id\":\"12345678\"}&degrees_of_freedom_spec={\"creative_features_spec\": {\"standard_enhancements\": {\"enroll_status\": \"OPT_OUT\"}}}"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test1"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test2"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test3"
             }
            ]' https://graph.facebook.com/
```

The response includes individual response codes for each request and the standard Graph API response. For details, see [Making Multiple API Requests](#batch-requests).

The batched request process uses the [JSONPath expression](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) format to reference the previous requests.

**Update Ads**

You can update ads with batch requests. To updates bids for three ads:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715639",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": <API_VERSION>/v6004251716039",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715839",
              "body": "redownload=1&name=new name"
             }
            ]' https://graph.facebook.com
```

If you include `redownload=1` in the relative URL, you get full ad details including the ad ID. This help identify which ads you updated.

To update ad creative, specify the entire creative, or provide a new creative ID. This is because Ad Creatives cannot be edited after they have been created except for `name` and run status.

**Read Ads**

If you have a large number of ads, split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/?ids=6003356308839,6004164369439&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356307839/ads&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/ads?adset_ids=[6003356307839, 6004164259439]&fields=<comma separated list of fields>"
             }
            ]' https://graph.facebook.com
```

`6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

**Ad Insights**

If you have a large number of Ad Insights split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_19643108/insights?filtering=[{field:'ad.id',operator:'IN',value:[6003356308839,6004164369439]}]"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356308839/insights"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/insights?filtering=[{field:'adset.id',operator:'IN',value:[6003356307839, 6004164259439]}]"
             }
            ]' https://graph.facebook.com
```

In this example `6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

For Ad accounts with a large number of ads using `act_<account_ID>/adgroupstats` is not recommended as it may cause the request to timeout.

**Batch requests for Reach Estimate**

You can request up to 50 reach estimates in a single batched request. The following example shows the reach estimate being requested for 2 different targeting specs:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['US']}}"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['FR']}}"
             }
            ]' https://graph.facebook.com
```

**Batch API**

Batch API enables you batch requests and send them asynchronously. Group several Graph API calls into one HTTP request, and execute them asynchronously without having to block. You can also specify dependencies between related operations.

Facebook processes each independent operation in parallel processes and your dependent operations sequentially. Each API call can have a maximum of 1000 requests.

**Make a Batch API call**

To make a Batch API call:

`curl \-F "access_token=___" \-F "name=asyncbatchreqs" \-F "adbatch=<an array of requests>"\"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_batch_requests"`

Provide an array of HTTP POST requests as JSON arrays. Each request has:

- `name`
- `relative_url` - portion of URL after `graph.facebook.com`
- `body`

The API returns an `id` you use to query the progress of requests.

For example, create a campaign with an ad set with [JSONPath Format](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) to reference the previous requests:

```curl
curl \-F "access_token=___" \-F "name=batchapiexample" \-F "adbatch=[
  {
    'name': 'create-campaign',
    'relative_url': 'act_123456/campaigns',
    'body': 'name%3DTest+Campaign%26objective%3DLINK_CLICKS%26status%3DPAUSED%26buying_type%3DAUCTION',
  },
  {
    'name': 'create-adset',
    'relative_url': 'act_123456/adsets',
    'body': 'targeting%3D%7B%22geo_locations%22%3A%7B%22countries%22%3A%5B%22US%22%5D%7D%7D%26daily_budget%3D5000%26campaign_id%3D%7Bresult%3Dcreate-campaign%3A%24.id%7D%26bid_amount%3D2%26name%3DFirst%2BAd%2BSet%20Test%26billing_event%3DLINK_CLICKS',
  },
]" \
https://graph.facebook.com/<API_VERSION>/act_123456/async_batch_requests
```

To get a request set status:

`curl –G \-d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>"`

This returns overall status for async request sets as JSON objects. Not all fields are returned by default. To include them, specify the `fields`, such as `fields=id,owner_id,name,total_count,success_count,error_count,is_completed`.

| Name                  | Description       |
| :-------------------- | :---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | **type: int**     | Shown by default.     | id of current async request set.                                                                                                 |
| `owner_id`            | **type: int**     | Shown by default.     | Object that owns this async request set. If you create ads, `owner_id` is the ad account id.                                     |
| `name`                | **type: string**  | Shown by default.     | Name of this async request set                                                                                                   |
| `is_completed`        | **type: boolean** | Shown by default.     | All async requests in set complete                                                                                               |
| `total_count`         | **type: int**     | Not shown by default. | Total requests count for this request set                                                                                        |
| `initial_count`       | **type: int**     | Not shown by default. | Number of requests not served yet                                                                                                |
| `in_progress_count`   | **type: int**     | Not shown by default. | Number of requests in progress                                                                                                   |
| `success_count`       | **type: int**     | Not shown by default. | Number of requests finished and successful                                                                                       |
| `error_count`         | **type: int**     | Not shown by default. | Number of requests finished and failed                                                                                           |
| `canceled_count`      | **type: int**     | Not shown by default. | Number of requests canceled by user                                                                                              |
| `notification_uri`    | **type: string**  | Not shown by default. | Notification URI for this async request set.                                                                                     |
| `notification_mode`   | **type: string**  | Not shown by default. | Ways to receive notification. Valid values: `OFF` – No notifications, `ON_COMPLETE` – Send notification when the whole set done. |
| `notification_result` | **type: string**  | Not shown by default. | Result of sending notification.                                                                                                  |
| `notification_status` | **type: string**  | Not shown by default. | Notification status: `not_sent`, `sending`, or `sent`                                                                            |

After you get overall status, you can get details for each request:

`curl –G \   -d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>/requests"`

This returns details as a JSON array. To include non-default fields, specify it in `fields`, such as `fields=id,scope_object_id,status,result,input,async_request_set`.

| Name                | Description      |
| :------------------ | :--------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | **type: int**    | Shown by default.     | ID of individual async request                                                                                                                                                                                                      |
| `scope_object_id`   | **type: int**    | Shown by default.     | Parent ID of the object this request creates. If you create ads, this is ad set ID for the new ad.                                                                                                                                  |
| `status`            | **type: string** | Shown by default.     | Status of this async request: `Initial` – Not processed yet, `In_progress` – Request is processing, `Success` – Request finished and successful, `Error` – Request finished and failed, `Canceled` – Request canceled by user       |
| `result`            | **type: array**  | Not shown by default. | If request finishes, show result. For success, the result is same as non-async API. For example, if you create an ad creation, result is new ad ID. For errors: `error_code` – Error code returned, `error_message` – Error message |
| `input`             | **type: object** | Not shown by default. | Original input for this request. If you create an ad, the input is `adgroup_spec`.                                                                                                                                                  |
| `async_request_set` | **type: object** | Not shown by default. | Async request set containing this request.                                                                                                                                                                                          |

**List Batch API Requests for Ad Account**

You can create multiple Batch API request sets. To query all request sets under an ad account:

`curl –G \ -d "access_token=___" \"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_requests"`

This returns a JSON array of async request set objects. Each object is the same as specified in async request set section. You can filter results with `is_completed`. If `is_completed=true`, you see only completed async request set.

**Update Request Sets**

You can change `name`, `notification_uri` and `notification_mode`for an async request set.

```curl
curl \
  -F 'name=New Name' \
  -F 'notification_mode=OFF' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

This return true on successful update. You can only change `notification_uri` and `notification_mode` before the notification is sent.

**Cancel Request**

You can cancel an async request, but the request can only be cancelled if it is not processed yet.

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_ID>
```

Returns true on successful cancellation. You can also cancel unprocessed requests in the async request set:

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

Returns true on successful cancellation.

**Async Examples**

**Getting status of a specific async request:**

```curl
//pretty=true for command line readable output
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/"
```

Return values:

```json
{
  "id": "6012384857989",
  "owner_id": 12345,
  "name": "testasyncset",
  "is_completed": true
}
```

**Get results of requests:**

```curl
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "fields=result" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/requests"
```

Returns:

```json
{
  "data": [
    {
      "result": {
        "id": "6012384860989"
      },
      "id": "6012384858389"
    },
    {
      "result": {
        "id": "6012384858789"
      },
      "id": "6012384858189"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Get list of request sets for an ad account:**

```curl
curl -G \-d "is_completed=1" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/act_71597454/asyncadrequestsets"
```

Returns:

```json
{
  "data": [
    {
      "id": "6012384253789",
      "owner_id": 71597454,
      "name": "testasyncset",
      "is_completed": true
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Getting a list of requests for a campaign:**

```curl
curl -G \-d "status=SUCCESS,ERROR" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/6008248529789/asyncadrequests"
```

Return values:

```json
{
  "data": [
    {
      "id": "6012384951789",
      "scope_object_id": 6008248529789,
      "status": "SUCCESS"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Batch Requests**

With batched requests, combine a number of Graph API calls into the one HTTP request. Marketing API split this request into its constituent requests. This makes batched requests the most efficient way of interacting with the Marketing API. For even greater efficiency you can make parallel batch requests using separate processing threads.

Each batched request can contain a maximum of 50 requests. For ad creation you should only have 10 or less ads per batch.

Batch requests for ads, adcreatives and ad sets are very similar so we don't discuss them separately here. For more information, see [Graph API batch requests](https://developers.facebook.com/docs/graph-api/making-multiple-requests) and [ETags](#etags).

**Create Ads**

You can provide adcreative and other ad objects in a batched request. For example, you can create three ads using one adcreative and three different targeting specs. Define your Ad Creative first then reference it when you create each ad:

```curl
curl -F 'access_token=______' 
  -F 'test1=@./test1.jpg'  
  -F 'batch=[
             {
              "method": "POST",
              "name": "create_adimage",
              "relative_url": "<API_VERSION>/act_187687683/adimages",
              "attached_files": "test1"
             },
             {
              "method": "POST",
              "name": "create_creative",
              "relative_url": "<API_VERSION>/act_187687683/adcreatives",
              "attached_files": "test1",
              "body": "name=sample creative&object_story_spec={\"link_data\": {\"image_hash\": \"{result=create_adimage:$.images.*.hash}\", \"link\": \"https://www.test12345.com\", \"message\": \"this is a sample message\"}, \"page_id\":\"12345678\"}&degrees_of_freedom_spec={\"creative_features_spec\": {\"standard_enhancements\": {\"enroll_status\": \"OPT_OUT\"}}}"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test1"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test2"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/act_187687683/ads",
              "body": "adset_id=6004163746239&redownload=1&status=PAUSED&optimization_goal=REACH&billing_event=IMPRESSIONS&&creative={\"creative_id\":\"{result=create_creative:$.id}\"}&targeting={\"countries\":[\"US\"]}&name=test3"
             }
            ]' https://graph.facebook.com/
```

The response includes individual response codes for each request and the standard Graph API response. For details, see [Making Multiple API Requests](#batch-requests).

The batched request process uses the [JSONPath expression](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) format to reference the previous requests.

**Update Ads**

You can update ads with batch requests. To updates bids for three ads:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715639",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": <API_VERSION>/v6004251716039",
              "body": "redownload=1&name=new name"
             },
             {
              "method": "POST",
              "relative_url": "<API_VERSION>/6004251715839",
              "body": "redownload=1&name=new name"
             }
            ]' https://graph.facebook.com
```

If you include `redownload=1` in the relative URL, you get full ad details including the ad ID. This help identify which ads you updated.

To update ad creative, specify the entire creative, or provide a new creative ID. This is because Ad Creatives cannot be edited after they have been created except for `name` and run status.

**Read Ads**

If you have a large number of ads, split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/?ids=6003356308839,6004164369439&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356307839/ads&fields=<comma separated list of fields>"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/ads?adset_ids=[6003356307839, 6004164259439]&fields=<comma separated list of fields>"
             }
            ]' https://graph.facebook.com
```

`6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

**Ad Insights**

If you have a large number of Ad Insights split the request over multiple requests within a batched request:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_19643108/insights?filtering=[{field:'ad.id',operator:'IN',value:[6003356308839,6004164369439]}]"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/6003356308839/insights"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_187687683/insights?filtering=[{field:'adset.id',operator:'IN',value:[6003356307839, 6004164259439]}]"
             }
            ]' https://graph.facebook.com
```

In this example `6003356308839` and `6004164369439` are ad ids and `6003356307839` and `6004164259439` are ad set ids.

For Ad accounts with a large number of ads using `act_<account_ID>/adgroupstats` is not recommended as it may cause the request to timeout.

**Batch requests for Reach Estimate**

You can request up to 50 reach estimates in a single batched request. The following example shows the reach estimate being requested for 2 different targeting specs:

```curl
curl -F 'access_token=____' 
  -F 'batch=[
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['US']}}"
             },
             {
              "method": "GET",
              "relative_url": "<API_VERSION>/act_600335/reachestimate?targeting_spec={'geo_locations': {'countries':['FR']}}"
             }
            ]' https://graph.facebook.com
```

**Batch API**

Batch API enables you batch requests and send them asynchronously. Group several Graph API calls into one HTTP request, and execute them asynchronously without having to block. You can also specify dependencies between related operations.

Facebook processes each independent operation in parallel processes and your dependent operations sequentially. Each API call can have a maximum of 1000 requests.

**Make a Batch API call**

To make a Batch API call:

`curl \-F "access_token=___" \-F "name=asyncbatchreqs" \-F "adbatch=<an array of requests>"\"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_batch_requests"`

Provide an array of HTTP POST requests as JSON arrays. Each request has:

- `name`
- `relative_url` - portion of URL after `graph.facebook.com`
- `body`

The API returns an `id` you use to query the progress of requests.

For example, create a campaign with an ad set with [JSONPath Format](https://developers.facebook.com/docs/graph-api/making-multiple-requests#operations) to reference the previous requests:

```curl
curl \-F "access_token=___" \-F "name=batchapiexample" \-F "adbatch=[
  {
    'name': 'create-campaign',
    'relative_url': 'act_123456/campaigns',
    'body': 'name%3DTest+Campaign%26objective%3DLINK_CLICKS%26status%3DPAUSED%26buying_type%3DAUCTION',
  },
  {
    'name': 'create-adset',
    'relative_url': 'act_123456/adsets',
    'body': 'targeting%3D%7B%22geo_locations%22%3A%7B%22countries%22%3A%5B%22US%22%5D%7D%7D%26daily_budget%3D5000%26campaign_id%3D%7Bresult%3Dcreate-campaign%3A%24.id%7D%26bid_amount%3D2%26name%3DFirst%2BAd%2BSet%20Test%26billing_event%3DLINK_CLICKS',
  },
]" \
https://graph.facebook.com/<API_VERSION>/act_123456/async_batch_requests
```

To get a request set status:

`curl –G \-d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>"`

This returns overall status for async request sets as JSON objects. Not all fields are returned by default. To include them, specify the `fields`, such as `fields=id,owner_id,name,total_count,success_count,error_count,is_completed`.

| Name                  | Description       |
| :-------------------- | :---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | **type: int**     | Shown by default.     | id of current async request set.                                                                                                 |
| `owner_id`            | **type: int**     | Shown by default.     | Object that owns this async request set. If you create ads, `owner_id` is the ad account id.                                     |
| `name`                | **type: string**  | Shown by default.     | Name of this async request set                                                                                                   |
| `is_completed`        | **type: boolean** | Shown by default.     | All async requests in set complete                                                                                               |
| `total_count`         | **type: int**     | Not shown by default. | Total requests count for this request set                                                                                        |
| `initial_count`       | **type: int**     | Not shown by default. | Number of requests not served yet                                                                                                |
| `in_progress_count`   | **type: int**     | Not shown by default. | Number of requests in progress                                                                                                   |
| `success_count`       | **type: int**     | Not shown by default. | Number of requests finished and successful                                                                                       |
| `error_count`         | **type: int**     | Not shown by default. | Number of requests finished and failed                                                                                           |
| `canceled_count`      | **type: int**     | Not shown by default. | Number of requests canceled by user                                                                                              |
| `notification_uri`    | **type: string**  | Not shown by default. | Notification URI for this async request set.                                                                                     |
| `notification_mode`   | **type: string**  | Not shown by default. | Ways to receive notification. Valid values: `OFF` – No notifications, `ON_COMPLETE` – Send notification when the whole set done. |
| `notification_result` | **type: string**  | Not shown by default. | Result of sending notification.                                                                                                  |
| `notification_status` | **type: string**  | Not shown by default. | Notification status: `not_sent`, `sending`, or `sent`                                                                            |

After you get overall status, you can get details for each request:

`curl –G \   -d "access_token=___" \-d "fields=<comma separated list of fields>" \"https://graph.facebook.com/v24.0/<REQUEST_SET_ID>/requests"`

This returns details as a JSON array. To include non-default fields, specify it in `fields`, such as `fields=id,scope_object_id,status,result,input,async_request_set`.

| Name                | Description      |
| :------------------ | :--------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | **type: int**    | Shown by default.     | ID of individual async request                                                                                                                                                                                                      |
| `scope_object_id`   | **type: int**    | Shown by default.     | Parent ID of the object this request creates. If you create ads, this is ad set ID for the new ad.                                                                                                                                  |
| `status`            | **type: string** | Shown by default.     | Status of this async request: `Initial` – Not processed yet, `In_progress` – Request is processing, `Success` – Request finished and successful, `Error` – Request finished and failed, `Canceled` – Request canceled by user       |
| `result`            | **type: array**  | Not shown by default. | If request finishes, show result. For success, the result is same as non-async API. For example, if you create an ad creation, result is new ad ID. For errors: `error_code` – Error code returned, `error_message` – Error message |
| `input`             | **type: object** | Not shown by default. | Original input for this request. If you create an ad, the input is `adgroup_spec`.                                                                                                                                                  |
| `async_request_set` | **type: object** | Not shown by default. | Async request set containing this request.                                                                                                                                                                                          |

**List Batch API Requests for Ad Account**

You can create multiple Batch API request sets. To query all request sets under an ad account:

`curl –G \ -d "access_token=___" \"https://graph.facebook.com/v24.0/act_<AD_ACCOUNT_ID>/async_requests"`

This returns a JSON array of async request set objects. Each object is the same as specified in async request set section. You can filter results with `is_completed`. If `is_completed=true`, you see only completed async request set.

**Update Request Sets**

You can change `name`, `notification_uri` and `notification_mode`for an async request set.

```curl
curl \
  -F 'name=New Name' \
  -F 'notification_mode=OFF' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

This return true on successful update. You can only change `notification_uri` and `notification_mode` before the notification is sent.

**Cancel Request**

You can cancel an async request, but the request can only be cancelled if it is not processed yet.

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_ID>
```

Returns true on successful cancellation. You can also cancel unprocessed requests in the async request set:

```curl
curl -X DELETE \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/v24.0/<REQUEST_SET_ID>
```

Returns true on successful cancellation.

**Async Examples**

**Getting status of a specific async request:**

```curl
//pretty=true for command line readable output
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/"
```

Return values:

```json
{
  "id": "6012384857989",
  "owner_id": 12345,
  "name": "testasyncset",
  "is_completed": true
}
```

**Get results of requests:**

```curl
curl -G \-d "id=6012384857989" \-d "pretty=true" \-d "fields=result" \-d "access_token=_____" \"https://graph.facebook.com/v24.0/requests"
```

Returns:

```json
{
  "data": [
    {
      "result": {
        "id": "6012384860989"
      },
      "id": "6012384858389"
    },
    {
      "result": {
        "id": "6012384858789"
      },
      "id": "6012384858189"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Get list of request sets for an ad account:**

```curl
curl -G \-d "is_completed=1" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/act_71597454/asyncadrequestsets"
```

Returns:

```json
{
  "data": [
    {
      "id": "6012384253789",
      "owner_id": 71597454,
      "name": "testasyncset",
      "is_completed": true
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

**Getting a list of requests for a campaign:**

```curl
curl -G \-d "status=SUCCESS,ERROR" \-d "pretty=true" \-d "access_token=___" \"https://graph.facebook.com/v24.0/6008248529789/asyncadrequests"
```

Return values:

```json
{
  "data": [
    {
      "id": "6012384951789",
      "scope_object_id": 6008248529789,
      "status": "SUCCESS"
    }
  ],
  "paging": {
    "cursors": {
      "after": "___",
      "before": "___"
    }
  }
}
```

# Troubleshooting

Working with the Marketing API can occasionally present challenges. Below are issues users may encounter, along with practical solutions to help streamline your experience.

## Error Handling

Use the error handling techniques and best practices below to enhance the reliability and efficiency of your applications.

**Authorization Errors**

These errors often occur due to access tokens that are expired, invalid, or lacking the necessary permissions. To mitigate these issues, ensure that tokens are refreshed regularly and that the correct scopes are requested during authorization.

**Invalid Parameters**

Sending requests with incorrect or missing parameters can lead to errors. Always validate the input data before making API calls. Utilizing validation tools can significantly reduce such errors.

**Resource Not Found**

This error occurs when attempting to access a resource that does not exist or has been deleted. To resolve this, check that resources (like campaigns or ad sets) exist before performing operations on them.

**Rate Limiting**

The Marketing API enforces rate limits to prevent abuse. Exceeding these limits results in error messages indicating that too many requests have been made in a short time. Employing [exponential backoff strategies](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/#exponential-backoff) can help slow down request rates after hitting the limit.

To optimize performance and avoid hitting rate limits, create a queue system for API requests. This allows for controlled pacing of requests, ensuring compliance with the API's limits without sacrificing performance.

**Caching Strategies**

Implement caching for frequently accessed data, such as audience insights or ad performance metrics. This reduces the number of API calls and speeds up data retrieval, leading to a more efficient application.

**Managing API Versioning**

Stay informed about updates and changes in the Marketing API by regularly checking the documentation. Placing API calls within version-specific functions can prepare your application for version changes, allowing for independent updates.

**Error Logging and Monitoring**

Implement robust error logging to track API interactions. This will help identify patterns in errors and facilitate quicker resolutions. Utilizing monitoring tools can alert developers to critical failures or unusual patterns in API usage.

## Error Codes

The following are error codes returned by the API:

| Error Code           | Description                                                                                                                                                                                                                                                                                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -                    | Negative-value error codes are internal Facebook errors. Check `error_subcode` for the actual failure code.                                                                                                                                                                                                |
| 1                    | An unknown error occurred                                                                                                                                                                                                                                                                                  |
| 1, subcode 99        | An unknown error occurred. This error may occur if you set `level` to `adset` but the correct value should be `campaign`.                                                                                                                                                                                  |
| 4                    | Application request limit reached                                                                                                                                                                                                                                                                          |
| 10                   | Application does not have permission for this action                                                                                                                                                                                                                                                       |
| 17                   | User request limit reached                                                                                                                                                                                                                                                                                 |
| 100                  | Invalid parameter                                                                                                                                                                                                                                                                                          |
| 100, subcode 33      | Unsupported post request.                                                                                                                                                                                                                                                                                  |
| 100, subcode 1487694 | Invalid parameter.                                                                                                                                                                                                                                                                                         | The category you selected is no longer available. Several behavior-based targeting categories are deprecated. If you try to use them to create ads, your requests fails and returns this error. Use [Targeting Search](https://developers.facebook.com/docs/marketing-api/targeting-search) to see categories available for targeting.                                                                                        |
| 100, subcode 1752129 | Invalid parameter.                                                                                                                                                                                                                                                                                         | This Task Combination Is Not Supported. To assign a user for this ad account valid capabilities, you should pass in a combination of tasks defined in the [mapping](https://developers.facebook.com/docs/marketing-api/business-management/business-assets#tasks-mapping). See [Business Manager API, Permitted Roles](https://developers.facebook.com/docs/marketing-api/business-management/business-assets#tasks-mapping). |
| 100, subcode 1487694 | Invalid parameter.                                                                                                                                                                                                                                                                                         | The category you selected is no longer available. Several behavior-based targeting categories are deprecated. If you try to use them to create ads, your requests fails and returns this error. Use [Targeting Search](https://developers.facebook.com/docs/marketing-api/targeting-search) to see categories available for targeting.                                                                                        |
| 102                  | Session key invalid or no longer valid                                                                                                                                                                                                                                                                     |
| 104                  | Incorrect signature                                                                                                                                                                                                                                                                                        |
| 190                  | Invalid OAuth 2.0 Access Token                                                                                                                                                                                                                                                                             |
| 200                  | Permission error                                                                                                                                                                                                                                                                                           |
| 200, subcode 1870034 | Custom Audience Terms Not Accepted: You'll need to agree to the Custom Audience terms before you can create or edit an audience or an ad set. See [Facebook, Custom Audience Terms](https://www.facebook.com/business/help/985551378129759)                                                                |
| 200, subcode 1870047 | Audience Size too Low: You cannot remove users from this audience because it will result in a low audience size and may result in under-delivery or non-delivery of your ads.                                                                                                                              |
| 294                  | Managing advertisements requires the extended permission `ads_management` and an application that is in our allow list to access the Marketing API                                                                                                                                                         |
| 2606                 | Unable to display a preview of this ad                                                                                                                                                                                                                                                                     |
| 2607                 | The given currency is invalid for usage with ads.                                                                                                                                                                                                                                                          |
| 2615                 | Invalid call to update this adaccount                                                                                                                                                                                                                                                                      |
| 2654                 | Failed to create custom audience.                                                                                                                                                                                                                                                                          |
| 2654 subcode 1713092 | No write permission for this ad account. Developer making this call must have permissions for the ad account to create an audience for it.                                                                                                                                                                 |
| 5000                 | Unknown Error Code                                                                                                                                                                                                                                                                                         |
| 1340029              | Currently deletion of Dynamic Creative Ad is not allowed. Please proceed by deleting parent Ad Set                                                                                                                                                                                                         |
| 1373054              | No Call To Action Type was parseable. Please refer to the [call to action api documentation](https://developers.facebook.com/docs/marketing-api/guides/ad-creatives/call-to-action)                                                                                                                        |
| 1404078              | You have been temporarily blocked from performing this action.                                                                                                                                                                                                                                             |
| 1404163              | You're no longer allowed to use Facebook Products to advertise. You can't run ads, manage advertising assets or create new ad or business accounts. [Learn More](https://www.facebook.com/business/help/2361664177309971)                                                                                  |
| 1487007              | You can't edit this ad because it's part of a scheduled ad set that has reached its end date. Please go to the Budget and Schedule section of the ad set and change the end date to a date in the future and then try your edits again.                                                                    |
| 1487033              | Your campaign's end date must be in the future. Please choose a different end date and try again.                                                                                                                                                                                                          |
| 1487056              | This ad set has been deleted, so you can only edit the name. If you want to edit other fields, you can duplicate this ad set, which will create a new ad set with the same settings that you can then edit.                                                                                                |
| 1487472              | You are using {msg}, which can't be promoted in an ad. Please choose a different Page post to continue.                                                                                                                                                                                                    |
| 1487566              | This campaign has been deleted, so you can only edit the name. If you want to edit other fields, you can duplicate this campaign, which will create a new campaign with the same settings that you can then edit.                                                                                          |
| 1487678              | The app you're trying to create an ad for is on a different operating system than targeting settings for this ad set.                                                                                                                                                                                      |
| 1487831              | Your product set cannot be loaded. It may be non-existent or inaccessible due to privacy reasons.                                                                                                                                                                                                          |
| 1487929              | The object you are trying to promote is ambiguous. You must specify only one promoted object.                                                                                                                                                                                                              |
| 1487990              | This Ad Account has already too many archived adgroups. You need to delete some of them before being able to archive any more.                                                                                                                                                                             |
| 1815199              | Ad account has no access to this Instagram account. Please use authorized Instagram account or assign ad account to this Instagram account first.                                                                                                                                                          |
| 1815629              | All ad asset values should be unique. Please check your values.                                                                                                                                                                                                                                            |
| 1815694              | The user does not have the permission for this action.                                                                                                                                                                                                                                                     |
| 1870065              | This can't be used because it contains at least one audience that was disabled. Disabled audiences were shared by accounts that are no longer active. To fix this issue, remove the affected audiences                                                                                                     |
| 1870088              | Connection targeting is being deprecated. Please remove connections from your campaign to publish your campaign.                                                                                                                                                                                           |
| 1870090              | To create or edit audience or ad set, please agree to the Custom Audience terms.                                                                                                                                                                                                                           |
| 1870092              | To create or edit audience or ad set, please agree to the Meta Business Tools terms                                                                                                                                                                                                                        |
| 1870165              | Your audience contains targeting options that can no longer be used to target ads to people under 18 globally, 20 in Thailand or 21 in Indonesia. Increase the minimum age of your audience or remove all targeting options apart from location, age and gender.                                           |
| 1870199              | All location targeting will now reach people living in or recently in the locations you selected. Please remove all values from the location_types field.                                                                                                                                                  |
| 1870219              | Only employer exclusions are allowed to be saved in account control. If you are trying to save anything other than employer exclusions then this error will be thrown.                                                                                                                                     |
| 1870220              | If you are trying to save more than the allowed number of employer exclusions then this error will be thrown.                                                                                                                                                                                              |
| 1885029              | The Page selected for your ad doesn't match the Page associated with the object you're promoting, like a Page post or app. Please make sure the Pages are the same.                                                                                                                                        |
| 1885088              | This ad has been archived and can not be edited. Only name is allowed to be edited for this ad. If you want to edit other fields, you can duplicate this ad, which will create a new ad with the same settings that you can then edit.                                                                     |
| 1885183              | Ads creative post was created by an app that is in development mode. It must be in public to create this ad.ate this ad, which will create a new ad with the same settings that you can then edit.                                                                                                         |
| 1885204              | You need to set your bid to automatic for the chosen optimization. Remove any billing or bid info or change your optimization.                                                                                                                                                                             |
| 1885272              | Budget is too low.                                                                                                                                                                                                                                                                                         |
| 1885557              | Your ad is promoting an unavilable post. It is either deleted, unpublished, not owned by the ad's page or you do not have permissions to see or promote it.                                                                                                                                                |
| 1885621              | You can only set an ad set budget or a campaign budget.                                                                                                                                                                                                                                                    |
| 1885557              | Your ad is promoting an unavilable post. It is either deleted, unpublished, not owned by the ad's page or you do not have permissions to see or promote it.                                                                                                                                                |
| 1885650              | Your budget is too low. This minimum amount is required to account for any spending that occurs while your budget is updated, which may take up to 15 minutes.                                                                                                                                             |
| 2238055              | Your campaign budget must be at least {minimum_budget} to account for all ad sets in this campaign.                                                                                                                                                                                                        |
| 2446173              | Target rule label with name {label} doesn't refer to any of the asset labels. Please fix it by removing all ad creatives.                                                                                                                                                                                  |
| 2446289              | The {post_type} you selected for your ad is not available. It could be deleted or you might not have permissions to see it. Please check your ad creative and try again.                                                                                                                                   |
| 2446347              | The ad of an existing post should have the flag `use_existing_post` (default rule in "asset_feed_spec:target_rules") set to true. This is part of the POST request to the server, not something that can be done through the UI.                                                                           |
| 2446383              | Your campaign objective requires an external website URL. Select a call to action and enter a website URL in the ad creative section.                                                                                                                                                                      |
| 2446394              | This ad set includes detailed targeting options that are either no longer available or aren't available when excluding people from an audience. You may need to remove items from your detailed targeting or confirm the changes to turn it back on.                                                       |
| 2446509              | The ad campaign destination type is not valid                                                                                                                                                                                                                                                              |
| 2446580              | Cannot specify both `components` and `child_attachments` field when providing `interactive_components_spec` params                                                                                                                                                                                         |
| 2446712              | The ability to create or run an ad set with store visits optimization is no longer available. Choose the reach or store sales optimization instead.                                                                                                                                                        |
| 2446867              | You've already reached the limit of {campaigns_per_country_cap} Advantage+ Shopping Campaigns for the following countries: {country_names}. If you'd like to create additional campaigns for these countries, use a standard conversions campaign.                                                         |
| 2446880              | The WhatsApp number connected to your Facebook page or Instagram profile was disconnected. You can run this ad again when you reconnect your WhatsApp account.                                                                                                                                             |
| 2490085              | The 191x100 crop key will no longer be available in the newest Ads API version. The recommended crop key will be 100x100.                                                                                                                                                                                  |
| 2490155              | The post associated with your ad is not available. It may have been removed, or you might not have permission to view it.                                                                                                                                                                                  |
| 2490372              | You need to choose a shop destination in order to continue.                                                                                                                                                                                                                                                |
| 2490427              | Your ad has been rejected in its latest review and is currently disabled. In order to enable the ad, you will need to make updates to it and create a new ad.                                                                                                                                              |
| 2490468              | Your ad has been rejected in its latest review and is currently disabled. In order to enable the ad, you will need to make updates to it and create a new ad.                                                                                                                                              |
| 2708008              | You haven't been authorized to run ads about social issues, elections or politics. Please have an authorized ad account user place this ad, or complete the ID confirmation process yourself at `https://www.facebook.com/id`                                                                              |
| 2859015              | You have been temporarily blocked from performing this action.                                                                                                                                                                                                                                             |
| 3858064              | This campaign contains options that can no longer be used in campaigns with audiences under age 18 globally, 20 in Thailand or 21 in Indonesia. Increase the minimum age of your audience or remove all targeting options except for age and locations that are cities or larger (excluding postal codes). |
| 3858082              | This creative is eligible for Standard Enhancements, but `enroll_status` was not provided. Please choose whether you want to turn on standard enhancements or not. [Learn more here](https://developers.facebook.com/docs/marketing-api/guides/advantage-creative)                                         |
| 3858152              | This ad belongs to an ad set that must be published with beneficiary and payer information. Go to the ad set to add or review this information, and then click "Publish".                                                                                                                                  |
| 3867105              | This content can’t be used for your partnership ad. Select different content.                                                                                                                                                                                                                              |
| 3910001              | We're facing some trouble with your account. Please try again later.                                                                                                                                                                                                                                       |

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

Represents a business, person or other entity who creates and manages ads on Facebook.

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
| `object_story_spec` | `string (AdCreativeObjectStorySpec)` | JSON string of `AdCreativeObjectStorySpec` type. Use if you want to create a new unpublished page post and turn the post into an ad. The Page ID and the content to create a new unpublished page post. Specify `link_data`, `photo_data`, `video_data`, `text_data` or `template_data` with the content. |
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

Yes, there are several more sections in the document after the **Ad Account Ads** section (which you provided in the previous turn).

Here is the continuation of the document, starting with the next entry in the Marketing API Reference: **Ad Account Adsets**.

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

After the **Ad Account Adsets** section, there are **four** more complete sections in the Marketing API Reference:

1.  **Ad Account Adspixels**
2.  **Ad Videos**
3.  **Ad Account Async Batch Requests**
4.  **Ad Account Asyncadcreatives**
5.  **Ad Account Asyncadrequestsets**


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
````
