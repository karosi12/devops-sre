#!/bin/bash

# Wiki Service Setup Script
# This script automates the setup process for the Wiki Service application

set -e

echo "=== Wiki Service Setup ==="

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
echo "Setting environment variables..."
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=aurora_db

# Create wiki-network
echo "Creating docker network..."
docker network create wiki-net || echo "Network wiki-net already exists"

# Start PostgreSQL (Docker example)
echo "Starting PostgreSQL container..."
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=aurora_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  --network wiki-net \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Build wiki-service docker image
echo "Building wiki-service docker image..."
docker build -t wiki-service .

# Run the application using docker container
echo "Starting wiki-service container..."
docker run -d -p 8080:8000 \
  --name wiki-service \
  --network wiki-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_HOST=postgres-dev \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=aurora_db \
  wiki-service

echo "=== Setup Complete ==="
echo "Wiki Service is running on http://localhost:8080"
echo "PostgreSQL is running on localhost:5432"
