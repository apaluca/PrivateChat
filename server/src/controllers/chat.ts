import { Request, Response } from "express";
import * as models from "../db/models";
import { getDb } from "../db"; // Import getDb from the correct location

// User related controllers
export async function searchUsers(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 2 characters" });
    }

    const users = await models.searchUsers(query, req.user.userId);
    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Conversation related controllers
export async function getUserConversations(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const conversations = await models.getUserConversations(req.user.userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createDirectConversation(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if the target user exists
    const targetUser = await models.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const conversation = await models.getOrCreateConversation(
      req.user.userId,
      userId
    );

    // Include user info
    const result = {
      ...conversation,
      otherUser: {
        id: targetUser.id,
        username: targetUser.username,
      },
    };

    res.json(result);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getConversationMessages(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { conversationId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Verify the user is part of this conversation
    const db = await getDb(); // Use the correctly imported getDb
    const conversation = await db.get(
      "SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
      [conversationId, req.user.userId, req.user.userId]
    );

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await models.getConversationMessages(
      parseInt(conversationId),
      limit
    );
    res.json(messages);
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendDirectMessage(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify the user is part of this conversation
    const db = await getDb(); // Use the correctly imported getDb
    const conversation = await db.get(
      "SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
      [conversationId, req.user.userId, req.user.userId]
    );

    if (!conversation) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messageId = await models.createDirectMessage(
      parseInt(conversationId),
      req.user.userId,
      content
    );

    // Get the created message with sender info
    const message = await db.get(
      `SELECT dm.id, dm.content, dm.created_at, dm.sender_id, u.username as sender_name
       FROM direct_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.id = ?`,
      [messageId]
    );

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending direct message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Group related controllers
export async function getUserGroups(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const groups = await models.getUserGroups(req.user.userId);
    res.json(groups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createNewGroup(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name, members = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    // Create group
    const groupId = await models.createGroup(name, req.user.userId);

    // Track all member IDs including the creator
    const allMemberIds = [req.user.userId];

    // Add members
    if (members.length > 0) {
      for (const memberId of members) {
        if (memberId !== req.user.userId) {
          await models.addGroupMember(groupId, memberId);
          allMemberIds.push(memberId);
        }
      }
    }

    const group = await models.getGroupById(groupId);
    const groupMembers = await models.getGroupMembers(groupId);

    // Include the group ID and member IDs for socket event
    group.allMemberIds = allMemberIds;

    res.status(201).json({
      ...group,
      members: groupMembers,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGroupMessages(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { groupId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Verify the user is a member of this group
    const isMember = await models.isGroupMember(
      parseInt(groupId),
      req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await models.getGroupMessages(parseInt(groupId), limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendGroupMessage(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { groupId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify the user is a member of this group
    const isMember = await models.isGroupMember(
      parseInt(groupId),
      req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messageId = await models.createGroupMessage(
      parseInt(groupId),
      req.user.userId,
      content
    );

    // Get the created message with sender info
    const db = await getDb(); // Use the correctly imported getDb
    const message = await db.get(
      `SELECT gm.id, gm.content, gm.created_at, gm.sender_id, u.username as sender_name
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.id = ?`,
      [messageId]
    );

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGroupMembersList(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { groupId } = req.params;

    // Verify the user is a member of this group
    const isMember = await models.isGroupMember(
      parseInt(groupId),
      req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const members = await models.getGroupMembers(parseInt(groupId));
    res.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function addMemberToGroup(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { groupId } = req.params;
    const { userId, isAdmin = false } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify the current user is an admin of the group
    const isCurrentUserAdmin = await models.isGroupAdmin(
      parseInt(groupId),
      req.user.userId
    );
    if (!isCurrentUserAdmin) {
      return res
        .status(403)
        .json({ error: "Only group admins can add members" });
    }

    // Add the member
    await models.addGroupMember(parseInt(groupId), userId, isAdmin);

    // Get updated members list
    const members = await models.getGroupMembers(parseInt(groupId));
    res.json(members);
  } catch (error) {
    console.error("Error adding group member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeMemberFromGroup(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { groupId, userId } = req.params;

    // Verify the current user is an admin of the group
    const isCurrentUserAdmin = await models.isGroupAdmin(
      parseInt(groupId),
      req.user.userId
    );

    // Users can remove themselves, or admins can remove others
    if (parseInt(userId) !== req.user.userId && !isCurrentUserAdmin) {
      return res
        .status(403)
        .json({ error: "Only group admins can remove members" });
    }

    // Remove the member
    await models.removeGroupMember(parseInt(groupId), parseInt(userId));

    // Get updated members list
    const members = await models.getGroupMembers(parseInt(groupId));
    res.json(members);
  } catch (error) {
    console.error("Error removing group member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
