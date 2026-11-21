import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Every DevX app has an id. Add new apps here first. */
export type AppId = "education";

/** Roles used by the education app. Other apps can define their own. */
export type EducationRole = "student" | "teacher" | "admin" | "parent";

export interface BackendConfig {
  url: string;
  anonKey: string;
}

/**
 * All apps talk to the backend through this one function.
 * If we ever move off Supabase, this is the place to change.
 */
export function createBackend(config: BackendConfig): SupabaseClient {
  if (!config.url || !config.anonKey) {
    throw new Error("Backend config missing: set the URL and anon key in .env");
  }
  return createClient(config.url, config.anonKey);
}
