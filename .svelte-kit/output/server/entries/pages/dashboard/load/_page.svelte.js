import { s as sanitize_props, a as spread_props, b as slot, h as head, e as ensure_array_like } from "../../../../chunks/index2.js";
import "../../../../chunks/supabase.js";
import "clsx";
import "../../../../chunks/toast.js";
import { I as Icon } from "../../../../chunks/Icon.js";
function Plus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
  Icon($$renderer, spread_props([
    { name: "plus" },
    $$sanitized_props,
    {
      /**
       * @component @name Plus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
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
    head("1g84nau", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Teaching Load — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-8"><div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><h1 class="text-3xl font-bold text-text-primary tracking-tight">Teaching Load</h1> <p class="text-base text-text-secondary mt-1 font-medium">Manage your academic assignments and grade levels</p></div> <button class="px-6 py-3 bg-gov-blue text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg hover:shadow-gov-blue/20 transition-all flex items-center gap-2 group">`);
    Plus($$renderer2, {
      size: 16,
      class: "group-hover:rotate-90 transition-transform"
    });
    $$renderer2.push(`<!----> Add New Load</button></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><!--[-->`);
      const each_array = ensure_array_like(Array(3));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="gov-card-static p-8 animate-pulse"><div class="h-6 bg-gray-100 rounded-full w-24 mb-6"></div> <div class="h-8 bg-gray-100 rounded w-3/4 mb-4"></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
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
