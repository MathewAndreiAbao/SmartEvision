import { s as sanitize_props, a as spread_props, b as slot, h as head, c as store_get, u as unsubscribe_stores } from "../../chunks/index2.js";
import { a as authLoading, p as profile } from "../../chunks/auth.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { S as Shield_check } from "../../chunks/shield-check.js";
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
    $$renderer2.push(`<div class="min-h-screen bg-white flex flex-col font-sans selection:bg-gov-blue/10 selection:text-gov-blue"><nav class="w-full px-8 py-6 border-b border-gray-100 flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-10 h-10 rounded-xl bg-gov-blue flex items-center justify-center text-white shadow-lg shadow-gov-blue/20">`);
    Shield_check($$renderer2, { size: 24 });
    $$renderer2.push(`<!----></div> <div class="flex flex-col"><span class="text-lg font-black tracking-tight text-text-primary">Smart E-VISION</span> <span class="text-[10px] uppercase tracking-[0.2em] font-bold text-gov-blue">Educational Hub</span></div></div> <div>`);
    if (!store_get($$store_subs ??= {}, "$authLoading", authLoading)) {
      $$renderer2.push("<!--[-->");
      if (store_get($$store_subs ??= {}, "$profile", profile)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button class="text-sm font-bold text-gov-blue hover:underline">Go to Dashboard</button>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="flex items-center gap-4"><button class="text-sm font-bold text-text-primary hover:text-gov-blue transition-colors px-6 py-2">Sign In</button> <button class="px-6 py-2 rounded-full bg-gov-blue text-white text-sm font-bold shadow-lg shadow-gov-blue/20 hover:bg-gov-blue-dark transition-all">Get Started</button></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></nav> <main class="flex-grow flex flex-col items-center justify-center px-6 text-center"><div class="max-w-3xl"><div class="inline-block px-3 py-1 rounded-full bg-gov-blue/5 text-gov-blue text-[10px] font-black uppercase tracking-[0.2em] mb-6">DepEd Calapan City</div> <h1 class="text-5xl md:text-6xl font-black text-text-primary tracking-tight leading-tight mb-8">Official Document <br/> <span class="text-gov-blue">Transparency</span> Portal.</h1> <p class="text-xl text-text-secondary mb-12 max-w-xl mx-auto leading-relaxed font-medium">A unified hub for teachers, school heads, and district
                supervisors for secure document management and compliance
                tracking.</p> <div class="flex flex-col sm:flex-row items-center justify-center gap-6"><button class="w-full sm:w-auto px-10 py-4 rounded-full bg-gov-blue text-white text-lg font-black shadow-xl shadow-gov-blue/30 hover:bg-gov-blue-dark transition-all flex items-center justify-center gap-2">Access Portal `);
    Arrow_right($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></button> <div class="text-text-muted text-xs font-black uppercase tracking-widest">Restricted Access Hub</div></div></div></main> <footer class="w-full px-8 py-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"><p class="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">© 2026 Smart E-VISION Hub</p> <div class="flex items-center gap-6"><span class="text-[10px] text-text-muted font-black uppercase tracking-widest">Public Portal</span> <span class="text-[10px] text-text-muted font-black uppercase tracking-widest px-2 py-0.5 border border-gray-200 rounded">v1.2 Pilot</span></div></footer></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
