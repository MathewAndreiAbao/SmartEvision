import { h as head, j as attr, g as escape_html, c as store_get, d as attr_class, u as unsubscribe_stores, f as stringify } from "../../../../chunks/index2.js";
import { p as profile } from "../../../../chunks/auth.js";
import "../../../../chunks/toast.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/supabase.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let fullName = "";
    let newPassword = "";
    let confirmPassword = "";
    let saving = false;
    let queueCount = 0;
    head("a30v8d", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Settings — Smart E-VISION</title>`);
      });
    });
    $$renderer2.push(`<div class="max-w-2xl"><div class="mb-8"><h1 class="text-2xl font-bold text-text-primary">Settings</h1> <p class="text-base text-text-secondary mt-1">Manage your profile and preferences</p></div> <div class="space-y-8"><div class="glass-card-static p-6"><h2 class="text-lg font-bold text-text-primary mb-5">Profile</h2> <div class="space-y-4"><div><label for="fullName" class="block text-sm font-semibold text-text-primary mb-2">Full Name</label> <input id="fullName" type="text"${attr("value", fullName)} class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"/></div> <div><span class="block text-sm font-semibold text-text-primary mb-2">Email</span> <p class="px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl text-text-muted min-h-[48px] flex items-center">${escape_html(store_get($$store_subs ??= {}, "$profile", profile)?.id ? "Loaded from Supabase" : "—")}</p></div> <div><span class="block text-sm font-semibold text-text-primary mb-2">Role</span> <p class="px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl text-text-muted min-h-[48px] flex items-center">${escape_html(store_get($$store_subs ??= {}, "$profile", profile)?.role || "—")}</p></div> <button${attr("disabled", saving, true)} class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all disabled:opacity-60">${escape_html("Save Changes")}</button></div></div> <div class="glass-card-static p-6"><h2 class="text-lg font-bold text-text-primary mb-5">Change Password</h2> <div class="space-y-4"><div><label for="newPass" class="block text-sm font-semibold text-text-primary mb-2">New Password</label> <input id="newPass" type="password"${attr("value", newPassword)} placeholder="Minimum 6 characters" class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"/></div> <div><label for="confirmPass" class="block text-sm font-semibold text-text-primary mb-2">Confirm Password</label> <input id="confirmPass" type="password"${attr("value", confirmPassword)} placeholder="Re-enter new password" class="w-full px-4 py-3 text-base bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"/></div> <button${attr("disabled", saving, true)} class="px-6 py-3 bg-gradient-to-r from-gov-blue to-gov-blue-dark text-white font-semibold rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all disabled:opacity-60">${escape_html("Change Password")}</button></div></div> <div class="glass-card-static p-6"><h2 class="text-lg font-bold text-text-primary mb-5">Preferences &amp; Status</h2> <div class="space-y-4"><div class="flex items-center justify-between py-2 border-b border-gray-100"><div><span class="block text-sm font-semibold text-text-primary">Voice Guidance</span> <p class="text-[10px] text-text-muted">Grandparent UX: Spoken feedback for system actions</p></div> <button${attr_class(`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 ${stringify("bg-gray-200")}`)}><span class="sr-only">Toggle voice guidance</span> <span${attr_class(`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stringify("translate-x-1")}`)}></span></button></div> <div class="flex items-center justify-between py-2 border-b border-gray-100"><div><span class="block text-sm font-semibold text-text-primary">Push Notifications</span> <p class="text-[10px] text-text-muted">Receive alerts for deadlines and reviews</p></div> <button${attr_class(`px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${stringify("border-gov-blue text-gov-blue hover:bg-gov-blue/5")} transition-colors`)}>${escape_html("Subscribe Now")}</button></div> <div class="flex items-center justify-between py-2"><span class="text-sm text-text-secondary">Offline Queue</span> <span${attr_class(`text-sm font-semibold ${stringify("text-gov-green")}`)}>${escape_html(queueCount)} file${escape_html("s")} pending</span></div> <div class="flex items-center justify-between py-2"><span class="text-sm text-text-secondary">Connection</span> <span class="text-sm font-semibold text-gov-green">Online</span></div></div></div> <button class="w-full py-4 border-2 border-gov-red/30 text-gov-red font-semibold rounded-xl min-h-[56px] hover:bg-gov-red/5 transition-colors">Sign Out</button></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
