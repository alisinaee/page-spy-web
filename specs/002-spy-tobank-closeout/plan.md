# Implementation Plan: Spy Tobank Closeout

**Branch**: `spy-tobank/step-4-panels` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-spy-tobank-closeout/spec.md`

Spec Kit resolved this feature as `specs/002-spy-tobank-closeout` (`.specify/feature.json`). That name is the feature id, not a git branch. The git branch stays `spy-tobank/step-4-panels` at `c888250`. Panel, device, and recordings work is uncommitted on that branch and must be kept. This plan does not create, switch, stash, or reset a branch.

## Summary

Finish the Spy Tobank debugging client on the current working tree. Saved shell, token, and cleanup commits stay. The closeout makes the on-device connection dialog non-blocking, keeps recordings manual with a required note and a 7-day default retention, and runs a quality pass for contrast, 44px targets, 16px phone fields, one dark violet palette, leftover removal, and no source-host link on the error screen.

The connection dialog is the PageSpy SDK modal inside `#__pageSpy`. It is `position: fixed` over the whole viewport and its root click handler swallows clicks, so the page behind it cannot scroll or receive taps. The fix stays inside the existing SDK patch and on-device logger: the full-screen layer ignores pointer events, the card keeps them, and the document-wide mutation observer stops doing work on every page change. The public script stays `page-spy/index.min.js` with the same connection behavior.

Recordings already upload through `POST /api/v1/log/upload`, list through `/log/list`, and open in `/recordings/view`. The upload dialog still treats the note as optional, and the API binary keeps logs for 720 hours when `config.json` is absent. Closeout refuses a blank note before upload and makes 168 hours the default when no custom lifetime is set, without adding a retention control.

## Technical Context

**Language/Version**: TypeScript 5.3 / React 18.2

**Primary Dependencies**: Vite 6, Tailwind CSS v4, shadcn Base UI (`components.json` style `base-nova`, `@base-ui/react`), `lucide-react`, Zustand, `@huolala-tech/page-spy-browser` and `@huolala-tech/page-spy-api` 2.x, `react-window`

**Storage**: Uploaded recordings live on the PageSpy API (`/api/v1/log/*`). The client does not add a database. Server lifetime is `maxLogLifeTimeOfHour` in the API process `config.json` (gitignored). The binary default when that file is absent is 720 hours.

**Testing**: `yarn tsc --noEmit` and `yarn build:client`. Browser checks at 360px, 768px, and a desktop width (1280px) against the in-repo smoke-test device page and the panel. No new test runner.

**Target Platform**: Modern desktop and mobile browsers. The panel is the React client. The device UI is the patched SDK script plus `smoke-test/client-logs.js`, published to `public/page-spy/`.

**Project Type**: Web client (React panel) plus a patched browser SDK served as a static script

**Performance Goals**: With the connection dialog open, a scroll and a tap outside the dialog register within 1 second, including while new logs arrive (SC-001). Opening the dialog must not start a document-wide mutation loop or serialize `documentElement.outerHTML`.

**Constraints**: Yarn only. Do not add `"type": "module"` to the root `package.json`. Do not modify or run `/Users/ali/Works/appstudio-runtime`. Tailwind preflight stays as it is in the current `src/styles/shadcn.css` (see Complexity Tracking). Phone controls are at least 44px. Phone text fields are at least 16px. English only. One dark theme, one violet accent. Manual recordings only. Page and Element inspection stay on the main panel. Public embed path and connection behavior stay `page-spy/index.min.js`.

**Scale/Scope**: Existing routes `/room-list`, `/devtools`, `/recordings`, `/recordings/view`, plus the on-device SDK modal and logger. No new product surface. Uncommitted files under `src/`, `scripts/`, and `smoke-test/` are the implementation baseline.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Mobile-First Design**: Phone layout (under 768px) keeps the top bar, bottom tabs, and bottom-sheet detail. 768px and wider keep the left menu and side pane. 360px, 768px, and desktop must not blow out horizontally.
- [x] **Pure Dark Theme**: `.dark` stays on. One palette in `src/styles/shadcn.css`, mirrored on the device. No second theme and no light product surfaces.
- [x] **Lean Bundle**: No new runtime dependency. Closeout removes unused libraries, files, icons, and translation strings. `react-window` stays because the recording viewer uses it. Do not add `react-virtualized`.
- [x] **Canonical shadcn Workflow**: New React controls come from `@/components/ui` via `npx shadcn@latest add <name>`. No `--all` and no hand-copied registry source. The device logger stays vanilla JS and must not import React.
- [x] **Screen Migration Quarantine**: Ant Design is already gone from `src/`. This closeout does not reintroduce it. Debugger panels stay on the shadcn kit already in the working tree.
- [x] **Tailwind Preflight Suppression**: See Complexity Tracking. Ant Design is gone. Preflight is already imported. This closeout does not toggle it.
- [x] **44px Touch Targets**: Phone buttons, tabs, chips, and dialog actions use the `touch` or `icon-touch` size, or an equivalent 44px box. Desktop may use the shorter sizes.
- [x] **Package Manager Integrity**: Yarn and `yarn.lock` stay. Root `package.json` does not gain `"type": "module"`. The Dart runtime is not modified or executed. No git commit, push, rebase, or reset unless the user asks.

Post-design re-check: the contracts and data model stay inside these gates. Retention is a server config default, not a new UI library. The dialog fix patches the existing script instead of replacing the SDK. Contrast changes adjust lightness inside the current palette.

## Project Structure

### Documentation (this feature)

```text
specs/002-spy-tobank-closeout/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── pages/
│   ├── Layouts/                 # shell: devices + recordings nav
│   ├── Devtools/                # panel: left menu / bottom tabs, sheets
│   ├── Recordings/              # list, timeline, download
│   └── RoomList/
├── components/
│   ├── ui/                      # shadcn / Base UI
│   ├── panel/                   # toolbar, sheet, 768px breakpoint
│   └── ErrorBoundary/           # error screen
├── store/recording.ts           # parse uploaded log files
├── styles/shadcn.css            # shared dark palette
└── assets/locales/              # English only (en.json)

scripts/
├── public-files.sh              # copies SDK to public/page-spy/index.min.js
└── patch-sdk-network.mjs        # connection behavior + dialog chrome

smoke-test/
├── index.html                   # device page under test
└── client-logs.js               # on-device clear / upload / viewer

public/page-spy/index.min.js    # published script (generated, same URL)
```

**Structure Decision**: One web client. React screens stay under `src/` and use `@/components/ui`. The device is not a second app: `scripts/public-files.sh` copies the SDK and `smoke-test/client-logs.js` to `public/page-spy/`. Embedders keep loading `page-spy/index.min.js`. Implementation edits the current uncommitted tree. It does not add `backend/`, `tests/`, or a new package.

## Complexity Tracking

| Violation                                                                                                                           | Why Needed                                                                                                                                                         | Simpler Alternative Rejected Because                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind preflight is imported in `src/styles/shadcn.css` while Principle VI says to leave it off when raw unclassed markup remains | Ant Design is already gone, and the shell work already enabled preflight. Flipping it during closeout would restyle every migrated screen in the uncommitted tree. | Turning preflight off now is a separate visual migration. Closeout verifies no horizontal blowout and no light surfaces, and does not expand preflight further. |
| 7-day retention is a server config default, not a client delete job                                                                 | The API process already deletes files after `maxLogLifeTimeOfHour`. Its built-in default is 720 hours. `config.json` is gitignored and may hold storage secrets.   | A client-only hide would leave the file downloadable at `/log/download`. Forking `@huolala-tech/page-spy-api` is outside this repo.                             |
| SDK modal behavior is patched in `scripts/patch-sdk-network.mjs` and `smoke-test/client-logs.js`                                    | The connection dialog ships inside `page-spy/index.min.js`. The public URL and `PageSpy` connection behavior are locked.                                           | Replacing the SDK, or wrapping the host page in a second modal library, would change the embed contract.                                                        |
