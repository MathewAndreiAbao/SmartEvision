import { s as sanitize_props, a as spread_props, b as slot, h as head, c as store_get, g as escape_html, j as attr, d as attr_class, u as unsubscribe_stores, f as stringify } from "../../../../chunks/index2.js";
import { p as profile, u as user } from "../../../../chunks/auth.js";
import { a as addToast } from "../../../../chunks/toast.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { s as supabase } from "../../../../chunks/supabase.js";
import "../../../../chunks/config.js";
import { P as ProfileUploader, U as User } from "../../../../chunks/ProfileUploader.js";
import { S as Shield_check, B as Bell } from "../../../../chunks/shield-check.js";
import { I as Icon } from "../../../../chunks/Icon.js";
function Languages($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "m5 8 6 6" }],
    ["path", { "d": "m4 14 6-6 2-3" }],
    ["path", { "d": "M2 5h12" }],
    ["path", { "d": "M7 2h1" }],
    ["path", { "d": "m22 22-5-10-5 10" }],
    ["path", { "d": "M14 18h6" }]
  ];
  Icon($$renderer, spread_props([
    { name: "languages" },
    $$sanitized_props,
    {
      /**
       * @component @name Languages
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNSA4IDYgNiIgLz4KICA8cGF0aCBkPSJtNCAxNCA2LTYgMi0zIiAvPgogIDxwYXRoIGQ9Ik0yIDVoMTIiIC8+CiAgPHBhdGggZD0iTTcgMmgxIiAvPgogIDxwYXRoIGQ9Im0yMiAyMi01LTEwLTUgMTAiIC8+CiAgPHBhdGggZD0iTTE0IDE4aDYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/languages
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
function Log_out($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    ["path", { "d": "m16 17 5-5-5-5" }],
    ["path", { "d": "M21 12H9" }],
    ["path", { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "log-out" },
    $$sanitized_props,
    {
      /**
       * @component @name LogOut
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMTcgNS01LTUtNSIgLz4KICA8cGF0aCBkPSJNMjEgMTJIOSIgLz4KICA8cGF0aCBkPSJNOSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/log-out
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
    let fullName = "";
    let avatarUrl = null;
    let saving = false;
    async function updateProfile() {
      if (!store_get($$store_subs ??= {}, "$profile", profile)) return;
      saving = true;
      const { error } = await supabase.from("profiles").update({ full_name: fullName, avatar_url: avatarUrl }).eq("id", store_get($$store_subs ??= {}, "$profile", profile).id);
      if (error) {
        addToast("error", error.message);
      } else {
        addToast("success", "Profile updated successfully");
        profile.update((p) => p ? { ...p, full_name: fullName, avatar_url: avatarUrl } : null);
      }
      saving = false;
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("a30v8d", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Profile Settings — Smart E-VISION</title>`);
        });
      });
      $$renderer3.push(`<div class="max-w-3xl mx-auto space-y-8 pb-12"><div class="mb-2"><h1 class="text-3xl font-bold text-text-primary tracking-tight">Account Identity</h1> <p class="text-text-secondary mt-1 font-medium">Manage your personal profile and system preferences.</p></div> <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-1"><div class="gov-card-static p-8 flex flex-col items-center text-center">`);
      ProfileUploader($$renderer3, {
        id: store_get($$store_subs ??= {}, "$profile", profile)?.id || "",
        label: "Profile Photo",
        path: "users",
        size: "xl",
        onUpload: (newUrl) => {
          avatarUrl = newUrl;
          updateProfile();
        },
        get url() {
          return avatarUrl;
        },
        set url($$value) {
          avatarUrl = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> <div class="mt-6 w-full"><h2 class="text-xl font-bold text-text-primary truncate">${escape_html("User Name")}</h2> <p class="text-xs font-bold text-gov-blue uppercase tracking-widest mt-1">${escape_html(store_get($$store_subs ??= {}, "$profile", profile)?.role || "User")}</p></div> <div class="mt-8 w-full space-y-3 pt-6 border-t border-gray-50 text-left"><div class="flex items-center gap-3 text-text-secondary">`);
      Shield_check($$renderer3, { size: 14, class: "text-gov-blue" });
      $$renderer3.push(`<!----> <span class="text-[10px] font-bold uppercase tracking-wider">Access Secured</span></div></div></div></div> <div class="lg:col-span-2 space-y-8"><div class="gov-card-static p-6"><div class="flex items-center gap-2 mb-6 text-gov-blue">`);
      User($$renderer3, { size: 18 });
      $$renderer3.push(`<!----> <h2 class="text-sm font-bold uppercase tracking-widest">Personal Details</h2></div> <div class="space-y-6"><div><label for="fullName" class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Display Name (User Name)</label> <input id="fullName" type="text"${attr("value", fullName)} placeholder="Enter your full name" class="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/20 focus:border-gov-blue outline-none transition-all font-bold"/></div> <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Official Email</span> <div class="px-4 py-3 text-sm bg-gray-50/50 border border-gray-100 rounded-xl text-text-muted italic flex items-center min-h-[48px]">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.email || "Not verified")}</div></div> <div><span class="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Connection Status</span> <div class="px-4 py-3 text-sm bg-gray-50/50 border border-gray-100 rounded-xl text-text-muted flex items-center min-h-[48px]">`);
      Log_out($$renderer3, { size: 14, class: "mr-2 rotate-180 opacity-40" });
      $$renderer3.push(`<!----> ${escape_html("Synchronized")}</div></div></div> <div class="pt-4 flex justify-end"><button${attr("disabled", saving, true)} class="px-8 py-3 bg-gov-blue text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gov-blue-dark active:scale-95 transition-all disabled:opacity-50 shadow-sm">${escape_html(saving ? "Syncing..." : "Update Identity")}</button></div></div></div> <div class="gov-card-static p-6"><div class="flex items-center gap-2 mb-6 text-gov-blue">`);
      Bell($$renderer3, { size: 18 });
      $$renderer3.push(`<!----> <h2 class="text-sm font-bold uppercase tracking-widest">System Experience</h2></div> <div class="space-y-4"><div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gov-blue shadow-sm">`);
      Languages($$renderer3, { size: 18 });
      $$renderer3.push(`<!----></div> <div><span class="block text-sm font-bold text-text-primary">Voice Assistance</span> <p class="text-[10px] text-text-muted font-medium">Auditory feedback for accessibility.</p></div></div> <button${attr_class(`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 ${stringify("bg-gray-300")}`)}><span class="sr-only">Toggle voice guidance</span> <span${attr_class(`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stringify("translate-x-1")}`)}></span></button></div> <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gov-green shadow-sm">`);
      Bell($$renderer3, { size: 18 });
      $$renderer3.push(`<!----></div> <div><span class="block text-sm font-bold text-text-primary">Live Alerts</span> <p class="text-[10px] text-text-muted font-medium">Real-time deadline and review notifications.</p></div></div> <button${attr_class(`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 ${stringify("bg-gray-300")}`)}><span class="sr-only">Toggle push notifications</span> <span${attr_class(`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stringify("translate-x-1")}`)}></span></button></div></div></div> <div class="pt-4"><button class="w-full py-4 border-2 border-gov-red/20 text-gov-red font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-gov-red/5 transition-all flex items-center justify-center gap-2 group">`);
      Log_out($$renderer3, {
        size: 16,
        class: "group-hover:translate-x-1 transition-transform"
      });
      $$renderer3.push(`<!----> Sign Out Securely</button></div></div></div></div>`);
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
