import { config } from "dotenv";
config();

import app from "./app";
import { createServer } from "http";
import { setupSocket } from "./socket";
import { initializeDb } from "./db";

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database
    await initializeDb();

    // Create HTTP server
    const httpServer = createServer(app);

    // Setup Socket.io
    setupSocket(httpServer);

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
