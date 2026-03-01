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
      }
      supabase.channel("global-settings").on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "system_settings"
      }, (payload) => {
        const { key, value } = payload.new;
        update((current) => {
          const next = { ...current };
          if (key === "submission_window_days") next.submission_window_days = parseInt(value);
          if (key === "maintenance_mode") next.maintenance_mode = value === "true";
          if (key === "enforce_ocr") next.enforce_ocr = value === "true";
          if (key === "max_upload_size_mb") next.max_upload_size_mb = parseFloat(value);
          return next;
        });
      }).subscribe();
    }
  };
}
const settings = createSettingsStore();
export {
  settings as s
};
