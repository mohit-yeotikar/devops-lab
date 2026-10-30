import { env as cfEnv } from 'cloudflare:workers';
export const env = cfEnv as unknown as Env;
