# Quickstart & Verification Guide

## Prerequisites

- Node.js >= 18
- Package manager: `yarn`

## Verification Commands

### 1. Static Type Checking

```bash
yarn tsc --noEmit
```

Expected outcome: Process exits with code 0 and 0 errors reported.

### 2. Build Verification

```bash
yarn build
```

Expected outcome: Production build finishes cleanly without bundling errors.

### 3. Responsive & Theme Layout Testing

Start the Vite development server:

```bash
yarn dev --port 3000
```

- Open browser at `http://localhost:3000` with DevTools Device Mode set to 375x667 (iPhone SE).
- Test `/room-list`: Verify cards fit within width, buttons have 44px targets, dark theme active.
- Test `/devtools`: Verify BrowserFrame divider drags via touch emulation; console groups strip box borders.
- Test `/log-list`: Verify Sider and Table adapt to 375px without horizontal clipping.
- Test `/replay`: Verify rrweb player and panel tabs stack vertically on mobile.
