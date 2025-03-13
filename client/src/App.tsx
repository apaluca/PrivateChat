/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import ChatBox from "./components/ChatBox";
import MessageInput from "./components/MessageInput";
import ConversationsList from "./components/ConversationsList";
import UserSearch from "./components/UserSearch";
import CreateGroup from "./components/CreateGroup";
import GroupInfo from "./components/GroupInfo";
import Auth from "./components/Auth";
import { subscribeToAuth, getAuthState, logout } from "./services/auth";
import {
  getUserConversations,
  getConversationMessages,
  getGroupMessages,
  getUserGroups,
  getGroupMembers,
} from "./services/api";

// Socket.io connection
const SOCKET_URL = "http://localhost:3001";

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<{
    id: number | null;
    type: "direct" | "group" | null;
    name: string | null;
  }>({
    id: null,
    type: null,
    name: null,
  });
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  // Check authentication state
  useEffect(() => {
    const subscription = subscribeToAuth((authState) => {
      setIsAuthenticated(!!authState.user && !!authState.token);
      setUsername(authState.user?.username || "");
      setUserId(authState.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const { token } = getAuthState();
    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      if (error.message.includes("Authentication")) {
        // If authentication error, log out
        logout();
      }
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message || "An error occurred");
    });

    setSocket(newSocket);

    // Cleanup on unmount or when auth state changes
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Setup message listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for direct messages
    socket.on("direct:message:received", (message) => {
      console.log("App received direct message:", message);
      if (
        currentConversation.type === "direct" &&
        currentConversation.id === message.conversation_id
      ) {
        setMessages((prev) => [message, ...prev]);
      }
    });

    // Listen for group messages
    socket.on("group:message:received", (message) => {
      console.log("App received group message:", message);
      if (
        currentConversation.type === "group" &&
        currentConversation.id === message.group_id
      ) {
        setMessages((prev) => [message, ...prev]);
      }
    });

    return () => {
      socket.off("direct:message:received");
      socket.off("group:message:received");
    };
  }, [socket, currentConversation]);

  // Handle conversation selection
  const handleSelectConversation = async (
    id: number,
    type: "direct" | "group"
  ) => {
    // Clear previous messages
    setMessages([]);

    try {
      if (type === "direct") {
        // Fetch conversation details
        const conversations = await getUserConversations();
        const conversation = conversations.find((c: any) => c.id === id);

        if (conversation) {
          setCurrentConversation({
            id,
            type,
            name: conversation.other_username,
          });

          // Join socket room if needed

          // Fetch messages
          const messages = await getConversationMessages(id);
          setMessages(messages);
        }
      } else if (type === "group") {
        // Fetch group details
        const groups = await getUserGroups();
        const group = groups.find((g: any) => g.id === id);

        if (group) {
          setCurrentConversation({
            id,
            type,
            name: group.name,
          });

          // Join socket room for this group
          if (socket) {
            socket.emit("group:join", id);
          }

          // Fetch messages
          const messages = await getGroupMessages(id);
          setMessages(messages);

          // Fetch group members
          const members = await getGroupMembers(id);
          setGroupMembers(members);
        }
      }
    } catch (error) {
      console.error("Error selecting conversation:", error);
    }
  };

  // Send message
  const sendMessage = (content: string) => {
    if (!socket || !isAuthenticated || !currentConversation.id) return;

    if (currentConversation.type === "direct") {
      // Get the other user ID from the conversation
      getUserConversations().then((conversations) => {
        const conversation = conversations.find(
          (c: any) => c.id === currentConversation.id
        );
        if (conversation) {
          console.log("Sending direct message to:", conversation.other_user_id);
          socket.emit("direct:message:send", {
            recipientId: conversation.other_user_id,
            content,
          });
        }
      });
    } else if (currentConversation.type === "group") {
      console.log("Sending group message to:", currentConversation.id);
      socket.emit("group:message:send", {
        groupId: currentConversation.id,
        content,
      });
    }
  };

  // Handle conversation creation
  const handleConversationCreated = (conversationId: number) => {
    setShowUserSearch(false);
    handleSelectConversation(conversationId, "direct");
  };

  // Handle group creation
  const handleGroupCreated = (groupId: number) => {
    console.log("Group created with ID:", groupId);

    // Get the full group data including members
    getUserGroups().then((groups) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group && socket) {
        // Inform socket server about the new group and its members
        const memberIds = group.members
          ? group.members.map((m: any) => m.user_id)
          : [];

        // Emit to socket server so it can notify all members
        socket.emit("group:created", {
          groupId: groupId,
          memberIds: memberIds,
        });
      }
    });

    setShowCreateGroup(false);
    handleSelectConversation(groupId, "group");
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setCurrentConversation({
      id: null,
      type: null,
      name: null,
    });
    setMessages([]);
  };

  // Show group info
  const toggleGroupInfo = () => {
    setShowGroupInfo(!showGroupInfo);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {!isAuthenticated ? (
        <Auth onAuthSuccess={() => {}} />
      ) : (
        <>
          <div className="w-1/4 bg-white p-4 border-r flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-medium">Welcome, {username}</h3>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ConversationsList
                socket={socket}
                onSelectConversation={handleSelectConversation}
                currentConversation={{
                  id: currentConversation.id,
                  type: currentConversation.type,
                }}
                onNewConversation={() => setShowUserSearch(true)}
                onNewGroup={() => setShowCreateGroup(true)}
              />
            </div>
          </div>

          <div className="w-3/4 flex flex-col">
            {currentConversation.id ? (
              <>
                <div className="bg-white p-2 border-b flex justify-between items-center">
                  <h1 className="text-xl font-bold">
                    {currentConversation.name}
                  </h1>
                  {currentConversation.type === "group" && (
                    <button
                      onClick={toggleGroupInfo}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Group Info
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-auto p-4 relative">
                  <ChatBox
                    messages={messages}
                    username={username}
                    userId={userId!}
                  />

                  {showGroupInfo && currentConversation.type === "group" && (
                    <div className="absolute top-0 right-0 h-full w-1/3 bg-white p-4 shadow-lg border-l">
                      <GroupInfo
                        groupId={currentConversation.id}
                        groupName={currentConversation.name!}
                        members={groupMembers}
                        currentUserId={userId!}
                        onClose={() => setShowGroupInfo(false)}
                        onMemberAdded={(members) => setGroupMembers(members)}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t">
                  <MessageInput onSendMessage={sendMessage} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <h2 className="text-xl font-medium mb-2">
                    Welcome to WhatsApp-like Chat
                  </h2>
                  <p className="mb-4">
                    Select a conversation or start a new one
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setShowUserSearch(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      New Chat
                    </button>
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      New Group
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modals */}
            {showUserSearch && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <div className="max-w-md w-full">
                  <UserSearch
                    onConversationCreated={handleConversationCreated}
                    onCancel={() => setShowUserSearch(false)}
                  />
                </div>
              </div>
            )}

            {showCreateGroup && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <div className="max-w-md w-full">
                  <CreateGroup
                    onGroupCreated={handleGroupCreated}
                    onCancel={() => setShowCreateGroup(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
