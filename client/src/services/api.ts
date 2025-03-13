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

// Get recent messages
export async function getMessages(limit = 50) {
  return fetchWithAuth(`/messages?limit=${limit}`);
}

// Get rooms list
export async function getRooms() {
  return fetchWithAuth("/rooms");
}

// Create a new room
export async function createRoom(name: string) {
  return fetchWithAuth("/rooms", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Get room messages
export async function getRoomMessages(roomId: number, limit = 50) {
  return fetchWithAuth(`/rooms/${roomId}/messages?limit=${limit}`);
}
