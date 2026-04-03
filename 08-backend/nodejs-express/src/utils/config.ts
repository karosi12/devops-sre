import dotenv from 'dotenv';

dotenv.config();

const Config = {
  serverName: process.env.SERVER_NAME,
  serverPort: Number(process.env.PORT) ?? 3200,
  environment: process.env.SERVER_ENVIRONMENT as string,
  version: process.env.SERVER_VERSION as string,
};

export default Config;
