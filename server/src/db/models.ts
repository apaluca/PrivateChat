import { getDb } from "./index";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "22ec7510f51e11bf315c426b145595fd1a5cbd8cca0ea33bf448bec005ec3745";
const SALT_ROUNDS = 10;

// User model
export async function createUser(username: string, password: string) {
  const db = await getDb();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword]
  );
  return result.lastID;
}

export async function getUserById(id: number) {
  const db = await getDb();
  return db.get("SELECT id, username, created_at FROM users WHERE id = ?", [
    id,
  ]);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  return db.get("SELECT * FROM users WHERE username = ?", [username]);
}

export async function validateUser(username: string, password: string) {
  const user = await getUserByUsername(username);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
  };
}

export function generateToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
    };
  } catch (error) {
    return null;
  }
}

// Message model
export async function createMessage(userId: number, content: string) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO messages (user_id, content) VALUES (?, ?)",
    [userId, content]
  );
  return result.lastID;
}

export async function getRecentMessages(limit = 50) {
  const db = await getDb();
  return db.all(
    `
    SELECT m.id, m.content, m.created_at, u.username 
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `,
    [limit]
  );
}

// Room model
export async function createRoom(name: string) {
  const db = await getDb();
  const trimmedName = name.trim();
  const result = await db.run("INSERT INTO rooms (name) VALUES (?)", [trimmedName]);
  return result.lastID;
}

export async function getRooms() {
  const db = await getDb();
  return db.all("SELECT * FROM rooms ORDER BY name ASC");
}

export async function getRoomById(id: number) {
  const db = await getDb();
  return db.get("SELECT * FROM rooms WHERE id = ?", [id]);
}

export async function getRoomByName(name: string) {
  const db = await getDb();
  return db.get("SELECT * FROM rooms WHERE LOWER(name) = LOWER(?)", [name.trim()]);
}

// Room messages
export async function createRoomMessage(
  roomId: number,
  userId: number,
  content: string
) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO room_messages (room_id, user_id, content) VALUES (?, ?, ?)",
    [roomId, userId, content]
  );
  return result.lastID;
}

export async function getRoomMessages(roomId: number, limit = 50) {
  const db = await getDb();
  return db.all(
    `
    SELECT rm.id, rm.content, rm.created_at, u.username 
    FROM room_messages rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
    ORDER BY rm.created_at DESC
    LIMIT ?
  `,
    [roomId, limit]
  );
}
