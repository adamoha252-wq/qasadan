(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/site/reveal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnimatedCounter",
    ()=>AnimatedCounter,
    "Reveal",
    ()=>Reveal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
function Reveal({ children, className, variant = "up", delay = 0, stagger = false, staggerStep = 90, as: Tag = "div" }) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Reveal.useEffect": ()=>{
            const el = ref.current;
            if (!el) return;
            // Graceful fallback: very old browsers without IO support show content instantly
            if (typeof IntersectionObserver === "undefined") {
                setVisible(true);
                return;
            }
            const observer = new IntersectionObserver({
                "Reveal.useEffect": (entries)=>{
                    for (const entry of entries){
                        if (entry.isIntersecting) {
                            setVisible(true);
                            observer.disconnect();
                        }
                    }
                }
            }["Reveal.useEffect"], {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            });
            observer.observe(el);
            return ({
                "Reveal.useEffect": ()=>observer.disconnect()
            })["Reveal.useEffect"];
        }
    }["Reveal.useEffect"], []);
    const variantClass = variant === "left" ? "reveal-left" : variant === "right" ? "reveal-right" : variant === "zoom" ? "reveal-zoom" : "";
    const delayStyle = delay > 0 ? {
        "--reveal-delay": `${delay}ms`
    } : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Tag, {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("reveal-item", variantClass, visible && "is-visible", className),
        style: delayStyle,
        children: stagger ? Array.isArray(children) ? children.map((child, i)=>child ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("reveal-item h-full", variantClass, visible && "is-visible"),
                style: {
                    "--reveal-delay": `${delay + i * staggerStep}ms`
                },
                children: child
            }, i, false, {
                fileName: "[project]/src/components/site/reveal.tsx",
                lineNumber: 81,
                columnNumber: 17
            }, this) : child) : children : children
    }, void 0, false, {
        fileName: "[project]/src/components/site/reveal.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(Reveal, "F7BtIAxVh3vOWU1Jr24RYsj9CHc=");
_c = Reveal;
function AnimatedCounter({ value, className, duration = 1600 }) {
    _s1();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [display, setDisplay] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(value);
    const started = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnimatedCounter.useEffect": ()=>{
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
            const run = {
                "AnimatedCounter.useEffect.run": ()=>{
                    if (started.current) return;
                    started.current = true;
                    // Reduced motion → jump straight to final value
                    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                        setDisplay(value);
                        return;
                    }
                    const decimals = (numStr.split(".")[1] || "").length;
                    const t0 = performance.now();
                    const tick = {
                        "AnimatedCounter.useEffect.run.tick": (now)=>{
                            const p = Math.min((now - t0) / duration, 1);
                            // easeOutExpo for a satisfying deceleration
                            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                            const current = target * eased;
                            const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString("en-US");
                            setDisplay(`${prefix}${formatted}${suffix}`);
                            if (p < 1) requestAnimationFrame(tick);
                            else setDisplay(value); // exact final string
                        }
                    }["AnimatedCounter.useEffect.run.tick"];
                    requestAnimationFrame(tick);
                }
            }["AnimatedCounter.useEffect.run"];
            const observer = new IntersectionObserver({
                "AnimatedCounter.useEffect": (entries)=>{
                    for (const entry of entries){
                        if (entry.isIntersecting) {
                            run();
                            observer.disconnect();
                        }
                    }
                }
            }["AnimatedCounter.useEffect"], {
                threshold: 0.4
            });
            observer.observe(el);
            return ({
                "AnimatedCounter.useEffect": ()=>observer.disconnect()
            })["AnimatedCounter.useEffect"];
        }
    }["AnimatedCounter.useEffect"], [
        value,
        duration
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        ref: ref,
        className: className,
        children: display
    }, void 0, false, {
        fileName: "[project]/src/components/site/reveal.tsx",
        lineNumber: 177,
        columnNumber: 5
    }, this);
}
_s1(AnimatedCounter, "wxVRbsoAnCuPcK3215Z0iyR8AZE=");
_c1 = AnimatedCounter;
var _c, _c1;
__turbopack_context__.k.register(_c, "Reveal");
__turbopack_context__.k.register(_c1, "AnimatedCounter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_site_reveal_tsx_a08c37c0._.js.map