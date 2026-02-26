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

  return httpServer;
}
