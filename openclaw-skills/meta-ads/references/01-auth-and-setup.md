<\!-- Source: META-ADS-API-GUIDE.md, Lines 500-714 -->

# Get Started with the Marketing API

To effectively utilize the Marketing API, users must follow some key steps to set up their environment and gain access to the API's features. This section outlines the prerequisites necessary for getting started.

## Ad Account Requirements

To manage your ads through the Marketing API, you must have an active ad account. This account is crucial not only for running campaigns but also for managing billing settings and setting spending limits. An ad account allows you to track your advertising expenses, monitor performance, and optimize your campaigns effectively.

### Finding Your Ad Account Number

Locating your ad account number can be done through the Meta Ads Manager.

- **Log into Facebook:** Start by logging into your Facebook account that is associated with your business.
- **Access Ads Manager:** Ads Manager can be found in the drop-down menu in the upper right corner of your Facebook homepage or business page.
- **Locate your ad account:** In Ads Manager, click on the ad account **Settings** from the menu on the bottom left of the screen.
- **View ad account information:** In the Settings screen, you will find your ad account number listed along with other details such as your billing information and spending limits.

## Meta Developer Account

See [Register as a Meta Developer](https://developers.facebook.com/docs/development/register/) for more information.

## Create an App

See [Create an App](https://developers.facebook.com/docs/development/create-an-app/) for more information on setting up an app in the App Dashboard as well as app types and use cases.

## Authorization and Authentication

See [Authorization](#authorization) for more information on verifying the users and apps that will be accessing the Marketing API and granting them permissions.
See [Authentication](#get-an-access-token-for-ad-accounts-you-manage) for more information on getting, extending, and renewing access tokens with the Marketing API.

## Next Steps

- [Create an Ad Campaign](#create-an-ad-campaign)
- [Manage Ad Campaigns](#ad-campaign-management)
- [Optimize Ad Campaigns](#ad-optimization-basics)

# Authorization

The authorization process verifies the users and apps that will be accessing the Marketing API and grants them permissions.

## App Roles

In your app's dashboard, you can set roles for yourself or team members as necessary: Admin, Developer, Tester.

**Note:** Depending on your intended use case, you may need to submit your app for review to gain access to specific permissions related to ad management.

## Access Levels, Permissions, and Features

Business apps are subject to an additional layer of Graph API authorization called access levels. During App Review, your app must also request specific permissions and features.

Each level has restrictions, see [Access Levels And Features](https://developers.facebook.com/docs/development/release/access-levels/) for more information. All developers also must follow all Meta [Platform Terms](https://developers.facebook.com/policy/) and [Developer Policies](https://developers.facebook.com/policy/details/). Calls on **ANY** access level are against production data.

### Marketing API Access Levels vs. Ads Management Standard Access

Permissions and features for apps have two different access levels: **standard access** and **advanced access** (Note: The use of the term "standard access" here is not related to the Ads Management Standard Access feature.) The advanced access level of Ads Management Standard Access still requires an app to pass through review in order to have access to the feature.

### Marketing API Access vs Ads Management Standard Access Mapping

| Marketing API Access | Ads Management Standard Access | Action                 |
| :------------------- | :----------------------------- | :--------------------- |
| Development access   | Standard access                | By default             |
| Standard access      | Advanced access                | Apply in App Dashboard |

To check your current access level, go to **App Dashboard > App Review > Permissions and Features**.

## Permissions and Features

### Permissions

The permissions you should request change depending on which API you want to access.

If your app is only managing your ad account, standard access to the `ads_read` and `ads_management` permissions are sufficient. If your app is managing other people's ad accounts, you need advanced access to the `ads_read` and/or `ads_management` permissions. See [all available permissions for business apps](https://developers.facebook.com/docs/permissions/reference/ads_management/).

### Features

The features you should request change depending on how you want to use our APIs. If you're managing ads, a common feature to request is **Ads Management Standard Access**. See [all available features for business apps](https://developers.facebook.com/docs/features/reference/ads-management-standard-access/).

### Feature access levels

| Feature Access Level | Description                                                                                                                                                                                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Standard access**  | Business apps are automatically approved for standard access for all permissions and features available to the Business app type.                                                                                                                                                                       |
|                      | Use this option if you're getting started. You can build end-to-end workflows before requesting full permissions, and you can access an unlimited number of ad accounts.                                                                                                                                |
|                      | Some API calls may not be available with standard access because they may belong to multiple accounts or the affected account can't be identified programmatically.                                                                                                                                     |
| **Advanced access**  | Advanced access must be approved through the App Review process on an individual permission and feature basis.                                                                                                                                                                                          |
|                      | To request advanced access, go to your app’s dashboard and click **App Review > Permissions and Features**.                                                                                                                                                                                             |
|                      | Find the permission or feature you would like to access and, under **Action**, click **Request advanced access**. You can select one or more features. Once you have selected your options, click **Continue the Request**. You'll be taken to a screen that guides you through the submission process. |
|                      | After you submit your information, Meta responds with an approval or denial and additional information if your app is not qualified for standard access.                                                                                                                                                |
|                      | If you're approved for advanced access, you need to do the following to maintain your status:                                                                                                                                                                                                           |
|                      | \* Have successfully made at least 1500 Marketing API calls in the last 15 days.                                                                                                                                                                                                                        |
|                      | \* Have made Marketing API calls with an error rate of less than 15% in the last 15 days.                                                                                                                                                                                                               |

### Access level significance

The table below shows how standard and advanced access levels impact the **Ads Management Standard Access** feature.

|                      | Standard Access                                                                                                                       | Advanced Access                                                                                                            |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **Account Limits**   | Manage an unlimited number of ad accounts. App admins or developers can make API calls on behalf of ad account admins or advertisers. | Manage an unlimited number of ad accounts, assuming you get `ads_read` or `ads_management` permission from the ad account. |
| **Rate Limits**      | Heavily rate-limited per ad account. For development only. Not for production apps running for live advertisers.                      | Lightly rate limited per ad account.                                                                                       |
| **Business Manager** | Limited access to Business Manager and Catalog APIs. No Business Manager access to manage ad accounts, user permissions and Pages.    | Access to all Business Manager and Catalog APIs.                                                                           |
| **System User**      | Can create 1 system user and 1 admin system user.                                                                                     | Can create 10 system users and 1 admin system user.                                                                        |
| **Page Creation**    | Cannot create Pages through the API.                                                                                                  | Cannot create Pages through the API.                                                                                       |

### Get Advanced Access

In order to get advanced access of **Ads Management Standard Access**, your app needs to meet these requirements:

- Have successfully made at least 1500 Marketing API calls in the last 15 days.
- Have made Marketing API calls with an error rate of less than 15% in the last 15 days.

If you're managing someone's ads, use the `scope` parameter to prompt them for the `ads_management` or `ads_read` permissions. Your app gets access when they click **Allow**.

```
https://www.facebook.com/v24.0/dialog/oauth?
  client_id=<YOUR_APP_ID>
  &redirect_uri=<YOUR_URL>
  &scope=ads_management
```

**Note:** When inputting the `YOUR_URL` field, put a trailing `/` (for example, `http://www.facebook.com/`).

### Example Use Cases

| Use Case                                                                                                        | What To Request                                                                              |
| :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| You want to read and manage ads for ad accounts you own or have been granted access to by the ad account owner. | **Permission:** `ads_management` **Feature:** Ads Management Standard Access                 |
| You want to read ad reports for ad accounts you own or have been granted access to by the ad account owner.     | **Permission:** `ads_read` **Feature:** Ads Management Standard Access                       |
| You want to pull ad reports from a set of clients and to both read and manage ads from another set of clients.  | **Permissions:** `ads_management` and `ads_read` **Feature:** Ads Management Standard Access |

## Business Verification

Business verification is a process that allows us to verify your identity as a business entity, which we require if your app will access sensitive data. [Learn more about the Business Verification process](https://developers.facebook.com/docs/development/release/business-verification/).

## Learn More

[Permissions Reference for Meta Technologies APIs](https://developers.facebook.com/docs/permissions/reference)

# Graph API Explorer

You can get a user access token using the Graph API Explorer. To learn how to use the Graph API Explorer to make API calls, see the [Graph API Explorer Guide](https://developers.facebook.com/docs/graph-api/explorer/).

1.  In the **Meta App** field, select an app to obtain the access token for.
2.  In the **User or Page** field, select **User Token**.
3.  In the **Add a Permission** drop-down under **Permissions**, select the permissions you need (for example, `ads_read` and/or `ads_management`).
4.  Click **Generate Access Token**. The box on top of the button is populated with the access token; store the token for later use.

## Debug

To get more information in the token you just generated, click on the information icon (`i`) in front of the token to open the **Access Token Info** table, which displays some basic information about the token. Click **Open in Access Token Tool** to be redirected to the [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).

While debugging, you can check:

- **App ID:** The app ID mentioned in the prerequisite section.
- **Expires:** A time stamp. A short-lived token expires in an hour or two.
- **Scopes:** Contains the permissions added in the Graph API Explorer.

## Extend your access token

1.  Paste your token in the text box of the **Access Token Debugger** and click **Debug**.
2.  Click **Extend Access Token** at the bottom of the **Access Token Info** table to get a long-lived token, and copy that token for later use.
3.  Check your new token’s properties using the Access Token Debugger. It should have a longer expiration time, such as "60 days", or "Never" under **Expires**. See [Long-Lived Access Token](https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing) for more information.

## System User Access Tokens

A system user access token is a type of access token that is associated with a system user account, which is an account that is created in Meta Business Manager for the purpose of managing assets and calling the Marketing API. System user access tokens are useful for server-to-server interactions where there is no user present to authenticate. They can be used to perform actions on behalf of the business, such as reading and writing business data, managing ad campaigns, and other ad objects.

One benefit of using a system user access token is that it does not expire, so it can be used in long-running scripts or services that need to access the Marketing API. Additionally, because system user accounts are not tied to a specific individual, they can be used to provide a level of separation between personal and business activity on Meta technologies.

System user tokens are also less likely subject to invalidation for other reasons compared to the long-lived user access tokens.

See [System Users](https://developers.facebook.com/docs/marketing-api/business-management/system-users/) for more information.

# Get an Access Token for Ad Accounts you Manage

After the owner of an ad account you are going to manage clicks the **Allow** button when you prompt for permissions, they are redirected to a URL that contains the value of the `redirect_uri` parameter and an authorization code:

```
http://YOUR_URL?code=<AUTHORIZATION_CODE>
```

You can then build the URL for an API call that includes the endpoint for getting a token, your app ID, your site URL, your app secret, and the authorization code you just received:

```
https://graph.facebook.com/v24.0/oauth/access_token?
  client_id=<YOUR_APP_ID>
  &redirect_uri=<YOUR_URL>
  &client_secret=<YOUR_APP_SECRET>
  &code=<AUTHORIZATION_CODE>
```

The API response should contain the generated access token:

- If you follow the server-side authentication flow, you get a persistent token.
- If you follow the client-side authentication flow, you get a token with a finite validity period of about one to two hours. This can be exchanged for a persistent token by calling the Graph API endpoint for [Extending Tokens](https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing).
- If the API is to be invoked by a system user of a business, you can use a system user access token.

You can debug the access token, check for expiration, and validate the permissions granted using the [access token debugger](https://developers.facebook.com/tools/debug/accesstoken) or the [programmatic validation API](https://developers.facebook.com/docs/facebook-login/access-tokens/validation).

# Storing the Token

Your token should be safely stored in your database for subsequent API calls. Moving tokens between your client and server must be done securely over HTTPS to ensure account security. Read more about the implications of moving tokens between your clients and your server.

You should regularly check for validity of the token, and if necessary, prompt for permissions renewal. Even a persistent token can become invalid in a few cases, including the following:

- A password changes
- Permissions are revoked

As user access tokens can be invalidated or revoked anytime for some reasons, your app should expect to have a flow to re-request permission from users. Check the validity of the user token when they start your app. If necessary, re-run the authentication flow to get an updated token.

If this is not possible for your app, you may need a different way to prompt for permissions. This can happen in cases where the API calls are not directly triggered by a user interface or are made by periodically run scripts. A possible solution is to send an email with instructions.

# Best Practices for Secure Credential Management

To ensure the security of user credentials and access tokens, you should adhere to the following best practices:

- **Use HTTPS:** Always transmit access tokens over secure connections (HTTPS) to prevent interception by malicious actors.
- **Store Tokens Securely:** Utilize secure storage solutions, such as encrypted databases, for storing access and refresh tokens, minimizing the risk of unauthorized access.
- **Limit Token Scope:** Request only the minimum necessary permissions, reducing the risk of overexposure to user data.
- **Implement Token Expiration:** Regularly refresh tokens and have a robust mechanism to handle expiration, ensuring continued access without exposing long-lived tokens.
