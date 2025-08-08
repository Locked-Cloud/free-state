# Free State Real Estate Platform

A React application for browsing real estate properties and developers in Egypt. Features include user authentication, property listings, and detailed project information. This application is also a Progressive Web App (PWA) with offline capabilities.

## Features

- User authentication using Google Sheets as a database
- Browse real estate developers and their projects
- Detailed project information with images and specifications
- Responsive design for mobile and desktop
- Protected routes requiring authentication
- Progressive Web App (PWA) capabilities:
  - Installable on desktop and mobile devices
  - Offline functionality
  - App-like experience with full-screen mode
  - Fast loading with service worker caching

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Development Tools

#### React DevTools

For a better development experience, install React DevTools browser extension:

- [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- [Edge Extension](https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil)

For Safari or other browsers, install the standalone version:

```bash
# Using npm
npm install -g react-devtools

# Using yarn
yarn global add react-devtools
```

Then run the DevTools from the terminal:

```bash
react-devtools
```

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

### Installing as a PWA

This application can be installed as a Progressive Web App on compatible devices:

1. **Desktop (Chrome, Edge, or other Chromium-based browsers)**:
   - Navigate to the deployed application
   - Look for the install icon (⊕) in the address bar or menu
   - Click "Install" when prompted

2. **Android**:
   - Open the application in Chrome
   - Tap the menu button (⋮)
   - Select "Add to Home screen"

3. **iOS (Safari)**:
   - Open the application in Safari
   - Tap the Share button
   - Scroll down and tap "Add to Home Screen"

Once installed, the application will run like a native app with offline capabilities.

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
