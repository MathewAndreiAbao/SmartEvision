import { s as supabase } from "./supabase.js";
async function createNotification(userId, title, message, type = "info", link) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[Notification System] Attempting insert:", {
      targetUserId: userId,
      sessionUserId: user?.id,
      match: userId === user?.id
    });
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      read: false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (error) {
      if (error.code === "42501") {
        console.warn("[Notification System] RLS Policy Blocked: Target ID", userId, "vs Session ID", user?.id);
        console.warn('[Notification System] Please check your Supabase RLS policies for the "notifications" table.');
      } else {
        console.error("[Notification System] Failed to push notification:", error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Notification System] Error creating notification:", err);
    return false;
  }
}
export {
  createNotification
};
