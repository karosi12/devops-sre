// src/services/userService.ts
import { Database } from 'better-sqlite3';
import { User } from '../../models/user';

export class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  create(user: User): User {
    const stmt = this.db.prepare(
      'INSERT INTO users (name, email) VALUES (?, ?)',
    );
    const info = stmt.run(user.name, user.email);
    return { id: info.lastInsertRowid as number, ...user };
  }

  findAll(): User[] {
    return this.db.prepare('SELECT id, name, email FROM users').all() as User[];
  }

  findById(id: number): User | null {
    const row = this.db
      .prepare('SELECT id, name, email FROM users WHERE id = ?')
      .get(id);
    return row ? (row as User) : null;
  }

  update(id: number, updates: Partial<User>): User | null {
    const existing = this.findById(id);
    if (!existing) return null;
    const name = updates.name ?? existing.name;
    const email = updates.email ?? existing.email;
    this.db
      .prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
      .run(name, email, id);
    return { id, name, email };
  }

  delete(id: number): boolean {
    const info = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return info.changes > 0;
  }
}
