import { Router } from "express";
import {
  getMessages,
  createChatRoom,
  getRoomsList,
  getRoomMessages,
} from "../controllers/chat";
import { register, login, getCurrentUser } from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Auth endpoints
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authenticateToken, getCurrentUser);

// Message endpoints
router.get("/messages", authenticateToken, getMessages);

// Room endpoints
router.get("/rooms", authenticateToken, getRoomsList);
router.post("/rooms", authenticateToken, createChatRoom);
router.get("/rooms/:roomId/messages", authenticateToken, getRoomMessages);

export default router;
