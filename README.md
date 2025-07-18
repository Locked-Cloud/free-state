# Free State Real Estate Platform

A React application for browsing real estate properties and developers in Egypt. Features include user authentication, property listings, and detailed project information.

## Features

- User authentication using Google Sheets as a database
- Browse real estate developers and their projects
- Detailed project information with images and specifications
- Responsive design for mobile and desktop
- Protected routes requiring authentication

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/free-state.git
cd free-state
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm start
```

## Deployment

### Option 1: Deploy to Netlify (Recommended)

1. Build the application

```bash
npm run build
```

2. Deploy to Netlify

   - Create a free account on [Netlify](https://www.netlify.com/)
   - Drag and drop the `build` folder onto Netlify's upload area
   - Your site will be live in seconds with a Netlify subdomain

3. Fix 404 errors (if they occur)
   - The repository already includes a `_redirects` file in the `public` folder
   - If you still encounter 404 errors, go to your Netlify site settings
   - Navigate to "Deploys" > "Deploy settings" > "Build & deploy" > "Post processing"
   - Enable "Asset optimization" and "Pretty URLs"

### Option 2: Deploy to GitHub Pages

1. Install GitHub Pages package

```bash
npm install gh-pages --save-dev
```

2. Update package.json

```json
"homepage": "https://locked-cloud.github.io/free-state",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

3. Deploy

```bash
npm run deploy
```

### Option 3: Deploy to Vercel

1. Install Vercel CLI

```bash
npm install -g vercel
```

2. Deploy

```bash
vercel
```

## Environment Variables

For production, consider setting up environment variables for:

- Google Sheet IDs
- API keys
- CORS proxy URLs

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Create React App for the initial project setup
- Google Sheets for database functionality
