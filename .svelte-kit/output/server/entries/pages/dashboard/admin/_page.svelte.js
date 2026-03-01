import { s as sanitize_props, a as spread_props, b as slot, h as head, d as attr_class, j as attr, e as ensure_array_like, f as stringify } from "../../../../chunks/index2.js";
import "../../../../chunks/supabase.js";
import { S as Settings } from "../../../../chunks/settings.js";
import { I as Icon } from "../../../../chunks/Icon.js";
function Users($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "users" },
    $$sanitized_props,
    {
      /**
       * @component @name Users
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgMjF2LTJhNCA0IDAgMCAwLTQtNEg2YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8cGF0aCBkPSJNMTYgMy4xMjhhNCA0IDAgMCAxIDAgNy43NDQiIC8+CiAgPHBhdGggZD0iTTIyIDIxdi0yYTQgNCAwIDAgMC0zLTMuODciIC8+CiAgPGNpcmNsZSBjeD0iOSIgY3k9IjciIHI9IjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/users
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
    let activeTab = "settings";
    head("wt9tlv", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Admin Config — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-5xl mx-auto" role="main" aria-label="Admin Configuration"><div class="mb-8"><h1 class="text-2xl font-bold text-text-primary uppercase tracking-tight flex items-center gap-2">`);
    Settings($$renderer2, { size: 24 });
    $$renderer2.push(`<!----> Admin Configuration</h1> <p class="text-text-secondary mt-1">Manage system parameters and user accounts.</p></div> <div class="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-8 max-w-md" role="tablist" aria-label="Admin sections"><button${attr_class(`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${stringify(
      "bg-white text-gov-blue shadow-sm"
    )}`)} role="tab"${attr("aria-selected", activeTab === "settings")} aria-controls="settings-panel">`);
    Settings($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> System Parameters</button> <button${attr_class(`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${stringify("text-text-muted hover:text-text-primary")}`)} role="tab"${attr("aria-selected", activeTab === "users")} aria-controls="users-panel">`);
    Users($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> User Management</button></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab">`);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="space-y-4"><!--[-->`);
        const each_array = ensure_array_like(Array(3));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          each_array[$$index];
          $$renderer2.push(`<div class="h-32 glass-card-static animate-pulse"></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
