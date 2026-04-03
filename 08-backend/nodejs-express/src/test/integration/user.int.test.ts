import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createUserRoutes } from '../../routes/user';

let app: express.Express;
let db: Database.Database;

beforeAll(() => {
  db = new Database(':memory:');
  db.prepare(
    'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
  ).run();
  app = express();
  app.use(express.json());
  app.use('/users', createUserRoutes(db));
});

afterAll(() => db.close());

describe('User API Integration', () => {
  it('should create and fetch a user', async () => {
    const resCreate = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201);

    const resGet = await request(app)
      .get(`/users/${resCreate.body.id}`)
      .expect(200);

    expect(resGet.body.email).toBe('alice@example.com');
  });
});
