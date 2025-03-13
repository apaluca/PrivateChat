import React, { useState } from "react";
import { searchUsers, createConversation } from "../services/api";

interface User {
  id: number;
  username: string;
}

interface UserSearchProps {
  onConversationCreated: (conversationId: number) => void;
  onCancel: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({
  onConversationCreated,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setError("Search query must be at least 2 characters");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setError("No users found");
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (userId: number) => {
    try {
      const conversation = await createConversation(userId);
      onConversationCreated(conversation.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
      setError("Failed to start conversation");
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">New Conversation</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="flex mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for users..."
          className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || searchQuery.length < 2}
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Results:</h3>
          <ul className="max-h-60 overflow-y-auto divide-y">
            {searchResults.map((user) => (
              <li
                key={user.id}
                className="py-2 flex justify-between items-center hover:bg-gray-50"
              >
                <span>{user.username}</span>
                <button
                  onClick={() => handleStartConversation(user.id)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Message
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
