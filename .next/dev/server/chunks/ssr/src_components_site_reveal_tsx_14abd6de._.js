module.exports = [
"[project]/src/components/site/reveal.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnimatedCounter",
    ()=>AnimatedCounter,
    "Reveal",
    ()=>Reveal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function Reveal({ children, className, variant = "up", delay = 0, stagger = false, staggerStep = 90, as: Tag = "div" }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = ref.current;
        if (!el) return;
        // Graceful fallback: very old browsers without IO support show content instantly
        if (typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver((entries)=>{
            for (const entry of entries){
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            }
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -40px 0px"
        });
        observer.observe(el);
        return ()=>observer.disconnect();
    }, []);
    const variantClass = variant === "left" ? "reveal-left" : variant === "right" ? "reveal-right" : variant === "zoom" ? "reveal-zoom" : "";
    const delayStyle = delay > 0 ? {
        "--reveal-delay": `${delay}ms`
    } : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Tag, {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("reveal-item", variantClass, visible && "is-visible", className),
        style: delayStyle,
        children: stagger ? Array.isArray(children) ? children.map((child, i)=>child ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("reveal-item h-full", variantClass, visible && "is-visible"),
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
function AnimatedCounter({ value, className, duration = 1600 }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [display, setDisplay] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(value);
    const started = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
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
        const run = ()=>{
            if (started.current) return;
            started.current = true;
            // Reduced motion → jump straight to final value
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                setDisplay(value);
                return;
            }
            const decimals = (numStr.split(".")[1] || "").length;
            const t0 = performance.now();
            const tick = (now)=>{
                const p = Math.min((now - t0) / duration, 1);
                // easeOutExpo for a satisfying deceleration
                const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                const current = target * eased;
                const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString("en-US");
                setDisplay(`${prefix}${formatted}${suffix}`);
                if (p < 1) requestAnimationFrame(tick);
                else setDisplay(value); // exact final string
            };
            requestAnimationFrame(tick);
        };
        const observer = new IntersectionObserver((entries)=>{
            for (const entry of entries){
                if (entry.isIntersecting) {
                    run();
                    observer.disconnect();
                }
            }
        }, {
            threshold: 0.4
        });
        observer.observe(el);
        return ()=>observer.disconnect();
    }, [
        value,
        duration
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        ref: ref,
        className: className,
        children: display
    }, void 0, false, {
        fileName: "[project]/src/components/site/reveal.tsx",
        lineNumber: 177,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_components_site_reveal_tsx_14abd6de._.js.map