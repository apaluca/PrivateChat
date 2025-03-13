import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { getRooms, createRoom } from "../services/api";

interface Room {
  id: number;
  name: string;
}

interface RoomListProps {
  socket: Socket | null;
  onJoinRoom: (roomName: string) => void;
  currentRoom: string | null;
}

const RoomList: React.FC<RoomListProps> = ({
  socket,
  onJoinRoom,
  currentRoom,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch rooms from API
    fetchRooms();

    // Listen for new rooms
    if (socket) {
      socket.on("room:created", (room: Room) => {
        setRooms((prevRooms) => {
          // Check if room already exists in our list
          if (!prevRooms.some((r) => r.id === room.id)) {
            return [...prevRooms, room];
          }
          return prevRooms;
        });
      });

      // Clean up listener
      return () => {
        socket.off("room:created");
      };
    }
  }, [socket]);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await getRooms();
      setRooms(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setError("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate room name
    const trimmedRoomName = newRoomName.trim();
    if (!trimmedRoomName || !socket) {
      setError("Room name cannot be empty");
      return;
    }

    // Check if room name already exists
    if (
      rooms.some(
        (room) => room.name.toLowerCase() === trimmedRoomName.toLowerCase()
      )
    ) {
      setError("A room with this name already exists");
      return;
    }

    setIsLoading(true);
    try {
      // Create room via API
      const createdRoom = await createRoom(trimmedRoomName);

      // Update local room list
      setRooms((prevRooms) => [...prevRooms, createdRoom]);

      // No need to emit socket event, server will broadcast to all clients
      // socket.emit("room:create", trimmedRoomName);

      setNewRoomName("");
      setIsCreating(false);
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating room:", error);
      // Display the specific error message from the server if available
      setError(error.message || "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Chat Rooms</h2>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        {isCreating ? (
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Room name"
              autoFocus
              disabled={isLoading}
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                disabled={isLoading || !newRoomName.trim()}
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewRoomName("");
                  setError(null);
                }}
                className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
          >
            Create Room
          </button>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Available Rooms</h3>
        {isLoading && rooms.length === 0 ? (
          <p className="text-gray-500">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">No rooms available</p>
        ) : (
          <ul className="space-y-2">
            <li
              onClick={() => onJoinRoom("global")}
              className={`p-2 rounded cursor-pointer ${
                !currentRoom ? "bg-blue-100 font-medium" : "hover:bg-gray-100"
              }`}
            >
              Global Chat
            </li>
            {rooms.map((room) => (
              <li
                key={room.id}
                onClick={() => onJoinRoom(room.name)}
                className={`p-2 rounded cursor-pointer ${
                  currentRoom === room.name
                    ? "bg-blue-100 font-medium"
                    : "hover:bg-gray-100"
                }`}
              >
                {room.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RoomList;
