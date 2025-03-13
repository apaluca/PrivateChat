import { getAuthHeaders } from "./auth";

const API_URL = "http://localhost:3001/api";

// Generic fetch wrapper with authentication
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const authHeaders = getAuthHeaders();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeaders as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

// User search
export async function searchUsers(query: string) {
  return fetchWithAuth(`/users/search?q=${encodeURIComponent(query)}`);
}

// Direct messaging
export async function getUserConversations() {
  return fetchWithAuth("/conversations");
}

export async function createConversation(userId: number) {
  return fetchWithAuth("/conversations", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function getConversationMessages(
  conversationId: number,
  limit = 50
) {
  return fetchWithAuth(
    `/conversations/${conversationId}/messages?limit=${limit}`
  );
}

export async function sendDirectMessage(
  conversationId: number,
  content: string
) {
  return fetchWithAuth(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// Group messaging
export async function getUserGroups() {
  return fetchWithAuth("/groups");
}

export async function createGroup(name: string, members: number[] = []) {
  return fetchWithAuth("/groups", {
    method: "POST",
    body: JSON.stringify({ name, members }),
  });
}

export async function getGroupMessages(groupId: number, limit = 50) {
  return fetchWithAuth(`/groups/${groupId}/messages?limit=${limit}`);
}

export async function sendGroupMessage(groupId: number, content: string) {
  return fetchWithAuth(`/groups/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getGroupMembers(groupId: number) {
  return fetchWithAuth(`/groups/${groupId}/members`);
}

export async function addGroupMember(
  groupId: number,
  userId: number,
  isAdmin = false
) {
  return fetchWithAuth(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, isAdmin }),
  });
}

export async function removeGroupMember(groupId: number, userId: number) {
  return fetchWithAuth(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
}
