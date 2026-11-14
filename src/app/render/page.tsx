"use client";

import { Reel, type ReelHandle } from "@/components/reel/Reel";

// Frame-accurate render target: 1080x1920, paused. scripts/render.mjs drives
// window.__reel.tl.time(t) and screenshots each frame.
export default function RenderPage() {
  return (
    <Reel
      autoplay={false}
      onReady={(h: ReelHandle) => {
        (window as unknown as { __reel: ReelHandle }).__reel = h;
      }}
    />
  );
}
