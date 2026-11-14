<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Kokonut UI

- Before building an animated or interactive component from scratch, check the Kokonut UI component list at https://kokonutui.com/llms.txt for an existing one.
- Install components with the shadcn CLI, never by pasting code: `npx shadcn@latest add @kokonutui/<name>` (the `@kokonutui` registry is set in `components.json`).
- After install, edit the installed file in place.
- The shadcn MCP server (`.mcp.json`) can browse and install registry components from the editor.

## GSAP

- Import GSAP only from `@/lib/gsap` (`import { gsap, useGSAP } from "@/lib/gsap"`). It registers plugins once; add new plugins there.
- GSAP touches the DOM: use it only in Client Components (`"use client"`), and use `useGSAP()` instead of `useEffect` so animations revert on unmount.
