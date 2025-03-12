/* eslint-disable @typescript-eslint/no-explicit-any */
// client/src/App.tsx
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import ChatBox from "./components/ChatBox";
import MessageInput from "./components/MessageInput";
import UserJoin from "./components/UserJoin";
import RoomList from "./components/RoomList";

// Socket.io connection
const SOCKET_URL = "http://localhost:3001";

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);

  // Initialize socket connection
  useEffect(() => {
    if (socket) {
      socket.disconnect();
    }
    
    const newSocket = io(SOCKET_URL);

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message || "An error occurred");
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

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

  // Handle user join
  const handleJoin = async (username: string) => {
    if (!socket) return;

    try {
      // First register the user via API
      const response = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to join");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = await response.json();

      // Then emit join event to socket
      socket.emit("user:join", username);

      setUsername(username);
      setIsJoined(true);

      // Fetch recent messages
      fetchMessages();
    } catch (error) {
      console.error("Error joining:", error);
      alert(
        "Failed to join: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // Fetch recent messages
  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Send message
  const sendMessage = (content: string) => {
    if (!socket || !isJoined) return;

    if (currentRoom && currentRoom !== "global") {
      socket.emit("room:message:send", { roomName: currentRoom, content });
    } else {
      socket.emit("message:send", content);
    }
  };

  // Join room
  const joinRoom = (roomName: string) => {
    if (!socket || !isJoined) return;

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
      const room = await fetch(`http://localhost:3001/api/rooms`)
        .then((res) => res.json())
        .then((rooms) => rooms.find((r: any) => r.name === roomName));

      if (room) {
        const response = await fetch(
          `http://localhost:3001/api/rooms/${room.id}/messages`
        );
        if (response.ok) {
          const data = await response.json();
          setRoomMessages(data);
        }
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

  return (
    <div className="flex h-screen bg-gray-100">
      {!isJoined ? (
        <div className="w-full flex items-center justify-center">
          <UserJoin onJoin={handleJoin} />
        </div>
      ) : (
        <>
          <div className="w-1/4 bg-white p-4 border-r">
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
