# Logo Implementation Guide for Fluid Pack

This guide provides instructions for adding logos to the Fluid Pack application.

## 📁 Directory Structure

All logo files should be placed in:

```
front-end/src/assets/images/logos/
```

## 📋 Required Logo Files

### 1. **logo-main.png** (Main Logo)

- **Size**: 200x200px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Login page, Register page
- **Location in Code**:
  - `login.component.ts` → `LOGO_PATHS.MAIN`
  - `register.component.ts` → `LOGO_PATHS.MAIN`

### 2. **logo-icon.png** (Sidebar Icon)

- **Size**: 64x64px or 128x128px (recommended)
- **Format**: PNG with transparent background
- **Usage**: All sidebar headers (Admin, Technician, QC)
- **Location in Code**:
  - `admin-sidebar.component.ts` → `LOGO_PATHS.ICON`
  - `technician-sidebar.component.ts` → `LOGO_PATHS.ICON`
  - `qc-sidebar.component.ts` → `LOGO_PATHS.ICON`

### 3. **logo-favicon.png** (Favicon)

- **Size**: 32x32px (16x16px also recommended)
- **Format**: PNG or ICO
- **Usage**: Browser tab icon
- **Note**: You may need to update `index.html` to reference this favicon

### 4. **logo-app-icon.png** (App Icon)

- **Size**: 512x512px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Progressive Web App icon, mobile home screen
- **Note**: You may need multiple sizes for different platforms

### 5. **logo-spinner.png** (Optional - Loading Spinner)

- **Size**: 64x64px (recommended)
- **Format**: PNG with transparent background
- **Usage**: Loading spinners, global loader, card loader
- **Note**: Can be the same as `logo-icon.png` if preferred

## ✅ Implementation Checklist

- [ ] Add `logo-main.png` to `assets/images/logos/`
- [ ] Add `logo-icon.png` to `assets/images/logos/`
- [ ] Add `logo-favicon.png` to `assets/images/logos/`
- [ ] Add `logo-app-icon.png` to `assets/images/logos/`
- [ ] (Optional) Add `logo-spinner.png` to `assets/images/logos/`

## 🔧 Code Implementation Status

### ✅ Already Implemented

1. **Login Page** (`login.component.ts` & `.html`)
   - Logo path: `LOGO_PATHS.MAIN`
   - Fallback: Icon placeholder (`pi-building`)
   - Styling: 6rem x 6rem circular container

2. **Register Page** (`register.component.ts` & `.html`)
   - Logo path: `LOGO_PATHS.MAIN`
   - Fallback: Icon placeholder (`pi-building`)
   - Styling: 6rem x 6rem circular container

3. **Admin Sidebar** (`admin-sidebar.component.ts` & `.html`)
   - Logo path: `LOGO_PATHS.ICON`
   - Fallback: Icon placeholder (`pi-shield`)
   - Styling: 2.5rem x 2.5rem in gradient container

4. **Technician Sidebar** (`technician-sidebar.component.ts`)
   - Logo path: `LOGO_PATHS.ICON`
   - Fallback: Icon placeholder (`pi-wrench`)
   - Styling: 2.5rem x 2.5rem in gradient container

5. **QC Sidebar** (`qc-sidebar.component.ts` & `.html`)
   - Logo path: `LOGO_PATHS.ICON`
   - Fallback: Icon placeholder (`pi-check-circle`)
   - Styling: 2.5rem x 2.5rem in gradient container

### 📝 Constants File

All logo paths are centralized in:

- `src/app/core/constants/logo.constants.ts`

This file defines:

- `LOGO_PATHS.MAIN` - Main logo path
- `LOGO_PATHS.ICON` - Icon logo path
- `LOGO_PATHS.FAVICON` - Favicon path
- `LOGO_PATHS.APP_ICON` - App icon path
- `LOGO_PATHS.SPINNER` - Spinner logo path

## 🎨 Design Guidelines

### Logo Specifications:

- **Background**: Transparent (for PNG files)
- **Color Scheme**: Should work on both light and dark backgrounds
- **Style**: Professional, clean, modern
- **Branding**: Should represent "Fluid Pack" brand identity

### Best Practices:

1. Use SVG format when possible for better scalability
2. Ensure logos are optimized for web (compressed file size)
3. Test logos on both light and dark backgrounds
4. Verify logos display correctly at different sizes
5. Ensure proper alt text for accessibility

## 🧪 Testing

After adding logo files, test:

1. **Login Page**:
   - [ ] Logo displays correctly
   - [ ] Fallback icon shows if logo not found
   - [ ] Logo is properly sized and centered

2. **Register Page**:
   - [ ] Logo displays correctly
   - [ ] Fallback icon shows if logo not found
   - [ ] Logo is properly sized and centered

3. **Admin Sidebar**:
   - [ ] Logo icon displays in sidebar header
   - [ ] Fallback icon shows if logo not found
   - [ ] Logo works in both collapsed and expanded states

4. **Technician Sidebar**:
   - [ ] Logo icon displays in sidebar header
   - [ ] Fallback icon shows if logo not found
   - [ ] Logo works in both collapsed and expanded states

5. **QC Sidebar**:
   - [ ] Logo icon displays in sidebar header
   - [ ] Fallback icon shows if logo not found
   - [ ] Logo works in both collapsed and expanded states

## 📝 Notes

- All components have error handling: if logo fails to load, they fall back to icon placeholders
- Logo paths are relative to the assets directory
- Logo constants can be easily updated if file names change
- The system automatically handles missing logos gracefully

## 🔄 Future Enhancements

Potential improvements:

- Support for SVG logos (better scalability)
- Dark mode logo variants
- Animated logo for loading states
- Logo caching for better performance
