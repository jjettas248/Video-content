"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Reel, type ReelHandle } from "./Reel";
import { REEL_HEIGHT, REEL_WIDTH } from "./script";

/** Fits the 1080x1920 reel to the viewport and adds play / restart controls. */
export function ReelPlayer() {
  const [scale, setScale] = useState(0.4);
  const [playing, setPlaying] = useState(true);
  const handle = useRef<ReelHandle | null>(null);

  useEffect(() => {
    const fit = () =>
      setScale(Math.min((window.innerHeight - 96) / REEL_HEIGHT, (window.innerWidth - 32) / REEL_WIDTH));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const toggle = () => {
    const tl = handle.current?.tl;
    if (!tl) return;
    if (tl.paused()) tl.play();
    else tl.pause();
    setPlaying(!tl.paused());
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-4">
      <div
        className="overflow-hidden rounded-2xl ring-1 ring-white/10"
        style={{ width: REEL_WIDTH * scale, height: REEL_HEIGHT * scale }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Reel onReady={(h) => (handle.current = h)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            handle.current?.tl.play(0);
            setPlaying(true);
          }}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
        >
          <RotateCcw size={16} /> Restart
        </button>
      </div>
    </main>
  );
}
