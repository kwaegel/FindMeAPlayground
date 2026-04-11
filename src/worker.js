// Cloudflare Worker entry point for FindMeAPlayground.
//
// Routes /api/travel-times requests to the ORS proxy handler and serves
// the pre-built Vite static assets for all other paths.
//
// The project was originally structured as Cloudflare Pages with a
// functions/ directory. Cloudflare has since unified Pages into the Workers
// platform, so this Worker + assets model replaces the Pages deployment.

import { onRequest } from '../functions/api/travel-times.js';

export default {
  /**
   * Main fetch handler. Dispatches API requests to the travel-times proxy
   * and falls back to static asset serving for everything else.
   *
   * @param {Request} request
   * @param {{ ORS_API_KEY: string, ALLOWED_ORIGIN?: string, ASSETS: Fetcher }} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    // Route the ORS proxy to its handler. The handler accepts a Pages-Function-
    // style context object { request, env } which maps directly to the Worker's
    // fetch arguments — no adaptation needed.
    if (url.pathname === '/api/travel-times') {
      return onRequest({ request, env });
    }

    // Serve pre-built Vite assets (dist/) for all other paths.
    // ASSETS is a binding automatically provided by wrangler when
    // assets.directory is configured in wrangler.jsonc.
    return env.ASSETS.fetch(request);
  },
};
