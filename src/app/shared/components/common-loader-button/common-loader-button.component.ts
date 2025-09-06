import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-common-loader-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || isLoadingState()"
      [class]="getButtonClasses()"
      (click)="onClick()"
    >
      <!-- Loading Spinner -->
      <span *ngIf="isLoadingState()" class="absolute left-0 inset-y-0 flex items-center pl-3">
        <svg class="animate-spin h-4 w-4" [class]="getSpinnerColor()" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>

      <!-- Button Content -->
      <span [class]="isLoadingState() ? 'opacity-0' : 'opacity-100'">
        <ng-content></ng-content>
      </span>

      <!-- Loading Text -->
      <span *ngIf="isLoadingState() && loadingText" class="ml-2">
        {{ loadingText }}
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `],
})
export class CommonLoaderButtonComponent implements OnInit {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled: boolean = false;
  @Input() buttonId?: string;
  @Input() loadingText?: string;
  @Input() isLoading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';

  @Output() clicked = new EventEmitter<void>();

  loaderService = inject(LoaderService);

  // Use signal for reactive loading state
  isLoadingState = signal(false);

  ngOnInit() {
    // Set initial loading state from input
    this.isLoadingState.set(this.isLoading);

    // Watch for external loading state changes
    if (this.buttonId) {
      this.loaderService.getButtonLoaders$().subscribe(buttonLoaders => {
        this.isLoadingState.set(buttonLoaders.get(this.buttonId!) || false);
      });
    }
  }

  getButtonClasses(): string {
    const baseClasses = 'relative inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-light focus:ring-primary/50 shadow-medium',
      secondary: 'bg-bg-soft text-text border border-neutral-300 hover:bg-neutral-300 focus:ring-primary/50',
      outline: 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-white focus:ring-primary/50',
      ghost: 'bg-transparent text-text hover:bg-bg-soft focus:ring-primary/50',
      danger: 'bg-error text-white hover:bg-red-600 focus:ring-error/50 shadow-medium',
      success: 'bg-success text-white hover:bg-green-600 focus:ring-success/50 shadow-medium',
    };

    const widthClass = this.fullWidth ? 'w-full' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${widthClass}`;
  }

  getSpinnerColor(): string {
    const spinnerColors = {
      primary: 'text-white',
      secondary: 'text-text',
      outline: 'text-primary',
      ghost: 'text-text',
      danger: 'text-white',
      success: 'text-white',
    };
    return spinnerColors[this.variant];
  }

  onClick(): void {
    if (!this.isLoadingState() && !this.disabled) {
      this.clicked.emit();
    }
  }

  // Public methods for external control
  showLoading(): void {
    this.isLoadingState.set(true);
    if (this.buttonId) {
      this.loaderService.showButtonLoader(this.buttonId);
    }
  }

  hideLoading(): void {
    this.isLoadingState.set(false);
    if (this.buttonId) {
      this.loaderService.hideButtonLoader(this.buttonId);
    }
  }
}
