import { BehaviorSubject } from "rxjs";

interface User {
  id: number;
  username: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

// API URL
const API_URL = "http://localhost:3001/api";

// Create a BehaviorSubject to track authentication state
const authState = new BehaviorSubject<AuthState>({
  user: null,
  token: localStorage.getItem("token"),
});

// Initialize auth state from localStorage
if (localStorage.getItem("token")) {
  getCurrentUser();
}

// Register a new user
export async function register(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    const data = await response.json();

    // Update auth state
    authState.next({
      user: data.user,
      token: data.token,
    });

    // Store token in localStorage
    localStorage.setItem("token", data.token);

    return true;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Login an existing user
export async function login(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();

    // Update auth state
    authState.next({
      user: data.user,
      token: data.token,
    });

    // Store token in localStorage
    localStorage.setItem("token", data.token);

    return true;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Get current user data
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token invalid or expired, log out
        logout();
        return null;
      }
      throw new Error("Failed to get user data");
    }

    const user = await response.json();

    // Update auth state
    authState.next({
      user,
      token,
    });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Logout
export function logout(): void {
  // Clear auth state
  authState.next({
    user: null,
    token: null,
  });

  // Remove token from localStorage
  localStorage.removeItem("token");
}

// Get current auth state
export function getAuthState(): AuthState {
  return authState.value;
}

// Subscribe to auth state changes
export function subscribeToAuth(callback: (state: AuthState) => void) {
  return authState.subscribe(callback);
}

// Get authorization headers for API requests
export function getAuthHeaders(): { Authorization?: string } {
  const token = authState.value.token;
  
  return token ? {
    'Authorization': `Bearer ${token}`
  } : {};
}
