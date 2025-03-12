import { Request, Response } from "express";
import * as models from "../db/models";

export async function createUser(req: Request, res: Response) {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Check if username already exists
    const existingUser = await models.getUserByUsername(username);
    if (existingUser) {
      return res.status(200).json(existingUser); // Return existing user
    }

    const userId = await models.createUser(username);
    const user = await models.getUserById(userId);

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Check if room already exists
    const existingRoom = await models.getRoomByName(name);
    if (existingRoom) {
      return res.status(409).json({ error: "Room already exists" });
    }

    const roomId = await models.createRoom(name);
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
