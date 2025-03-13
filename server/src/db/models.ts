import { getDb } from "./index";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "22ec7510f51e11bf315c426b145595fd1a5cbd8cca0ea33bf448bec005ec3745";
const SALT_ROUNDS = 10;

// User model functions
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

export async function searchUsers(query: string, currentUserId: number) {
  const db = await getDb();
  return db.all(
    "SELECT id, username, created_at FROM users WHERE id != ? AND username LIKE ? LIMIT 20",
    [currentUserId, `%${query}%`]
  );
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

// Conversation model functions
export async function getOrCreateConversation(
  user1Id: number,
  user2Id: number
) {
  const db = await getDb();

  // Sort IDs to ensure consistent conversation lookup regardless of order
  const [smallerId, largerId] =
    user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

  // Check if conversation exists
  let conversation = await db.get(
    "SELECT * FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
    [smallerId, largerId, largerId, smallerId]
  );

  if (!conversation) {
    // Create new conversation
    const result = await db.run(
      "INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)",
      [smallerId, largerId]
    );

    conversation = {
      id: result.lastID,
      user1_id: smallerId,
      user2_id: largerId,
      created_at: new Date().toISOString(),
    };
  }

  return conversation;
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  
  // Get all conversations this user is part of
  const conversations = await db.all(
    `SELECT c.id, c.created_at,
      CASE 
        WHEN c.user1_id = ? THEN c.user2_id 
        ELSE c.user1_id 
      END as other_user_id,
      u.username as other_username
    FROM conversations c
    JOIN users u ON (
      CASE 
        WHEN c.user1_id = ? THEN c.user2_id 
        ELSE c.user1_id 
      END = u.id
    )
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY (
      SELECT MAX(created_at) FROM direct_messages 
      WHERE conversation_id = c.id
    ) DESC NULLS LAST`,
    [userId, userId, userId, userId]
  );
  
  // Get the last message for each conversation
  for (const conversation of conversations) {
    const lastMessage = await db.get(
      `SELECT id, content, created_at, sender_id 
       FROM direct_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [conversation.id]
    );
    
    conversation.lastMessage = lastMessage || null;
  }
  
  return conversations;
}

export async function getConversationMessages(
  conversationId: number,
  limit = 50
) {
  const db = await getDb();
  return db.all(
    `SELECT dm.id, dm.content, dm.created_at, dm.sender_id, u.username as sender_name
     FROM direct_messages dm
     JOIN users u ON dm.sender_id = u.id
     WHERE dm.conversation_id = ?
     ORDER BY dm.created_at DESC
     LIMIT ?`,
    [conversationId, limit]
  );
}

export async function createDirectMessage(
  conversationId: number,
  senderId: number,
  content: string
) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO direct_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
    [conversationId, senderId, content]
  );
  return result.lastID;
}

// Group model functions
export async function createGroup(name: string, createdBy: number) {
  const db = await getDb();

  // Create the group
  const result = await db.run(
    "INSERT INTO groups (name, created_by) VALUES (?, ?)",
    [name.trim(), createdBy]
  );

  const groupId = result.lastID;

  // Add creator as an admin member
  await db.run(
    "INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)",
    [groupId, createdBy, true]
  );

  return groupId;
}

export async function getUserGroups(userId: number) {
  const db = await getDb();

  // Get all groups this user is a member of
  const groups = await db.all(
    `SELECT g.id, g.name, g.created_at, g.created_by, gm.is_admin
     FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?
     ORDER BY (
       SELECT MAX(created_at) FROM group_messages 
       WHERE group_id = g.id
     ) DESC NULLS LAST`,
    [userId]
  );

  // Get the last message for each group
  for (const group of groups) {
    const lastMessage = await db.get(
      `SELECT gm.content, gm.created_at, gm.sender_id, u.username as sender_name
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.created_at DESC LIMIT 1`,
      [group.id]
    );

    group.lastMessage = lastMessage || null;
  }

  return groups;
}

export async function getGroupById(id: number) {
  const db = await getDb();
  return db.get("SELECT * FROM groups WHERE id = ?", [id]);
}

export async function isGroupMember(groupId: number, userId: number) {
  const db = await getDb();
  const member = await db.get(
    "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
    [groupId, userId]
  );
  return !!member;
}

export async function isGroupAdmin(groupId: number, userId: number) {
  const db = await getDb();
  const admin = await db.get(
    "SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND is_admin = 1",
    [groupId, userId]
  );
  return !!admin;
}

export async function addGroupMember(
  groupId: number,
  userId: number,
  isAdmin = false
) {
  const db = await getDb();
  try {
    const result = await db.run(
      "INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)",
      [groupId, userId, isAdmin]
    );
    return result.lastID;
  } catch (error) {
    // Handle duplicate member
    return null;
  }
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  return db.all(
    `SELECT gm.user_id, gm.is_admin, u.username, gm.joined_at
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?
     ORDER BY gm.is_admin DESC, u.username ASC`,
    [groupId]
  );
}

export async function removeGroupMember(groupId: number, userId: number) {
  const db = await getDb();
  await db.run("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", [
    groupId,
    userId,
  ]);
}

export async function createGroupMessage(
  groupId: number,
  senderId: number,
  content: string
) {
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)",
    [groupId, senderId, content]
  );
  return result.lastID;
}

export async function getGroupMessages(groupId: number, limit = 50) {
  const db = await getDb();
  return db.all(
    `SELECT gm.id, gm.content, gm.created_at, gm.sender_id, u.username as sender_name
     FROM group_messages gm
     JOIN users u ON gm.sender_id = u.id
     WHERE gm.group_id = ?
     ORDER BY gm.created_at DESC
     LIMIT ?`,
    [groupId, limit]
  );
}
