#!/bin/bash

# Get your public IP
MYIP=$(curl -s https://checkip.amazonaws.com)

if [[ -z "$MYIP" ]]; then
  echo "Could not fetch public IP"
  exit 1
fi

echo "Your IP: $MYIP"


echo "Update port 22 rule in main.tf to allow $MYIP/32"
