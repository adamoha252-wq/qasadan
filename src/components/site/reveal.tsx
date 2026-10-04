"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper — lightweight IntersectionObserver motion.
 * Works with ISR/static pages (progressively enhances on the client),
 * respects prefers-reduced-motion via the CSS in globals.css.
 *
 * Usage:
 *   <Reveal>...</Reveal>
 *   <Reveal variant="left" delay={120}>...</Reveal>
 *   <Reveal stagger>{items.map(...)}</Reveal>  // children auto-stagger
 */
export function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
  stagger = false,
  staggerStep = 90,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "up" | "left" | "right" | "zoom";
  delay?: number;
  stagger?: boolean;
  staggerStep?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Graceful fallback: very old browsers without IO support show content instantly
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass =
    variant === "left"
      ? "reveal-left"
      : variant === "right"
        ? "reveal-right"
        : variant === "zoom"
          ? "reveal-zoom"
          : "";

  const delayStyle =
    delay > 0 ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined;

  return (
    <Tag
      ref={ref}
      className={cn("reveal-item", variantClass, visible && "is-visible", className)}
      style={delayStyle}
    >
      {stagger
        ? Array.isArray(children)
          ? children.map((child, i) =>
              child ? (
                <div
                  key={i}
                  className={cn("reveal-item h-full", variantClass, visible && "is-visible")}
                  style={{ "--reveal-delay": `${delay + i * staggerStep}ms` } as React.CSSProperties}
                >
                  {child}
                </div>
              ) : (
                child
              )
            )
          : children
        : children}
    </Tag>
  );
}

/**
 * Animated number counter — parses a display value like "50+", "$299",
 * "24/7", "98%" and animates the numeric part from 0 when scrolled into
 * view. Non-numeric values are rendered as-is (graceful fallback).
 */
export function AnimatedCounter({
  value,
  className,
  duration = 1600,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    // Parse: prefix ($, +, etc.) + number + suffix (+, %, /7 etc.)
    const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr.replace(/,/g, ""));
    if (!Number.isFinite(target) || match[2] === "") {
      setDisplay(value);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;

      // Reduced motion → jump straight to final value
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(value);
        return;
      }

      const decimals = (numStr.split(".")[1] || "").length;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        // easeOutExpo for a satisfying deceleration
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        const current = target * eased;
        const formatted =
          decimals > 0
            ? current.toFixed(decimals)
            : Math.round(current).toLocaleString("en-US");
        setDisplay(`${prefix}${formatted}${suffix}`);
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(value); // exact final string
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
