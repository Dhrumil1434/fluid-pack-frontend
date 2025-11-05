# Logo Troubleshooting Guide

## Issue: Logos not displaying

If you've added the logo files but they're not showing, follow these steps:

### Step 1: Verify Files Exist

- ✅ Check that `logo-main.png` exists in `src/assets/images/logos/`
- ✅ Check that `logo-icon.png` exists in `src/assets/images/logos/`

### Step 2: Restart Angular Dev Server

**IMPORTANT**: After adding logo files or updating `angular.json`, you MUST restart the dev server:

1. Stop the current dev server (Ctrl+C)
2. Start it again: `npm start` or `ng serve`

Angular needs to rebuild to include the new assets.

### Step 3: Clear Browser Cache

Sometimes browsers cache 404 errors. Try:

- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### Step 4: Check Browser Console

Open browser DevTools (F12) and check:

- Console tab for any 404 errors
- Network tab to see if logo files are being requested
- Look for errors like: `GET http://localhost:4200/assets/images/logos/logo-main.png 404`

### Step 5: Verify File Paths

The logo files should be at:

```
front-end/
  src/
    assets/
      images/
        logos/
          logo-main.png
          logo-icon.png
```

### Step 6: Check Angular Configuration

Ensure `angular.json` includes the assets folder (already updated):

```json
"assets": [
  {
    "glob": "**/*",
    "input": "public"
  },
  {
    "glob": "**/*",
    "input": "src/assets",
    "output": "assets"
  }
]
```

### Step 7: Verify Logo Paths in Code

Check `src/app/core/constants/logo.constants.ts`:

- Should be: `'assets/images/logos/logo-main.png'`
- Should be: `'assets/images/logos/logo-icon.png'`

### Common Issues:

1. **404 Error**: Logo file not found
   - Solution: Restart dev server after adding files

2. **Icon placeholder showing**: Logo file exists but not loading
   - Solution: Check file path, restart dev server, clear cache

3. **Broken image icon**: Logo path incorrect
   - Solution: Verify path in `logo.constants.ts` matches file location

### Quick Test:

1. Open browser console (F12)
2. Navigate to login page
3. Check Network tab for logo requests
4. Look for any errors or 404s

### Still Not Working?

1. Verify file names are EXACTLY: `logo-main.png` and `logo-icon.png` (case-sensitive)
2. Check file extensions are `.png` (not `.PNG` or `.jpg`)
3. Ensure files are actual image files (not corrupted)
4. Try opening the logo files directly in browser: `http://localhost:4200/assets/images/logos/logo-main.png`
