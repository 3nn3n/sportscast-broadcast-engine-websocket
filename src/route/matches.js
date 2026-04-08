import { Router } from "express";
import { json } from "zod";
import  {db} from "../db/db.js";
import { matches } from "../db/schema.js";
import { createMatchSchema } from "../validation/matchValidation.js";
import { getMatchStatus } from "../utils/match-status.js";
import { listMatchesQuerySchema } from "../validation/matchValidation.js";
import { desc } from "drizzle-orm";
import { de } from "zod/locales";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters", details: json.stringify(parsed.error) });
  }

  const limit = Math.min(parsed.data.limit || 50, MAX_LIMIT);

  try{
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
      
      res.status(200).json({ matches: data });
  }
  catch (error) {
    res.status(500).json({ error: "Internal server error", details: json.stringify(error) });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  const{data: {startTime, endTime, homeScore, awayScore}} = parsed;


  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: json.stringify(parsed.error)});
  }

  try {
    const [event] = await db.insert(matches).values({
      ...parsed.data,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      homeScore: homeScore || 0,
      awayScore: awayScore || 0,
      status: getMatchStatus(startTime, endTime),
    }).returning();

    return res.status(201).json({ match: event });

  } 
  catch (error) {
    console.error("Error creating match:", error);
    return res.status(500).json({ error: "Internal server error", details: json.stringify(error) });
  }
});