---
description: 'Task list for Spy Tobank closeout'
---

# Tasks: Spy Tobank Closeout

**Input**: Design documents from `/specs/002-spy-tobank-closeout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested. Do not add a test runner. Verification is `yarn tsc --noEmit`, `yarn build:client`, and the manual checks in `specs/002-spy-tobank-closeout/quickstart.md`.

**Organization**: Tasks follow user stories so each story can be implemented and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task names a file path

## Path Conventions

- React panel: `src/`
- Device SDK patch: `scripts/patch-sdk-network.mjs`, published by `scripts/public-files.sh` to `public/page-spy/index.min.js`
- On-device logger: `smoke-test/client-logs.js`, copied beside that script as `public/page-spy/client-logs.js`
- Stay on git branch `spy-tobank/step-4-panels` at `c888250`. Do not stash, reset, checkout, or clean. Do not commit unless the user asks.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Keep the existing tree and the existing release commands

- [x] T001 Confirm `.git/HEAD` is `spy-tobank/step-4-panels` at `c888250` and leave the uncommitted files under `src/`, `scripts/`, and `smoke-test/` in place. Do not create or switch a branch.
- [x] T002 [P] Confirm `package.json` keeps Yarn scripts `start:client`, `start:server`, and `build:client`, and that the root `package.json` has no `"type": "module"`. Do not add a dependency in this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The public embed path both the dialog fix and the logger publish through

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Confirm `scripts/public-files.sh` copies `node_modules/@huolala-tech/page-spy-browser/dist/iife/index.min.js` to `public/page-spy/index.min.js`, runs `scripts/patch-sdk-network.mjs` on that file, and copies `smoke-test/client-logs.js` to `public/page-spy/client-logs.js`. Leave the customer URL `page-spy/index.min.js` unchanged.

**Checkpoint**: Publish path is intact. User stories can start.

---

## Phase 3: User Story 1 - Page stays usable while the connection dialog is open (Priority: P1) 🎯 MVP

**Goal**: Opening the on-device SDK connection dialog does not freeze the page. Scroll, taps, and typing outside the card still work within 1 second, including while new logs arrive.

**Independent Test**: On `smoke-test/index.html`, open the PageSpy connection dialog and immediately scroll the page and tap a control outside the dialog. The page moves and the tap registers. Repeat 10 times, including once while logs are arriving (SC-001).

### Implementation for User Story 1

- [x] T004 [P] [US1] In `scripts/patch-sdk-network.mjs` `buildSdkCss`, set `pointer-events: none` on `#__pageSpy .page-spy-modal` and `pointer-events: auto` on `#__pageSpy .page-spy-modal-content`. Keep clicks on the card. Clicks outside the card must reach the page. Do not set `overflow: hidden` on `document`, `documentElement`, or `body`.
- [x] T005 [US1] In `scripts/patch-sdk-network.mjs`, if the patched SDK sets `overflow: hidden` on `document`, `documentElement`, or `body` when `modal.show()` runs, stop that lock on open and restore nothing the host page did not already set. Do not change PageSpy address, secret, or room-join behavior.
- [x] T006 [P] [US1] In `smoke-test/client-logs.js`, replace the `MutationObserver` that calls `runMount` on `document.documentElement` with `{ childList: true, subtree: true }`. Observe `#__pageSpy` only, disconnect the observer while `mountDialogActions` writes, and return immediately when `#page-spy-upload-logs` and the other footer actions are already mounted. Keep one `modal:show` listener that mounts once.
- [x] T007 [US1] In `smoke-test/client-logs.js` and `scripts/patch-sdk-network.mjs`, confirm the dialog-open path does not read `document.documentElement.outerHTML`. Page snapshots stay on the existing PagePlugin refresh path and still return early when `window.PageSpyClientLogs.getSettings().pageSnapshots === false`.
- [x] T008 [US1] Run `scripts/public-files.sh` so `public/page-spy/index.min.js` and `public/page-spy/client-logs.js` include the dialog fix. Do not rename `page-spy/index.min.js`.

**Checkpoint**: User Story 1 is testable on the device page with the dialog open. No recording work is required for this check.

---

## Phase 4: User Story 2 - Save a manual recording and review it (Priority: P1)

**Goal**: A recording exists only after a successful upload with a required note. The person can clear, generate logs, upload, see the row, open the timeline, and download. With no custom retention, the server keeps the file for 168 hours.

**Independent Test**: Clear logs, generate console and network activity, refuse a blank note, upload with a note, open the timeline at `/recordings/view`, and download the JSON file (SC-002). A second note creates a second row. A failed upload adds no row and leaves the local buffer.

### Implementation for User Story 2

- [x] T009 [US2] In `smoke-test/client-logs.js` `openUploadDialog`, replace the label `Note (optional)` with a required note. `remark` is required: blank or whitespace is invalid and must not be stored by a new upload. On a blank note, set the status text to a clear English message that a note is required, do not call `uploadLogs`, and do not send a request. Keep `maxlength="300"` and the textarea font at 16px.
- [x] T010 [US2] In `smoke-test/client-logs.js` `buildUpload` and `uploadLogs`, reject a blank or whitespace `remark` before `fetch`. Do not call `POST /api/v1/log/upload` with an empty `remark`. On a non-OK response or `success: false`, leave `harbor` and `logs` in place so the person can retry.
- [x] T011 [US2] In `smoke-test/client-logs.js` `clear`, empty `logs`, `harbor`, `harborChars`, and `sectionCounts` only. Do not upload and do not add a recordings row. Clearing an already empty buffer shows the empty state and no error.
- [x] T012 [P] [US2] In `src/pages/Recordings/index.tsx` and `src/pages/Recordings/Viewer.tsx`, keep each row identified by `remark` (the required note). In `src/pages/Recordings/utils.ts` `downloadRecording` and `src/apis/index.ts` `requestGetLogFileContent`, a missing file must reject so the existing error message is shown and no download is written. Do not add a second client expiry filter that hides a file the server would still download.
- [x] T013 [P] [US2] Add `scripts/ensure-log-retention.mjs` and call it from the `start:server` script in `package.json` before `page-spy-api`. If `config.json` is missing or has no `maxLogLifeTimeOfHour`, set that key to `168` and leave every other key unchanged. If the operator already set a number, leave that number. Do not commit `config.json` (it is listed in `.gitignore`). If the API rejects a one-key file, write the upstream example shape with only the lifetime set to `168` when the file was missing.
- [x] T014 [P] [US2] Update the Recordings section in `README.md`: the note is required, and `yarn start:server` uses `168` hours when `maxLogLifeTimeOfHour` is unset. A custom value stays as set. Do not describe a retention settings screen.
- [x] T015 [US2] Run `scripts/public-files.sh` after the `smoke-test/client-logs.js` upload changes so `public/page-spy/client-logs.js` matches.

**Checkpoint**: User Stories 1 and 2 both work. Clear does not create a recording. Two uploads in one session are two rows.

---

## Phase 5: User Story 3 - Closeout quality on phone, tablet, and desktop (Priority: P2)

**Goal**: One dark palette, WCAG 2.2 AA pairs, 44px phone targets, 16px phone fields, no source-host link, no leftovers, and the same live device usable from the panel and the device. Page and Element stay on the panel only.

**Independent Test**: Walk `/room-list`, `/devtools`, `/recordings`, and `/recordings/view` at 360px, 768px, and 1280px with one live device. At 360px the shell is a top bar, bottom tabs, and a bottom sheet. At 768px and up it is a left menu and a side pane. No horizontal page scroll.

### Implementation for User Story 3

- [x] T016 [P] [US3] In `src/styles/shadcn.css`, set `--primary`, `--sidebar-primary`, and `--chart-1` from `#8b5cf6` to `#7c3aed`. Set `--border` and `--sidebar-border` from `#2a3040` to `#5c6b86`. Set `--input` from `#566078` to `#5c6b86`. Leave `--primary-text` at `#a78bfa`, `--foreground` at `#e7e9ee`, and `--muted-foreground` at `#9aa3b2`.
- [x] T017 [P] [US3] Mirror those hex values in the `--spyt-*` block in `smoke-test/client-logs.js` and in the `SPYT` object in `scripts/patch-sdk-network.mjs`: `primary` `#7c3aed`, `border` and `input` `#5c6b86`. Keep one violet accent. Do not restyle fixture colors in `smoke-test/index.html`.
- [x] T018 [US3] In `src/components/ui/button.tsx` and `src/components/ui/badge.tsx`, check `hover:bg-primary/80` with a white label on the new `--primary`. If that mix is under 4.5:1, change the hover so normal button text stays at least 4.5:1.
- [x] T019 [P] [US3] Remove the source-host anchor (`VITE_GITHUB_REPO/issues`) from `src/components/ErrorBoundary/index.tsx`. Keep retry, and make that control at least 44px tall on a phone. Update `error.actions` in `src/assets/locales/en.json` so the sentence no longer includes Report, and remove `error.report` if nothing else uses it.
- [x] T020 [US3] Audit phone controls in `src/pages/Devtools`, `src/pages/Recordings`, `src/pages/RoomList`, `src/pages/Layouts`, and `src/components/panel` so each touch control is at least 44px (`touch`, `icon-touch`, `min-h-[44px]`, or `min-w-[44px]`). Phone text fields, including the console input and the note textarea in `smoke-test/client-logs.js`, stay at least 16px (`text-base` or `font:16px`). From the `md` breakpoint up, shorter desktop sizes may remain.
- [x] T021 [P] [US3] Confirm Page stays a menu item under `src/pages/Devtools` and Element stays inside `src/pages/Devtools/BrowserFrame`. Confirm `smoke-test/client-logs.js` offers console and network only. Do not add Page or Element controls to the device footer.
- [x] T022 [US3] Remove unused runtime dependencies from `package.json` and unused keys from `src/assets/locales/en.json`. Remove the unused `url === 'demo'` branch and `src/apis/demo.json` import in `src/apis/index.ts` if no caller passes `demo`. Keep `react-window` while `src/pages/Recordings/Viewer.tsx` imports it. Do not add `react-virtualized`. Product chrome colors must come from `src/styles/shadcn.css`. Leave `src/assets/locales/index.ts` on English only.
- [x] T023 [US3] Run `yarn tsc --noEmit` and `yarn build:client`. Both must exit 0. If T016 or T017 changed tokens, run `scripts/public-files.sh` again so `public/page-spy/index.min.js` and `public/page-spy/client-logs.js` match.

**Checkpoint**: All three stories work. Type check and the production package succeed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Run the closeout checks without touching git history

- [ ] T024 Walk sections 3 through 7 of `specs/002-spy-tobank-closeout/quickstart.md` on the panel and `smoke-test/index.html` at 360px, 768px, and 1280px. Do not run or edit `/Users/ali/Works/appstudio-runtime`.
- [x] T025 Confirm a page that loads `public/page-spy/index.min.js` still uses the same connection address and secret behavior. The only intended behavior change is dialog hit-testing plus the recording rules above.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start here.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2 or US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Also edit `smoke-test/client-logs.js` only after T006, because US1 and US2 share that file.
- **User Story 3 (Phase 5)**: Depends on Foundational. Token edits in `smoke-test/client-logs.js` and `scripts/patch-sdk-network.mjs` come after US1 and US2 edits to those files.
- **Polish (Phase 6)**: Depends on the stories you intend to ship.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No other story required.
- **User Story 2 (P1)**: Starts after Foundational. Independently testable, but the shared logger file should be edited after US1.
- **User Story 3 (P2)**: Starts after the shared files from US1 and US2 are stable. Layout behavior is already in the working tree; this story checks and corrects it.

### Within Each User Story

- US1: T004 and T006 can run together. T005 follows T004. T007 follows T004 and T006. T008 is last.
- US2: T009, then T010, then T011, all in `smoke-test/client-logs.js`. T012, T013, and T014 can run together beside that chain. T015 is last.
- US3: T016, T017, and T019 can run together. T018 follows T016. T020 follows T018. T022 follows the UI edits. T023 is last.

### Parallel Opportunities

- T002 can run beside T001.
- T004 and T006 can run together.
- T012, T013, and T014 can run together.
- T016, T017, and T019 can run together.
- T021 can run beside T016 and T019.

---

## Parallel Example: User Story 1

```bash
Task: "pointer-events on the SDK modal in scripts/patch-sdk-network.mjs"
Task: "Narrow the MutationObserver in smoke-test/client-logs.js"
```

## Parallel Example: User Story 2

```bash
Task: "Download failure path in src/pages/Recordings and src/apis/index.ts"
Task: "168-hour default in scripts/ensure-log-retention.mjs and package.json"
Task: "Required-note wording in README.md"
```

## Parallel Example: User Story 3

```bash
Task: "Contrast tokens in src/styles/shadcn.css"
Task: "Mirror tokens in smoke-test/client-logs.js and scripts/patch-sdk-network.mjs"
Task: "Remove the source-host link in src/components/ErrorBoundary/index.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Open the connection dialog and scroll and tap outside it
5. Continue only after that check passes

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → dialog stays responsive → check independently
3. User Story 2 → manual recording with a required note and a 168-hour default → check independently
4. User Story 3 → contrast, touch, type, leftovers, type check, production package
5. Polish → quickstart walk at 360px, 768px, and 1280px

### Parallel Team Strategy

After Foundational:

1. One person owns `scripts/patch-sdk-network.mjs` and the observer change (US1)
2. After that file is free, the recordings note, retention bootstrap, and panel download path (US2)
3. Palette, error screen, and leftover pass (US3) after those shared files settle

Do not split two people onto `smoke-test/client-logs.js` at the same time.

---

## Notes

- [P] tasks use different files and do not wait on an unfinished task
- [US1], [US2], and [US3] map to the three stories in `spec.md`
- Do not commit, push, or open a PR unless the user asks
- `config.json` stays gitignored
- Do not modify or run `/Users/ali/Works/appstudio-runtime`
