# Feature Specification: PageSpy React Client Mobile-First Dark Refactor & shadcn UI Migration

**Feature Branch**: `001-shadcn-mobile-refactor`

**Created**: 2026-09-30

**Status**: Active

**Input**: User description: "Refactor the PageSpy React client (React 18, Vite, Ant Design 5, Less) onto the design system already installed. Do not redo that install. The feature requires the React client UI to render with `@/components/ui` (shadcn, Base UI, Tailwind v4). In-scope files have zero imports from `antd` or `@ant-design/icons`. Keep existing FR-001–FR-011. Mobile first. Dark theme only. Keep bundle light. Phone controls 44px. Fix BUG-01 through BUG-10."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Full Responsive Mobile Debugging Session (Priority: P1)

A mobile web developer opens the PageSpy debugging interface on a mobile device or narrow screen (<= 768px). They navigate the room list, inspect connected device status, view room cards without horizontal clipping, and debug console and network traffic. Controls like buttons and splitter handles have at least 44px touch targets so they can comfortably tap and drag with fingers.

**Why this priority**: Core value proposition. Developers on mobile or debugging from mobile browsers need touch-friendly targets and responsive layouts that do not overflow horizontally or crush sidebars.

**Independent Test**: Load `/room-list`, `/devtools`, and `/log-list` at viewport 375px x 667px. Verify that no horizontal scrolling occurs on container wrappers, touch targets are >= 44px, and log items are legibly rendered.

**Acceptance Scenarios**:

1. **Given** a user viewing the room list on a 375px mobile viewport, **When** they inspect the room list and statistics header, **Then** all cards and action buttons fit within the viewport width and buttons have at least 44px touch targets.
2. **Given** an open devtools session with BrowserFrame split, **When** the user drags the pane divider with a finger touch gesture, **Then** the split position adjusts smoothly following the touch move events.
3. **Given** a user viewing the log list on a 375px viewport, **When** the page loads, **Then** the layout stacks vertically without blowing out horizontal margins, and log tables remain legible without squashing.
4. **Given** a user viewing a recorded log session in the replayer on mobile, **When** the replay player loads, **Then** the canvas and plugin tabs stack vertically rather than occupying a squashed 50/50 horizontal split.

---

### User Story 2 - Consistent Pure Dark Theme Experience (Priority: P1)

A developer uses the PageSpy web UI in a low-light environment. Regardless of whether they visit documentation (`/docs`), landing page (`/`), room list (`/room-list`), devtools (`/devtools`), log list (`/log-list`), or standalone replayer (`/replay`), the entire interface remains dark. No un-themed white blocks or stark light borders appear.

**Why this priority**: Avoids blinding contrast and visual fragmentation across navigation flows. The application design requires unified dark mode.

**Independent Test**: Navigate through `/`, `/room-list`, `/devtools`, `/log-list`, and `/replay`. Verify `document.documentElement` retains `.dark` class throughout, and surfaces use dark tokens without hardcoded `#fff` backgrounds.

**Acceptance Scenarios**:

1. **Given** a user navigating from `/` to `/devtools`, **When** the route transitions, **Then** the `.dark` class remains present on the HTML root and all panels render dark backgrounds.
2. **Given** a user opening storage or system panels in `/devtools`, **When** the table or empty state displays, **Then** background containers render using dark theme tokens rather than hardcoded `#fff`.
3. **Given** a user opening a room card or log list card, **When** viewing card surfaces and borders, **Then** surface colors conform to the dark theme palette.

---

### User Story 3 - Clean Error-Free Console & Accurate Log Details (Priority: P2)

A developer inspects rich console messages and grouped logs transmitted from connected client devices. When expanding console log groups, box-drawing characters used by ASCII borders are cleanly stripped, displaying only the underlying message content identically to the local device log viewer.

**Why this priority**: Eliminates visual noise in console output and establishes parity between local and remote log inspections.

**Independent Test**: Dispatch a console log group containing ASCII/Unicode box-drawing borders (`┌`, `│`, `└`). Expand the group details drawer in the remote console panel and verify no border characters leak into the expanded text or clipboard output.

**Acceptance Scenarios**:

1. **Given** a console group formatted with box border characters, **When** the user clicks to expand group details, **Then** the details view and copy payload display clean log content with box borders stripped.
2. **Given** console items with ANSI color codes, **When** rendered in the group details, **Then** ANSI codes and border characters are both stripped cleanly.

---

### User Story 4 - Strict TypeScript & Execution Stability (Priority: P2)

Developers running type checks and automated verification suites experience clean builds with zero compiler errors and zero stale hook closures during code execution.

**Why this priority**: Prevents runtime crashes, regression bugs, and broken builds.

**Independent Test**: Execute `tsc --noEmit` and verify zero errors are reported across all workspace packages and source files.

**Acceptance Scenarios**:

1. **Given** `device-session.ts`, **When** `value` of unknown type is evaluated for bigint or symbol, **Then** string conversion executes safely without TS18048 undefined access.
2. **Given** documentation EmbedVideo and DocContent TOC components, **When** compiled by TypeScript, **Then** language comparisons and AST phrasing content accesses compile cleanly without TS2367 or TS2339.
3. **Given** `FooterInput` in the devtools console panel, **When** client browser type updates after connection, **Then** `handleDebugCode` accesses current client environment state without stale closure bugs.
4. **Given** `HeaderActions` keyword filtering, **When** a user types into the search field, **Then** debounce operates cleanly without regenerating across renders or triggering hook warnings.

---

### User Story 5 - Complete Migration of In-Scope React UI onto shadcn / Base UI (Priority: P1)

Users interacting with the application shell, home page, room list, devtools panels, log list, and log replayer experience a unified modern interface built entirely on `@/components/ui` (Base UI, Tailwind v4). In-scope code contains zero imports from `antd` or `@ant-design/icons`. All interactive icons are sourced from `lucide-react`.

**Why this priority**: Eliminates Ant Design legacy dependencies from all primary application interfaces, achieving the target modern mobile-first design system architecture.

**Independent Test**: Execute `rg "from 'antd'|from '@ant-design/icons'" src/` and verify that matches occur strictly in explicitly listed out-of-scope paths (MainDocs, OSpyDocs, OSpy widgets, static doc json), with exactly zero matches in in-scope paths.

**Acceptance Scenarios**:

1. **Given** the application shell (`App.tsx`, `404.tsx`, `Layouts`), **When** loaded, **Then** header navigation, menus, and layout grids render using `@/components/ui` components and `lucide-react` icons with zero `antd` imports.
2. **Given** the Room List and Devtools pages, **When** inspected, **Then** cards, action buttons, modals, tabs, dropdowns, inputs, and drawers render using `@/components/ui` without any `antd` or `@ant-design/icons` imports.
3. **Given** the Log List and Replayer screens, **When** inspected, **Then** tables, filters, progress controls, and panels render using `@/components/ui` without any `antd` or `@ant-design/icons` imports.
4. **Given** all dialogs, tooltips, and notification toasts in in-scope flows, **When** triggered, **Then** they render via Base UI / shadcn primitives.

---

### Edge Cases

- What happens when a user on a mobile device rotates from portrait to landscape? The stacked layout dynamically recalculates container widths without overflowing.
- What happens when a user touches the BrowserFrame divider with multiple fingers? The touch handler isolates `touches[0]` for single-finger drag calculations and handles `touchcancel`/`touchend` gracefully.
- What happens when a console log contains box characters as genuine log data (not frame borders)? The stripping logic targets standard box frame patterns (`isBoxSeparator` and line-boundary `stripBoxBorder`) preserving legitimate internal characters.
- What happens when a room has an empty list or error state on mobile? The Empty/Error state container scales down to fit viewport widths under 375px without horizontal clipping.
- What happens when a toast notification triggers without antd's `message` / `notification`? A lightweight Base UI / shadcn toast or custom notification handler renders toasts in dark theme without importing antd.

## Scope Boundaries

### In-Scope Files (MUST HAVE ZERO `antd` or `@ant-design/icons` IMPORTS)

The following paths and all components they render must be completely migrated to `@/components/ui` and `lucide-react`:

- `src/App.tsx`, `src/404.tsx`
- `src/pages/Layouts/**` (`Header`, `NavMenu`, `Logo`, index)
- `src/pages/Main/**` (`Banner`, `Introduction` blocks 1-3, index)
- `src/pages/RoomList/**` (`RoomCard`, `Statistics`, `DebugButton`, `SecretModal`, index)
- `src/pages/Devtools/**` (`BrowserFrame`, `ConnectStatus`, `ElementPanel`, `SectionLogActions`, `ConsolePanel`, `NetworkPanel`, `PagePanel`, `StoragePanel`, `SystemPanel`, `save-log-dialog`, index)
- `src/pages/LogList/**` (`ExtraLogButton`, index)
- `src/pages/Replay/**` (index)
- `src/components/LogReplayer/**` (`Meta`, `PlayControl`, `PluginPanel`, `ConsolePanel`, `NetworkPanel`, `SiderMenu`, `StoragePanel`, `SystemPanel`, index)
- `src/components/ConsoleList/**` (`ConsoleItem`, `ConsoleNode`, `ErrorTrace`)
- `src/components/NetworkTable/**` (`NetworkDetail`, `PartOfHeader`, `QueryParamsBlock`, `RequestPayloadBlock`, `ResponseBody`, `StatusCode`, `TypeFilter`, index)
- Shared components rendered by in-scope screens:
  - `src/components/AuthLogin/index.tsx`
  - `src/components/BlockTitle/index.tsx`
  - `src/components/CNUserModal/index.tsx`
  - `src/components/CodeBlock/index.tsx`
  - `src/components/CopyContent/index.tsx`
  - `src/components/DBTable/index.tsx`
  - `src/components/DocSearch/**`
  - `src/components/DropFile/index.tsx`
  - `src/components/ErrorBoundary/index.tsx`
  - `src/components/ErrorDetailDrawer/index.tsx`
  - `src/components/FeatureItem/index.tsx`
  - `src/components/LoadingFallback/index.tsx`
  - `src/components/MPWarning/index.tsx`
  - `src/components/ResizableDetail/index.tsx`
  - `src/components/SelectLogButton/index.tsx`
  - `src/components/StorageTable/index.tsx`
  - `src/components/SystemContent/**`
  - `src/components/SelectRoom/index.tsx.deprecated` (clean up or migrate)
- Stores and utilities:
  - `src/store/socket-message/socket.ts`
  - `src/utils/AuthContext.tsx`

### Out-of-Scope Files (Explicitly Allowed to Retain Ant Design)

The following paths are outside the scope of this migration and may retain Ant Design imports:

- MDX documentation pages and MDX components under `src/pages/MainDocs/**`
- MDX documentation pages and MDX components under `src/pages/OSpyDocs/**`
- MDX documentation shared layout and viewer components under `src/components/Docs/**`
- Static documentation JSON extraction at `src/assets/docs.json`
- Standalone marketing playground widgets under `src/pages/OSpy/**`
- Non-React DOM test script at `smoke-test/client-logs.js`

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST enforce dark theme globally by maintaining `.dark` on the root document across all application routes.
- **FR-002**: Mobile viewports (width <= 768px) MUST render stacked single-column layouts for `/log-list` and `/replay` without horizontal scroll on the outer container.
- **FR-003**: All touch controls and divider drag handles MUST have a minimum target size of 44px on mobile viewports.
- **FR-004**: BrowserFrame divider MUST support touch events (`touchstart`, `touchmove`, `touchend`, `touchcancel`) to enable pane dragging on mobile devices.
- **FR-005**: Remote console group details and copy text MUST strip box-drawing characters and boundary separators using `stripBoxBorder` and `isBoxSeparator`.
- **FR-006**: TypeScript compilation (`tsc --noEmit`) MUST succeed with 0 errors, resolving TS18048 in `device-session.ts`, TS2367 in `EmbedVideo`, and TS2339 in `toc/index.tsx`.
- **FR-007**: `FooterInput` `handleDebugCode` MUST include `clientInfo?.browser.type` in its dependency list to prevent stale closures.
- **FR-008**: `HeaderActions` keyword filter debounce MUST be stable and preserve event values without re-creating debounced handlers on each render.
- **FR-009**: Hardcoded `#fff` backgrounds and light borders in `RoomList`, `StoragePanel`, and `LogReplayer` MUST be replaced with theme-aware dark tokens.
- **FR-010**: Unused runtime dependencies (`cmdk`, `shadcn` in runtime deps) MUST be pruned, and `@fontsource-variable/geist` MUST be removed and justified since PageSpy uses system monospace/sans fonts.
- **FR-011**: Tailwind CSS preflight MUST remain disabled while any Ant Design screens coexist in the application.
- **FR-012**: All in-scope React screens and components MUST render their UI using `@/components/ui` (shadcn / Base UI / Tailwind v4) and MUST have ZERO imports from `antd`.
- **FR-013**: All in-scope React screens and components MUST source their icons from `lucide-react` and MUST have ZERO imports from `@ant-design/icons`.
- **FR-014**: All modals, dialogs, drawers, popovers, select dropdowns, and tooltips in in-scope screens MUST be powered by `@/components/ui` or Base UI primitives.
- **FR-015**: Notifications, messages, and alerts in in-scope screens and stores (`socket.ts`, `AuthContext.tsx`) MUST NOT import `antd` (`message` or `notification`) and MUST use theme-aware custom toasts or alert components.

### Key Entities

- **DeviceSession**: State tracking connected client device metadata (OS, browser, engine, platform).
- **ConsoleItem**: Log item representing console entries, groups, errors, and evaluation results.
- **ReplaySession**: Data payload containing rrweb events, console events, and network entries for time-travel playback.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `tsc --noEmit` exits with status 0 and 0 errors across the entire codebase.
- **SC-002**: Viewport resizing to 375px width shows 0 horizontal scrollbar overflow on `/room-list`, `/devtools`, `/log-list`, and `/replay`.
- **SC-003**: 100% of primary mobile touch buttons and handles provide a minimum dimension of 44px.
- **SC-004**: 100% of routes render with `.dark` active on the document element.
- **SC-005**: Remote console group expansion shows 0 residual box-drawing boundary characters.
- **SC-006**: Production client bundle excludes unreferenced packages (`cmdk`, CLI packages, unused variable font files).
- **SC-007**: A ripgrep search `rg "from 'antd'|from '@ant-design/icons'" src/` yields ZERO results across all in-scope paths.
- **SC-008**: 100% of in-scope UI screens render their component elements via `@/components/ui` and `lucide-react`.

## Assumptions

- PageSpy uses system font stacks (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`) for dark UI; the `@fontsource-variable/geist` variable font is not required and removing it saves unnecessary network transfer.
- The dual virtualization packages (`react-virtualized` and `react-window`) are retained in this pass to prevent scope creep, as each is referenced in distinct subsystems.
- `smoke-test/client-logs.js` is an independent vanilla JS script; its theme variables match the dark palette without introducing React or shadcn dependencies.
- MDX documentation pages (`MainDocs`, `OSpyDocs`) and `OSpy` marketing widgets remain on Ant Design in this phase, allowing Tailwind preflight to remain disabled to prevent style regressions in those documentation views.
