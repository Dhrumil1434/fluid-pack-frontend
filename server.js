const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Get the dist path - try multiple possible locations
// When Render uses a publish directory, process.cwd() will be that directory
// So we check process.cwd() first, then fall back to standard locations
const possiblePaths = [
  // If Render uses publish directory (dist/fluidpack-frontend/browser),
  // files will be directly in process.cwd()
  process.cwd(),
  // Standard build output locations (if no publish directory)
  path.join(__dirname, 'dist/fluidpack-frontend/browser'),
  path.join(__dirname, 'dist/fluidpack-frontend'),
  path.join(process.cwd(), 'dist/fluidpack-frontend/browser'),
  path.join(process.cwd(), 'dist/fluidpack-frontend'),
  // Fallback locations
  path.join(__dirname, 'browser'),
  path.join(__dirname),
];

let distPath = null;
let indexPath = null;

// Find the correct dist path
for (const possiblePath of possiblePaths) {
  const possibleIndexPath = path.join(possiblePath, 'index.html');
  if (fs.existsSync(possiblePath) && fs.existsSync(possibleIndexPath)) {
    distPath = possiblePath;
    indexPath = possibleIndexPath;
    break;
  }
}

// If not found, try to list what's available for debugging
if (!distPath) {
  console.error('ERROR: Could not find dist directory or index.html');
  console.error('Current working directory:', process.cwd());
  console.error('__dirname:', __dirname);

  // List current working directory contents
  console.error('\nContents of current working directory:');
  try {
    const cwdContents = fs.readdirSync(process.cwd(), { withFileTypes: true });
    cwdContents.forEach(item => {
      if (item.isDirectory()) {
        console.error(`  📁 ${item.name}/`);
      } else {
        console.error(`  📄 ${item.name}`);
      }
    });
  } catch (e) {
    console.error('  (cannot read current working directory)');
  }

  // Try to list dist directory if it exists
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    console.error('\nContents of dist directory:');
    try {
      const contents = fs.readdirSync(distDir, { withFileTypes: true });
      contents.forEach(item => {
        const itemPath = path.join(distDir, item.name);
        if (item.isDirectory()) {
          console.error(`  📁 ${item.name}/`);
          try {
            const subContents = fs.readdirSync(itemPath);
            subContents.forEach(subItem => {
              console.error(`    - ${subItem}`);
            });
          } catch (e) {
            console.error(`    (cannot read)`);
          }
        } else {
          console.error(`  📄 ${item.name}`);
        }
      });
    } catch (e) {
      console.error('  (cannot read dist directory)');
    }
  }

  process.exit(1);
}

console.log('✓ Dist directory found:', distPath);
console.log('✓ index.html found:', indexPath);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the Angular app (CSS, JS, images, etc.)
app.use(
  express.static(distPath, {
    // Don't serve index.html automatically for directory requests
    index: false,
    // Set proper cache headers for static assets
    maxAge: '1y',
    etag: true,
    lastModified: true,
    // Add fallthrough to allow catch-all route to handle non-existent files
    fallthrough: true,
  })
);

// Explicitly handle root route
app.get('/', (req, res) => {
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html for root:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Explicitly handle /index.html route
app.get('/index.html', (req, res) => {
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html:', err);
      console.error('Request path:', req.path);
      console.error('Index path:', indexPath);
      res.status(500).send('Error loading application');
    }
  });
});

// API routes or other backend routes should be handled before the catch-all
// Add any API proxy routes here if needed

// Handle Angular routing - return index.html for all non-API routes
// This must be the last route to catch all unmatched routes
app.get('*', (req, res, next) => {
  // Skip if it's an API route (if you have any)
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Skip health check
  if (req.path === '/health') {
    return next();
  }

  // Skip if it's a static file request (has extension)
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return next();
  }

  // Send index.html for all other routes (SPA fallback)
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html:', err);
      console.error('Request path:', req.path);
      console.error('Index path:', indexPath);
      res.status(500).send('Error loading application');
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📁 Serving static files from: ${distPath}`);
  console.log(`📄 Index file path: ${indexPath}`);
  console.log(
    `🌐 Application should be accessible at: http://localhost:${port}`
  );
});
