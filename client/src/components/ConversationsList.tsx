/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getUserConversations, getUserGroups } from "../services/api";

interface Conversation {
  id: number;
  other_user_id: number;
  other_username: string;
  created_at: string;
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: number;
  } | null;
}

interface Group {
  id: number;
  name: string;
  created_at: string;
  is_admin: boolean;
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: number;
    sender_name: string;
  } | null;
}

interface ConversationsListProps {
  socket: Socket | null;
  onSelectConversation: (id: number, type: "direct" | "group") => void;
  currentConversation: { id: number | null; type: "direct" | "group" | null };
  onNewConversation: () => void;
  onNewGroup: () => void;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  socket,
  onSelectConversation,
  currentConversation,
  onNewConversation,
  onNewGroup,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "groups">("chats");

  // Create memoized fetch functions to avoid recreating them on every render
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserConversations();
      console.log("Fetched conversations:", data); // Debug log
      setConversations(data || []);
      setError(null);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserGroups();
      console.log("Fetched groups:", data); // Debug log
      setGroups(data || []);
      setError(null);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setError("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch conversations and groups
    fetchConversations();
    fetchGroups();
  }, [fetchConversations, fetchGroups]);

  useEffect(() => {
    if (!socket) return;

    // Listen for direct message events
    const handleDirectMessage = (message: any) => {
      console.log("Direct message received:", message);
      // Refresh conversation list to show latest messages
      fetchConversations();
    };

    // Listen for group message events
    const handleGroupMessage = (message: any) => {
      console.log("Group message received:", message);
      // Refresh groups list to show latest messages
      fetchGroups();
    };

    // Listen for conversation update events
    const handleConversationUpdate = (data: any) => {
      console.log("Conversation updated:", data);
      fetchConversations();
    };

    // Listen for group update events
    const handleGroupUpdate = (data: any) => {
      console.log("Group updated:", data);
      fetchGroups();
    };

    // Register all event listeners
    socket.on("direct:message:received", handleDirectMessage);
    socket.on("group:message:received", handleGroupMessage);
    socket.on("conversation:updated", handleConversationUpdate);
    socket.on("group:updated", handleGroupUpdate);

    // Clean up event listeners
    return () => {
      socket.off("direct:message:received", handleDirectMessage);
      socket.off("group:message:received", handleGroupMessage);
      socket.off("conversation:updated", handleConversationUpdate);
      socket.off("group:updated", handleGroupUpdate);
    };
  }, [socket, fetchConversations, fetchGroups]);

  // Format timestamp to a readable format
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date to show day if not today
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return formatTime(timestamp);
    }

    // If within the last week, show day name
    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }

    // Otherwise show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div className="flex">
          <button
            className={`px-4 py-2 ${
              activeTab === "chats"
                ? "border-b-2 border-blue-500 font-medium"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("chats")}
          >
            Chats
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "groups"
                ? "border-b-2 border-blue-500 font-medium"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("groups")}
          >
            Groups
          </button>
        </div>
        <button
          onClick={activeTab === "chats" ? onNewConversation : onNewGroup}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {isLoading && conversations.length === 0 && groups.length === 0 ? (
        <p className="text-gray-500 p-4 text-center">Loading...</p>
      ) : activeTab === "chats" ? (
        conversations.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            <p>No conversations yet</p>
            <button
              onClick={onNewConversation}
              className="mt-2 text-blue-500 hover:underline"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          <ul className="divide-y">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id, "direct")}
                className={`p-3 hover:bg-gray-100 cursor-pointer ${
                  currentConversation.id === conversation.id &&
                  currentConversation.type === "direct"
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {conversation.other_username}
                  </span>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatDate(conversation.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                {conversation.lastMessage ? (
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No messages yet
                  </p>
                )}
              </li>
            ))}
          </ul>
        )
      ) : groups.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          <p>No groups yet</p>
          <button
            onClick={onNewGroup}
            className="mt-2 text-blue-500 hover:underline"
          >
            Create a new group
          </button>
        </div>
      ) : (
        <ul className="divide-y">
          {groups.map((group) => (
            <li
              key={group.id}
              onClick={() => onSelectConversation(group.id, "group")}
              className={`p-3 hover:bg-gray-100 cursor-pointer ${
                currentConversation.id === group.id &&
                currentConversation.type === "group"
                  ? "bg-blue-50"
                  : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium">
                  {group.name}
                  {group.is_admin && (
                    <span className="ml-2 px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                      Admin
                    </span>
                  )}
                </span>
                {group.lastMessage && (
                  <span className="text-xs text-gray-500">
                    {formatDate(group.lastMessage.created_at)}
                  </span>
                )}
              </div>
              {group.lastMessage ? (
                <p className="text-sm text-gray-600 truncate">
                  <span className="font-medium">
                    {group.lastMessage.sender_name}:{" "}
                  </span>
                  {group.lastMessage.content}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No messages yet</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationsList;
