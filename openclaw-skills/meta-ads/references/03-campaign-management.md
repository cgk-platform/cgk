<\!-- Source: META-ADS-API-GUIDE.md, Lines 880-939 -->

# Ad Campaign Management

Managing ad campaigns through the Marketing API involves several key operations: modifying campaign settings, pausing and resuming campaigns, and deleting campaigns.

## Modify an Ad Campaign

To update an existing ad campaign, you can send a `POST` request to the `/<CAMPAIGN_ID>` endpoint. You can change various settings, including the campaign's `objective`, `budget`, and `targeting` attributes.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID> \
  -F 'objective=CONVERSIONS' \
  -F 'daily_budget=2000' \
  -F 'status=ACTIVE' \
  -F 'access_token=<ACCESS_TOKEN>'
```

## Pause an Ad Campaign

Temporarily stopping a campaign can help you reassess your strategy without deleting the campaign entirely. To pause a campaign, update its status to `PAUSED`.

**Example API Request:**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID> \
  -F 'status=PAUSED' \
  -F 'access_token=<ACCESS_TOKEN>'
```

To resume the campaign, you can set the status back to `ACTIVE`.

## Archive an Ad Campaign

If you want to temporarily stop a campaign without deleting it, you can archive it instead. To do this, send a `POST` request to the `/<CAMPAIGN_ID>` endpoint with the `status` parameter set to `ARCHIVED`.

**Example API Request**

```curl
curl -X POST \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID> \
  -F 'status=ARCHIVED \
  -F 'access_token=<ACCESS_TOKEN>'
```

Note that archiving a campaign will stop it from running, but it can be easily restored by changing its status back to `ACTIVE`.

## Delete an Ad Campaign

When you need to permanently remove a campaign, send a `DELETE` request to the `/<CAMPAIGN_ID>` endpoint.

Be cautious when deleting campaigns, as this action cannot be undone. Always double-check the campaign ID before deletion to avoid accidental loss of data.

**Example API Request**

```curl
curl -X DELETE \
  https://graph.facebook.com/v24.0/<CAMPAIGN_ID> \
  -F 'access_token=<ACCESS_TOKEN>'
```
