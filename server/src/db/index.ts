import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { createTables } from "./migrations";

let db: any;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: "./chat.db",
      driver: sqlite3.Database,
    });
  }
  return db;
}

export async function initializeDb() {
  const db = await getDb();
  await createTables(db);
  console.log("Database initialized");
  return db;
}
