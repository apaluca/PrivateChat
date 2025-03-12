import { getDb } from "./index";

// User model
export async function createUser(username: string) {
  const db = await getDb();
  const result = await db.run("INSERT INTO users (username) VALUES (?)", [
    username,
  ]);
  return result.lastID;
}

export async function getUserById(id: number) {
  const db = await getDb();
  return db.get("SELECT * FROM users WHERE id = ?", [id]);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  return db.get("SELECT * FROM users WHERE username = ?", [username]);
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
  const result = await db.run("INSERT INTO rooms (name) VALUES (?)", [name]);
  return result.lastID;
}

export async function getRooms() {
  const db = await getDb();
  return db.all("SELECT * FROM rooms");
}

export async function getRoomById(id: number) {
  const db = await getDb();
  return db.get("SELECT * FROM rooms WHERE id = ?", [id]);
}

export async function getRoomByName(name: string) {
  const db = await getDb();
  return db.get("SELECT * FROM rooms WHERE name = ?", [name]);
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
