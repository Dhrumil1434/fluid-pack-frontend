const express = require('express');
const path = require('path');
const app = express();

// Get the dist path
const distPath = path.join(__dirname, 'dist/fluidpack-frontend/browser');
const indexPath = path.join(distPath, 'index.html');

// Serve static files from the Angular app (CSS, JS, images, etc.)
app.use(
  express.static(distPath, {
    // Don't serve index.html for static file requests
    index: false,
    // Set proper cache headers for static assets
    maxAge: '1y',
    etag: true,
    lastModified: true,
  })
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

  // Send index.html for all other routes (SPA fallback)
  res.sendFile(indexPath, err => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving static files from: ${distPath}`);
  console.log(`Index file path: ${indexPath}`);
});
