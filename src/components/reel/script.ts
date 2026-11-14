// Reel 12 – Closed-Lost Money. Script lines are verbatim; times are in seconds.
export const REEL_DURATION = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;

export type Beat = "problem" | "solution" | "gain";

export const CAPTIONS: { start: number; end: number; beat: Beat; text: string }[] = [
  { start: 0, end: 2.6, beat: "problem", text: "There’s money sitting in your fucking DMs right now." },
  {
    start: 2.6,
    end: 5.6,
    beat: "problem",
    text: "You’re out here posting for strangers… while your actual buyers are already in your inbox.",
  },
  {
    start: 5.6,
    end: 10,
    beat: "problem",
    text: "Every ‘not right now,’ every ‘too expensive,’ every person who wasn’t ready for 1:1 — they’re all still sitting there. Doing nothing.",
  },
  { start: 10, end: 13, beat: "solution", text: "One message. To the dead DMs. That’s the system." },
  { start: 13, end: 16.5, beat: "solution", text: "Couldn’t close them on the big thing? Route ‘em smaller." },
  { start: 16.5, end: 20, beat: "solution", text: "Don’t drop ‘em. Don’t ghost ’em. Just move the money." },
  { start: 20, end: 24, beat: "gain", text: "Clients you already talked to. No new content. No new ads." },
  { start: 24, end: 27, beat: "gain", text: "Just money you left on the table." },
  { start: 27, end: 30, beat: "gain", text: "Comment GROWTH and I’ll show you the exact message." },
];

/** Shot boundaries (hard cuts), in seconds. */
export const CUTS = [0, 2.6, 5.6, 8.25, 10, 11.4, 13, 14.65, 16.5, 17.3, 18.1, 20, 21.6, 24, 25.6, 27, 28.45];

/** Punch-in reframes inside shots (eased camera cuts), in seconds. */
export const PUNCHES = [
  0.9, 1.7, 3.55, 4.6, 6.6, 7.45, 9.1, 10.7, 12.3, 13.6, 15.35, 18.75, 19.4, 20.9, 22.3, 23.0, 24.8, 26.2, 27.7, 29.2,
];

/** Captions split into 3-4 word chunks, timed by word position within each line. */
export const CHUNKS = CAPTIONS.flatMap((c) => {
  const words = c.text.split(" ");
  const per = (c.end - c.start - 0.15) / words.length;
  const size = words.length <= 4 ? words.length : Math.ceil(words.length / Math.ceil(words.length / 4));
  const out: { start: number; end: number; words: string[] }[] = [];
  for (let i = 0; i < words.length; i += size) {
    const group = words.slice(i, i + size);
    out.push({ start: c.start + i * per, end: c.start + (i + group.length) * per, words: group });
  }
  out[out.length - 1].end = c.end;
  return out;
});
