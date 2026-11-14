"use client";

import { useRef, type ReactNode } from "react";
import { Ban, Camera, Eye, Heart, Inbox, Megaphone, Send, ArrowDown, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { CHUNKS, CUTS, PUNCHES, REEL_DURATION, REEL_HEIGHT, REEL_WIDTH } from "./script";

/* ------------------------------------------------------------------ */
/* Palette: problem = red, solution/gain = green + yellow              */
/* ------------------------------------------------------------------ */
const RED = "#ff2d2d";
const YELLOW = "#ffe14d";
const GREEN = "#2dff7a";
const INK = "#0b0b0b";

/** Deterministic PRNG so every render of the reel is identical frame for frame. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BILL_COUNT = 70;

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

/** One kinetic word/line. `k` is the class the timeline animates. */
function K({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("k mx-[0.07em] inline-block will-change-transform", className)} style={{ color }}>
      {children}
    </span>
  );
}

function Scene({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div
      data-scene={id}
      className={cn("scene invisible absolute inset-0 flex flex-col items-center justify-center px-[70px] pb-[520px] pt-[190px]", className)}
    >
      {children}
    </div>
  );
}

function Bubble({
  children,
  className,
  tone = "dead",
  meta,
}: {
  children: ReactNode;
  className?: string;
  tone?: "dead" | "live" | "me";
  meta?: string;
}) {
  return (
    <div className={cn("bubble flex flex-col gap-2", tone === "me" ? "items-end" : "items-start", className)}>
      <div
        className={cn(
          "rounded-[44px] px-[40px] py-[22px] text-[48px] font-semibold leading-tight shadow-[0_20px_60px_rgba(0,0,0,.45)]",
          tone === "dead" && "rounded-bl-[10px] bg-[#2a2a2e] text-white/90",
          tone === "live" && "rounded-bl-[10px] bg-[#1fd96a] text-black",
          tone === "me" && "rounded-br-[10px] bg-[#3b82f6] text-white",
        )}
      >
        {children}
      </div>
      {meta && <div className="px-4 text-[30px] font-bold tracking-wide text-[#ff5a5a]">{meta}</div>}
    </div>
  );
}

function Bill({ i }: { i: number }) {
  return (
    <div
      className="bill absolute top-0 flex h-[96px] w-[210px] items-center justify-between rounded-[10px] border-[5px] border-[#bfffd0] bg-[#1f9d55] px-4 font-display text-[44px] text-[#eaffef] shadow-[0_10px_30px_rgba(0,0,0,.35)]"
      data-i={i}
    >
      <span>$</span>
      <span className="grid h-[64px] w-[64px] place-items-center rounded-full border-[4px] border-[#bfffd0] text-[30px]">
        100
      </span>
      <span>$</span>
    </div>
  );
}

const DEAD_LEADS = ["not right now", "too expensive", "maybe later", "can’t afford it", "let me think", "not ready for 1:1", "next month", "send info", "seen ✓✓"];

/* ------------------------------------------------------------------ */
/* The reel                                                            */
/* ------------------------------------------------------------------ */

export type ReelHandle = { tl: gsap.core.Timeline; duration: number };

export function Reel({ autoplay = true, onReady }: { autoplay?: boolean; onReady?: (h: ReelHandle) => void }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

      // Everything that animates starts hidden; scenes are switched on/off by hard cuts.
      tl.set(q(".scene"), { autoAlpha: 0 }, 0);
      tl.set(q(".k, .bubble, .pop, .spark"), { autoAlpha: 0 }, 0);
      tl.set(q(".bill"), { y: -300 }, 0);

      /* ---------- helpers ---------- */
      const scene = (id: string, start: number, end: number) => {
        // Smooth cut: the outgoing shot pushes past the camera and blurs out while
        // the incoming one settles in from slightly behind it. The two overlap.
        const el = q(`[data-scene="${id}"]`);
        if (start <= 0) tl.set(el, { autoAlpha: 1, scale: 1, filter: "blur(0px)" }, 0);
        else
          tl.fromTo(
            el,
            { autoAlpha: 0, scale: 0.86, filter: "blur(18px)" },
            { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.34, ease: "power3.out", immediateRender: false },
            start - 0.1,
          );
        if (end < REEL_DURATION)
          tl.to(el, { autoAlpha: 0, scale: 1.16, filter: "blur(18px)", duration: 0.24, ease: "power2.in" }, end - 0.14);
      };
      const sel = (s: string) => q(s);
      // Kinetic slam: word punches in from big + blurred.
      const slam = (s: string, t: number, stagger = 0.09) =>
        tl.fromTo(
          sel(s),
          { autoAlpha: 0, scale: 2.8, filter: "blur(18px)" },
          { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.34, stagger, immediateRender: false },
          t,
        );
      // Springy pop for objects (bubbles, cards, icons).
      const pop = (s: string, t: number, stagger = 0.12) =>
        tl.fromTo(
          sel(s),
          { autoAlpha: 0, scale: 0.15, rotation: -8 },
          { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.55, ease: "back.out(2.4)", stagger, immediateRender: false },
          t,
        );
      // Reactive scale: a quick "bass hit" on a key word.
      const hit = (s: string, t: number, amount = 1.18) =>
        tl.fromTo(sel(s), { scale: amount }, { scale: 1, duration: 0.45, ease: "elastic.out(1.1,0.35)", immediateRender: false }, t);
      const flash = (t: number, color = "#ffffff", strength = 0.9) => {
        // Soft colour bloom instead of a hard strobe.
        tl.fromTo(
          sel(".flash"),
          { backgroundColor: color, autoAlpha: 0 },
          { autoAlpha: strength * 0.38, duration: 0.08, ease: "power1.out", immediateRender: false },
          t - 0.06,
        );
        tl.to(sel(".flash"), { autoAlpha: 0, duration: 0.36, ease: "power2.out" }, t + 0.03);
      };
      const shake = (t: number, amt = 22) =>
        tl.fromTo(
          sel(".shaker"),
          { x: amt, y: -amt * 0.6, rotation: 0.8 },
          { x: 0, y: 0, rotation: 0, duration: 0.5, ease: "elastic.out(1.2,0.25)", immediateRender: false },
          t,
        );
      const bg = (color: string, t: number) =>
        t <= 0
          ? tl.set(sel(".bg"), { backgroundColor: color }, 0)
          : tl.to(sel(".bg"), { backgroundColor: color, duration: 0.4, ease: "power1.inOut" }, t - 0.12);

      // Money rain: bills fall through the frame between `start` and `end`.
      const bills = sel(".bill");
      let billCursor = 0;
      const rain = (start: number, end: number, count: number, seed: number) => {
        const r = rng(seed);
        for (let n = 0; n < count; n++) {
          const el = bills[billCursor++ % bills.length];
          const at = start + r() * Math.max(0.01, end - start - 1.2);
          const dur = 1.3 + r() * 1.1;
          const x = -80 + r() * (REEL_WIDTH - 60);
          const rot0 = -60 + r() * 120;
          tl.fromTo(
            el,
            { x, y: -260, rotation: rot0, rotationX: 0, autoAlpha: 1, scale: 0.7 + r() * 0.6 },
            {
              y: REEL_HEIGHT + 200,
              x: x + (-160 + r() * 320),
              rotation: rot0 + (-240 + r() * 480),
              rotationX: 360 * (r() > 0.5 ? 1 : -1),
              duration: dur,
              ease: "power1.in",
              immediateRender: false,
            },
            at,
          );
        }
      };

      /* ---------- progress + beat labels + captions ---------- */
      tl.fromTo(sel(".progress"), { scaleX: 0 }, { scaleX: 1, duration: REEL_DURATION, ease: "none", immediateRender: false }, 0);
      tl.set(sel(".beat-label"), { autoAlpha: 0 }, 0);
      [0, 10, 20].forEach((t, i) => {
        tl.set(sel(".beat-label"), { autoAlpha: 0 }, t);
        tl.set(sel(`.beat-label-${i}`), { autoAlpha: 1 }, t + 0.001);
        tl.fromTo(sel(`.beat-label-${i}`), { scale: 1.6 }, { scale: 1, duration: 0.4, immediateRender: false }, t + 0.001);
      });
      tl.set(sel(".progress"), { backgroundColor: RED }, 0);
      tl.set(sel(".progress"), { backgroundColor: GREEN }, 10);
      tl.set(sel(".progress"), { backgroundColor: YELLOW }, 20);
      // Karaoke captions: 3-4 words on screen, the spoken word pops yellow.
      CHUNKS.forEach((c, i) => {
        const chunk = sel(`[data-chunk="${i}"]`);
        tl.set(chunk, { autoAlpha: 1 }, c.start);
        tl.set(chunk, { autoAlpha: 0 }, c.end - 0.001);
        const words = sel(`[data-chunk="${i}"] .w`);
        const step = (c.end - c.start) / words.length;
        words.forEach((w, j) => {
          const at = c.start + j * step;
          tl.fromTo(
            w,
            { scale: 1.5, color: YELLOW },
            { scale: 1.14, color: YELLOW, duration: 0.14, ease: "back.out(3)", immediateRender: false },
            at,
          );
          tl.to(w, { color: "#ffffff", scale: 1, duration: 0.1 }, at + step);
        });
      });

      // Camera: constant slow push-in on every shot, so nothing ever sits still.
      // Punch-ins: extra cuts inside each shot, eased so the reframe glides.
      const FRAMES = [
        { scale: 1.1, x: -26, y: 18 },
        { scale: 1.0, x: 0, y: 0 },
        { scale: 1.14, x: 24, y: -22 },
        { scale: 1.04, x: -12, y: -10 },
      ];
      PUNCHES.forEach((t, i) => {
        tl.to(sel(".punch"), { ...FRAMES[i % FRAMES.length], duration: 0.36, ease: "power3.inOut" }, t - 0.12);
      });

      CUTS.forEach((start, i) => {
        const end = CUTS[i + 1] ?? REEL_DURATION;
        tl.fromTo(
          sel(".cam"),
          { scale: i % 2 ? 1.07 : 1, rotation: i % 2 ? 0.6 : -0.6 },
          { scale: i % 2 ? 1 : 1.07, rotation: 0, duration: end - start, ease: "none", immediateRender: false },
          start,
        );
      });
      tl.fromTo(sel(".sunburst"), { rotation: 0 }, { rotation: 150, duration: REEL_DURATION, ease: "none", immediateRender: false }, 0);

      // Spark burst from the centre on big hits.
      const sparks = sel(".spark");
      let sparkCursor = 0;
      const burst = (t: number, color: string, n = 16, seed = 5) => {
        const r = rng(seed + Math.round(t * 10));
        for (let k = 0; k < n; k++) {
          const el = sparks[sparkCursor++ % sparks.length];
          const a = (k / n) * Math.PI * 2 + r() * 0.5;
          const d = 420 + r() * 520;
          tl.fromTo(
            el,
            { x: 0, y: 0, scale: 0.3, autoAlpha: 1, color, rotation: 0 },
            {
              x: Math.cos(a) * d,
              y: Math.sin(a) * d,
              scale: 1.2 + r(),
              rotation: -180 + r() * 360,
              autoAlpha: 0,
              duration: 0.75,
              ease: "power3.out",
              immediateRender: false,
            },
            t,
          );
        }
      };
      [
        [0.9, YELLOW], [4.95, YELLOW], [9.12, RED], [10.0, GREEN], [12.7, YELLOW], [15.9, YELLOW],
        [16.5, INK], [18.75, GREEN], [21.05, GREEN], [25.2, YELLOW], [26.4, GREEN], [28.25, YELLOW], [29.2, GREEN],
      ].forEach(([t, c]) => burst(t as number, c as string));

      /* ================= BEAT 1 · PROBLEM (0–10s) ================= */
      bg("#160000", 0);

      // S1 0–2.6  "There's money sitting in your fucking DMs right now."
      scene("s1", 0, 2.6);
      pop('[data-scene="s1"] .pop', 0.0, 0.05);
      slam('[data-scene="s1"] .k', 0.1, 0.16);
      shake(0.42);
      hit('[data-scene="s1"] .money', 0.9, 1.3);
      shake(1.3, 30);
      flash(1.3, RED, 0.5);
      rain(0.5, 2.6, 8, 1);

      // S2 2.6–5.6  posting for strangers → buyers already in your inbox
      flash(2.6);
      scene("s2", 2.6, 5.6);
      pop('[data-scene="s2"] .icons .pop', 2.62, 0.06);
      slam('[data-scene="s2"] .a .k', 2.7, 0.1);
      tl.fromTo(sel(".strike"), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power4.out", immediateRender: false }, 3.55);
      tl.to(sel('[data-scene="s2"] .a, [data-scene="s2"] .icons'), { autoAlpha: 0, scale: 0.7, duration: 0.2 }, 3.85);
      pop('[data-scene="s2"] .inbox', 4.0);
      const badge = { n: 0 };
      tl.to(
        badge,
        {
          n: 47,
          duration: 0.9,
          ease: "power2.out",
          onUpdate() {
            const el = sel(".badge")[0];
            if (el) el.textContent = String(Math.round(badge.n));
          },
        },
        4.15,
      );
      slam('[data-scene="s2"] .b .k', 4.25, 0.08);
      hit('[data-scene="s2"] .buyers', 4.95, 1.35);
      shake(4.95);

      // S3 5.6–10  every "not right now"... still sitting there. Doing nothing.
      flash(5.6);
      scene("s3", 5.6, 10);
      tl.fromTo(sel(".s3-every"), { autoAlpha: 0, x: -80 }, { autoAlpha: 1, x: 0, duration: 0.3, immediateRender: false }, 5.62);
      pop('[data-scene="s3"] .bubble', 5.75, 0.85);
      tl.fromTo(
        sel('[data-scene="s3"] .bubble'),
        { scale: 1 },
        { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut", stagger: 0.85, immediateRender: false },
        6.2,
      );
      // They go cold: grey out, sink, dust.
      tl.to(sel('[data-scene="s3"] .bubble'), { filter: "grayscale(1) brightness(.55)", y: 40, rotation: (i: number) => [-4, 3, -2][i] ?? 0, duration: 0.6, ease: "power2.out", stagger: 0.05 }, 8.25);
      tl.to(sel(".s3-every"), { autoAlpha: 0, duration: 0.2 }, 8.25);
      slam(".s3-still .k", 8.35, 0.08);
      slam(".s3-nothing", 9.1);
      shake(9.12, 34);
      flash(9.12, RED, 0.45);
      hit(".s3-nothing", 9.6, 1.12);

      /* ================= BEAT 2 · SOLUTION (10–20s) ================= */
      flash(10, GREEN, 1);
      bg("#00140a", 10);

      // S4 10–13  One message. To the dead DMs. That's the system.
      scene("s4", 10, 13);
      slam(".s4-one .k", 10.05, 0.12);
      shake(10.2);
      tl.fromTo(
        sel(".s4-send"),
        { autoAlpha: 0, y: 500, x: 0, scale: 0.6, rotation: -12 },
        { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.55, ease: "back.out(1.8)", immediateRender: false },
        10.45,
      );
      tl.to(sel(".s4-send"), { y: -720, x: 260, scale: 0.35, rotation: 18, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, 11.2);
      slam(".s4-dead .k", 11.0, 0.08);
      pop(".lead", 11.45, 0.035);
      // Dead DMs come back to life — grey to green, one after another.
      tl.to(sel(".lead"), { backgroundColor: GREEN, color: INK, duration: 0.12, stagger: 0.07, ease: "none" }, 11.75);
      tl.fromTo(sel(".lead"), { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1, stagger: 0.07, immediateRender: false }, 11.75);
      slam(".s4-system .k", 12.3, 0.1);
      hit(".s4-system", 12.7, 1.15);

      // S5 13–16.5  Couldn't close them on the big thing? Route 'em smaller.
      flash(13);
      scene("s5", 13, 16.5);
      slam(".s5-q .k", 13.05, 0.07);
      pop(".big-offer", 13.5);
      tl.fromTo(sel(".declined"), { autoAlpha: 0, scale: 3, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: -12, duration: 0.3, ease: "power4.out", immediateRender: false }, 14.15);
      shake(14.18);
      // Route smaller: big card shrinks up, arrows draw, three small offers pop.
      tl.to(sel(".big-offer"), { scale: 0.7, y: -150, duration: 0.45, ease: "power3.inOut" }, 14.65);
      tl.to(sel(".s5-q"), { autoAlpha: 0, y: -80, duration: 0.3 }, 14.65);
      tl.fromTo(sel(".route-line"), { scaleY: 0 }, { scaleY: 1, duration: 0.3, stagger: 0.06, ease: "power2.out", immediateRender: false }, 14.95);
      pop(".small-offer", 15.15, 0.12);
      slam(".s5-route .k", 15.35, 0.1);
      hit(".s5-route .smaller", 15.9, 1.3);
      shake(15.9, 16);

      // S6 16.5–20  quick cuts: Don't drop 'em / Don't ghost 'em / Just move the money.
      scene("s6a", 16.5, 17.3);
      flash(16.5, YELLOW, 1);
      slam('[data-scene="s6a"] .k', 16.52, 0.08);
      shake(16.7, 28);
      scene("s6b", 17.3, 18.1);
      flash(17.3, "#ffffff", 0.8);
      slam('[data-scene="s6b"] .k', 17.32, 0.08);
      tl.fromTo(sel(".ghost"), { autoAlpha: 0, scale: 0.4, y: 120 }, { autoAlpha: 0.9, scale: 1, y: 0, duration: 0.4, ease: "back.out(2)", immediateRender: false }, 17.35);
      tl.fromTo(sel(".ghost-ban"), { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 1, scale: 1, duration: 0.22, immediateRender: false }, 17.7);
      shake(17.7);
      scene("s6c", 18.1, 20);
      flash(18.1, GREEN, 1);
      slam('[data-scene="s6c"] .k', 18.12, 0.12);
      hit('[data-scene="s6c"] .money', 18.75, 1.4);
      shake(18.75, 36);
      rain(18.3, 20.2, 26, 7);
      hit('[data-scene="s6c"] .money', 19.4, 1.15);

      /* ================= BEAT 3 · GAIN (20–30s) ================= */
      flash(20, YELLOW, 1);
      bg("#121000", 20);

      // S7 20–24  Clients you already talked to. No new content. No new ads.
      scene("s7", 20, 24);
      pop(".avatar", 20.05, 0.07);
      slam(".s7-clients .k", 20.3, 0.08);
      hit(".s7-clients .talked", 21.05, 1.2);
      pop(".s7-row-1", 21.6);
      tl.fromTo(sel(".s7-row-1 .xmark"), { autoAlpha: 0, scale: 3 }, { autoAlpha: 1, scale: 1, duration: 0.2, immediateRender: false }, 22.0);
      shake(22.0, 14);
      pop(".s7-row-2", 22.6);
      tl.fromTo(sel(".s7-row-2 .xmark"), { autoAlpha: 0, scale: 3 }, { autoAlpha: 1, scale: 1, duration: 0.2, immediateRender: false }, 23.0);
      shake(23.0, 14);
      hit(".s7-rows", 23.4, 1.06);

      // S8 24–27  Just money you left on the table. (heavy rain + counter)
      flash(24, GREEN, 0.9);
      scene("s8", 24, 27);
      slam(".s8-line .k", 24.05, 0.1);
      pop(".tabletop", 24.3);
      pop(".counter", 24.55);
      const counter = { v: 0 };
      tl.to(
        counter,
        {
          v: 18400,
          duration: 1.9,
          ease: "power3.out",
          onUpdate() {
            const el = sel(".counter-num")[0];
            if (el) el.textContent = "$" + (Math.round(counter.v / 10) * 10).toLocaleString("en-US");
          },
        },
        24.6,
      );
      rain(24.2, 27.2, 36, 42);
      hit(".s8-line .table-word", 25.2, 1.3);
      shake(26.4, 20);
      hit(".counter", 26.4, 1.2);

      // S9 27–30  Comment GROWTH and I'll show you the exact message.
      flash(27, "#ffffff", 0.9);
      scene("s9", 27, 30.01);
      slam(".s9-comment .k", 27.05);
      pop(".comment-box", 27.25);
      const word = "GROWTH";
      const typed = { n: 0 };
      tl.to(
        typed,
        {
          n: word.length,
          duration: 0.75,
          ease: `steps(${word.length})`,
          onUpdate() {
            const el = sel(".typed")[0];
            if (el) el.textContent = word.slice(0, Math.round(typed.n));
          },
        },
        27.45,
      );
      tl.fromTo(sel(".caret"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25, repeat: 9, yoyo: true, ease: "steps(1)", immediateRender: false }, 27.3);
      hit(".comment-box", 28.25, 1.12);
      tl.fromTo(sel(".send-btn"), { backgroundColor: "#3a3a3a" }, { backgroundColor: GREEN, duration: 0.15, immediateRender: false }, 28.25);
      shake(28.25, 14);
      slam(".s9-show .k", 28.45, 0.07);
      hit(".s9-show .exact", 29.2, 1.25);
      tl.fromTo(sel(".s9-arrow"), { y: -20, autoAlpha: 0 }, { y: 20, autoAlpha: 1, duration: 0.35, repeat: 3, yoyo: true, ease: "sine.inOut", immediateRender: false }, 28.6);

      tl.seek(0);
      onReady?.({ tl, duration: REEL_DURATION });
      if (autoplay) tl.play(0);
      tl.eventCallback("onComplete", () => {
        if (autoplay) tl.play(0);
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="relative overflow-hidden bg-black font-sans text-white"
      style={{ width: REEL_WIDTH, height: REEL_HEIGHT }}
    >
      <div className="bg absolute inset-0" />
      {/* Grain + vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.75)_100%)]" />

      <div className="sunburst pointer-events-none absolute left-1/2 top-1/2 h-[2600px] w-[2600px] -translate-x-1/2 -translate-y-1/2 bg-[repeating-conic-gradient(rgba(255,255,255,.055)_0_9deg,transparent_9deg_18deg)]" />
      <div className="shaker absolute inset-0">
       <div className="punch absolute inset-0">
       <div className="cam absolute inset-0">
        {/* ---------------- S1 ---------------- */}
        <Scene id="s1">
          <div className="pop mb-[60px] flex items-center gap-6 rounded-full bg-white/10 px-10 py-5 text-[40px] font-bold">
            <MessageDot /> 47 unread
          </div>
          <div className="text-center font-display uppercase leading-[1.06]">
            <K className="text-[120px]">There’s</K>
            <br />
            <K className="money text-[260px]" color={YELLOW}>
              money
            </K>
            <br />
            <K className="text-[96px]">sitting in your</K>
            <br />
            <K className="text-[150px]" color={RED}>
              fucking
            </K>{" "}
            <K className="rounded-[24px] bg-[#ff2d2d] px-6 text-[150px] text-black">DMs</K>
            <br />
            <K className="mt-6 text-[110px]" color={YELLOW}>
              right now.
            </K>
          </div>
        </Scene>

        {/* ---------------- S2 ---------------- */}
        <Scene id="s2">
          <div className="icons mb-10 flex gap-10">
            {[Heart, Eye, Heart].map((Icon, i) => (
              <div key={i} className="pop grid h-[120px] w-[120px] place-items-center rounded-full bg-white/10">
                <Icon size={64} strokeWidth={2.5} />
              </div>
            ))}
          </div>
          <div className="a relative text-center font-display uppercase leading-[1.06]">
            <K className="text-[96px] text-white/80">You’re out here</K>
            <br />
            <K className="text-[150px]">posting for</K>
            <br />
            <K className="text-[170px]" color={RED}>
              strangers
            </K>
            <div className="strike absolute left-[-30px] right-[-30px] top-[62%] h-[26px] origin-left rounded bg-[#ff2d2d]" />
          </div>
          <div className="absolute inset-x-0 top-[650px] flex flex-col items-center">
            <div className="inbox pop relative mb-14 grid h-[300px] w-[300px] place-items-center rounded-[70px] bg-[#ffe14d] text-black shadow-[0_0_120px_rgba(255,225,77,.55)]">
              <Inbox size={170} strokeWidth={2.2} />
              <div className="badge absolute -right-8 -top-8 grid h-[130px] min-w-[130px] place-items-center rounded-full bg-[#ff2d2d] px-4 font-display text-[78px] text-white">
                0
              </div>
            </div>
            <div className="b text-center font-display uppercase leading-[1.06]">
              <K className="text-[90px]">while your actual</K>
              <br />
              <K className="buyers text-[200px]" color={YELLOW}>
                buyers
              </K>
              <br />
              <K className="text-[90px]">are already in your inbox.</K>
            </div>
          </div>
        </Scene>

        {/* ---------------- S3 ---------------- */}
        <Scene id="s3" className="justify-start pt-[190px]">
          <div className="s3-every mb-6 self-start font-display text-[80px] uppercase" style={{ color: RED }}>
            Every…
          </div>
          <div className="flex w-full flex-col gap-5">
            <Bubble className="self-start" meta="SEEN · 63 DAYS AGO">“not right now”</Bubble>
            <Bubble className="self-end" meta="SEEN · 41 DAYS AGO">“too expensive”</Bubble>
            <Bubble className="self-start" meta="SEEN · 22 DAYS AGO">“not ready for 1:1”</Bubble>
          </div>
          <div className="mt-[36px] text-center font-display uppercase leading-[1.06]">
            <div className="s3-still">
              <K className="text-[84px]">they’re all still</K>
              <br />
              <K className="text-[84px]">sitting there.</K>
            </div>
            <K className="s3-nothing mt-8 rotate-[-4deg] whitespace-nowrap rounded-[20px] border-[12px] border-[#ff2d2d] px-8 text-[128px] text-[#ff2d2d]">
              Doing nothing.
            </K>
          </div>
        </Scene>

        {/* ---------------- S4 ---------------- */}
        <Scene id="s4" className="justify-start pt-[220px]">
          <div className="s4-one text-center font-display uppercase leading-[1.06]">
            <K className="text-[150px]" color={GREEN}>
              One
            </K>{" "}
            <K className="text-[150px]">message.</K>
          </div>
          <div className="s4-send pop mt-10 flex items-center gap-6">
            <Bubble tone="me" className="!opacity-100 !visible">
              Hey — quick one for you…
            </Bubble>
            <Send size={90} color={GREEN} />
          </div>
          <div className="s4-dead mt-6 text-center font-display uppercase">
            <K className="text-[110px]">To the</K> <K className="text-[110px] text-white/50 line-through decoration-[#2dff7a]">dead</K>{" "}
            <K className="text-[110px]" color={GREEN}>
              DMs.
            </K>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-5">
            {DEAD_LEADS.map((t, i) => (
              <div key={i} className="lead pop grid h-[96px] w-[290px] place-items-center rounded-[30px] bg-[#2a2a2e] px-4 text-center text-[34px] font-bold text-white/70">
                {t}
              </div>
            ))}
          </div>
          <div className="s4-system mt-10 whitespace-nowrap text-center font-display uppercase">
            <K className="text-[116px]">That’s the</K> <K className="text-[116px]" color={YELLOW}>
              system.
            </K>
          </div>
        </Scene>

        {/* ---------------- S5 ---------------- */}
        <Scene id="s5" className="justify-start pt-[220px]">
          <div className="s5-q text-center font-display uppercase leading-[1.06]">
            <K className="text-[84px]">Couldn’t close them</K>
            <br />
            <K className="text-[84px]">on the</K> <K className="text-[120px]" color={RED}>
              big thing?
            </K>
          </div>
          <div className="big-offer pop relative mt-8 w-[760px] rounded-[48px] border-[6px] border-white/20 bg-[#151515] p-8 text-center">
            <div className="text-[40px] font-bold tracking-widest text-white/60">1:1 COACHING</div>
            <div className="font-display text-[170px] leading-none">$5,000</div>
            <div className="declined absolute -right-10 top-10 rounded-[16px] border-[10px] border-[#ff2d2d] px-6 font-display text-[90px] text-[#ff2d2d]">
              DECLINED
            </div>
          </div>
          <div className="mt-2 flex w-full justify-around px-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="route-line h-[64px] w-[10px] origin-top rounded bg-[#2dff7a]" />
            ))}
          </div>
          <div className="mt-2 flex w-full justify-between gap-6">
            {[
              ["$497", "COURSE"],
              ["$97", "WORKSHOP"],
              ["$27", "TEMPLATE"],
            ].map(([p, l]) => (
              <div key={l} className="small-offer pop flex-1 rounded-[36px] bg-[#2dff7a] p-8 text-center text-black">
                <div className="font-display text-[100px] leading-none">{p}</div>
                <div className="mt-2 text-[32px] font-black tracking-widest">{l}</div>
              </div>
            ))}
          </div>
          <div className="s5-route mt-8 whitespace-nowrap text-center font-display uppercase">
            <K className="text-[112px]">Route ’em</K>{" "}
            <K className="smaller text-[112px]" color={YELLOW}>
              smaller.
            </K>
          </div>
        </Scene>

        {/* ---------------- S6 quick cuts ---------------- */}
        <Scene id="s6a" className="bg-[#ffe14d] text-black">
          <div className="text-center font-display uppercase leading-[1.06]">
            <K className="text-[260px]">Don’t</K>
            <br />
            <K className="text-[260px]">drop</K>
            <br />
            <K className="text-[260px]">’em.</K>
          </div>
        </Scene>
        <Scene id="s6b" className="bg-black">
          <div className="relative mb-10">
            <Ghost />
            <div className="ghost-ban absolute inset-0 grid place-items-center">
              <Ban size={420} color={RED} strokeWidth={2.4} />
            </div>
          </div>
          <div className="text-center font-display uppercase leading-[1.06]" style={{ color: YELLOW }}>
            <K className="text-[220px]">Don’t</K>
            <br />
            <K className="text-[220px]">ghost ’em.</K>
          </div>
        </Scene>
        <Scene id="s6c" className="bg-[#00140a]">
          <div className="text-center font-display uppercase leading-[1.06]">
            <K className="text-[150px]">Just move</K>
            <br />
            <K className="text-[200px]">the</K>
            <br />
            <K className="money text-[300px]" color={GREEN}>
              money.
            </K>
          </div>
        </Scene>

        {/* ---------------- S7 ---------------- */}
        <Scene id="s7" className="justify-start pt-[260px]">
          <div className="mb-12 flex -space-x-8">
            {["#ff7a59", "#ffe14d", "#2dff7a", "#5ab0ff", "#c77dff"].map((c, i) => (
              <div
                key={c}
                className="avatar pop grid h-[170px] w-[170px] place-items-center rounded-full border-[8px] border-[#121000] font-display text-[80px] text-black"
                style={{ backgroundColor: c }}
              >
                {"JMKSA"[i]}
              </div>
            ))}
          </div>
          <div className="s7-clients text-center font-display uppercase leading-[1.06]">
            <K className="text-[150px]" color={YELLOW}>
              Clients
            </K>
            <br />
            <K className="text-[100px]">you already</K>
            <br />
            <K className="talked text-[150px]" color={GREEN}>
              talked to.
            </K>
          </div>
          <div className="s7-rows mt-20 flex w-full flex-col gap-10">
            {[
              { cls: "s7-row-1", Icon: Camera, text: "No new content." },
              { cls: "s7-row-2", Icon: Megaphone, text: "No new ads." },
            ].map(({ cls, Icon, text }) => (
              <div key={cls} className={cn(cls, "pop flex items-center gap-10 rounded-[40px] bg-white/[.07] p-8")}>
                <div className="relative grid h-[150px] w-[150px] shrink-0 place-items-center rounded-[34px] bg-white/10">
                  <Icon size={90} />
                  <div className="xmark absolute inset-0 grid place-items-center">
                    <X size={170} color={RED} strokeWidth={3} />
                  </div>
                </div>
                <div className="font-display text-[100px] uppercase leading-none">{text}</div>
              </div>
            ))}
          </div>
        </Scene>

        {/* ---------------- S8 ---------------- */}
        <Scene id="s8">
          <div className="counter pop mb-14 rounded-[40px] bg-[#2dff7a] px-14 py-6 text-black shadow-[0_0_140px_rgba(45,255,122,.6)]">
            <div className="text-[36px] font-black tracking-widest">RECOVERED</div>
            <div className="counter-num font-display text-[190px] leading-none">$0</div>
          </div>
          <div className="s8-line text-center font-display uppercase leading-[1.06]">
            <K className="text-[130px]">Just</K> <K className="text-[130px]" color={GREEN}>
              money
            </K>
            <br />
            <K className="text-[110px]">you left on the</K>
            <br />
            <K className="table-word text-[240px]" color={YELLOW}>
              table.
            </K>
          </div>
          <div className="tabletop pop mt-6 h-[40px] w-[900px] rounded-full bg-[#7a4a1f] shadow-[0_20px_0_#4d2c0f]" />
        </Scene>

        {/* ---------------- S9 ---------------- */}
        <Scene id="s9">
          <div className="s9-comment mb-10 font-display uppercase">
            <K className="text-[170px]">Comment</K>
          </div>
          <div className="comment-box pop flex w-[920px] items-center gap-6 rounded-full border-[6px] border-[#ffe14d] bg-[#141414] py-6 pl-12 pr-6 shadow-[0_0_120px_rgba(255,225,77,.45)]">
            <div className="flex-1 font-display text-[130px] leading-none" style={{ color: YELLOW }}>
              <span className="typed" />
              <span className="caret ml-1 inline-block h-[110px] w-[10px] translate-y-[10px] bg-[#ffe14d]" />
            </div>
            <div className="send-btn grid h-[140px] w-[140px] place-items-center rounded-full bg-[#3a3a3a]">
              <Send size={70} color="#000" />
            </div>
          </div>
          <div className="s9-show mt-16 text-center font-display uppercase leading-[1.06]">
            <K className="text-[96px]">and I’ll show you</K>
            <br />
            <K className="text-[96px]">the</K>{" "}
            <K className="exact text-[150px]" color={GREEN}>
              exact
            </K>
            <br />
            <K className="text-[150px]" color={YELLOW}>
              message.
            </K>
          </div>
          <div className="s9-arrow mt-12">
            <ArrowDown size={140} color={YELLOW} strokeWidth={3} />
          </div>
        </Scene>
       </div>
       </div>
      </div>

      {/* Spark bursts */}
      <div className="pointer-events-none absolute left-1/2 top-[44%]">
        {Array.from({ length: 48 }, (_, i) => (
          <div key={i} className="spark invisible absolute -ml-[30px] -mt-[45px] font-display text-[90px] leading-none">
            {i % 3 === 0 ? "$" : i % 3 === 1 ? "✦" : "●"}
          </div>
        ))}
      </div>

      {/* Money rain layer (shared by all scenes) */}
      <div className="pointer-events-none absolute inset-0 [perspective:900px]">
        {Array.from({ length: BILL_COUNT }, (_, i) => (
          <Bill key={i} i={i} />
        ))}
      </div>

      {/* HUD: progress + beat label */}
      <div className="absolute inset-x-[60px] top-[70px] h-[12px] overflow-hidden rounded-full bg-white/15">
        <div className="progress h-full origin-left" />
      </div>
      {[
        ["THE PROBLEM", RED],
        ["THE SOLUTION", GREEN],
        ["THE GAIN", YELLOW],
      ].map(([label, color], i) => (
        <div
          key={label}
          className={`beat-label beat-label-${i} invisible absolute left-[60px] top-[110px] origin-left font-display text-[44px] tracking-[0.2em]`}
          style={{ color }}
        >
          {label}
        </div>
      ))}

      {/* Captions: verbatim script, inside the safe zone above platform UI */}
      <div className="absolute inset-x-[50px] bottom-[330px] h-[200px]">
        {CHUNKS.map((c, i) => (
          <div
            key={i}
            data-chunk={i}
            className="invisible absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-[22px] text-center font-display text-[76px] uppercase leading-[1.1] [-webkit-text-stroke:10px_#000] [paint-order:stroke_fill] [text-shadow:0_8px_0_#000]"
          >
            {c.words.map((w, j) => (
              <span key={j} className="w inline-block">
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="flash pointer-events-none invisible absolute inset-0" />
    </div>
  );
}

function MessageDot() {
  return <span className="inline-block h-[30px] w-[30px] rounded-full bg-[#ff2d2d] shadow-[0_0_30px_#ff2d2d]" />;
}

function Ghost() {
  return (
    <svg className="ghost" width="380" height="420" viewBox="0 0 38 42" fill="white" aria-hidden>
      <path d="M19 1C9.6 1 3 7.8 3 17v24l5-4 5 4 6-4 6 4 5-4 5 4V17C35 7.8 28.4 1 19 1z" />
      <circle cx="13" cy="17" r="3" fill="#000" />
      <circle cx="25" cy="17" r="3" fill="#000" />
    </svg>
  );
}
