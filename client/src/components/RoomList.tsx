import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

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
    try {
      const response = await fetch("http://localhost:3001/api/rooms");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim() || !socket) return;

    try {
      // Emit socket event to create room
      socket.emit("room:create", newRoomName);

      setNewRoomName("");
      setIsCreating(false);

      // The room list will update automatically when we receive the room:created event
    } catch (error) {
      console.error("Error creating room:", error);
      alert(
        "Failed to create room: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Chat Rooms</h2>

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
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
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
        {rooms.length === 0 ? (
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
