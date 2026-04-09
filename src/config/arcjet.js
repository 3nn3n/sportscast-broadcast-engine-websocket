import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import { de } from "zod/locales";

const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetEnv = process.env.ARCJET_ENV || 'production';
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
  throw new Error("Missing ARCJET_API_KEY in environment variables");
}

export const httpArcjetConfig = arcjetKey ? arcjet({
  key: arcjetKey,
  rules: [
    shield({mode: arcjetMode}),
    detectBot({mode: arcjetMode, allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW", "CATEGORY:TOOL"]}),
    slidingWindow({mode: arcjetMode, interval: "10s", max: 40}),
  ],
}) : null;


export const wsArcjetConfig = arcjetKey ? arcjet({
  key: arcjetKey,
  rules: [
    shield({mode: arcjetMode}),
    detectBot({mode: arcjetMode, allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW", "CATEGORY:TOOL"]}),
    slidingWindow({mode: arcjetMode, interval: "4s", max: 3}),
  ],
}) : null;


export function getArcjetMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjetConfig) {
      return next();
    }
    try{
      const decision = await httpArcjetConfig.protect(req);
      if(decision.isDenied()){
        if(decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too many requests", details: "You have exceeded the allowed request limit. Please try again later." });
        }
        return res.status(403).json({ error: "Forbidden", details: "Your request was blocked by Arcjet security rules." });
      }
    } catch (error) {
      console.error("Arcjet error:", error);
      return res.status(503).json({ error: "Service unavailable", details: JSON.stringify(error) });
    }
    next();
  };

}