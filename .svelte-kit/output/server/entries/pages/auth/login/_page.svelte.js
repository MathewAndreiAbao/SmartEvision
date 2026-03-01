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
    $$renderer2.push(`<div class="min-h-screen gradient-mesh flex items-center justify-center p-6"><div class="fixed top-20 left-20 w-72 h-72 bg-gov-blue/10 rounded-full blur-3xl pointer-events-none"></div> <div class="fixed bottom-20 right-20 w-96 h-96 bg-gov-gold/10 rounded-full blur-3xl pointer-events-none"></div> <div class="w-full max-w-md animate-slide-up"><div class="text-center mb-10"><div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gov-blue to-gov-blue-dark flex items-center justify-center text-white text-3xl font-bold shadow-elevated mb-4">E</div> <h1 class="text-2xl font-bold text-text-primary">Welcome Back</h1> <p class="text-base text-text-secondary mt-1">Sign in to Smart E-VISION</p></div> <div class="glass-card-static p-8"><form><div class="mb-5"><label for="email" class="block text-sm font-semibold text-text-primary mb-2">Email Address</label> <input id="email" type="email"${attr("value", email)} placeholder="your.email@deped.gov.ph" class="w-full px-5 py-3.5 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none transition-all min-h-[48px]" autocomplete="email" required=""/></div> <div class="mb-6"><label for="password" class="block text-sm font-semibold text-text-primary mb-2">Password</label> <input id="password" type="password"${attr("value", password)} placeholder="Enter your password" class="w-full px-5 py-3.5 text-base bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gov-blue/30 focus:border-gov-blue outline-none transition-all min-h-[48px]" autocomplete="current-password" required=""/></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", loading, true)} class="w-full py-4 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white text-lg font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 min-h-[56px] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Sign In`);
    }
    $$renderer2.push(`<!--]--></button></form></div> <div class="text-center mt-6"><a href="/dashboard" class="text-sm text-text-muted hover:text-gov-blue transition-colors">Back to Smart E-VISION</a></div></div></div>`);
  });
}
export {
  _page as default
};
