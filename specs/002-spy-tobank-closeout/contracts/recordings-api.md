# Recordings API Contract

Existing PageSpy API. This closeout does not add endpoints. Paths below are the ones the device and the panel already call. The client prefix is `/api/v1` (`request.defaultPrefix`).

## Upload

`POST /api/v1/log/upload`

Query (tags stored on the log):

| Name      | Required | Rule                                                                           |
| --------- | -------- | ------------------------------------------------------------------------------ |
| remark    | yes      | Non-empty note. The device must not call this endpoint when the note is blank. |
| project   | no       | SDK project id, may be empty.                                                  |
| title     | no       | SDK title, may be empty.                                                       |
| deviceId  | no       | Device id used later by the viewer link.                                       |
| userAgent | no       | Browser UA string.                                                             |

Body: `multipart/form-data` with one part `log`, a JSON file. The JSON array contains console and network events plus a final `meta` object (`ua`, `title`, `url`, `startTime`, `endTime`, `remark`). Event `data` may be deflate-compressed.

Success: JSON `{ success: true, ... }`. The new file then appears in the list with the same `remark`.

Failure: non-OK HTTP or `success: false`. The device keeps its buffer and the list does not gain a row.

This endpoint is not called for clear, for session start, or for leaving a session.

## List

`GET /api/v1/log/list?page={n}&size={n}`

Response `data.data[]` items match `I.SpyLog` (`fileId`, `name`, `size`, `createdAt`, `tags[]`). The panel reads `remark` from tags.

Rows older than the active lifetime are absent because the server deleted them. The panel does not invent a second expiry filter that hides a file the server would still download.

## Download

`GET /api/v1/log/download?fileId={fileId}`

Returns the JSON file while the log is retained. The panel sends the same auth header as other API calls when a password is set.

When the file is gone, the call fails. The UI shows an error and does not write a download.

## Delete

`DELETE /api/v1/log/delete?fileId={fileId}`

Manual delete of one retained log. Independent of the 7-day sweeper. Already implemented on the recordings page. Closeout does not remove it.

## Retention

Server config key `maxLogLifeTimeOfHour` (integer hours).

| Config state                         | Effective lifetime    |
| ------------------------------------ | --------------------- |
| `config.json` missing, or key absent | 168 hours (7 days)    |
| Key set by the operator              | That value, unchanged |

The API process deletes the file after the lifetime. No client cron and no new settings endpoint.

## Embed script

`GET /page-spy/index.min.js`

Same path and the same PageSpy connection behavior (address, secret, room join). Dialog hit-testing may change as described in [ui.md](./ui.md). The file is produced by `scripts/public-files.sh` plus `scripts/patch-sdk-network.mjs`. `client-logs.js` is loaded next to that script and is not a second public embed URL for customers.
