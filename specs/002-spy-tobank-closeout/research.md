# Research: Spy Tobank Closeout

Phase 0 decisions for `specs/002-spy-tobank-closeout`. Locked spec decisions are not reopened. `/mnt/project-files/spy-tobank-plan.md` and `/mnt/project-files/ui-ux-issues.md` were not readable. Removals named only in those files stay out of this plan.

## Decision 1: Keep the uncommitted tree

- **Decision**: Implement on the current git branch `spy-tobank/step-4-panels` (`c888250`). Do not create or switch branches. Do not stash, reset, or clean. Saved history is step 1 `a1fd589`, step 2 `ead3b0e`, and step 3 `c888250`. Panel, device, and recordings edits already in the working tree are the baseline.
- **Rationale**: The spec says that unsaved work must be kept. Spec Kit's feature id `002-spy-tobank-closeout` is only `.specify/feature.json`. `setup-plan.sh` prints that id as `BRANCH` when `SPECIFY_FEATURE` is unset. It did not change git state.
- **Alternatives considered**: A new `002-spy-tobank-closeout` branch. Rejected because a checkout would drop or hide the uncommitted panel work.

## Decision 2: Connection dialog stays in the SDK and stops locking the page

- **Decision**: Treat the on-device connection dialog as the SDK modal (`modal.show()`, class `page-spy-modal`, full-viewport `position: fixed`, `z-index: 13000`). In the existing patch:
  - Set `pointer-events: none` on the full-screen layer and `pointer-events: auto` on `.page-spy-modal-content`.
  - Do not set `overflow: hidden` on `document`, `documentElement`, or `body` when the dialog opens. If a patch or the host logger did, remove it.
  - Leave the card click handler in place so clicks on the card do not fall through. Clicks outside the card must reach the page.
  - Replace the `MutationObserver` on `document.documentElement` (`subtree: true`) in `smoke-test/client-logs.js`. Observe `#__pageSpy` only, disconnect while writing, and skip work when the footer actions are already mounted. `modal:show` may call that mount once.
  - Do not run `document.documentElement.outerHTML` (page snapshot) on the dialog-open path.
- **Rationale**: `modal.show()` adds `show`, fills the card, and dispatches `modal:show`. It does not itself freeze the JS thread. The page becomes unusable because the fixed layer covers the viewport and the root listener calls `stopPropagation` and `close`. A document-wide observer plus DOM writes is the stall risk while logs arrive. Both must be fixed to meet SC-001. The embed URL and `PageSpy` connect flow stay.
- **Alternatives considered**: A React dialog in the panel. Rejected because the freeze is on the device page. Removing the SDK modal. Rejected because sites already open this dialog to start a session.

## Decision 3: Manual upload, required note, no auto-capture

- **Decision**: A recording exists only after a successful `POST /api/v1/log/upload`. Clear logs empties the on-device buffer and the visible list and does not upload. New console or network activity after a clear is what "generate logs" means. The note dialog refuses a blank or whitespace note, explains that a note is required, and does not send the request. A failed response leaves the local buffer in place and does not add a row. Two successful uploads in one session are two recordings, each with its own note.
- **Rationale**: `openUploadDialog` currently labels the note optional and `buildUpload` sends `remark: remark || ''`. The spec requires a note. The panel list already reads the `remark` tag.
- **Alternatives considered**: Auto-upload on an interval or on disconnect. Rejected. Manual recordings are locked.

## Decision 4: Default retention is 168 hours on the API

- **Decision**: When `config.json` is missing, or it has no `maxLogLifeTimeOfHour`, the server process this product starts must use `168` (7 days). If the operator already set a number, leave that number. Do not add a retention control. Do not commit `config.json` (it is gitignored and may hold storage secrets). A local bootstrap may create or fill only the missing lifetime before `page-spy-api` starts. The client list and download follow the server: after expiry the file is gone, the row is absent, and a stale download shows an error instead of a broken file.
- **Rationale**: `@huolala-tech/page-spy-api` documents and defaults `maxLogLifeTimeOfHour` to `720` (30 days) when no file exists. That misses FR-008. The API already deletes expired files. A client-side hide would leave `/log/download` working.
- **Alternatives considered**: Forking the API package. Rejected. Overwriting a custom lifetime with 168. Rejected because a custom period is configuration, not a new control, and must be preserved.

## Decision 5: Layout breakpoint stays 768px

- **Decision**: Widths below 768px use the top bar, bottom tabs, and bottom-sheet detail. Widths of 768px and above use the left menu and side pane. The 768px check is "no horizontal blowout", not a third chrome. Phone text fields use at least 16px (`text-base`). From 768px up, fields may use the shorter desktop size. Touch targets on phone are at least 44px (`touch`, `icon-touch`, or `min-h-[44px]`).
- **Rationale**: `useIsDesktop` and Tailwind `md` already use `(min-width: 768px)`. The spec's phone example is 360px. Its desktop example is wider than 768px. At exactly 768px the existing desktop chrome fits the "no blowout" check.
- **Alternatives considered**: A third layout at 768px, or treating 768px as phone (`min-width: 769px`). Rejected. It would restyle the shell that step 3 already saved.

## Decision 6: Contrast inside the current violet palette

- **Decision**: Keep one violet accent and the dark neutrals. Change only lightness where a pair fails WCAG 2.2 AA.
  - `--primary` moves from `#8b5cf6` to `#7c3aed`. White (`#ffffff`) on `#8b5cf6` is 4.23:1, short of 4.5:1 for normal button text. White on `#7c3aed` is 5.70:1. `--sidebar-primary` matches.
  - `--primary-text` stays `#a78bfa` (7.14:1 on `#0b0d12`).
  - `--border` and `--input` move to `#5c6b86` so control edges clear 3:1 on `#0b0d12` (3.61), `#12151c` (3.39), and `#181c25` (3.17). `#2a3040` on `#0b0d12` is 1.48:1.
  - Foreground `#e7e9ee` and muted `#9aa3b2` on the dark surfaces already clear 4.5:1. Leave them.
  - Mirror the same hex values in the device token block (`smoke-test/client-logs.js`) and `scripts/patch-sdk-network.mjs`. Check rendered button hover as well as the token. If `hover:bg-primary/80` drops the label under 4.5:1, adjust that hover mix.
- **Rationale**: FR-012 and FR-014. A second accent hue is locked out. These edits stay in the same violet and neutral families.
- **Alternatives considered**: Leaving `#8b5cf6` and calling button text "large text". Rejected. `text-sm font-medium` is not WCAG large text. Switching the label to a dark color on the current violet. Rejected in favor of one darker violet with white labels, which matches the current button.

## Decision 7: Error screen drops the source-host link

- **Decision**: Remove the GitHub issues link from `src/components/ErrorBoundary/index.tsx` (`VITE_GITHUB_REPO/issues`). Keep the retry action. Do not add another outbound link. `github-dark` as a Shiki theme name is not a link and stays.
- **Rationale**: FR-016. The visible "Report" anchor is the source-host link.
- **Alternatives considered**: Pointing the link at a fork homepage. Rejected. The requirement is no source-host link.

## Decision 8: Page and Element stay on the panel

- **Decision**: `Page` remains a Devtools menu item. Element inspection remains inside `BrowserFrame` on the panel. The on-device logger sections stay console and network only. Do not add Page or Element controls to `client-logs.js` or the SDK footer.
- **Rationale**: FR-010 and SC-007. The working tree already matches this split.
- **Alternatives considered**: Mirroring Page and Element on the device. Rejected.

## Decision 9: English, one theme, leftovers

- **Decision**: `src/assets/locales/index.ts` stays `lng: 'en'` only. No locale switcher. Quality pass deletes unused dependencies, dead files, unused icons, and unused `en.json` keys. Colors in product chrome come from the shared tokens. The smoke-test host page (`smoke-test/index.html`) is the page under test, not product chrome. Its fixture colors are not a second theme. SDK chrome, the on-device logger, and the React client use the shared palette.
- **Rationale**: FR-011 and FR-015. Restyling the fixture page does not change the product.
- **Alternatives considered**: Darkening `smoke-test/index.html` to match the panel. Rejected. That page stands in for the customer's app.

## Decision 10: Verification commands stay the ones the repo already has

- **Decision**: Release checks are `yarn tsc --noEmit` and `yarn build:client`. There is no `yarn build` script. The device check uses the in-repo smoke-test page and the panel. Do not run or modify `/Users/ali/Works/appstudio-runtime`.
- **Rationale**: SC-008 and constitution VIII. `package.json` scripts are `start:client`, `start:server`, and `build:client`.
- **Alternatives considered**: Adding a unit-test runner for the closeout. Rejected. The spec's release bar is the existing type check and production package.
