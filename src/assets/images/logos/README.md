# Logo Files Required for Fluid Pack Application

This directory should contain the following logo files. Please add your logo images here with the exact filenames specified below.

## Required Logo Files

### 1. Main Logo (Login/Register Pages)

- **File**: `logo-main.png`
- **Size**: 200x200px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Login and Register pages - centered logo display
- **Alternative sizes**: You can also provide `logo-main.svg` for better scalability

### 2. Sidebar Logo Icon (All Sidebars)

- **File**: `logo-icon.png`
- **Size**: 64x64px (recommended) or 128x128px
- **Format**: PNG with transparent background
- **Usage**: Admin sidebar, Technician sidebar, QC sidebar - header icon
- **Alternative sizes**: You can also provide `logo-icon.svg` for better scalability

### 3. Favicon

- **File**: `logo-favicon.png` or `logo-favicon.ico`
- **Size**: 32x32px (16x16px also recommended)
- **Format**: PNG or ICO
- **Usage**: Browser tab icon
- **Note**: You may also need to update `index.html` to reference the favicon

### 4. App Icon (PWA/Mobile)

- **File**: `logo-app-icon.png`
- **Size**: 512x512px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Progressive Web App icon, mobile home screen icon
- **Note**: You may need multiple sizes for different platforms

### 5. Loading Spinner Logo (Optional)

- **File**: `logo-spinner.png`
- **Size**: 64x64px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Loading spinners, global loader, card loader
- **Note**: This can be the same as logo-icon.png if you prefer

## Logo Specifications

### Design Guidelines:

- **Background**: Transparent (for PNG files)
- **Color Scheme**: Should work on both light and dark backgrounds
- **Style**: Professional, clean, modern
- **Branding**: Should represent "Fluid Pack" brand identity

### File Naming Convention:

All logo files should follow this naming pattern:

- `logo-{purpose}.{extension}`
- Examples: `logo-main.png`, `logo-icon.png`, `logo-favicon.png`

## Implementation Notes

Once you add the logo files:

1. The components are already configured to use these logos
2. Logo paths are defined in `src/app/core/constants/logo.constants.ts`
3. Components will automatically fall back to icon placeholders if logos are not found
4. All logos are referenced using relative paths from the assets directory

## File Structure

```
assets/
  images/
    logos/
      logo-main.png        (200x200px)
      logo-icon.png        (64x64px)
      logo-favicon.png     (32x32px)
      logo-app-icon.png    (512x512px)
      logo-spinner.png     (64x64px) [optional]
```

## Quick Checklist

- [ ] `logo-main.png` - Main logo for login/register pages
- [ ] `logo-icon.png` - Icon for sidebars
- [ ] `logo-favicon.png` - Browser favicon
- [ ] `logo-app-icon.png` - PWA app icon
- [ ] `logo-spinner.png` - Loading spinner (optional)

## Testing

After adding logos:

1. Check login page displays logo correctly
2. Check register page displays logo correctly
3. Check all sidebars (Admin, Technician, QC) display logo icon
4. Check browser tab shows favicon
5. Check loading spinners use logo (if implemented)
