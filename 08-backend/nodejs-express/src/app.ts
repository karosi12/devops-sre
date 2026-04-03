import Config from './utils/config';
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import Log from './utils/loggers';
import { createInMemoryDb } from './db';
import { createUserRoutes } from './routes/user';

dotenv.config();
const app = express();
const port: number = Config.serverPort;
const version: string = Config.version ?? 'v1';

// Initialize database (in-memory for now)
const db = createInMemoryDb();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.get('/health', (req: Request, res: Response) => {
  res.send(`Welcome to ${Config.serverName} Service`);
});

// API routes
app.use(`/api/${version}/users`, createUserRoutes(db));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: err.message });
});
app.listen(port, () =>
  Log.success(`API is Alive and running 🚀 on port ${port}`),
);
