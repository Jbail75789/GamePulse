import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  return httpServer;
}
