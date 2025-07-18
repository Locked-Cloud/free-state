#!/bin/bash

# Build the React app
echo "Building React application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Exiting."
  exit 1
fi

# Ensure _redirects file exists
echo "Ensuring Netlify configuration exists..."
echo "/* /index.html 200" > build/_redirects

echo "Build completed successfully!"
echo "To deploy to Netlify, run: netlify deploy"
echo "Or upload the 'build' folder to your hosting provider of choice." 