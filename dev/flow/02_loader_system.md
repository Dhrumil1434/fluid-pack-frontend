# Loader System Documentation

## Overview

The Fluid Pack frontend implements a comprehensive loading system with multiple levels of loaders to provide optimal user experience across different scenarios. The system includes global loaders, card-level loaders, button loaders, and automatic HTTP request loaders.

## Architecture

### Core Components

1. **LoaderService** - Centralized loader state management
2. **GlobalLoaderComponent** - Full-screen loader with company logo
3. **CardLoaderComponent** - Card-specific overlay loader
4. **LoadingButtonComponent** - Button with integrated loading state
5. **LoaderInterceptor** - Automatic HTTP request loader

## Loader Types & Use Cases

### 1. Global Loader

**When to Use:**
- Major operations affecting the entire application
- Multiple simultaneous operations
- Critical system operations
- Page navigation/transitions

**Features:**
- Full-screen overlay with backdrop blur
- Company logo with pulsing animation
- Spinning loader with progress dots
- Customizable message
- High z-index (9999) to appear above all content

```typescript
// Show global loader
this.loaderService.showGlobalLoader('Processing your request...');

// Hide global loader
this.loaderService.hideGlobalLoader();
```

**Visual Design:**
- Dark backdrop with blur effect
- Centered white card with rounded corners
- Company logo in primary color circle
- Animated spinner and progress dots
- Design system colors and typography

### 2. Card Loader

**When to Use:**
- Individual card/section operations
- Table data loading
- Form section updates
- Component-specific operations

**Features:**
- Overlay on specific card/section
- Smaller logo and spinner
- Positioned absolutely within card
- Semi-transparent background
- Customizable message per card

```typescript
// Show card loader
this.loaderService.showCardLoader('user-table', 'Loading user data...');

// Hide card loader
this.loaderService.hideCardLoader('user-table');
```

**Visual Design:**
- Semi-transparent overlay on card
- Smaller company logo with pulse animation
- Compact spinner and progress dots
- Maintains card layout and structure

### 3. Button Loader

**When to Use:**
- Single action operations
- Form submissions
- Quick operations
- User-initiated actions

**Features:**
- Integrated spinner in button
- Disabled state during loading
- Custom loading text
- Multiple button variants
- Automatic state management

```typescript
// Show button loader
this.loaderService.showButtonLoader('submit-button');

// Hide button loader
this.loaderService.hideButtonLoader('submit-button');
```

**Visual Design:**
- Spinner replaces button content
- Maintains button styling and variants
- Smooth transitions
- Disabled state with opacity

### 4. HTTP Request Loader

**When to Use:**
- Automatic for all HTTP requests
- API calls and data fetching
- Background operations

**Features:**
- Automatic global loader for HTTP requests
- Configurable skip patterns
- Automatic hide on completion
- Error handling integration

```typescript
// Automatically handled by interceptor
// No manual code required for basic HTTP requests
```

## Implementation Details

### LoaderService

```typescript
@Injectable({ providedIn: 'root' })
export class LoaderService {
  // Global loader methods
  showGlobalLoader(message?: string): void
  hideGlobalLoader(): void
  
  // Card loader methods
  showCardLoader(cardId: string, message?: string): void
  hideCardLoader(cardId: string): void
  
  // Button loader methods
  showButtonLoader(buttonId: string): void
  hideButtonLoader(buttonId: string): void
  
  // Utility methods
  isGlobalLoading(): boolean
  isCardLoading(cardId: string): boolean
  isButtonLoading(buttonId: string): boolean
  getActiveLoadersCount(): number
  clearAllLoaders(): void
}
```

### State Management

The service uses both BehaviorSubjects and Angular signals for reactive state management:

- **BehaviorSubjects**: For Observable subscriptions
- **Signals**: For reactive template updates
- **Map-based storage**: For multiple card/button loaders

### Component Integration

#### Global Loader Component

```typescript
@Component({
  selector: 'app-global-loader',
  template: `
    <div *ngIf="loaderService.globalLoader().isLoading" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-bg rounded-2xl shadow-high p-8 max-w-sm w-full mx-4 text-center">
        <!-- Logo with pulse animation -->
        <div class="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4 animate-pulse">
          <app-logo size="lg" variant="white"></app-logo>
        </div>
        
        <!-- Spinner -->
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        
        <!-- Message -->
        <div class="text-text font-medium">{{ message }}</div>
        
        <!-- Progress dots -->
        <div class="flex justify-center space-x-1 mt-4">
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `
})
export class GlobalLoaderComponent {
  loaderService = inject(LoaderService);
}
```

#### Card Loader Component

```typescript
@Component({
  selector: 'app-card-loader',
  template: `
    <div *ngIf="isLoading" 
         class="absolute inset-0 bg-bg/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
      <!-- Card-specific loader content -->
    </div>
  `
})
export class CardLoaderComponent {
  @Input() cardId!: string;
  @Input() message?: string;
  
  get isLoading(): boolean {
    return this.loaderService.isCardLoading(this.cardId);
  }
}
```

#### Loading Button Component

```typescript
@Component({
  selector: 'app-loading-button',
  template: `
    <button [disabled]="disabled || isLoading" [class]="getButtonClasses()">
      <!-- Loading spinner -->
      <span *ngIf="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
        <svg class="animate-spin h-5 w-5 text-white">...</svg>
      </span>
      
      <!-- Button content -->
      <span [class]="isLoading ? 'opacity-0' : 'opacity-100'">
        <ng-content></ng-content>
      </span>
      
      <!-- Loading text -->
      <span *ngIf="isLoading && loadingText">{{ loadingText }}</span>
    </button>
  `
})
export class LoadingButtonComponent {
  @Input() buttonId?: string;
  @Input() loadingText?: string;
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
```

## Usage Examples

### Basic Usage

```typescript
export class MyComponent {
  constructor(private loaderService: LoaderService) {}
  
  // Global loader
  performGlobalOperation() {
    this.loaderService.showGlobalLoader('Processing...');
    // Perform operation
    setTimeout(() => {
      this.loaderService.hideGlobalLoader();
    }, 2000);
  }
  
  // Card loader
  loadCardData() {
    this.loaderService.showCardLoader('data-card', 'Loading data...');
    // Load data
    setTimeout(() => {
      this.loaderService.hideCardLoader('data-card');
    }, 1500);
  }
  
  // Button loader
  submitForm() {
    this.loaderService.showButtonLoader('submit-btn');
    // Submit form
    setTimeout(() => {
      this.loaderService.hideButtonLoader('submit-btn');
    }, 1000);
  }
}
```

### Template Usage

```html
<!-- Global loader (in app component) -->
<app-global-loader></app-global-loader>

<!-- Card with loader -->
<div class="card relative">
  <div class="card-content">
    <!-- Card content -->
  </div>
  <app-card-loader cardId="my-card"></app-card-loader>
</div>

<!-- Loading button -->
<app-loading-button
  buttonId="submit-btn"
  loadingText="Saving..."
  variant="primary"
  size="lg"
  (clicked)="submitForm()">
  Save Changes
</app-loading-button>
```

### HTTP Request Integration

```typescript
// Automatically handled by interceptor
// No manual code required

// For custom control, you can still use manual loaders
async fetchData() {
  this.loaderService.showCardLoader('data-table', 'Fetching data...');
  try {
    const data = await this.apiService.getData();
    // Handle data
  } finally {
    this.loaderService.hideCardLoader('data-table');
  }
}
```

## Design System Integration

### Colors

```css
/* Loader colors using design system variables */
.loader-primary { color: var(--color-primary); }
.loader-bg { background: var(--color-bg); }
.loader-text { color: var(--color-text); }
.loader-text-muted { color: var(--color-text-muted); }
```

### Animations

```css
/* Consistent animations across all loaders */
.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}
```

### Spacing & Typography

```css
/* Consistent spacing and typography */
.loader-container {
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: var(--shadow-high);
}

.loader-message {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-text);
}
```

## Best Practices

### 1. Loader Hierarchy

- **Global Loader**: Use for major operations
- **Card Loader**: Use for section-specific operations
- **Button Loader**: Use for individual actions
- **HTTP Loader**: Automatic for API calls

### 2. Performance Considerations

- Use appropriate loader type for operation scope
- Avoid multiple global loaders simultaneously
- Clear loaders on component destruction
- Use debouncing for rapid operations

### 3. User Experience

- Provide meaningful loading messages
- Use appropriate durations for different operations
- Show progress when possible
- Handle errors gracefully

### 4. Accessibility

- Ensure proper contrast ratios
- Provide screen reader announcements
- Use appropriate ARIA labels
- Maintain keyboard navigation

## Configuration

### Skip Patterns for HTTP Loader

```typescript
// Configure which endpoints skip automatic loading
const skipPatterns = [
  '/api/health',
  '/api/ping',
  '/api/analytics',
];
```

### Custom Loader Messages

```typescript
// Global loader with custom message
this.loaderService.showGlobalLoader('Saving your changes...');

// Card loader with specific message
this.loaderService.showCardLoader('user-table', 'Loading user data...');
```

### Loader Timeouts

```typescript
// Set maximum loader duration
setTimeout(() => {
  this.loaderService.hideGlobalLoader();
  this.errorHandler.showWarning('Operation timed out');
}, 30000); // 30 seconds max
```

## Troubleshooting

### Common Issues

1. **Loader not hiding**: Check if hide method is called
2. **Multiple loaders**: Use appropriate loader type
3. **Performance issues**: Avoid too many simultaneous loaders
4. **Styling issues**: Check CSS variable definitions

### Debug Tips

```typescript
// Check active loaders
console.log('Active loaders:', this.loaderService.getActiveLoadersCount());
console.log('Global loading:', this.loaderService.isGlobalLoading());
console.log('Card loading:', this.loaderService.isCardLoading('my-card'));
```

## Future Enhancements

1. **Progress Indicators**: Add progress bars for long operations
2. **Cancellation**: Allow users to cancel operations
3. **Queue Management**: Handle multiple operations in queue
4. **Analytics**: Track loader usage and performance
5. **Custom Animations**: Allow custom loader animations

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Frontend Team
