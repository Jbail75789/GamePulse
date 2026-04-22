import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.get(api.games.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const games = await storage.getGames(req.user.id);
    res.json(games);
  });

  app.post(api.games.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.games.create.input.parse(req.body);
    const game = await storage.createGame(req.user.id, input);
    res.status(201).json(game);
  });

  app.patch(api.games.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.games.update.input.parse(req.body);
    const game = await storage.updateGame(Number(req.params.id), input);
    res.json(game);
  });

  app.delete(api.games.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteGame(Number(req.params.id));
    res.sendStatus(204);
  });

  app.post("/api/user/redeem", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body;
    if (code === "PRO99") {
      const user = await storage.updateUserProStatus(req.user.id, true);
      return res.json(user);
    }
    res.status(400).json({ message: "Invalid redemption code" });
  });

  app.get("/api/user/charges", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    let user = await storage.getUser(req.user.id);
    if (!user) return res.sendStatus(404);

    if (user.isPro) {
      return res.json({ charges: Infinity, nextRefill: null });
    }

    const now = new Date();
    const lastRefill = user.lastChargeRefill || now;
    const hoursSinceLastRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastRefill >= 10) {
      user = await storage.updateUserCharges(user.id, 3, now);
    }

    const nextRefill = new Date(lastRefill.getTime() + 10 * 60 * 60 * 1000);
    res.json({ charges: user.pulseCharges, nextRefill: nextRefill.toISOString() });
  });

  app.post("/api/user/charges/consume", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = await storage.getUser(req.user.id);
    if (!user) return res.sendStatus(404);

    if (user.isPro) {
      return res.json({ charges: Infinity });
    }

    if (user.pulseCharges && user.pulseCharges > 0) {
      const updatedUser = await storage.updateUserCharges(user.id, user.pulseCharges - 1);
      return res.json({ charges: updatedUser.pulseCharges });
    }

    res.status(400).json({ message: "No charges remaining" });
  });

  const ADMIN_SECRET = process.env.ADMIN_SECRET || "GAMEPULSE_ADMIN_2025";

  app.post("/api/admin/generate-code", async (req, res) => {
    const { adminSecret } = req.body;
    if (adminSecret !== ADMIN_SECRET) return res.sendStatus(403);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await storage.createPromoCode(code);
    res.json({ code });
  });

  app.post("/api/user/redeem-free", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body;
    const redeemed = await storage.redeemPromoCode(code, req.user.id);
    if (redeemed) return res.json({ success: true });
    res.status(400).json({ message: "Invalid or already used code" });
  });
  app.post("/api/ai/vibe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Game title required" });

    if (!openai.apiKey) {
      return res.status(500).json({ vibe: "AI link severed. (Missing OpenAI key)" });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 140,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You are the Cyber-Cynic: a jaded, neon-soaked gaming oracle. In 2 short, punchy sentences, deliver a brutally honest 'vibe check' on the given game. Mix gamer slang ('goated', 'mid', 'chef's kiss', 'comfy', 'sweaty') with dry cyberpunk wit. No emojis. No hedging.",
          },
          { role: "user", content: `Vibe check this game: ${title}` },
        ],
      });

      const vibe = completion.choices[0]?.message?.content?.trim() ?? "Signal lost in the static.";
      res.json({ vibe });
    } catch (error: any) {
      console.error("[ai/vibe] OpenAI error:", error?.message || error);
      res.status(500).json({ vibe: `Codex error: ${error?.message ?? "connection failed"}` });
    }
  });

  // === HLTB-style target hours suggestion ===
  app.post("/api/ai/hltb", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Game title required" });

    if (!openai.apiKey) {
      return res.status(500).json({ message: "AI link severed. (Missing OpenAI key)" });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 160,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You estimate playtime hours for video games using publicly known HLTB-style averages. Reply ONLY with strict JSON: {\"main\": <integer>, \"full\": <integer>, \"note\": \"<one short sentence>\"}. " +
              "main = average main-story hours. full = completionist / 100% run hours. Both MUST be positive integers between 1 and 500. full should be >= main. " +
              "note must be under 90 characters and reference the source style (e.g. 'HLTB main vs completionist'). " +
              "If the title is unknown, estimate based on genre and reply with your best integer guesses — never null, never strings.",
          },
          { role: "user", content: `Game: ${title}` },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
      let parsed: { main?: number; full?: number; hours?: number; note?: string } = {};
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
      const main = Math.max(1, Math.min(500, Math.round(Number(parsed.main ?? parsed.hours) || 0)));
      let full = Math.max(1, Math.min(500, Math.round(Number(parsed.full) || 0)));
      if (!full || full < main) full = Math.round(main * 1.6);
      const note = (parsed.note || "Estimate based on HLTB averages.").toString().slice(0, 120);

      if (!main) {
        return res.status(500).json({ message: "Could not parse AI estimate" });
      }
      // Backwards-compatible: still return `hours` = main
      res.json({ hours: main, main, full, note });
    } catch (error: any) {
      console.error("[ai/hltb] OpenAI error:", error?.message || error);
      res.status(500).json({ message: `Codex error: ${error?.message ?? "connection failed"}` });
    }
  });

  // === Cyber-Cynic streaming chat (Deep Pulse) ===
  app.post("/api/ai/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { gameTitle, currentTarget, currentPlaytime, messages } = req.body as {
      gameTitle?: string;
      currentTarget?: number | null;
      currentPlaytime?: number | null;
      messages?: { role: "user" | "assistant"; content: string }[];
    };
    if (!gameTitle || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Missing gameTitle or messages" });
    }
    if (!openai.apiKey) {
      return res.status(500).json({ message: "AI link severed. (Missing OpenAI key)" });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        temperature: 0.8,
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content:
              `You are the Cyber-Cynic, a jaded neon-soaked gaming oracle holding a terse chat with the user about ONE specific game. ` +
              `Current mission: "${gameTitle}". Saved target hours: ${currentTarget ?? "unknown"}. Player's logged playtime: ${currentPlaytime ?? "unknown"}h. ` +
              (typeof currentPlaytime === "number" && typeof currentTarget === "number" && currentPlaytime > currentTarget
                ? `STATUS: OVERTIME (+${currentPlaytime - currentTarget}h past target). Treat the player like a confirmed addict — drop snarky 'TOUCH GRASS' or 'LEGENDARY STATUS' verdicts when relevant. `
                : ``) +
              `Mix gamer slang ('goated', 'mid', 'sweaty', 'comfy') with dry cyberpunk wit. Keep replies under 4 short sentences. ` +
              `If the user asks anything about playtime, length, "how long to beat", or completion time, ALWAYS include a concrete integer estimate in the exact form "~XXh" (e.g. "~45h") so the interface can extract and offer to update their target. ` +
              `Never use emojis. Never hedge with vague words like "depends".`,
          },
          ...messages.slice(-10).map(m => ({ role: m.role, content: String(m.content || "") })),
        ],
      });
      for await (const chunk of stream as any) {
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (delta) res.write(delta);
      }
      res.end();
    } catch (e: any) {
      console.error("[ai/chat] OpenAI error:", e?.message || e);
      if (!res.headersSent) {
        res.status(500).json({ message: `Codex error: ${e?.message ?? "connection failed"}` });
      } else {
        res.end(`\n\n[Codex error: ${e?.message ?? "connection failed"}]`);
      }
    }
  });

  return httpServer;
}
