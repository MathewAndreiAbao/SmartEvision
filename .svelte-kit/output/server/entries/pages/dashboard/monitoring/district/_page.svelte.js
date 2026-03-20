import { s as sanitize_props, a as spread_props, b as slot, h as head, g as escape_html, c as store_get, e as ensure_array_like, u as unsubscribe_stores } from "../../../../../chunks/index2.js";
import { p as profile } from "../../../../../chunks/auth.js";
import { s as supabase } from "../../../../../chunks/supabase.js";
import { o as onDestroy } from "../../../../../chunks/index-server.js";
import { D as DrillDownModal } from "../../../../../chunks/DrillDownModal.js";
import { P as ProfileUploader } from "../../../../../chunks/ProfileUploader.js";
import { a as addToast } from "../../../../../chunks/toast.js";
import { I as Icon } from "../../../../../chunks/Icon.js";
function Building_2($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "M10 12h4" }],
    ["path", { "d": "M10 8h4" }],
    ["path", { "d": "M14 21v-3a2 2 0 0 0-4 0v3" }],
    [
      "path",
      {
        "d": "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
      }
    ],
    ["path", { "d": "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }]
  ];
  Icon($$renderer, spread_props([
    { name: "building-2" },
    $$sanitized_props,
    {
      /**
       * @component @name Building2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMTJoNCIgLz4KICA8cGF0aCBkPSJNMTAgOGg0IiAvPgogIDxwYXRoIGQ9Ik0xNCAyMXYtM2EyIDIgMCAwIDAtNCAwdjMiIC8+CiAgPHBhdGggZD0iTTYgMTBINGEyIDIgMCAwIDAtMiAydjdhMiAyIDAgMCAwIDIgMmgxNmEyIDIgMCAwIDAgMi0yVjlhMiAyIDAgMCAwLTItMmgtMiIgLz4KICA8cGF0aCBkPSJNNiAyMVY1YTIgMiAwIDAgMSAyLTJoOGEyIDIgMCAwIDEgMiAydjE2IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/building-2
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
    let districtLogoUrl = null;
    let kpi = {
      totalSchools: 0
    };
    let showModal = false;
    onDestroy(() => {
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1thoarh", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>District Monitoring — Smart E-VISION</title>`);
        });
      });
      $$renderer3.push(`<div class="space-y-10"><div class="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h1 class="text-3xl font-semibold text-text-primary tracking-tight">District Oversight</h1> <p class="text-base text-text-secondary mt-1 font-medium">Monitoring performance across <span class="font-bold text-gov-blue">${escape_html(kpi.totalSchools)} schools</span> in the district</p></div> `);
      if (store_get($$store_subs ??= {}, "$profile", profile)?.role === "District Supervisor" && store_get($$store_subs ??= {}, "$profile", profile)?.district_id) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">`);
        ProfileUploader($$renderer3, {
          id: store_get($$store_subs ??= {}, "$profile", profile).district_id,
          bucket: "avatars",
          path: "districts",
          label: "District Logo",
          size: "md",
          placeholderIcon: Building_2,
          onUpload: async (newUrl) => {
            await supabase.from("districts").update({ avatar_url: newUrl }).eq("id", store_get($$store_subs ??= {}, "$profile", profile)?.district_id || "");
            addToast("success", "District logo updated");
          },
          get url() {
            return districtLogoUrl;
          },
          set url($$value) {
            districtLogoUrl = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----> <div class="hidden sm:block"><h4 class="text-sm font-bold text-text-primary uppercase tracking-tight">District Branding</h4> <p class="text-[10px] text-text-muted font-medium">Official Governance Logo</p></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
        const each_array = ensure_array_like(Array(4));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          each_array[$$index];
          $$renderer3.push(`<div class="gov-card-static p-8 animate-pulse text-center"><div class="h-4 bg-gray-200 rounded w-24 mx-auto mb-4"></div> <div class="h-10 bg-gray-200 rounded w-16 mx-auto"></div></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      DrillDownModal($$renderer3, {
        isOpen: showModal,
        title: "School Details",
        onClose: () => showModal = false,
        children: ($$renderer4) => {
          {
            $$renderer4.push("<!--[!-->");
          }
          $$renderer4.push(`<!--]-->`);
        }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
