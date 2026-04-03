#!/bin/bash

# This script automates the process of creating a Docker network. It ensures that the network is created only if it doesn't already exist.
# Quick note: Make sure to replace the placeholder <network-name> with your actual network name before running the script.

# Step 1: Check if the network already exists
if docker network ls | grep -q "<network-name>"; then
    echo "Network <network-name> already exists."
else
    # Step 2: Create the Docker network
    docker network create <network-name>
    echo "Network <network-name> created successfully."
fi