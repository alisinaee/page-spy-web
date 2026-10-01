# UI & Component Contracts

## 1. Button Component Touch Contract

Path: `@/components/ui/button`

- Variant: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Sizes:
  - `sm`: 28px height (`h-7 px-2.5 text-xs`)
  - `default`: 32px height (`h-8 px-3 text-sm`)
  - `lg`: 36px height (`h-9 px-4 text-sm`)
  - `touch`: 44px height (`h-11 min-h-[44px] min-w-[44px] px-5 text-base`) -- **Mandatory for mobile touch targets**
  - `icon-touch`: 44px square (`size-11 min-h-[44px] min-w-[44px]`)

## 2. Touch Divider Contract

Path: `src/pages/Devtools/BrowserFrame/index.tsx`

- Events handled:
  - `mousedown`, `mousemove`, `mouseup`
  - `touchstart`, `touchmove`, `touchend`, `touchcancel`
- Touch behavior: Tracks `e.touches[0].clientX` relative to container width to update split percentage dynamically.

## 3. Dark Theme Contract

- Root DOM: `document.documentElement` MUST include class `dark`.
- Tokens:
  - Background: dark surface tones (`#121212`, `#1e1e1e`, or CSS variable `--background`)
  - Card/Panel backgrounds: `#1a1a1a`, `#242424` (never hardcoded `#fff`)
  - Border: `#333`, `#2a2a2a` (never hardcoded `#f0f0f0`)
