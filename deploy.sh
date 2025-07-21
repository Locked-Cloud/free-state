#!/bin/bash

# Build the React app
echo "Building React application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Exiting."
  exit 1
fi

echo "Build completed successfully!"
echo "Upload the 'build' folder to Cloudflare Pages or push to your connected repository." 