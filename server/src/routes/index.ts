import { Router } from "express";
import {
  searchUsers,
  getUserConversations,
  getConversationMessages,
  createDirectConversation,
  sendDirectMessage,
  getUserGroups,
  createNewGroup,
  getGroupMessages,
  sendGroupMessage,
  getGroupMembersList,
  addMemberToGroup,
  removeMemberFromGroup,
} from "../controllers/chat";
import { register, login, getCurrentUser } from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Auth endpoints
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authenticateToken, getCurrentUser);

// User endpoints
router.get("/users/search", authenticateToken, searchUsers);

// Conversation endpoints
router.get("/conversations", authenticateToken, getUserConversations);
router.post("/conversations", authenticateToken, createDirectConversation);
router.get(
  "/conversations/:conversationId/messages",
  authenticateToken,
  getConversationMessages
);
router.post(
  "/conversations/:conversationId/messages",
  authenticateToken,
  sendDirectMessage
);

// Group endpoints
router.get("/groups", authenticateToken, getUserGroups);
router.post("/groups", authenticateToken, createNewGroup);
router.get("/groups/:groupId/messages", authenticateToken, getGroupMessages);
router.post("/groups/:groupId/messages", authenticateToken, sendGroupMessage);
router.get("/groups/:groupId/members", authenticateToken, getGroupMembersList);
router.post("/groups/:groupId/members", authenticateToken, addMemberToGroup);
router.delete(
  "/groups/:groupId/members/:userId",
  authenticateToken,
  removeMemberFromGroup
);

export default router;
