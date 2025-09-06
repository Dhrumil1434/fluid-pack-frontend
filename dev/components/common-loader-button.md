# Common Loader Button Component

## Overview

The `CommonLoaderButtonComponent` is a reusable, feature-rich button component with integrated loading states that can be used across multiple pages in the Fluid Pack application. It provides consistent styling, loading animations, and state management.

## Features

- **Multiple Variants**: Primary, Secondary, Outline, Ghost, Danger, Success
- **Multiple Sizes**: XS, SM, MD, LG, XL
- **Loading States**: Integrated spinner with customizable loading text
- **Full Width Support**: Optional full-width button styling
- **Icon Support**: Left or right positioned icons
- **Reactive State**: Uses Angular signals for optimal performance
- **Loader Service Integration**: Works with the global loader service
- **Type Safety**: Full TypeScript support with proper interfaces

## Usage

### Basic Usage

```html
<app-common-loader-button
  variant="primary"
  size="md"
  (clicked)="handleClick()">
  Click Me
</app-common-loader-button>
```

### With Loading State

```html
<app-common-loader-button
  variant="primary"
  size="md"
  buttonId="save-button"
  loadingText="Saving..."
  (clicked)="saveData()">
  Save Changes
</app-common-loader-button>
```

### Full Width Button

```html
<app-common-loader-button
  variant="primary"
  size="lg"
  [fullWidth]="true"
  (clicked)="submitForm()">
  Submit Form
</app-common-loader-button>
```

## API Reference

### Inputs

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `variant` | `ButtonVariant` | `'primary'` | Button style variant |
| `size` | `ButtonSize` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `buttonId` | `string` | `undefined` | Unique ID for loader service integration |
| `loadingText` | `string` | `undefined` | Text to show during loading |
| `isLoading` | `boolean` | `false` | External loading state control |
| `fullWidth` | `boolean` | `false` | Whether button takes full width |
| `icon` | `string` | `undefined` | Icon to display (PrimeNG icon class) |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position of the icon |

### Outputs

| Event | Type | Description |
|-------|------|-------------|
| `clicked` | `EventEmitter<void>` | Emitted when button is clicked |

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `showLoading()` | `void` | Manually show loading state |
| `hideLoading()` | `void` | Manually hide loading state |

## Variants

### Primary
```html
<app-common-loader-button variant="primary">
  Primary Button
</app-common-loader-button>
```
- Green background with white text
- Hover effect with lighter green
- Primary shadow

### Secondary
```html
<app-common-loader-button variant="secondary">
  Secondary Button
</app-common-loader-button>
```
- Light background with dark text
- Border styling
- Subtle hover effect

### Outline
```html
<app-common-loader-button variant="outline">
  Outline Button
</app-common-loader-button>
```
- Transparent background with colored border
- Fills with color on hover
- Clean, minimal appearance

### Ghost
```html
<app-common-loader-button variant="ghost">
  Ghost Button
</app-common-loader-button>
```
- Transparent background
- Subtle hover effect
- Minimal styling

### Danger
```html
<app-common-loader-button variant="danger">
  Delete
</app-common-loader-button>
```
- Red background with white text
- Used for destructive actions
- Clear visual warning

### Success
```html
<app-common-loader-button variant="success">
  Confirm
</app-common-loader-button>
```
- Green background with white text
- Used for positive actions
- Confirmation styling

## Sizes

### Extra Small (XS)
```html
<app-common-loader-button size="xs">
  XS Button
</app-common-loader-button>
```
- `px-2 py-1 text-xs`
- Compact for tight spaces

### Small (SM)
```html
<app-common-loader-button size="sm">
  Small Button
</app-common-loader-button>
```
- `px-3 py-1.5 text-sm`
- Standard small size

### Medium (MD)
```html
<app-common-loader-button size="md">
  Medium Button
</app-common-loader-button>
```
- `px-4 py-2 text-sm`
- Default size

### Large (LG)
```html
<app-common-loader-button size="lg">
  Large Button
</app-common-loader-button>
```
- `px-6 py-3 text-base`
- Prominent actions

### Extra Large (XL)
```html
<app-common-loader-button size="xl">
  Extra Large Button
</app-common-loader-button>
```
- `px-8 py-4 text-lg`
- Hero buttons

## Loading States

### Automatic Loading (Recommended)
```html
<app-common-loader-button
  buttonId="save-button"
  loadingText="Saving..."
  (clicked)="saveData()">
  Save
</app-common-loader-button>
```

```typescript
// In component
saveData() {
  this.loaderService.showButtonLoader('save-button');
  // Perform operation
  setTimeout(() => {
    this.loaderService.hideButtonLoader('save-button');
  }, 2000);
}
```

### Manual Loading Control
```html
<app-common-loader-button
  #button
  [isLoading]="isSaving"
  loadingText="Saving..."
  (clicked)="saveData()">
  Save
</app-common-loader-button>
```

```typescript
// In component
isSaving = false;

saveData() {
  this.isSaving = true;
  // Perform operation
  setTimeout(() => {
    this.isSaving = false;
  }, 2000);
}
```

### Programmatic Control
```html
<app-common-loader-button
  #button
  (clicked)="handleClick()">
  Click Me
</app-common-loader-button>
```

```typescript
// In component
@ViewChild('button') button!: CommonLoaderButtonComponent;

handleClick() {
  this.button.showLoading();
  // Perform operation
  setTimeout(() => {
    this.button.hideLoading();
  }, 2000);
}
```

## Integration with Loader Service

The component automatically integrates with the global `LoaderService` when a `buttonId` is provided:

```typescript
// Service methods
this.loaderService.showButtonLoader('my-button');
this.loaderService.hideButtonLoader('my-button');
this.loaderService.isButtonLoading('my-button');
```

## Styling

The component uses Tailwind CSS classes and design system variables:

```css
/* Design system integration */
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.hover\:bg-primary-light:hover { background-color: var(--color-primary-light); }
```

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- Focus management during loading states
- Disabled state handling

## Examples

### Form Submission
```html
<form (ngSubmit)="onSubmit()">
  <!-- Form fields -->
  
  <div class="flex justify-end space-x-2">
    <app-common-loader-button
      type="button"
      variant="secondary"
      (clicked)="cancel()">
      Cancel
    </app-common-loader-button>
    
    <app-common-loader-button
      type="submit"
      variant="primary"
      buttonId="submit-form"
      loadingText="Submitting..."
      [disabled]="form.invalid">
      Submit
    </app-common-loader-button>
  </div>
</form>
```

### Action Buttons
```html
<div class="flex space-x-2">
  <app-common-loader-button
    variant="outline"
    size="sm"
    buttonId="edit-button"
    loadingText="Loading..."
    (clicked)="edit()">
    Edit
  </app-common-loader-button>
  
  <app-common-loader-button
    variant="danger"
    size="sm"
    buttonId="delete-button"
    loadingText="Deleting..."
    (clicked)="delete()">
    Delete
  </app-common-loader-button>
</div>
```

### Full Width Button
```html
<app-common-loader-button
  variant="primary"
  size="lg"
  [fullWidth]="true"
  buttonId="process-button"
  loadingText="Processing..."
  (clicked)="process()">
  Process All Items
</app-common-loader-button>
```

## Best Practices

1. **Use appropriate variants** for different actions
2. **Provide meaningful loading text** for better UX
3. **Use buttonId** for automatic loader service integration
4. **Handle loading states** properly in your components
5. **Test accessibility** with screen readers
6. **Use consistent sizing** across your application

## Migration from LoadingButtonComponent

The `CommonLoaderButtonComponent` is a replacement for the basic `LoadingButtonComponent` with enhanced features:

```html
<!-- Old -->
<app-loading-button
  variant="primary"
  size="md"
  buttonId="my-button"
  (clicked)="handleClick()">
  Click Me
</app-loading-button>

<!-- New -->
<app-common-loader-button
  variant="primary"
  size="md"
  buttonId="my-button"
  (clicked)="handleClick()">
  Click Me
</app-common-loader-button>
```

## Troubleshooting

### Loading State Not Working
- Ensure `buttonId` is provided for automatic loading
- Check if `LoaderService` is properly injected
- Verify loading state is being set correctly

### Styling Issues
- Check if design system CSS variables are loaded
- Verify Tailwind CSS is properly configured
- Ensure component is imported correctly

### Performance Issues
- Use signals for reactive updates
- Avoid unnecessary re-renders
- Implement proper change detection strategy

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Frontend Team
