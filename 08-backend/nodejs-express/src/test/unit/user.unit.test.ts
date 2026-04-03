import Database from 'better-sqlite3';
import { UserService } from '../../services/internal-service/user-service';

describe('UserService', () => {
  let db: Database.Database;
  let userService: UserService;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(
      'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT)',
    );
    userService = new UserService(db);
  });

  afterAll(() => {
    db.close();
  });

  it('should create a user', () => {
    const user = userService.create({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('John Doe');
  });

  it('should retrieve a user by ID', () => {
    const created = userService.create({
      name: 'Jane',
      email: 'jane@example.com',
    });
    const fetched = userService.findById(Number(created.id));
    expect(fetched).not.toBeNull();
    expect(fetched!.email).toBe('jane@example.com');
  });
});
