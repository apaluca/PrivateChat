import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { getDb } from "../db";
import {
  verifyToken,
  getUserById,
  createDirectMessage,
  createGroupMessage,
  getOrCreateConversation,
  isGroupMember,
  getGroupMembers,
} from "../db/models";

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // In production, specify exact origins
      methods: ["GET", "POST"],
    },
  });

  const connectedUsers = new Map();

  // Socket.io middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token is required"));
    }

    const userData = verifyToken(token);

    if (!userData) {
      return next(new Error("Invalid or expired token"));
    }

    // Attach user data to socket
    socket.data.user = userData;
    next();
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    const user = socket.data.user;

    // Add user to connected users map
    connectedUsers.set(socket.id, {
      username: user.username,
      userId: user.userId,
    });

    // Join the user to their personal room to receive direct messages
    socket.join(`user:${user.userId}`);

    console.log(`User ${user.username} joined`);

    // Handle direct messages
    socket.on("direct:message:send", async ({ recipientId, content }) => {
      try {
        const user = connectedUsers.get(socket.id);

        // Create or get conversation
        const conversation = await getOrCreateConversation(
          user.userId,
          recipientId
        );

        // Save message to database
        const messageId = await createDirectMessage(
          conversation.id,
          user.userId,
          content
        );

        // Get message with sender info
        const db = await getDb();
        const message = await db.get(
          `SELECT dm.id, dm.conversation_id, dm.content, dm.created_at, dm.sender_id, u.username as sender_name
           FROM direct_messages dm
           JOIN users u ON dm.sender_id = u.id
           WHERE dm.id = ?`,
          [messageId]
        );

        // Emit to both sender and recipient
        io.to(`user:${user.userId}`).emit("direct:message:received", message);
        io.to(`user:${recipientId}`).emit("direct:message:received", message);

        // Also emit a separate event to notify about conversation updates
        io.to(`user:${user.userId}`).emit("conversation:updated", {
          conversationId: conversation.id,
        });
        io.to(`user:${recipientId}`).emit("conversation:updated", {
          conversationId: conversation.id,
        });
      } catch (error) {
        console.error("Error sending direct message:", error);
        socket.emit("error", { message: "Failed to send direct message" });
      }
    });

    // Handle group messages
    socket.on("group:message:send", async ({ groupId, content }) => {
      try {
        const user = connectedUsers.get(socket.id);

        // Verify user is a group member
        const isMember = await isGroupMember(groupId, user.userId);
        if (!isMember) {
          socket.emit("error", {
            message: "You are not a member of this group",
          });
          return;
        }

        // Save message to database
        const messageId = await createGroupMessage(
          groupId,
          user.userId,
          content
        );

        // Get message with sender info
        const db = await getDb();
        const message = await db.get(
          `SELECT gm.id, gm.group_id, gm.content, gm.created_at, gm.sender_id, u.username as sender_name
           FROM group_messages gm
           JOIN users u ON gm.sender_id = u.id
           WHERE gm.id = ?`,
          [messageId]
        );

        // Get all group members
        const members = await getGroupMembers(groupId);

        // Emit to all group members individually to ensure they receive the message
        for (const member of members) {
          // Emit message received
          io.to(`user:${member.user_id}`).emit(
            "group:message:received",
            message
          );

          // Emit group updated event
          io.to(`user:${member.user_id}`).emit("group:updated", { groupId });
        }

        // Also broadcast to the group room for any active listeners
        io.to(`group:${groupId}`).emit("group:message:received", message);
      } catch (error) {
        console.error("Error sending group message:", error);
        socket.emit("error", { message: "Failed to send group message" });
      }
    });

    // Handle joining a group
    socket.on("group:join", async (groupId) => {
      try {
        const user = connectedUsers.get(socket.id);

        // Verify user is a group member
        const isMember = await isGroupMember(groupId, user.userId);
        if (!isMember) {
          socket.emit("error", {
            message: "You are not a member of this group",
          });
          return;
        }

        // Join the socket room for this group
        socket.join(`group:${groupId}`);
        console.log(`User ${user.username} joined group ${groupId}`);
      } catch (error) {
        console.error("Error joining group:", error);
        socket.emit("error", { message: "Failed to join group" });
      }
    });

    // Handle new group created
    socket.on("group:created", async (groupData) => {
      try {
        // For each member of the group, emit an event to refresh their groups list
        for (const memberId of groupData.memberIds) {
          io.to(`user:${memberId}`).emit("group:updated", {
            groupId: groupData.groupId,
          });
        }
      } catch (error) {
        console.error("Error handling group created:", error);
      }
    });

    // Handle user status changes
    socket.on("user:status", (status) => {
      // Update user status and broadcast to relevant users
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.status = status;
        // In a real app, you'd broadcast this only to users who have conversations with this user
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);

      if (user) {
        console.log(`User ${user.username} disconnected`);
      }

      connectedUsers.delete(socket.id);
    });
  });

  return io;
}
