# Data Model: PageSpy React Client Mobile-First Dark Refactor

## Entities & Interfaces

### 1. DeviceSession

Represents the connected client device running PageSpy SDK.

- `address`: string - Network address / origin of the target device.
- `browser`: { type: string, name: string, version: string } - Browser family and version.
- `os`: { type: string, name: string, version: string } - Operating system environment.
- `framework`: string - Integration framework (e.g., Vue, React, MiniProgram).
- `plugins`: string[] - Active SDK plugins reporting data.

### 2. FormattedConsoleItem

Represents console log messages rendered in the Console panel.

- `isGroup`: boolean - Whether this entry represents a collapsed or expanded log group.
- `groupItems`: ConsoleItem[] - Nested log items inside the group.
- `groupFullText`: string - Formatted text representation with ANSI color codes and ASCII box-drawing borders removed.
- `cleanTitle`: string - Group summary header stripped of leading box characters.

### 3. ResponsiveLayoutState

Viewport adaptation attributes for responsive screens.

- `isMobile`: boolean - Viewport width <= 768px.
- `orientation`: 'portrait' | 'landscape'.
- `splitRatio`: number - Percentage split for BrowserFrame or Replayer panels (100% on mobile stacked view).

### 4. ThemeConfiguration

Global appearance configuration.

- `mode`: 'dark' (fixed).
- `surfaceBg`: Token for dark panel surfaces.
- `borderToken`: Token for subtle dark card and panel dividers.
