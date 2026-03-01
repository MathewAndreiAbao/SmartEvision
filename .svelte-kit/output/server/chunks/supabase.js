import { createClient } from "@supabase/supabase-js";
import { p as public_env } from "./shared-server.js";
if (!public_env.PUBLIC_SUPABASE_URL || !public_env.PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY."
  );
}
class ReslientStorage {
  data = /* @__PURE__ */ new Map();
  getItem(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("[v0] localStorage access failed:", e);
    }
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    this.data.set(key, value);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("[v0] localStorage write failed:", e);
    }
  }
  removeItem(key) {
    this.data.delete(key);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("[v0] localStorage remove failed:", e);
    }
  }
  clear() {
    this.data.clear();
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn("[v0] localStorage clear failed:", e);
    }
  }
  key(index) {
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }
  get length() {
    return this.data.size;
  }
}
const supabase = createClient(
  public_env.PUBLIC_SUPABASE_URL,
  public_env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      debug: false,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: new ReslientStorage(),
      storageKey: "sb-auth-token-v3",
      // Changed key to bypass any existing deadlocks
      lock: (name, acquireTimeout, callback) => {
        return callback();
      }
    },
    global: {
      headers: {
        "X-Client-Info": "smart-evision"
      }
    }
  }
);
export {
  supabase as s
};
