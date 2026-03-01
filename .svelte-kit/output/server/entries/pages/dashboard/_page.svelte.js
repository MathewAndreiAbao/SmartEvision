import { h as head, g as escape_html, c as store_get, e as ensure_array_like, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { p as profile } from "../../../chunks/auth.js";
import "../../../chunks/supabase.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import "pdf-lib";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    onDestroy(() => {
    });
    head("x1i5gj", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dashboard — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div><div class="mb-10"><h1 class="text-3xl font-black text-text-primary tracking-tight">${escape_html(store_get($$store_subs ??= {}, "$profile", profile)?.role === "Teacher" ? "Overview" : "Supervision Dashboard")}</h1> <p class="text-base text-text-secondary mt-1">Welcome back, <span class="font-bold text-gov-blue">${escape_html(store_get($$store_subs ??= {}, "$profile", profile)?.full_name || "User")}</span></p></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
      const each_array = ensure_array_like(Array(4));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="glass-card-static p-8 animate-pulse"><div class="h-4 bg-gray-200 rounded w-24 mb-4"></div> <div class="h-10 bg-gray-200 rounded w-16"></div></div>`);
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
