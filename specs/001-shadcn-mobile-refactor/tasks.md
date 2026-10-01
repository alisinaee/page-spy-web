# Tasks: PageSpy React Client Mobile-First Dark Refactor & shadcn UI Migration

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prune unused bundle dependencies and clean font/animation overhead

- [x] T001 Prune unused runtime dependencies (`cmdk`, move `shadcn` to devDependencies, remove `@fontsource-variable/geist`) in `package.json`
- [x] T002 Remove unused Geist font import from `src/styles/shadcn.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core UI standards and dark theme permanence required across all screens

- [x] T003 Add 44px minimum touch size variants (`touch` and `icon-touch`) in `src/components/ui/button.tsx`
- [x] T004 Enforce permanent dark mode class `.dark` globally in `src/utils/useDarkTheme.ts` and `src/pages/Layouts/index.tsx`

---

## Phase 3: User Story 1 - Full Responsive Mobile Debugging Session (Priority: P1) 🎯 MVP

**Goal**: Make debugging screens mobile-first with touch-friendly controls and responsive layouts on viewports <= 768px.

**Independent Test**: Load `/room-list`, `/devtools`, `/log-list`, and `/replay` at 375px viewport width; verify no horizontal overflow, touch targets >= 44px, and draggable splitter responds to touch.

- [x] T005 [P] [US1] Add touch drag support (`touchstart`, `touchmove`, `touchend`, `touchcancel`) to BrowserFrame divider in `src/pages/Devtools/BrowserFrame/index.tsx` (BUG-07)
- [x] T006 [P] [US1] Add responsive layout styles for collapsible sider and table on mobile viewports <= 768px in `src/pages/LogList/index.less` and `src/pages/LogList/index.tsx` (BUG-08)
- [x] T007 [P] [US1] Add responsive column-stacking media query for 50/50 split on viewports <= 768px in `src/components/LogReplayer/index.less` (BUG-09)
- [x] T008 [P] [US1] Update room list layout and debug button targets to 44px on mobile in `src/pages/RoomList/index.tsx` and `src/pages/RoomList/DebugButton/index.tsx`

---

## Phase 4: User Story 2 - Consistent Pure Dark Theme Experience (Priority: P1)

**Goal**: Eliminate hardcoded light backgrounds and borders across all debugger panels.

**Independent Test**: Navigate to `/room-list`, `/devtools` (storage panel), and `/replay`; verify all panels use dark background surfaces and dark border tokens.

- [x] T009 [P] [US2] Replace hardcoded `#fff` background and `#f0f0f0` border with dark tokens in `src/pages/RoomList/index.less` (BUG-10)
- [x] T010 [P] [US2] Replace hardcoded `#fff` content background with dark tokens in `src/pages/Devtools/StoragePanel/index.less` (BUG-10)
- [x] T011 [P] [US2] Replace hardcoded `#fff` replayer backgrounds with dark tokens in `src/components/LogReplayer/index.less` (BUG-10)
- [x] T012 [P] [US2] Verify Ant Design dark algorithm configuration in `src/App.tsx`

---

## Phase 5: User Story 3 - Clean Error-Free Console & Accurate Log Details (Priority: P2)

**Goal**: Strip box-drawing border characters from expanded console group details and copy text.

**Independent Test**: Open a console group with box characters in devtools; verify expanded details display clean text with boundary lines and pipe borders stripped.

- [x] T013 [US3] Implement `stripBoxBorder` and `isBoxSeparator` in `src/components/ConsoleList/components/ConsoleItem/index.tsx` for `groupFullText` and line rendering (BUG-04)

---

## Phase 6: User Story 4 - Strict TypeScript & Execution Stability (Priority: P2)

**Goal**: Resolve compiler errors and React hook dependency/stale closure bugs.

**Independent Test**: Run `yarn tsc --noEmit` and verify 0 errors; verify debounce and debug code execution in ConsolePanel.

- [x] T014 [P] [US4] Fix TS18048 bigint/symbol toString on possibly undefined in `src/utils/device-session.ts` (BUG-01)
- [x] T015 [P] [US4] Fix TS2367 language comparison error in `src/components/Docs/components/EmbedVideo/index.tsx` (BUG-02)
- [x] T016 [P] [US4] Fix TS2339 property 'value' on PhrasingContent in `src/components/Docs/components/DocContent/toc/index.tsx` (BUG-03)
- [x] T017 [P] [US4] Add `clientInfo?.browser.type` to `handleDebugCode` dependency array in `src/pages/Devtools/ConsolePanel/components/FooterInput/index.tsx` (BUG-05)
- [x] T018 [P] [US4] Fix debounce handler creation inside `useCallback` in `src/pages/Devtools/ConsolePanel/components/HeaderActions/index.tsx` (BUG-06)

---

## Phase 7: Polish & Cross-Cutting Concerns (Bugfixes & Initial Hardening)

**Purpose**: Initial verification pass for bugs 1-10

- [x] T019 Run static type check with `yarn tsc --noEmit` and confirm 0 errors
- [x] T020 Run production build with `yarn build` and confirm success
- [x] T021 Execute mobile-first responsive and dark theme checks on phone (375px) and desktop viewports

---

## Phase 8: User Story 5 - Complete Migration of In-Scope React UI onto shadcn / Base UI (Priority: P1)

**Goal**: Eliminate all `antd` and `@ant-design/icons` imports from all in-scope files and replace them with `@/components/ui` and `lucide-react`.

**Independent Test**: Run `git grep -E "from 'antd'|from '@ant-design/icons'" src/` and verify 0 matches across in-scope files. Run `yarn tsc --noEmit` and verify 0 errors.

- [x] T022 Install required shadcn primitives via `npx shadcn@latest add dialog dropdown-menu select tooltip tabs table input textarea badge card separator sheet slider spinner empty alert radio-group switch`
- [x] T023 [P] [US5] Implement lightweight dark Toast notification utility in `src/components/ui/toast.tsx` to replace `antd` `message`/`notification`
- [x] T024 [P] [US5] Replace antd `message`/`notification` in `src/store/socket-message/socket.ts` and `src/utils/AuthContext.tsx`
- [x] T025 [P] [US5] Migrate `src/404.tsx` to `@/components/ui/button` and `lucide-react`
- [x] T026 [P] [US5] Migrate `src/pages/Layouts` (`Header`, `NavMenu`, `Logo`, `index.tsx`) to `@/components/ui/dropdown-menu`, `separator`, and `lucide-react`
- [x] T027 [US5] Migrate `src/App.tsx` from antd `ConfigProvider`/`App` to pure dark theme provider shell
- [x] T028 [P] [US5] Migrate `src/pages/Main` (`Banner`, `Introduction` blocks 1-3, `index.tsx`) to `@/components/ui` (`badge`, `button`, `card`) and `lucide-react`
- [x] T029 [P] [US5] Migrate `src/pages/RoomList` (`RoomCard`, `Statistics`, `DebugButton`, `SecretModal`, `index.tsx`) to `@/components/ui` and `lucide-react`
- [x] T030 [P] [US5] Migrate `src/pages/Devtools/BrowserFrame` and `ConnectStatus` to `@/components/ui` and `lucide-react`
- [x] T031 [P] [US5] Migrate `src/pages/Devtools/ConsolePanel` (`HeaderActions`, `FooterInput`, `Shortcuts`, `index.tsx`) to `@/components/ui` and `lucide-react`
- [x] T032 [P] [US5] Migrate `src/pages/Devtools/save-log-dialog.tsx` and `SectionLogActions.tsx` to `@/components/ui` and `lucide-react`
- [x] T033 [P] [US5] Migrate `src/pages/Devtools/NetworkPanel`, `PagePanel`, `StoragePanel`, `SystemPanel`, `ElementPanel`, and `Devtools/index.tsx` to `@/components/ui` and `lucide-react`
- [x] T034 [P] [US5] Migrate `src/pages/LogList` (`ExtraLogButton`, `index.tsx`) to `@/components/ui` (`table`, `input`, `select`, `dialog`, `button`) and `lucide-react`
- [x] T035 [P] [US5] Migrate `src/pages/Replay/index.tsx` to `@/components/ui/button` and `lucide-react`
- [x] T036 [P] [US5] Migrate `src/components/LogReplayer` (`Meta`, `PlayControl`, `PluginPanel`, `ConsolePanel`, `NetworkPanel`, `SiderMenu`, `StoragePanel`, `SystemPanel`, `index.tsx`) to `@/components/ui` and `lucide-react`
- [x] T037 [P] [US5] Migrate `src/components/ConsoleList` (`ConsoleItem`, `ConsoleNode`, `ErrorTrace`) to `@/components/ui/sheet`, `button`, `tooltip`, and `lucide-react`
- [x] T038 [P] [US5] Migrate `src/components/NetworkTable` (`NetworkDetail`, `PartOfHeader`, `QueryParamsBlock`, `RequestPayloadBlock`, `ResponseBody`, `StatusCode`, `TypeFilter`, `index.tsx`) to `@/components/ui` and `lucide-react`
- [x] T039 [P] [US5] Migrate shared components (`AuthLogin`, `BlockTitle`, `CNUserModal`, `CodeBlock`, `CopyContent`, `DBTable`, `DocSearch`, `DropFile`, `ErrorBoundary`, `ErrorDetailDrawer`, `FeatureItem`, `LoadingFallback`, `MPWarning`, `ResizableDetail`, `SelectLogButton`, `StorageTable`, `SystemContent`, and clean `SelectRoom.deprecated`) to `@/components/ui` and `lucide-react`

---

## Phase 9: Final Convergence Verification

**Purpose**: Strict verification of zero antd in in-scope tree, TypeScript checks, and responsive dark UX

- [x] T040 Verify 0 matches for `antd` or `@ant-design/icons` in in-scope paths using `git grep -E "from 'antd'|from '@ant-design/icons'" src/`
- [x] T041 Run `yarn tsc --noEmit` and confirm 0 errors
- [x] T042 Run `yarn build:client` and confirm clean production bundle build
- [x] T043 Execute mobile-first responsive tests at 375px and 1280px viewports across room-list, devtools, log-list, and replay
