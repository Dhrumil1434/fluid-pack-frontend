import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || isLoadingState"
      [class]="getButtonClasses()"
      (click)="onClick()"
    >
      <!-- Loading Spinner -->
      <span *ngIf="isLoadingState" class="absolute left-0 inset-y-0 flex items-center pl-3">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>

      <!-- Button Content -->
      <span [class]="isLoadingState ? 'opacity-0' : 'opacity-100'">
        <ng-content></ng-content>
      </span>

      <!-- Loading Text -->
      <span *ngIf="isLoadingState && loadingText" class="ml-2">
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
export class LoadingButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled: boolean = false;
  @Input() buttonId?: string;
  @Input() loadingText?: string;
  @Input() isLoading: boolean = false;

  @Output() clicked = new EventEmitter<void>();

  loaderService = inject(LoaderService);

  get isLoadingState(): boolean {
    if (this.isLoading) return true;
    if (this.buttonId) {
      return this.loaderService.isButtonLoading(this.buttonId);
    }
    return false;
  }

  getButtonClasses(): string {
    const baseClasses = 'relative inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-light focus:ring-primary/50 shadow-medium',
      secondary: 'bg-bg-soft text-text border border-neutral-300 hover:bg-neutral-300 focus:ring-primary/50',
      outline: 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-white focus:ring-primary/50',
      ghost: 'bg-transparent text-text hover:bg-bg-soft focus:ring-primary/50',
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]}`;
  }

  onClick(): void {
    if (!this.isLoadingState && !this.disabled) {
      this.clicked.emit();
    }
  }
}
