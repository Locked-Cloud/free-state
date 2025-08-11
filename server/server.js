const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Constants - Hidden from client-side code
const SHEET_ID = process.env.SHEET_ID || "1LBjCIE_wvePTszSrbSmt3szn-7m8waGX5Iut59zwURM";

// Sheet GIDs - Hidden from client-side code
const SHEET_GIDS = {
  COMPANIES: "1065798889", // Updated to the correct GID from the URL
  PROJECTS: "1884577336",
  USERS: "1815551767",
  PLACES: "658730705",
};

// Mock data for companies since the sheet is inaccessible
const MOCK_COMPANIES_DATA = `ID,Name,Description,NULL,Image_Path,Active
1,Mountain View,Driven by innovation, Mountain View for development and real estate investment is among Egypt's leading private property development companies. Specialized in developing first tier residences and resorts, Mountain View boasts over ten projects across Egypt, in some of the country's most prime locations, including East and West Cairo, the Red Sea Coast and the North Coast.,NULL,https://drive.google.com/file/d/182O-OQFHq8GVGjPFms7tfG_I4A-IXSrs/view?usp=sharing,1
2,Palm Hills,Palm Hills Developments is Egypt's leading real estate developer, primarily focused on integrated residential, commercial real estate as well as resort projects. They have one of the largest land banks in Egypt and a multitude of projects in residential, commercial and tourism destination resorts under its helm.,NULL,https://drive.google.com/file/d/1lLTgP72lha1bZzupX1MGQpnAV9H5cwWn/view?usp=sharing,1
3,Sodic,SODIC is a leading real estate development company in the region, with a distinguished track record of over 28 years of operations in West Cairo, East Cairo, and the North Coast. They develop contemporary office spaces, offer a wide range of leasable retail spaces, and build large-scale, mixed-use vibrant gated communities.,NULL,https://drive.google.com/file/d/1ySay6dh_QorU8YiGxTGiGrnEX5GgvTjW/view?usp=sharing,1
4,Tatweer Misr,Since its inception in 2014, Tatweer Misr has been a vital catalyst for change, delivering incomparable value through exemplary projects that master all facets of development. Boasting a wealth of industrial and technical expertise, Tatweer Misr has been offering an innovative outlook on integrated living to strongly emerge as a leading real-estate developer in Egypt, fulfilling the rising demand on mixed-use projects that enrich the life of its communities.,NULL,https://drive.google.com/file/d/160FeICfpCqqpthf-9rAk0ZKt9kI9F4-R/view?usp=sharing,1
5,Misr Italia Properties,At Misr Italia Properties, we aim to change the concept of the over-growing real estate market by listening to our customers who inspire us to stay ahead with innovative real estate solutions & designs. Our real estate developments are inspired by you. Your plans are the Inspiration for our concepts. Your lifestyle is the inspiration for our designs. Your habits are the inspiration for our solutions.,NULL,https://drive.google.com/file/d/1u1Oats63sd-1ppSMvCHqUITw6JuCc-Ux/view?usp=sharing,1
6,City Edge Developments,City Edge Developments aims to pioneer in improving people's lives by incorporating innovative value added solutions in the areas we master develop and manage. They provide development and asset management services, as well as developing their own real estate projects. Established in 2017, City Edge Developments has quickly risen to prominence as one of Egypt's leading real estate powerhouses.,NULL,https://drive.google.com/file/d/1n8vdA8Y2RuGumD_9hz98ST5zTbheBCNp/view?usp=sharing,1
7,Ora Developers,Ora Developers is a global real estate company founded by businessman Naguib Sawiris. It is known for creating luxurious, modern communities in Egypt and abroad, such as ZED in Sheikh Zayed and New Cairo.,NULL,https://drive.google.com/file/d/1CSOv4kvvhp9Ih4R7tDmY57WgiNqFMxwj/view?usp=sharing,1
8,Al Ahly Sabbour,Al Ahly Sabbour is one of Egypt's leading real estate developers. The company is known for delivering residential, commercial, and mixed-use projects with high-quality infrastructure and elegant designs.,NULL,https://drive.google.com/file/d/1FkHltFsRbrC_Y2wm2uE60sOmlj7WU3K9/view?usp=sharing,1
9,La Vista Developments,La Vista is a well-known developer in Egypt, famous for its beachside resorts and residential communities. Projects like La Vista Bay and La Vista Gardens reflect a focus on comfort, elegance, and landscape beauty.,NULL,https://drive.google.com/file/d/1kn3EIMRoLI207MMg1PFBxmVR3Il-GVCz/view?usp=sharing,1
10,IL Cazar Developments,IL Cazar (formerly Go Khozam) is an emerging real estate developer in Egypt. It offers modern, well-designed residential and commercial projects like Creek Town and Go Heliopolis, focusing on lifestyle and convenience.,NULL,https://drive.google.com/file/d/1vRLxQeNiQ5O4d7icG8X5TCJ5vCQqaja2/view?usp=sharing,1
11,Al Marasem Development,Al Marasem is part of the Bin Laden Group and is one of Egypt's top-tier real estate developers. It has a strong reputation for quality construction and successful projects like Fifth Square in New Cairo.,NULL,https://drive.google.com/file/d/1uhi2Bn27ABBnxBRQbd_Kj1JNNyj0rsQo/view?usp=sharing,1
12,Arabella Group,Arabella is a real estate development company in Egypt that focuses on high-end residential projects. It is best known for Arabella Park in New Cairo, offering villas and green spaces in a quiet, upscale setting.,NULL,https://drive.google.com/file/d/1R0qHw1NZe_vRXh_mQ_Eq9RaOcEtBVH92/view?usp=sharing,1
13,Hyde Park Developments,A leading Egyptian real estate company known for luxury residential projects like Hyde Park New Cairo, offering upscale villas, apartments, and green landscapes.,NULL,https://drive.google.com/file/d/13d-lOHw1sVgp1IhMkKfPwXCPKnlm3WsN/view?usp=sharing,1
14,Arabia Holding,A prominent developer with innovative residential and commercial projects such as Galleria Moon Valley and Sun Capital, blending lifestyle and investment value.,NULL,https://drive.google.com/file/d/1ksoHcNfUGHMuZpThBwJwSuRdEAdy3So4/view?usp=sharing,1
15,LMD (Living Modern Developments),An international real estate company delivering modern, design-driven developments in Egypt, Greece, and the UAE—famous for One Ninety in New Cairo.,NULL,https://drive.google.com/file/d/1nt53HeFgcVW87wSgHrUgJTUkm_MrWz1E/view?usp=sharing,1
16,Mavin Developments,A rising developer focusing on smart, sustainable communities like El Masyaf Ras El Hekma, combining nature with luxury coastal living.,NULL,https://drive.google.com/file/d/16xfp8FEbtkLw3RX-MvG6ooHRYhQObaV6/view?usp=sharing,1
17,PRE Developments (Pioneers Real Estate),Part of Pioneers Holding, PRE offers large-scale real estate projects like Stone Residence and Stone Towers, combining modern designs with prime locations.,NULL,https://drive.google.com/file/d/1u1ntWDPa2XbFTE-tv48Oxq8J5HAtgj3b/view?usp=sharing,1
18,Roya Developments,Known for high-end projects like Stone Park and Telal Sokhna, Roya focuses on delivering luxury residential and second-home developments.,NULL,https://drive.google.com/file/d/1vFbPItnXNXxuQ_75d79Azy4Bc-g78pWR/view?usp=sharing,1
19,Marakez,The real estate arm of Saudi Arabia's Fawaz Alhokair Group, Marakez is behind Mall of Arabia and District 5, blending retail with premium living.,NULL,https://drive.google.com/file/d/10hpT-9e2s0Qm6D9XYtvGyOHlzU7gNtjM/view?usp=sharing,1
20,Hassan Allam Properties,A reputable developer with a long history in Egypt, delivering premium gated communities like Swan Lake Residences and emphasizing quality construction.,NULL,https://drive.google.com/file/d/1JoDFeEolwJsShaeERTsGFERhVuYiL5aa/view?usp=sharing,1
21,Azha by Madaar,A luxury waterfront development in Ain Sokhna, Azha blends modern architecture with resort-style living and a tranquil atmosphere.,NULL,https://drive.google.com/file/d/1T_euEBUgHIfS3aWWC5wVR0XT1-Aan1Dv/view?usp=sharing,1
22,Al Amar Group,A boutique real estate developer delivering residential and mixed-use projects with a focus on innovative architecture and functional living spaces.,NULL,https://drive.google.com/file/d/1QQ2Z_WEQOeg2ipCcaMh1HZHBtFtTPSDv/view?usp=sharing,1
23,Tharaa Real Estate,An emerging player in Egypt's market, Tharaa focuses on residential and commercial development with an emphasis on quality and modern design.,NULL,https://drive.google.com/file/d/1JlPhywY_eUZPmrRaMFPqEQn6HsEWCSCm/view?usp=sharing,1`;

/**
 * Get the URL for a Google Sheet
 * @param {string} gid The sheet GID
 * @param {string} format The export format (default: csv)
 * @returns {string} The sheet URL
 */
function getSheetUrl(gid, format = 'csv') {
  if (format === 'tq') {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  } else {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  }
}

/**
 * API endpoint to fetch data from a specific sheet
 */
app.get('/api/sheets/:sheetType', async (req, res) => {
  try {
    const { sheetType } = req.params;
    const { format = 'csv' } = req.query;
    
    // Try to fetch real data for companies sheet, fall back to mock data if it fails
    if (sheetType === 'companies') {
      try {
        console.log('Attempting to fetch real data for companies sheet');
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GIDS.COMPANIES}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.text();
          console.log('Successfully fetched real company data');
          return res.send(data);
        } else {
          console.log(`Failed to fetch real data: ${response.status}. Using mock data.`);
          return res.send(MOCK_COMPANIES_DATA);
        }
      } catch (error) {
        console.error('Error fetching real company data:', error);
        console.log('Falling back to mock data for companies sheet');
        return res.send(MOCK_COMPANIES_DATA);
      }
    }
    
    // Map sheet type to GID
    let gid;
    switch (sheetType) {
      case 'projects':
        gid = SHEET_GIDS.PROJECTS;
        break;
      case 'users':
        gid = SHEET_GIDS.USERS;
        break;
      case 'places':
        gid = SHEET_GIDS.PLACES;
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid sheet type' });
    }
    
    const url = getSheetUrl(gid, format);
    console.log(`Fetching data from URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorMessage = response.status === 403
        ? 'Access denied. Please make sure the sheet is publicly accessible.'
        : `Server error. Please try again later. (Status: ${response.status})`;
      throw new Error(errorMessage);
    }
    
    const csvText = await response.text();
    console.log(`Response length: ${csvText.length} characters`);
    
    // Validate the response
    if (!csvText || csvText.trim() === "") {
      throw new Error('No data available. Please try again later.');
    }
    
    if (csvText.includes("<!DOCTYPE html")) {
      console.error('Response contains HTML instead of CSV');
      throw new Error('Access denied. Please make sure the sheet is publicly accessible.');
    }
    
    if (csvText.includes("400. That's an error")) {
      console.error('Response contains error message');
      throw new Error('Access denied. Please make sure the sheet is publicly accessible.');
    }
    
    res.send(csvText);
  } catch (error) {
    console.error('Error fetching sheet data:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to fetch an image from Google Drive
 */
app.get('/api/image', async (req, res) => {
  try {
    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ success: false, error: 'File ID is required' });
    }
    
    // Add cache buster to prevent caching issues
    const cacheBuster = Date.now() % 1000;
    const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h600&cb=${cacheBuster}`;
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    
    // Set the appropriate content type for the response
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    
    // Pipe the image data to the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching image:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint for the image proxy that hides Google Drive as the source
 * This endpoint serves images without revealing the original source
 */
app.get('/image-proxy/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ success: false, error: 'File ID is required' });
    }
    
    // Set cache control headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Use lh3.googleusercontent.com for direct image access (more reliable than thumbnail API)
    const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    
    // Set the appropriate content type for the response
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    
    // Pipe the image data to the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching image:', error.message);
    // Send a placeholder image instead of an error
    res.redirect('https://placehold.co/800x600?text=Image+Not+Found');
  }
});

/**
 * API endpoint to proxy any image URL
 */
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    
    // Set the appropriate content type for the response
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    
    // Pipe the image data to the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying image:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});