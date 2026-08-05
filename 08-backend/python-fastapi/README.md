# Wiki Service - FastAPI Application

This directory contains the FastAPI application code that will be containerized and deployed via Helm.

## Application Overview

The Wiki Service is a RESTful API for managing users and posts with the following features:

- **User Management**: Create and retrieve users
- **Post Management**: Create and retrieve posts under specific users
- **Prometheus Metrics**: Automatic metric collection for users/posts creation
- **PostgreSQL Backend**: Persistent data storage
- **Async Support**: Fully asynchronous request handling

## Directory Structure

```
wiki-service/
├── Dockerfile              # Container image definition
├── requirements.txt        # Python dependencies
├── app/
│   ├── __init__.py        # Package initialization
│   ├── main.py            # FastAPI application and endpoints
│   ├── database.py        # Database configuration (PostgreSQL)
│   ├── models.py          # SQLAlchemy ORM models
│   ├── schemas.py         # Pydantic request/response schemas
│   └── metrics.py         # Prometheus metrics
```

## Building the Docker Image

From the `wiki-service` directory, run:

```bash
cd wiki-service
docker build .
```

Or with a tag:

```bash
docker build -t wiki-service:latest .
```

The directory contains everything needed: `Dockerfile`, `requirements.txt`, and `app/` source. No files outside this directory are required.

### Dockerfile Details

- **Base Image**: python:3.13-slim
- **Exposed Port**: 8000
- **Health Check**: HTTP endpoint check every 30 seconds
- **Dependencies**: Installed from requirements.txt
- **Command**: Runs uvicorn with FastAPI app

## Environment Variables

The application requires these environment variables for PostgreSQL connection:

| Variable | Default | Description |
|----------|---------|-------------|
| POSTGRES_USER | postgres | Database username |
| POSTGRES_PASSWORD | postgres | Database password |
| POSTGRES_HOST | localhost | Database host |
| POSTGRES_PORT | 5432 | Database port |
| POSTGRES_DB | aurora_db | Database name |

## Running Locally

### Prerequisites

- Python 3.13+
- PostgreSQL 12+
- `uv` (recommended) or `pip`

### Setup

Using `uv` (recommended):

```bash
# Create and activate virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Set environment variables
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=aurora_db

# Start PostgreSQL (Docker example)
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=aurora_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  --network wiki-net
  postgres:15-alpine

# Create wiki-network
docker network create wiki-net

# Build wiki-service docker image
docker build -t wiki-service .

# Run the application using docker container
docker run -d -p 8080:8000 \
  --name wiki-service \
  --network wiki-net \
  --env-file .env \
  wiki-service

# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Using `pip` (alternative):

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Visit http://localhost:8000/docs for the interactive API documentation.

## API Endpoints

### Users

**POST /users** - Create a new user
```json
Request:
{
  "name": "John Doe"
}

Response (201):
{
  "id": 1,
  "name": "John Doe",
  "created_time": "2024-01-22T10:30:00+00:00"
}
```

**GET /user/{id}** - Retrieve a user by ID
```json
Response (200):
{
  "id": 1,
  "name": "John Doe",
  "created_time": "2024-01-22T10:30:00+00:00"
}
```

### Posts

**POST /posts** - Create a new post
```json
Request:
{
  "user_id": 1,
  "content": "Hello, World!"
}

Response (201):
{
  "post_id": 1,
  "content": "Hello, World!",
  "user_id": 1,
  "created_time": "2024-01-22T10:35:00+00:00"
}
```

**GET /posts/{id}** - Retrieve a post by ID
```json
Response (200):
{
  "post_id": 1,
  "content": "Hello, World!",
  "user_id": 1,
  "created_time": "2024-01-22T10:35:00+00:00"
}
```

### Metrics

**GET /metrics** - Prometheus metrics endpoint
```
# HELP users_created_total Total number of users created
# TYPE users_created_total counter
users_created_total 5.0
# HELP posts_created_total Total number of posts created
# TYPE posts_created_total counter
posts_created_total 12.0
```

### Root

**GET /** - API information
```json
{
  "message": "User and Post API",
  "endpoints": {
    "POST /users": "Create a new user",
    "POST /posts": "Create a new post",
    "GET /user/{id}": "Get user by ID",
    "GET /posts/{id}": "Get post by ID",
    "GET /metrics": "Prometheus metrics"
  }
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR NOT NULL,
  created_time TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Posts Table

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL FOREIGN KEY REFERENCES users(id),
  created_time TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Metrics

The application exposes two key Prometheus metrics:

- **users_created_total**: Counter tracking total users created
- **posts_created_total**: Counter tracking total posts created

These metrics are used by Grafana to visualize creation rates over time.

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success
- `201`: Resource created
- `404`: Resource not found
- `422`: Validation error
- `500`: Server error

All endpoints include proper error messages in the response body.

## Logging

The application logs important events:

- Database table creation on startup
- User creation events
- Post creation events
- Connection errors and exceptions

Logs are output to stdout and are captured by Kubernetes.

## Performance Considerations

- **Async/Await**: All database operations are non-blocking
- **Connection Pooling**: AsyncSessionLocal manages database connections
- **Health Checks**: Kubernetes uses HTTP health checks for pod readiness
- **Resource Limits**: Configured to use minimal resources (~512Mi memory max)

## Dependencies

See `requirements.txt` for complete list:

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **sqlalchemy**: ORM for database operations
- **asyncpg**: Async PostgreSQL driver
- **pydantic**: Request/response validation
- **prometheus-client**: Metrics export

## Development

To contribute or extend the application:

1. Add new endpoints in `app/main.py`
2. Define models in `app/models.py`
3. Create schemas in `app/schemas.py`
4. Add any new metrics to `app/metrics.py`
5. Update requirements.txt with new dependencies
6. Rebuild the Docker image

## Deployment

See the parent `wiki-chart/README.md` for complete Kubernetes/Helm deployment instructions.
