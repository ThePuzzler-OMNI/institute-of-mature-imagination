import { dispatch } from "../lib/archive/handlers.js";
import { productionDeps } from "../lib/archive/production.js";

export default {
  async fetch(request) {
    try {
      return await dispatch(request, productionDeps());
    } catch (error) {
      console.error("archive", error && error.code ? error.code : "error");
      return new Response("Internal error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  },
};
