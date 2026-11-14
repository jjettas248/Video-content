"use client";

/**
 * Single GSAP entry point. Import from here, not from "gsap" directly:
 *
 *   import { gsap, useGSAP } from "@/lib/gsap";
 *
 * Plugins are registered once here so build tools don't tree-shake them away.
 * To add one (e.g. ScrollTrigger, SplitText — all free since GSAP 3.13):
 *   import { ScrollTrigger } from "gsap/ScrollTrigger";
 *   gsap.registerPlugin(useGSAP, ScrollTrigger);
 *   export { ScrollTrigger };
 *
 * GSAP touches the DOM, so only use it in Client Components ("use client").
 * Prefer useGSAP() over useEffect: it scopes selectors to a ref and reverts
 * all animations on unmount.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
