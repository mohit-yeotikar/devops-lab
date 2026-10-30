/// <reference types="astro/client" />
type Env = {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  APP_NAME: string;
  ADMIN_EMAIL: string;
  COMPANY_NAME: string;
  COMPANY_CITY: string;
  ANTHROPIC_API_KEY?: string;
};
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
declare namespace App {
  interface Locals extends Runtime {
    user: import('./lib/db').User | null;
  }
}
