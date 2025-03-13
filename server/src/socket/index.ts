import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  createMessage,
  createRoomMessage,
  getUserById,
  getRoomByName,
  createRoom as dbCreateRoom,
  getRoomById,
  verifyToken,
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

    // Notify all clients about the new user
    io.emit("user:joined", { username: user.username, userId: user.userId });

    console.log(`User ${user.username} joined`);

    // Handle room creation
    socket.on("room:create", async (roomName) => {
      try {
        const user = connectedUsers.get(socket.id);

        // Trim the room name to avoid whitespace issues
        const trimmedRoomName = roomName.trim();

        // Check if room already exists - do case-insensitive check
        const existingRoom = await getRoomByName(trimmedRoomName);
        if (existingRoom) {
          socket.emit("error", { message: "Room already exists" });
          return;
        }

        // Create the room in the database
        const roomId = await dbCreateRoom(trimmedRoomName);
        const newRoom = await getRoomById(roomId);

        // Notify all clients about the new room
        io.emit("room:created", newRoom);

        console.log(`Room ${trimmedRoomName} created by ${user.username}`);
      } catch (error) {
        console.error("Error creating room:", error);
        socket.emit("error", { message: "Failed to create room" });
      }
    });

    // Handle messages in global chat
    socket.on("message:send", async (content) => {
      try {
        const user = connectedUsers.get(socket.id);

        const messageId = await createMessage(user.userId, content);

        // Broadcast the message to all clients including sender
        io.emit("message:received", {
          id: messageId,
          content,
          username: user.username,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle room join
    socket.on("room:join", async (roomName) => {
      try {
        const socketRooms = Array.from(socket.rooms);
        for (const room of socketRooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }

        const user = connectedUsers.get(socket.id);
        const room = await getRoomByName(roomName);

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Join the socket room
        socket.join(`room:${room.id}`);

        // Notify room members
        io.to(`room:${room.id}`).emit("room:user-joined", {
          roomId: room.id,
          username: user.username,
        });

        console.log(`User ${user.username} joined room ${roomName}`);
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle room messages
    socket.on("room:message:send", async ({ roomName, content }) => {
      try {
        const user = connectedUsers.get(socket.id);
        const room = await getRoomByName(roomName);

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const messageId = await createRoomMessage(
          room.id,
          user.userId,
          content
        );

        // Broadcast to room members with sender's correct information
        io.to(`room:${room.id}`).emit("room:message:received", {
          id: messageId,
          roomId: room.id,
          content,
          username: user.username,
          userId: user.userId,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error sending room message:", error);
        socket.emit("error", { message: "Failed to send message to room" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);

      if (user) {
        io.emit("user:left", {
          username: user.username,
        });

        console.log(`User ${user.username} disconnected`);
      }

      connectedUsers.delete(socket.id);
    });
  });

  return io;
}
