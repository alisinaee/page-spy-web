# Implementation Plan: PageSpy React Client Mobile-First Dark Refactor & shadcn UI Migration

**Branch**: `001-shadcn-mobile-refactor` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-shadcn-mobile-refactor/spec.md`

## Summary

Migrate the PageSpy React client from Ant Design 5 to the canonical shadcn / Base UI design system (`@/components/ui`, Tailwind v4, style `base-nova`), eliminating all `antd` and `@ant-design/icons` imports from all in-scope files. Retain all BUG-01 to BUG-10 fixes, keep dark theme active globally, maintain 44px touch targets on mobile viewports, keep Tailwind preflight suppressed, prune unused runtime weight, and use `lucide-react` exclusively for icons across migrated interfaces.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18
**Primary UI Kit**: shadcn / Base UI (`@base-ui/react`, Tailwind CSS v4, style `base-nova`)
**Icon System**: `lucide-react` (installed; no secondary icon library)
**Legacy/Transitional Boundary**: Ant Design 5 and Less remain strictly confined to out-of-scope MDX documentation (`src/pages/MainDocs/**`, `src/pages/OSpyDocs/**`, `src/components/Docs/**`) and `src/pages/OSpy/**`
**Preflight Policy**: Tailwind preflight disabled in `src/styles/shadcn.css`
**Touch Standard**: 44px minimum touch targets (`touch`, `icon-touch` variants, `min-h-[44px]`)
**Testing & Verification**: `yarn tsc --noEmit`, `yarn build:client`, headless Chrome CDP viewport tests (375px mobile, 1280px desktop)
**Package Manager**: Yarn only (`yarn.lock`), no `"type": "module"` in `package.json`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Mobile-First Design**: Mobile viewports (<=768px) stack vertically without horizontal blowout; responsive tables and panels.
- [x] **Pure Dark Theme**: `.dark` enforced globally on root document; no hardcoded `#fff` backgrounds or un-themed borders.
- [x] **Lean Bundle**: Unused dependencies pruned (`cmdk`, `shadcn` in runtime, Geist font); components added individually as needed.
- [x] **Canonical shadcn Workflow**: Components installed strictly via `npx shadcn@latest add <name>`. No `--all` dump. No hand-copied code.
- [x] **Screen Migration Quarantine**: In-scope screens completely migrated away from `antd` and `@ant-design/icons`.
- [x] **Tailwind Preflight Suppression**: Preflight remains disabled in `src/styles/shadcn.css` because out-of-scope docs retain antd.
- [x] **44px Touch Targets**: Mobile controls provide >= 44px hit dimensions; touch gestures supported on splitters.
- [x] **Package Manager Integrity**: Yarn used exclusively. Root `package.json` untouched regarding `"type": "module"`. Dart app not touched.

## Component Installation Plan

Components installed strictly via `npx shadcn@latest add <name>`:

- `dialog`: For modal dialogs (`SecretModal`, `save-log-dialog`, `AuthLogin`, `CNUserModal`, `DocSearch`, `Shortcuts`, `ResponseBody` export modal)
- `dropdown-menu`: For menus (`NavMenu` language selector, `PlayControl` speed/format menu, `NetworkTable` actions)
- `select`: For select dropdowns (`LogList` filter, `ConsolePanel` level filter, `MessageTable` filter)
- `tooltip`: For icon buttons and helper tips (`RoomCard`, `PartOfHeader`, `SectionLogActions`, storage actions)
- `tabs`: For tabbed interfaces (`Devtools` panels, `NetworkDetail` tabs, `PluginPanel` tabs)
- `table`: For tabular data (`LogList` table, `NetworkTable`, `StorageTable`, `DBTable`, `EventsourceTable`, `WebsocketTable`)
- `input`: For text inputs, filters, and debug code inputs
- `textarea`: For multiline payloads and input areas
- `badge`: For status pills, tag counts, and badges
- `card`: For container surfaces (`RoomCard`, `SystemContent`, `Introduction` blocks)
- `separator`: For layout dividers
- `sheet`: For slide-over detail panels (`ConsoleItem` group details, `NetworkDetail`, `ErrorDetailDrawer`)
- `slider`: For playback timeline controls in `LogReplayer`
- `spinner`: For loading states and pending indicators
- `empty`: For empty state views across tables and panels
- `alert`: For error, warning, and informational callouts
- `radio-group`: For single-choice selectors (`TypeFilter`, log export format)
- `switch`: For boolean toggles (auto-scroll, filter toggles)

## Step-by-Step Migration Phases

### Phase 1: Install Required shadcn Primitives

Install components using `npx shadcn@latest add` individually. Inspect added files to verify import aliases and Base UI composition rules.

### Phase 2: App Shell & Global Utilities

- `src/App.tsx`: Replace antd `ConfigProvider`, `theme.darkAlgorithm`, and message holder with custom Toast/Notification provider and dark theme container.
- `src/404.tsx`: Replace antd `Button` / `Empty` with `@/components/ui/button` and `lucide-react`.
- `src/pages/Layouts`:
  - `Header`: Refactor to Tailwind flex/grid.
  - `NavMenu`: Replace antd `Dropdown`, `ConfigProvider`, `Flex`, `Divider` with `@/components/ui/dropdown-menu`, `separator`, and `lucide-react`.
  - `Logo`: Replace `@ant-design/icons` with `lucide-react` or SVG.
- `src/store/socket-message/socket.ts` & `src/utils/AuthContext.tsx`: Replace antd `message` and `notification` with custom dark-themed toast handler.

### Phase 3: Home & Room List Pages

- `src/pages/Main`: Refactor `Banner` and `Introduction` blocks 1-3 to use `@/components/ui` (`badge`, `button`, `card`) and Tailwind typography.
- `src/pages/RoomList`:
  - `RoomCard`: Replace antd `Col`, `Row`, `Tooltip` with `@/components/ui/card`, `tooltip`, and `lucide-react`.
  - `Statistics`: Replace antd grid with responsive Tailwind flex/grid.
  - `DebugButton` & `SecretModal`: Replace antd `Modal`, `Form`, `Input`, `Button`, `message` with `@/components/ui/dialog`, `input`, `button`.
  - `index.tsx`: Replace antd `Space`, `Input`, `Empty`, `Spin`, `Divider` with `@/components/ui` components and `lucide-react`.

### Phase 4: Devtools Panels & Split Frame

- `src/pages/Devtools/BrowserFrame`: Replace antd `Button`, `Space`, `Spin`, `Icon` with `@/components/ui/button`, `spinner`, and `lucide-react`. Maintain 44px touch splitter.
- `src/pages/Devtools/ConnectStatus`: Replace antd `Row`, `Col`, `Space`, `Divider`, `Icon` with Tailwind layout and `lucide-react`.
- `src/pages/Devtools/ConsolePanel`:
  - `HeaderActions`: Replace antd `Input`, `Select`, `Space` with `@/components/ui/input`, `select`.
  - `FooterInput`: Replace antd `Input`, `Button`, `Tooltip` with `@/components/ui/input`, `button`, `tooltip`, `lucide-react`.
  - `Shortcuts`: Replace antd `Modal`, `Space` with `@/components/ui/dialog`.
  - `index.tsx`: Replace antd components with `@/components/ui`.
- `src/pages/Devtools/NetworkPanel`, `PagePanel`, `StoragePanel`, `SystemPanel`, `ElementPanel`: Replace all antd layout, menus, tables, buttons, and icons with `@/components/ui` equivalents and `lucide-react`.
- `src/pages/Devtools/save-log-dialog.tsx`: Replace antd `Modal`, `Input` with `@/components/ui/dialog`, `input`.
- `src/pages/Devtools/SectionLogActions.tsx`: Replace antd `Button`, `Space`, `Tooltip`, `Icon` with `@/components/ui`.
- `src/pages/Devtools/index.tsx`: Replace antd tabs/layout with `@/components/ui/tabs` and Tailwind layout.

### Phase 5: Log List, Replayer & Shared Components

- `src/pages/LogList`:
  - `index.tsx`: Replace antd `Layout`, `Table`, `Input`, `Select`, `Button`, `Modal` with `@/components/ui/table`, `input`, `select`, `dialog`, `button`, `lucide-react`. Maintain mobile responsive collapsible layout.
  - `ExtraLogButton`: Replace antd `Modal`, `Form`, `Input`, `Radio`, `Button` with `@/components/ui/dialog`, `input`, `radio-group`, `button`.
- `src/pages/Replay/index.tsx`: Replace antd `Button`, `Space`, `message` with `@/components/ui/button`, toast, `lucide-react`.
- `src/components/LogReplayer`:
  - `PlayControl`: Replace antd `Button`, `Slider`, `Tooltip`, `Dropdown` with `@/components/ui/slider`, `tooltip`, `dropdown-menu`, `button`, `lucide-react`.
  - `Meta`, `PluginPanel`, `SiderMenu`, `index.tsx`: Replace antd components and Less with `@/components/ui`. Maintain mobile vertical stacking.
- Shared components:
  - `src/components/ConsoleList/**`: Replace antd `Drawer`, `Button`, `Tooltip`, `Typography` with `@/components/ui/sheet`, `button`, `tooltip`, `lucide-react`. Maintain box border stripping.
  - `src/components/NetworkTable/**`: Replace antd `Dropdown`, `Empty`, `Tooltip`, `Drawer`, `Tabs`, `Table`, `Modal`, `Form`, `Alert` with `@/components/ui`.
  - `src/components/StorageTable/**`, `DBTable/**`, `SystemContent/**`, `ResizableDetail/**`, `AuthLogin/**`, `CNUserModal/**`, `DocSearch/**`, `DropFile/**`, `ErrorBoundary/**`, `ErrorDetailDrawer/**`, `LoadingFallback/**`, `MPWarning/**`, `SelectLogButton/**`: Replace all antd imports with `@/components/ui` and `lucide-react`.
  - Clean up `src/components/SelectRoom/index.tsx.deprecated`.

### Phase 6: Verification & Convergence

- Run `git grep -E "from 'antd'|from '@ant-design/icons'" src/` to verify zero matches in in-scope files.
- Run `yarn tsc --noEmit` to verify type safety.
- Run `yarn build:client` to verify bundle build.
- Run headless Chrome CDP tests at 375px and 1280px viewports across room-list, devtools, log-list, and replay.
