<!--
Sync Impact Report:
- Version change: Unratified Template -> 1.0.0
- Principles established:
  1. Mobile-First Design & Usability
  2. Pure Dark Theme Enforcement
  3. Lean Bundle Economy & Dependency Hygiene
  4. Canonical shadcn/Base UI Component Workflow
  5. Screen-by-Screen Ant Design Migration Quarantine
  6. Tailwind Preflight Suppression Under Ant Design Coexistence
  7. 44px Touch Target Standard for Mobile Controls
  8. Package Manager & Workspace Boundaries
- Added sections:
  - Technical Constraints & Stack Standards
  - Quality Gates & Review Workflow
- Removed sections: None (initial ratification)
- Follow-up TODOs: None
-->

# PageSpy Web Constitution

## Core Principles

### I. Mobile-First Design & Usability

All viewport layouts, data displays, and interactive controls MUST be structured mobile-first. Screens MUST adapt gracefully to viewports at or under 768px without horizontal blowout or crushed flex rows. Multi-pane panels MUST stack vertically or provide responsive drawer navigation on small screens.

### II. Pure Dark Theme Enforcement

The client UI operates exclusively in dark theme across all routes, including debugger panels, room lists, documentation, and log inspection. Global class `dark` MUST remain active permanently. Hardcoded light-theme color values (`#fff`, light borders, un-themed surface tokens) are strictly prohibited.

### III. Lean Bundle Economy & Dependency Hygiene

The client bundle MUST remain minimal. Components MUST be added strictly on-demand. Unused dependencies (such as unreferenced CLI or command packages) MUST NOT be present in runtime dependencies. Dual icon or font libraries MUST NOT be introduced without strict necessity; unused variable font assets and dead animation packages MUST be pruned. Virtualization engines (`react-virtualized` and `react-window`) remain coexistent only where actively referenced and MUST NOT be blindly duplicated further.

### IV. Canonical shadcn/Base UI Component Workflow

All new and migrated React UI components MUST use shadcn with Base UI (`components.json` style `base-nova`, `@/components/ui`). Components MUST be installed via `npx shadcn@latest add <name>`. Bulk `--all` component dumping and manual hand-copying of registry source code are strictly forbidden.

### V. Screen-by-Screen Ant Design Migration Quarantine

Ant Design 5 components and Less styles MUST remain intact on a given screen until that specific screen is fully migrated to shadcn/Base UI. Incremental screen migration MUST avoid mixing conflicting UI library primitives on the same mobile interface. When a screen is fully migrated, its Ant Design imports MUST be cleanly removed.

### VI. Tailwind Preflight Suppression Under Ant Design Coexistence

Tailwind CSS preflight MUST remain disabled (`@import "tailwindcss/preflight.css"` omitted in `src/styles/shadcn.css`) as long as any screen or component depends on Ant Design or raw unclassed typography. Re-enabling preflight while Ant Design screens coexist is strictly prohibited due to destructive style collisions.

### VII. 44px Touch Target Standard for Mobile Controls

All interactive controls, buttons, toggles, and divider splitters intended for touch viewports MUST provide a minimum touch target dimension of 44px (e.g., via `h-11`, `min-h-[44px]`, or dedicated touch sizing). Pointer interaction systems (such as splitters and resizers) MUST support touch drag events alongside mouse events.

### VIII. Package Manager & Workspace Boundaries

Yarn (`yarn.lock`) is the mandatory package manager; switching package managers or package manager configurations is prohibited. The root `package.json` MUST NOT have `"type": "module"` added. External repositories, including the Dart runtime at `/Users/ali/Works/appstudio-runtime`, MUST NOT be modified or executed.

## Technical Constraints & Stack Standards

The repository stack is React 18, Vite, Tailwind CSS v4, Base UI, Ant Design 5 (legacy/transitional), and Less.

- Styling architecture: `src/styles/shadcn.css` provides the design system tokens and utility layers without preflight. Less files provide legacy screen styling.
- Auxiliary scripts: Non-React tools (such as vanilla JS smoke-test harnesses) MUST NOT import React shadcn components; any theme styling in those tools MUST match dark CSS tokens directly.
- Git & VCS safety: Automated workflows MUST NEVER perform git commits, pushes, rebase operations, or destructive resets unless explicitly directed by the user.

## Quality Gates & Review Workflow

- Type Integrity: All TypeScript code MUST compile cleanly with `tsc --noEmit` with zero errors.
- Clean Linting & Hook Integrity: React hooks MUST satisfy exhaustive dependencies without unsafe debounce creation or stale closures.
- Visual & Responsive Verification: Changes MUST be verified against mobile (≤768px) and desktop viewports, ensuring error and empty states render correctly.
- Converge Validation: Automated tasks MUST pass verification loops before work is finalized.

## Governance

This constitution supersedes all conflicting local patterns or informal development habits. Amendments require formal specification, rationalized semantic version bumps, and documentation in the Sync Impact Report.

Compliance with the constitution is verified before task sign-off. Any complexity or deviation from these principles must be explicitly justified.

**Version**: 1.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-09-30
