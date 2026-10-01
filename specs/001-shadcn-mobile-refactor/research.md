# Research & Technical Decisions: PageSpy React Client Mobile-First Dark Refactor

## Decision 1: Mobile-First Touch Controls (44px Minimum)

- **Decision**: Update `src/components/ui/button.tsx` to introduce a dedicated `touch` or `xl` size with `h-11 px-6 text-base` (44px height), ensure `default` or `lg` mobile controls have a 44px hit-box (`min-h-[44px] min-w-[44px]`), and style all mobile buttons, toggles, and handles accordingly.
- **Rationale**: Meets Apple Human Interface Guidelines and WCAG 2.5.5 / 2.5.8 recommendations. The current button `lg` variant is only 36px (`h-9`), which causes frequent missed taps on touch screens.
- **Alternatives considered**: Inline style overrides on every button — rejected as error-prone and violating design system consistency.

## Decision 2: Dark Theme Permanence & Global Enforcement

- **Decision**: Refactor `src/utils/useDarkTheme.ts` to return `true` unconditionally, or remove route-dependent un-darkening logic in `src/pages/Layouts/index.tsx` so `document.documentElement.classList.add('dark')` is permanently maintained. Replace hardcoded `#fff` and `#f0f0f0` across `RoomList`, `StoragePanel`, and `LogReplayer` Less files with theme variables or dark token values (`oklch(...)` or CSS variables matching the dark palette).
- **Rationale**: PageSpy client is specified as pure dark theme. Toggling off `.dark` when navigating to `/devtools` or `/room-list` was causing severe visual defects and flash of unstyled light styles.
- **Alternatives considered**: Dual light/dark toggle support — explicitly rejected by project constitution and specification ("Dark theme only").

## Decision 3: Keeping Tailwind Preflight Disabled

- **Decision**: Keep `@import "tailwindcss/preflight.css"` absent from `src/styles/shadcn.css`.
- **Rationale**: Multiple screens (Main landing, RoomList, Devtools subpanels, LogList, Docs, Replay) still rely on Ant Design 5 and raw MDX element layouts. Enabling Preflight resets button backgrounds to transparent, collapses heading sizes, and forces `svg { display: block }`, breaking inline icons across the legacy and documentation screens.
- **Alternatives considered**: Turning preflight on and manually overriding Ant Design classes with higher specificity — rejected as extremely high regression risk across dozens of components.

## Decision 4: Bundle Economy & Dependency Pruning

- **Decision**:
  1. Remove `@fontsource-variable/geist` from `package.json` and its import from `src/styles/shadcn.css`. PageSpy uses system monospace (`SFMono-Regular, Consolas`) and sans-serif stacks already configured in `initial.less`. Removing Geist avoids loading ~50-100KB of unused font assets.
  2. Remove `cmdk` from runtime dependencies (no imports found in `src/`).
  3. Move `"shadcn"` from `dependencies` to `devDependencies` or remove if only needed via `npx`.
  4. Retain `react-virtualized` and `react-window` concurrently as instructed (both are in active use in `NetworkTable` and `ConsoleList` respectively).
- **Rationale**: Directly aligns with Constitution Principle III (Lean Bundle Economy & Dependency Hygiene).
- **Alternatives considered**: Retaining Geist font — unjustified weight; removing one virtualization library immediately — out of scope for this pass.

## Decision 5: Console Group ASCII Box-Drawing Characters Fix (BUG-04)

- **Decision**: Port `isBoxSeparator` and `stripBoxBorder` from `public/page-spy/log-format.js` into `src/components/ConsoleList/components/ConsoleItem/index.tsx` (or a shared utility `src/utils/log-format.ts`), applying them to `groupFullText` and line rendering so expanded group details and clipboard copy omit ASCII box frames and separators.
- **Rationale**: Parity with the on-device log viewer in `smoke-test/log-format.js` and `public/page-spy/log-format.js`.
- **Alternatives considered**: Stripping borders during websocket reception in `groupConsoleItems` — rejected because raw logs may be copied or referenced in raw form elsewhere; formatting at render/copy matches on-device behavior.

## Decision 6: TypeScript Bug Fixes (BUG-01, BUG-02, BUG-03)

- **Decision**:
  - BUG-01: In `src/utils/device-session.ts`, cast `value` properly when checking `valueType === 'bigint'` (`(value as bigint).toString()`) or check `value != null && (typeof value === 'bigint' || typeof value === 'symbol')`.
  - BUG-02: In `src/components/Docs/components/EmbedVideo/index.tsx`, type `lang` as `string` or handle `'zh'` check without invalid disjoint literal comparison.
  - BUG-03: In `src/components/Docs/components/DocContent/toc/index.tsx`, check `'value' in texts[0]` or cast as `(texts[0] as { value?: string }).value`.
- **Rationale**: Clears `tsc --noEmit` blockers completely.

## Decision 7: React Hooks and Interaction Bugs (BUG-05, BUG-06, BUG-07, BUG-08, BUG-09, BUG-10)

- **Decision**:
  - BUG-05: In `FooterInput`, add `clientInfo?.browser.type` to `useCallback` dependency array.
  - BUG-06: In `HeaderActions`, wrap debounce handler in `useMemo(() => debounce(...), [])` with event value extraction, or use a ref.
  - BUG-07: In `BrowserFrame`, add `touchstart`, `touchmove`, `touchend`, and `touchcancel` event listeners to the divider line.
  - BUG-08: In `LogList`, add responsive CSS media queries (`@media (max-width: 768px)`) to collapse Sider and make Table horizontally scrollable or card-based on mobile.
  - BUG-09: In `LogReplayer`, update `index.less` with `@media (max-width: 768px)` to switch `&-main` flex direction to `column` and set `flex: 1 1 100%`.
  - BUG-10: In `RoomList/index.less`, `StoragePanel/index.less`, and `LogReplayer/index.less`, replace hardcoded `#fff` with dark background tokens (`var(--color-bg-base)`, `#141414`, `#1f1f1f`).
