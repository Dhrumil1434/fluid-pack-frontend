const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Get the dist path
const distPath = path.join(__dirname, 'dist/fluidpack-frontend/browser');
const indexPath = path.join(distPath, 'index.html');

// Verify that the dist directory exists
if (!fs.existsSync(distPath)) {
  console.error(`ERROR: Dist directory not found at: ${distPath}`);
  console.error('Please ensure the build completed successfully.');
  process.exit(1);
}

// Verify that index.html exists
if (!fs.existsSync(indexPath)) {
  console.error(`ERROR: index.html not found at: ${indexPath}`);
  console.error('Please ensure the build completed successfully.');
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
    // Don't serve index.html for static file requests
    index: false,
    // Set proper cache headers for static assets
    maxAge: '1y',
    etag: true,
    lastModified: true,
    // Add fallthrough to allow catch-all route to handle non-existent files
    fallthrough: true,
  }),
);

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

  // Send index.html for all other routes (SPA fallback)
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html:', err);
      console.error('Request path:', req.path);
      console.error('Index path:', indexPath);
      res.status(500).send('Error loading application');
    } else {
      console.log(`Served index.html for route: ${req.path}`);
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📁 Serving static files from: ${distPath}`);
  console.log(`📄 Index file path: ${indexPath}`);
  console.log(`🌐 Application should be accessible at: http://localhost:${port}`);
});
