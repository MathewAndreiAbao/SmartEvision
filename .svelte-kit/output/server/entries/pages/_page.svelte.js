import { s as sanitize_props, a as spread_props, b as slot, h as head, c as store_get, u as unsubscribe_stores } from "../../chunks/index2.js";
import { a as authLoading, p as profile } from "../../chunks/auth.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { I as Icon } from "../../chunks/Icon.js";
function Arrow_right($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M5 12h14" }],
    ["path", { "d": "m12 5 7 7-7 7" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJtMTIgNSA3IDctNyA3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/arrow-right
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Smart E-VISION — Official Portal</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen bg-white flex flex-col font-sans selection:bg-gov-blue/10 selection:text-gov-blue"><nav class="w-full px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-white"><div class="flex items-center gap-2"><img src="/app_icon.png" alt="Smart E-VISION" class="w-8 h-8 rounded-md"/> <div class="flex flex-col"><span class="text-sm font-bold text-text-primary">Smart E-VISION</span> <span class="text-[10px] uppercase tracking-wide font-medium text-gov-blue">Document Hub</span></div></div> <div>`);
    if (!store_get($$store_subs ??= {}, "$authLoading", authLoading)) {
      $$renderer2.push("<!--[-->");
      if (store_get($$store_subs ??= {}, "$profile", profile)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button class="text-sm font-medium text-gov-blue hover:text-gov-blue-dark transition-colors">Go to Dashboard</button>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="flex items-center gap-3"><button class="text-sm font-medium text-text-secondary hover:text-gov-blue transition-colors px-4 py-2">Sign In</button> <button class="gov-btn-primary">Get Started</button></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></nav> <main class="flex-grow flex flex-col items-center justify-center px-6 text-center"><div class="max-w-2xl"><div class="inline-block px-2.5 py-1 rounded-md bg-gov-blue/5 text-gov-blue text-xs font-medium uppercase tracking-wide mb-5">DepEd Calapan City</div> <h1 class="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-6">Official Document <span class="text-gov-blue">Transparency</span> Portal</h1> <p class="text-base text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed">A unified hub for teachers, school heads, and district
                supervisors for secure document management and compliance
                tracking.</p> <div class="flex flex-col sm:flex-row items-center justify-center gap-4"><button class="gov-btn-primary text-base px-8 py-3">Access Portal `);
    Arrow_right($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></button> <div class="text-text-muted text-xs font-medium uppercase tracking-wide">Restricted Access Hub</div></div></div></main> <footer class="w-full px-6 py-6 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-3"><p class="text-xs text-text-muted font-medium">© 2026 Smart E-VISION Hub</p> <div class="flex items-center gap-4"><span class="text-xs text-text-muted font-medium">Public Portal</span> <span class="text-xs text-text-muted font-medium px-2 py-0.5 border border-border-subtle rounded-md">v1.2 Pilot</span></div></footer></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
