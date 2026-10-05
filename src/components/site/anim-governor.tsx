"use client";

import { useEffect } from "react";

/**
 * Performance governor for the decorative animation system.
 *
 * The site uses many always-on brand animations (rotating gradient borders,
 * pulsing icon halos, shimmer lines, floating shapes). Each running instance
 * costs main-thread paint work every frame — and users only ever see the
 * handful that are currently on screen.
 *
 * This component watches every animated element with a single shared
 * IntersectionObserver and pauses (`animation-play-state: paused`) anything
 * that scrolls out of view, restoring it the moment it comes back. Visual
 * behavior is 100% identical for anything the visitor can actually see;
 * off-screen cost drops to zero.
 */

const ANIMATED_SELECTOR = [
  ".ab-anim", // always-on rotating border rings
  ".ab-icon", // pulsing icon halos
  ".btn-glow", // breathing CTA glow
  ".ab-line", // shimmering accent lines
  ".ab-title-line", // animated title underline
  ".animate-shimmer", // gradient sweep (badges)
  ".animate-glow-pulse", // WhatsApp button halo
  ".animate-float-slow", // hero blobs / floating cards
  ".animate-float-slower",
  ".animate-marquee", // partner strip
  ".animate-spin-slow", // decorative rings
].join(", ");

export function AnimGovernor() {
  useEffect(() => {
    // Reduced-motion users: CSS already freezes every animation — skip.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const tracked = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("anim-paused", !entry.isIntersecting);
        }
      },
      // Resume slightly before the element enters the viewport so motion is
      // already running when it appears; pause shortly after it leaves.
      { rootMargin: "200px 0px" }
    );

    const scan = () => {
      for (const el of document.querySelectorAll(ANIMATED_SELECTOR)) {
        if (tracked.has(el)) continue;
        tracked.add(el);
        io.observe(el);
      }
    };

    scan();

    // Cards added later (category filters, pagination) get picked up too.
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
