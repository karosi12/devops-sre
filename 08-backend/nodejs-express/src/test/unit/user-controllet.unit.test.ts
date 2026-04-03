import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { UserController } from '../../controllers/user';

describe('UserController', () => {
  let controller: UserController;
  let db: Database.Database;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    db = new Database(':memory:');
    db.prepare(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)',
    ).run();

    controller = new UserController(db);

    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock })) as any;
    mockRes = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    } as Partial<Response>;
  });

  afterEach(() => {
    db.close();
    jest.clearAllMocks();
  });

  // CREATE
  it('should create a user successfully', () => {
    mockReq = { body: { name: 'John', email: 'john@example.com' } } as Request;
    controller.createUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'John' }),
    );
  });

  it('should return 400 if name or email missing', () => {
    mockReq = { body: { name: '' } } as Request;
    controller.createUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'name and email required',
    });
  });

  it('should handle duplicate email (UNIQUE constraint failed)', () => {
    const user = { name: 'Jane', email: 'jane@example.com' };
    mockReq = { body: user } as Request;

    // First insert
    controller.createUser(mockReq as Request, mockRes as Response);

    // Second insert (duplicate email)
    controller.createUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'email exists' });
  });

  it('should handle unexpected errors (500)', () => {
    // Mock the service to throw a non-unique error
    const mockService = {
      create: jest.fn(() => {
        throw new Error('database offline');
      }),
    };
    (controller as any).service = mockService;

    mockReq = { body: { name: 'Jake', email: 'jake@example.com' } } as Request;

    controller.createUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'database offline' });
  });

  it('should return 409 if email already exists', () => {
    mockReq = { body: { name: 'Jane', email: 'jane@example.com' } } as Request;
    controller.createUser(mockReq as Request, mockRes as Response);
    controller.createUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'email exists' });
  });

  // READ ALL
  it('should get all users', () => {
    db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(
      'User1',
      'user1@example.com',
    );
    const mockResAll = { json: jest.fn() } as unknown as Response;

    controller.getAllUsers({} as Request, mockResAll);

    expect(mockResAll.json).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'User1' })]),
    );
  });

  // READ BY ID
  it('should get a user by ID', () => {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run('User2', 'user2@example.com');

    mockReq = {
      params: { id: String(result.lastInsertRowid) },
    } as unknown as Request;
    controller.getUserById(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'User2' }),
    );
  });

  it('should return 404 if user not found by ID', () => {
    mockReq = { params: { id: '999' } } as unknown as Request;
    controller.getUserById(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'not found' });
  });

  // UPDATE
  it('should update an existing user', () => {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run('OldName', 'old@example.com');

    mockReq = {
      params: { id: String(result.lastInsertRowid) },
      body: { name: 'NewName' },
    } as unknown as Request;

    controller.updateUser(mockReq as Request, mockRes as Response);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NewName' }),
    );
  });

  it('should return 404 if updating non-existing user', () => {
    mockReq = {
      params: { id: '999' },
      body: { name: 'Ghost' },
    } as unknown as Request;

    controller.updateUser(mockReq as Request, mockRes as Response);
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'not found' });
  });

  // DELETE
  it('should delete a user successfully', () => {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run('DeleteUser', 'delete@example.com');

    mockReq = {
      params: { id: String(result.lastInsertRowid) },
    } as unknown as Request;

    controller.deleteUser(mockReq as Request, mockRes as Response);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalled();
  });

  it('should return 404 when deleting non-existing user', () => {
    mockReq = { params: { id: '999' } } as unknown as Request;
    controller.deleteUser(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'not found' });
  });
});
