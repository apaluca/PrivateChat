import { Request, Response } from "express";
import * as models from "../db/models";

export async function getMessages(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const messages = await models.getRecentMessages(limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRoomsList(req: Request, res: Response) {
  try {
    const rooms = await models.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createChatRoom(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Check if room already exists - make sure this uses the exact name for comparison
    const existingRoom = await models.getRoomByName(name.trim());

    if (existingRoom) {
      return res.status(409).json({ error: "Room already exists" });
    }

    // Create the room with trimmed name
    const roomId = await models.createRoom(name.trim());
    const room = await models.getRoomById(roomId);

    res.status(201).json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRoomMessages(req: Request, res: Response) {
  try {
    const { roomId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    const messages = await models.getRoomMessages(parseInt(roomId), limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching room messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
