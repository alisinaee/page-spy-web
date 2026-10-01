# Agent notes

shadcn/ui is the mobile-first kit for new screens. Existing debugger panels stay on Ant Design and Less.

- Project config is `components.json` (style `base-nova`, Base UI, Tailwind v4).
- Styles live in `src/styles/shadcn.css`. Tailwind preflight is off so Ant Design layout is left alone.
- Add components with `npx shadcn@latest add <name>`. Do not hand-copy registry source.
- New phone UI uses `@/components/ui`. Do not place `antd` components on those screens.
- Phone controls need a 44px touch target. The default button is shorter, so use `size="lg"` or a taller class.
- The shadcn MCP server is named `shadcn` and runs `npx shadcn@latest mcp`.
