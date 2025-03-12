import { Router } from "express";
import {
  getMessages,
  createUser,
  getRoomsList,
  createChatRoom,
  getRoomMessages,
} from "../controllers/chat";

const router = Router();

// User endpoints
router.post("/users", createUser);

// Message endpoints
router.get("/messages", getMessages);

// Room endpoints
router.get("/rooms", getRoomsList);
router.post("/rooms", createChatRoom);
router.get("/rooms/:roomId/messages", getRoomMessages);

export default router;
