import { h as head, j as attr } from "../../../../chunks/index2.js";
import "../../../../chunks/supabase.js";
import "../../../../chunks/toast.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let password = "";
    let loading = false;
    head("1i2smtp", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sign In — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-screen bg-surface flex items-center justify-center p-6"><div class="w-full max-w-sm"><div class="text-center mb-8"><img src="/app_icon.png" alt="Smart E-VISION" class="w-12 h-12 mx-auto rounded-md shadow-sm mb-3"/> <h1 class="text-xl font-bold text-text-primary">Welcome Back</h1> <p class="text-sm text-text-secondary mt-1">Sign in to Smart E-VISION</p></div> <div class="gov-card-static p-6"><form><div class="mb-4"><label for="email" class="block text-sm font-medium text-text-primary mb-1.5">Email Address</label> <input id="email" type="email"${attr("value", email)} placeholder="your.email@deped.gov.ph" class="gov-input" autocomplete="email" required=""/></div> <div class="mb-5"><label for="password" class="block text-sm font-medium text-text-primary mb-1.5">Password</label> <input id="password" type="password"${attr("value", password)} placeholder="Enter your password" class="gov-input" autocomplete="current-password" required=""/></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", loading, true)} class="gov-btn-primary w-full py-3 text-base">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Sign In`);
    }
    $$renderer2.push(`<!--]--></button></form></div> <div class="text-center mt-4"><a href="/dashboard" class="text-sm text-text-muted hover:text-gov-blue transition-colors">Back to Smart E-VISION</a></div></div></div>`);
  });
}
export {
  _page as default
};
