import { w as writable } from "./index.js";
import { s as supabase } from "./supabase.js";
const DEFAULT_SETTINGS = {
  submission_window_days: 5,
  maintenance_mode: false,
  enforce_ocr: true,
  max_upload_size_mb: 2
};
function createSettingsStore() {
  const { subscribe, set, update } = writable(DEFAULT_SETTINGS);
  return {
    subscribe,
    async init() {
      const CACHE_KEY = "system_settings_cache";
      if (typeof localStorage !== "undefined") {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            set(JSON.parse(cached));
          } catch (e) {
            console.error("[offline] Error parsing settings cache:", e);
          }
        }
      }
      try {
        const { data, error } = await supabase.from("system_settings").select("*");
        if (!error && data) {
          const mapped = { ...DEFAULT_SETTINGS };
          data.forEach((s) => {
            if (s.key === "submission_window_days") mapped.submission_window_days = parseInt(s.value);
            if (s.key === "maintenance_mode") mapped.maintenance_mode = s.value === "true";
            if (s.key === "enforce_ocr") mapped.enforce_ocr = s.value === "true";
            if (s.key === "max_upload_size_mb") mapped.max_upload_size_mb = parseFloat(s.value);
          });
          set(mapped);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
          }
        }
      } catch (err) {
        console.warn("[offline] Settings fetch failed (ignoring if offline):", err);
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        supabase.channel("global-settings").on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "system_settings"
        }, (payload) => {
          if (!payload.new) return;
          const { key, value } = payload.new;
          update((current) => {
            const next = { ...current };
            if (key === "submission_window_days") next.submission_window_days = parseInt(value);
            if (key === "maintenance_mode") next.maintenance_mode = value === "true";
            if (key === "enforce_ocr") next.enforce_ocr = value === "true";
            if (key === "max_upload_size_mb") next.max_upload_size_mb = parseFloat(value);
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            }
            return next;
          });
        }).subscribe();
      }
    }
  };
}
const settings = createSettingsStore();
export {
  settings as s
};
