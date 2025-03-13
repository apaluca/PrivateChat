import React, { useState } from "react";
import {
  searchUsers,
  addGroupMember,
  removeGroupMember,
} from "../services/api";

interface User {
  id: number;
  username: string;
}

interface GroupMember {
  user_id: number;
  username: string;
  is_admin: boolean;
  joined_at: string;
}

interface GroupInfoProps {
  groupId: number;
  groupName: string;
  members: GroupMember[];
  currentUserId: number;
  onClose: () => void;
  onMemberAdded: (members: GroupMember[]) => void;
}

const GroupInfo: React.FC<GroupInfoProps> = ({
  groupId,
  groupName,
  members,
  currentUserId,
  onClose,
  onMemberAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // Check if current user is an admin
  const isCurrentUserAdmin = members.some(
    (member) => member.user_id === currentUserId && member.is_admin
  );

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchUsers(searchQuery);

      // Filter out users already in the group
      const filteredResults = results.filter(
        (user: User) => !members.some((member) => member.user_id === user.id)
      );

      setSearchResults(filteredResults);
      if (filteredResults.length === 0) {
        setError("No matching users found or all users are already members");
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    setIsAdding(true);
    setError(null);

    try {
      const updatedMembers = await addGroupMember(groupId, userId);
      onMemberAdded(updatedMembers);
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding member:", error);
      setError("Failed to add member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    setIsRemoving(userId);
    setError(null);

    try {
      const updatedMembers = await removeGroupMember(groupId, userId);
      onMemberAdded(updatedMembers);
    } catch (error) {
      console.error("Error removing member:", error);
      setError("Failed to remove member");
    } finally {
      setIsRemoving(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{groupName}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-md font-medium mb-2">
          Group Members ({members.length})
        </h3>
        {isCurrentUserAdmin && (
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="text-blue-500 hover:text-blue-700 text-sm mb-2"
          >
            {showAddMember ? "Cancel" : "+ Add Member"}
          </button>
        )}

        {showAddMember && (
          <div className="mb-4">
            <div className="flex mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user to add..."
                className="flex-1 p-2 border rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || searchQuery.length < 2}
                className="bg-blue-500 text-white px-3 py-1 rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 text-sm"
              >
                {isSearching ? "..." : "Search"}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

            {searchResults.length > 0 && (
              <ul className="max-h-40 overflow-y-auto divide-y border rounded">
                {searchResults.map((user) => (
                  <li
                    key={user.id}
                    className="p-2 flex justify-between items-center hover:bg-gray-50 text-sm"
                  >
                    <span>{user.username}</span>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      disabled={isAdding}
                      className="text-blue-500 hover:text-blue-700 text-xs"
                    >
                      {isAdding ? "Adding..." : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ul className="divide-y border rounded bg-white">
          {members.map((member) => (
            <li
              key={member.user_id}
              className="p-2 flex justify-between items-center hover:bg-gray-50"
            >
              <div>
                <span className="font-medium">
                  {member.username}
                  {member.is_admin && (
                    <span className="ml-2 px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                      Admin
                    </span>
                  )}
                  {member.user_id === currentUserId && (
                    <span className="ml-2 text-gray-500 text-xs">(You)</span>
                  )}
                </span>
                <div className="text-xs text-gray-500">
                  Joined {formatDate(member.joined_at)}
                </div>
              </div>
              {isCurrentUserAdmin && member.user_id !== currentUserId && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={isRemoving === member.user_id}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  {isRemoving === member.user_id ? "Removing..." : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isCurrentUserAdmin && (
        <div className="mt-auto">
          <button
            onClick={() => handleRemoveMember(currentUserId)}
            className="w-full p-2 text-center text-red-500 hover:bg-red-50 border border-red-200 rounded"
          >
            Leave Group
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupInfo;
