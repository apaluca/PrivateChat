/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import ChatBox from "./components/ChatBox";
import MessageInput from "./components/MessageInput";
import RoomList from "./components/RoomList";
import Auth from "./components/Auth";
import { subscribeToAuth, getAuthState, logout } from "./services/auth";
import { getMessages, getRoomMessages } from "./services/api";

// Socket.io connection
const SOCKET_URL = "http://localhost:3001";

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);

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

    // Listen for global messages
    socket.on("message:received", (message) => {
      setMessages((prev) => [message, ...prev]);
    });

    // Listen for room messages
    socket.on("room:message:received", (message) => {
      setRoomMessages((prev) => [message, ...prev]);
    });

    return () => {
      socket.off("message:received");
      socket.off("room:message:received");
    };
  }, [socket]);

  // Fetch messages when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated]);

  // Fetch recent messages
  const fetchMessages = async () => {
    try {
      const data = await getMessages();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Handle auth success (not needed anymore as we use the auth subscription)
  const handleAuthSuccess = () => {
    // This is handled by the auth state subscription
  };

  // Send message
  const sendMessage = (content: string) => {
    if (!socket || !isAuthenticated) return;

    if (currentRoom && currentRoom !== "global") {
      socket.emit("room:message:send", { roomName: currentRoom, content });
    } else {
      socket.emit("message:send", content);
    }
  };

  // Join room
  const joinRoom = (roomName: string) => {
    if (!socket || !isAuthenticated) return;

    if (roomName === "global") {
      setCurrentRoom(null);
      setRoomMessages([]);
      return;
    }

    socket.emit("room:join", roomName);
    setCurrentRoom(roomName);

    // Fetch room messages
    fetchRoomMessages(roomName);
  };

  // Fetch room messages
  const fetchRoomMessages = async (roomName: string) => {
    try {
      const rooms = await fetch(`http://localhost:3001/api/rooms`, {
        headers: {
          Authorization: `Bearer ${getAuthState().token}`,
        },
      })
        .then((res) => res.json())
        .then((rooms) => rooms.find((r: any) => r.name === roomName));

      if (rooms) {
        const data = await getRoomMessages(rooms.id);
        setRoomMessages(data);
      }
    } catch (error) {
      console.error("Error fetching room messages:", error);
    }
  };

  // Leave current room
  const leaveRoom = () => {
    setCurrentRoom(null);
    setRoomMessages([]);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setCurrentRoom(null);
    setRoomMessages([]);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {!isAuthenticated ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          <div className="w-1/4 bg-white p-4 border-r">
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
            <RoomList
              socket={socket}
              onJoinRoom={joinRoom}
              currentRoom={currentRoom}
            />
          </div>
          <div className="w-3/4 flex flex-col">
            <div className="bg-white p-2 border-b flex justify-between items-center">
              <h1 className="text-xl font-bold">
                {currentRoom ? `Room: ${currentRoom}` : "Global Chat"}
              </h1>
              {currentRoom && (
                <button
                  onClick={leaveRoom}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Leave Room
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <ChatBox
                messages={currentRoom ? roomMessages : messages}
                username={username}
                roomName={currentRoom}
              />
            </div>
            <div className="p-4 bg-white border-t">
              <MessageInput onSendMessage={sendMessage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
