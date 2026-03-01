import { s as sanitize_props, a as spread_props, b as slot, h as head, g as escape_html, e as ensure_array_like, d as attr_class, f as stringify, j as attr, u as unsubscribe_stores, c as store_get } from "../../../../chunks/index2.js";
import "../../../../chunks/supabase.js";
import { p as profile } from "../../../../chunks/auth.js";
import { I as Icon } from "../../../../chunks/Icon.js";
import { C as Chevron_right } from "../../../../chunks/chevron-right.js";
import { S as Search } from "../../../../chunks/search.js";
function Arrow_left($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "m12 19-7-7 7-7" }],
    ["path", { "d": "M19 12H5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIgMTktNy03IDctNyIgLz4KICA8cGF0aCBkPSJNMTkgMTJINSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-left
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
function House($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      { "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }
    ],
    [
      "path",
      {
        "d": "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "house" },
    $$sanitized_props,
    {
      /**
       * @component @name House
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMjF2LThhMSAxIDAgMCAwLTEtMWgtNGExIDEgMCAwIDAtMSAxdjgiIC8+CiAgPHBhdGggZD0iTTMgMTBhMiAyIDAgMCAxIC43MDktMS41MjhsNy02YTIgMiAwIDAgMSAyLjU4MiAwbDcgNkEyIDIgMCAwIDEgMjEgMTB2OWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/house
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
    let searchQuery = "";
    let currentPath = [{ type: "root", id: "root", label: "Archive" }];
    function getSubtitle() {
      const role = store_get($$store_subs ??= {}, "$profile", profile)?.role;
      if (role === "Teacher") return "Browse and search your archived instructional records";
      if (role === "District Supervisor") return "Browse all archived documents across your district";
      return "Browse all archived documents in your school";
    }
    head("15mknmq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Archive — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-6"><h1 class="text-2xl font-bold text-text-primary">Document Archive</h1> <p class="text-base text-text-secondary mt-1">${escape_html(getSubtitle())}</p></div> <div class="glass-card-static p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"><div class="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">`);
    if (currentPath.length > 1) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-text-primary transition-colors flex-shrink-0" title="Go back">`);
      Arrow_left($$renderer2, { size: 18 });
      $$renderer2.push(`<!----></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(currentPath);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let seg = each_array[i];
      if (i > 0) {
        $$renderer2.push("<!--[-->");
        Chevron_right($$renderer2, { size: 14, class: "text-text-muted flex-shrink-0 mx-0.5" });
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <button${attr_class(`text-sm font-medium px-2 py-1 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${stringify(i === currentPath.length - 1 ? "text-gov-blue bg-gov-blue/5 font-bold" : "text-text-muted hover:text-text-primary hover:bg-gray-100")}`)}>`);
      if (i === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="flex items-center gap-1.5">`);
        House($$renderer2, { size: 14 });
        $$renderer2.push(`<!----> Archive</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`${escape_html(seg.label)}`);
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="relative flex-shrink-0 w-full sm:w-64">`);
    Search($$renderer2, {
      size: 16,
      class: "absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
    });
    $$renderer2.push(`<!----> <input type="text"${attr("value", searchQuery)} placeholder="Search files..." class="w-full pl-9 pr-4 py-2.5 text-sm bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none min-h-[44px]"/></div></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"><!--[-->`);
      const each_array_1 = ensure_array_like(Array(10));
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        each_array_1[$$index_1];
        $$renderer2.push(`<div class="glass-card-static p-6 animate-pulse"><div class="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"></div> <div class="h-3 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div> <div class="h-2 bg-gray-100 rounded w-1/2 mx-auto"></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
