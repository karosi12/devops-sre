# 08 - Backend Services

Backend services in different languages for teaching full-stack DevOps.

## Languages

### Node.js/Express (`nodejs-express/`)
A RESTful API built with Node.js, Express, TypeScript, and PostgreSQL.

**Topics:**
- REST API design
- TypeScript fundamentals
- Database integration
- Unit and integration testing
- Docker containerization

**Getting Started:**
```bash
cd nodejs-express
npm install
npm run dev
```

**API Endpoints:**
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Python/FastAPI (`python-fastapi/`)
A modern Python API built with FastAPI.

**Topics:**
- Async Python
- FastAPI routing
- Pydantic validation
- OpenAPI documentation
- Database integration

**Getting Started:**
```bash
cd python-fastapi
pip install -r requirements.txt
uvicorn app:app --reload
```

## Running with Docker

```bash
# Node.js
cd nodejs-express
docker build -t api-nodejs .
docker run -p 3000:3000 api-nodejs

# Python
cd python-fastapi
docker build -t api-python .
docker run -p 8000:8000 api-python
```

## GitHub Container Registry (ghcr.io)

### Prerequisites
1. Create a Personal Access Token (PAT) on GitHub with `write:packages` scope
2. Save the token in a file (e.g., `ghp_token`) or use a secrets manager

### Push an Image

```bash
# 1. Login to GitHub Container Registry
cat ghp_token | docker login ghcr.io -u GITHUB_USERNAME --password-stdin

# 2. Build your image
docker build -t api-nodejs .

# 3. Tag the image for ghcr.io
docker tag api-nodejs ghcr.io/GITHUB_USERNAME/nodejs-api:latest

# 4. Push to GitHub Container Registry
docker push ghcr.io/GITHUB_USERNAME/nodejs-api:latest
```

### Pull an Image

```bash
# 1. Login (if not already authenticated)
cat ghp_token | docker login ghcr.io -u GITHUB_USERNAME --password-stdin

# 2. Pull the image
docker pull ghcr.io/GITHUB_USERNAME/nodejs-api:latest
```

### Automated Deployment

For automated deployment, see `01-docker/script/1-deploy-image.sh`. Update these values:
- `<aws-account-id>` and `<region>` for AWS ECR
- `<repository-name>` and `image-name-service` for your service
- `<host-port>:<container-port>` for port mapping
- `<network-name>` for Docker network

## CI/CD Integration
Each backend service includes:
- Dockerfile
- Jenkinsfile for CI/CD pipelines
- Unit and integration tests
