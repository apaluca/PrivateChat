import React, { useState } from "react";
import { searchUsers, createGroup } from "../services/api";

interface User {
  id: number;
  username: string;
}

interface CreateGroupProps {
  onGroupCreated: (groupId: number) => void;
  onCancel: () => void;
}

const CreateGroup: React.FC<CreateGroupProps> = ({
  onGroupCreated,
  onCancel,
}) => {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchUsers(searchQuery);

      // Filter out users already selected
      const filteredResults = results.filter(
        (user: User) =>
          !selectedUsers.some((selected) => selected.id === user.id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(searchResults.filter((u) => u.id !== user.id));
    setSearchQuery("");
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Select at least one member");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const memberIds = selectedUsers.map((user) => user.id);
      console.log("Creating group with members:", memberIds);

      const group = await createGroup(groupName, memberIds);
      console.log("Group created:", group);

      onGroupCreated(group.id);
    } catch (error) {
      console.error("Error creating group:", error);
      setError("Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Create Group</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="groupName" className="block text-sm font-medium mb-1">
          Group Name
        </label>
        <input
          type="text"
          id="groupName"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="members" className="block text-sm font-medium mb-1">
          Add Members
        </label>
        <div className="flex">
          <input
            type="text"
            id="members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyUp={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for users to add"
            className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || searchQuery.length < 2}
            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Search Results:</h3>
          <ul className="max-h-40 overflow-y-auto divide-y">
            {searchResults.map((user) => (
              <li
                key={user.id}
                className="py-2 flex justify-between items-center hover:bg-gray-50"
              >
                <span>{user.username}</span>
                <button
                  onClick={() => handleSelectUser(user)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Selected Members:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center"
              >
                <span className="mr-1">{user.username}</span>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className="mr-2 px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateGroup}
          disabled={
            isCreating || !groupName.trim() || selectedUsers.length === 0
          }
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {isCreating ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;
