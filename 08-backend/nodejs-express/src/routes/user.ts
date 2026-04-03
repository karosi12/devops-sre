import { Router } from 'express';
import { Database } from 'better-sqlite3';
import { UserController } from '../controllers/user';

export function createUserRoutes(db: Database) {
  const router = Router();
  const controller = new UserController(db);

  router.post('/', controller.createUser.bind(controller));
  router.get('/', controller.getAllUsers.bind(controller));
  router.get('/:id', controller.getUserById.bind(controller));
  router.put('/:id', controller.updateUser.bind(controller));
  router.delete('/:id', controller.deleteUser.bind(controller));

  return router;
}
