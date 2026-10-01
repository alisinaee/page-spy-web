# Data Model: Spy Tobank Closeout

Entities for the closeout. Field names match the current client where it already stores them.

## Recording (list row)

A manual snapshot created only by a successful upload. Source: `GET /api/v1/log/list`, mapped in `src/pages/Recordings/utils.ts` (`toRecording`).

| Field     | Type          | Rules                                                                                                                                     |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| fileId    | string        | Server id. Required for open, download, and delete.                                                                                       |
| name      | string        | Stored file name. Download uses this plus `.json` when needed.                                                                            |
| size      | number        | Bytes. Display only.                                                                                                                      |
| createdAt | string (date) | Start of the retention window.                                                                                                            |
| remark    | string        | Required note. Tag key `remark`. Blank is invalid and must not be stored by a new upload. The list identifies the recording by this note. |
| project   | string        | Tag `project`. May be empty.                                                                                                              |
| title     | string        | Tag `title`. May be empty.                                                                                                                |
| deviceId  | string        | Tag `deviceId`. Optional. Carried into the viewer query.                                                                                  |
| userAgent | string        | Tag `userAgent`. Display only.                                                                                                            |

Relationships:

- One device session may produce many recordings. Each upload is its own row, note, and timeline.
- A recording has one stored file and one parsed timeline.

Validation:

- Create only after `POST /api/v1/log/upload` returns success.
- Reject an empty note before the request.
- A failed upload adds no row and does not clear the device buffer.
- Clear logs adds no row.

State:

- **Retained**: `createdAt` is within the active lifetime (168 hours when no custom `maxLogLifeTimeOfHour` is set). Listed and downloadable.
- **Expired**: past that lifetime. The API removes the file. The row is absent. Download fails with a visible error, not a broken file.
- There is no client-side "pending recording" record. Until upload succeeds, the events exist only in the device buffer.

## Recording file (timeline)

Parsed by `parseRecording` in `src/store/recording.ts`. The file is a JSON array of `{ type, timestamp, data }`. `data` may be a deflate latin1 string or a plain object.

| Field                         | Type                      | Rules                                                                            |
| ----------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| meta.remark                   | string                    | Same note as the list row.                                                       |
| meta.ua, meta.title, meta.url | string                    | Captured at upload.                                                              |
| meta.startTime, meta.endTime  | number (epoch ms)         | Timeline bounds. Fall back to the first and last non-meta timestamps.            |
| console                       | console items             | `type === 'console'`.                                                            |
| network                       | network rows              | `type === 'network'`, merged by request id.                                      |
| marks                         | `{ kind, time, refId }[]` | `kind` is `error` (console error) or `request` (failed network). Sorted by time. |

The viewer is read-only. It does not write the live socket store.

## Connection dialog

Not a stored entity. Runtime state of the SDK modal on the device.

| Field    | Rules                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| open     | `page-spy-modal` has class `show`.                                                                                               |
| blocking | Must stay false. The page scrolls and receives taps and typing outside the card.                                                 |
| actions  | Copy debug link, download logs, see logs, upload logs, clear logs, log settings. Upload stays disabled when the buffer is empty. |

Transitions:

- Closed to open: `modal.show()`. The page stays responsive within 1 second.
- Open to closed: close control, or a follow-up action that already closes it (upload, see logs). Dismissing it restores the previous page behavior.
- Open while logs arrive: still responsive.

## Device session

One live device, seen from the panel (`/devtools`) and from the device (SDK plus on-device logger) at the same time.

| Field       | Rules                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------- |
| address     | Connection address already used by PageSpy. Unchanged.                                    |
| buffer      | On-device console and network events since the last clear. Not a recording.               |
| panel view  | Console, Network, Storage, System, and Page. Element inspection sits on the page preview. |
| device view | Console and network only. No Page or Element entry.                                       |

## Shared palette

Single dark set and one violet accent. Defined in `src/styles/shadcn.css` and copied to the device logger and SDK patch. See research decision 6 for the contrast edits.

| Token                               | Role                                                         |
| ----------------------------------- | ------------------------------------------------------------ |
| background, card, popover           | Dark surfaces                                                |
| foreground, muted-foreground        | Text. At least 4.5:1 on the surface behind it                |
| primary, primary-foreground         | Violet control and its label. Label at least 4.5:1           |
| primary-text                        | Violet text on dark surfaces                                 |
| border, input                       | Control edges. At least 3:1 on background, card, and popover |
| destructive, success, warning, info | Status colors already in the set. No extra hues              |

## Retention configuration

Not a user-facing entity. Server file `config.json` in the API process working directory.

| Field                | Rules                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| maxLogLifeTimeOfHour | Hours until the API deletes an uploaded log. Missing file or missing key means 168 for this product. A value the operator already set is left as-is. |

No client field stores a custom period. No settings screen edits it.
