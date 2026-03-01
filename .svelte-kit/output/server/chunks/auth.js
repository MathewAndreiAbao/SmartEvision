import { w as writable } from "./index.js";
import "./supabase.js";
const user = writable(null);
const profile = writable(null);
const authLoading = writable(true);
export {
  authLoading as a,
  profile as p,
  user as u
};
