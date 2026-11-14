# Video content

Short-form video reels built as React components: Next.js, Tailwind, shadcn/ui, the Kokonut UI registry and GSAP.

## Run

```bash
npm install
npm run dev      # http://localhost:3000 plays the reel, fitted to the window
```

## Render to MP4

```bash
npm run build && npm start     # terminal 1
npm run render                 # terminal 2 -> out/reel-12-closed-lost-money.mp4
```

`scripts/render.mjs` opens `/render` (the reel at 1080x1920, paused), steps the GSAP timeline frame by frame at 30 fps and pipes the frames to ffmpeg. It needs `ffmpeg` and Playwright's Chromium.

## Layout

- `src/components/reel/script.ts`: script lines, caption timing, cut points
- `src/components/reel/Reel.tsx`: scenes and the GSAP timeline
- `src/lib/gsap.ts`: the only place GSAP is imported and plugins are registered
- Kokonut UI components: `npx shadcn@latest add @kokonutui/<name>`
