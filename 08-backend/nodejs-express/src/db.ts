// src/db.ts
import Database from 'better-sqlite3';

export function createInMemoryDb() {
  const db = new Database(':memory:');
  // create users table
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );
  `);
  return db;
}
