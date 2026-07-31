import { Router } from "express";
import {
  renderWatchPage,
  renderChannelPage,
  renderEmbedPage,
  renderAppShell,
} from "../controllers/ssr.controller.js";

const router = Router();

// Server-Side Routes
router.get("/watch", renderWatchPage);
router.get("/watch/:videoId", renderWatchPage);
router.get("/c/:username", renderChannelPage);
router.get("/@:username", renderChannelPage);
router.get("/embed/:videoId", renderEmbedPage);

// General SPA page entry routes
router.get("/", renderAppShell);
router.get("/results", renderAppShell);
router.get("/subscriptions", renderAppShell);
router.get("/playlists", renderAppShell);
router.get("/history", renderAppShell);
router.get("/liked", renderAppShell);
router.get("/dashboard", renderAppShell);
router.get("/tweets", renderAppShell);
router.get("/settings", renderAppShell);

export default router;
