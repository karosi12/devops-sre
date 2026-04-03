# Node.js/Express Backend

A production-ready REST API built with Node.js, Express, TypeScript, and PostgreSQL.

## Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Testing:** Jest
- **Containerization:** Docker

## Project Structure
```
nodejs-express/
├── src/
│   ├── controllers/    # Request handlers
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/      # Business logic
│   ├── test/          # Unit & integration tests
│   └── utils/         # Utilities
├── Dockerfile
├── Jenkinsfile
├── package.json
└── tsconfig.json
```

## Getting Started

### Local Development
```bash
npm install
cp .env.sample .env
npm run dev
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create a user |
| GET | /api/users/:id | Get user by ID |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |

## Docker

```bash
# Build image
docker build -t nodejs-api .

# Run container
docker run -p 3000:3000 nodejs-api
```

## CI/CD

The Jenkinsfile includes:
- Code linting (ESLint)
- Type checking (TypeScript)
- Unit tests
- Docker image build
- Deployment stages
