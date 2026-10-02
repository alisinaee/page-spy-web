# Quickstart: Spy Tobank Closeout

Validation guide for the closeout. Implementation steps belong in `tasks.md`. Do not stash, reset, or switch branches. The working tree on `spy-tobank/step-4-panels` is the baseline.

Details live in [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md), and [contracts/recordings-api.md](./contracts/recordings-api.md).

## Prerequisites

- Node.js 18 or newer
- Yarn
- Repo root: this checkout
- Do not run or edit `/Users/ali/Works/appstudio-runtime`

Install, then publish the SDK script (postinstall also runs this):

```bash
yarn install --frozen-lockfile
```

## 1. Type check and production package

```bash
yarn tsc --noEmit
yarn build:client
```

Expected: both exit 0. There is no `yarn build` script.

## 2. Run the panel and the device page

Terminal A, from the repo root so the API reads this directory:

```bash
yarn start:server
```

Confirm the process is using `maxLogLifeTimeOfHour` 168 when no custom value was set. If a `config.json` in this directory already sets another number, leave it and record that number. Do not commit `config.json`.

Terminal B:

```bash
yarn start:client
```

Open the panel (Vite prints the URL) and the smoke-test device page that loads `page-spy/index.min.js` from that panel. The device page is `smoke-test/index.html`. Use it as the customer page. Do not treat its fixture colors as product chrome.

## 3. Connection dialog

On the device page, at a phone width and again on desktop:

1. Open the PageSpy connection dialog.
2. Within 1 second, scroll the page and tap a control outside the dialog.
3. Expected: the page moves and the tap runs. Typing outside the dialog still works.
4. Generate a few logs with the dialog still open and scroll again. Expected: the page does not stick.
5. Close the dialog. Expected: the page behaves as it did before.
6. Repeat the open step 10 times. Expected: no freeze (SC-001).

## 4. Manual recording

On one live device, with the panel open on `/devtools` and `/recordings`:

1. Clear logs. Expected: the device list is empty and `/recordings` does not gain a row.
2. Clear again with nothing present. Expected: empty state, no error, no row.
3. Generate console and network activity. Upload with a blank note. Expected: a clear refusal, no request stored, no new row, local logs still there.
4. Upload the same logs with a note. Expected: a row on `/recordings` identified by that note.
5. Open it. Expected: a timeline of those logs.
6. Download it. Expected: a JSON file.
7. Upload a second note in the same session. Expected: two rows.
8. Stop the API or block the upload and try again. Expected: no new row, local logs remain, retry works after the API is back.
9. Leave a session without uploading. Expected: no recording was created.

Page and Element appear on the panel only. The device logger does not show them. The same device is usable from the panel and from the device.

## 5. Retention

With no custom `maxLogLifeTimeOfHour`, a new recording is listed and downloadable. The server setting that will delete it is 168 hours. After that lifetime (or after a temporary non-production lifetime used only to watch the sweeper), the row is gone and download shows an error rather than a broken file. Restore 168, or the operator's previous custom value, when the temporary check is over.

## 6. Layout, contrast, and leftovers

Check `/room-list`, `/devtools`, `/recordings`, and `/recordings/view` at 360px, 768px, and 1280px.

- 360px: top bar, bottom tabs, detail as a bottom sheet, controls at least 44px, text fields at least 16px, no horizontal page scroll. A bottom sheet can be dismissed and primary navigation still works. Focusing a text field does not zoom the page.
- 768px and 1280px: no horizontal page scroll. 768px and up use the left menu and side pane.
- Text and controls use the shared palette and meet the ratios in research decision 6.
- The error screen (throw once inside the React tree) has no source-host link.
- UI copy is English. The theme is the one dark theme.
- A review finds no unused libraries, leftover files, unused icons, unused `en.json` strings, or product-chrome colors outside the palette.

## 7. Embed path

A page that loads `page-spy/index.min.js` still connects the way it did before this closeout. Only dialog hit-testing and the recording rules above change.
