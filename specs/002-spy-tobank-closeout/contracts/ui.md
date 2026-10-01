# UI Contract: Spy Tobank Closeout

Product chrome only. The smoke-test host page is the customer page under test and is outside this contract. Token values and the dialog behavior are decided in [research.md](../research.md). Entities are in [data-model.md](../data-model.md).

## 1. Connection dialog (device)

- Trigger: the existing PageSpy float button calls `modal.show()`.
- The dialog card stays visible and usable (copy link, clear, upload, see logs, settings, download).
- The full-screen layer does not take pointer events. The card does.
- Opening it does not set page `overflow: hidden` and does not freeze the main thread.
- Outside the card, scroll, taps, and typing work within 1 second, including while new logs arrive.
- Closing it leaves the page as it was before open.
- Script URL remains `page-spy/index.min.js`. Connection address and secret behavior stay as they are.

## 2. Manual recording flow (device)

- Clear logs empties the visible device log list and the upload buffer. It creates no recording. Clearing an already empty buffer shows the empty state and no error.
- After a clear, new console or network activity can be recorded and then uploaded.
- Upload asks for a note. Empty or whitespace notes are refused with a clear message. No request is sent and no recording is created.
- Upload of a non-empty note, on success, creates one server recording identified by that note.
- Upload failure (including a dropped connection) leaves the local logs in place, adds no panel row, and lets the person retry.
- Nothing is uploaded merely because a session is open or the person leaves.

## 3. Recordings panel

- Route `/recordings` lists retained recordings. Each row shows its note.
- Open goes to `/recordings/view` and shows the timeline of that file (console and network, with error and failed-request marks).
- Download fetches the retained file and saves it. If the file is already gone, the panel shows an error and does not save a broken file.
- Two uploads in one session produce two rows.
- Phone: top bar and bottom tabs where the shell uses them; row actions are at least 44px. Detail sheets on phone open from the bottom. Desktop (768px and up): left menu pattern already used by the shell, detail in a side pane.
- The recordings index and viewer follow that same sheet rule for their detail, using `useIsDesktop` (`min-width: 768px`).

## 4. Debugging panel and device split

- `/devtools` on a phone: top bar, bottom tabs, detail as a bottom sheet.
- `/devtools` at 768px and wider: left menu, detail in a side pane.
- Page inspection is a panel menu item. Element inspection is on the panel page preview only.
- The device logger does not offer Page or Element.
- A live device works from `/devtools` and from the device in the same session.

## 5. Touch, type, and fit

- Phone controls: at least 44px (`touch`, `icon-touch`, or `min-h-[44px]` / `min-w-[44px]`).
- Phone text fields, including the device note field: at least 16px so focus does not zoom the page.
- At 360px, 768px, and a desktop width (1280px), the page does not scroll horizontally.
- With a bottom sheet open at 360px, the person can dismiss it and reach primary navigation.

## 6. Palette and contrast

- Product colors come from `src/styles/shadcn.css`. Device chrome copies those hex values. No one-off colors in product chrome.
- One dark theme. One violet accent (`--primary` `#7c3aed` after the contrast edit).
- Normal text at least 4.5:1. Large text and control boundaries at least 3:1. Pairs and the border/input edit are in research decision 6.
- English only. No locale switcher.

## 7. Error screen

- `ErrorBoundary` shows the failure and a retry control.
- It does not link to the source host (`VITE_GITHUB_REPO` or any other source URL).
- Retry remains at least 44px on a phone.

## 8. Leftovers

- No unused runtime dependencies, dead files, unused icons, or unused `en.json` strings after the quality pass.
- `react-window` stays while the recording viewer imports it.
- New shadcn components, if any, are added with `npx shadcn@latest add <name>` only.
