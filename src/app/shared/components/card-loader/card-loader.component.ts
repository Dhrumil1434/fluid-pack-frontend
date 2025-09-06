import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-card-loader',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div
      *ngIf="isLoading"
      class="absolute inset-0 bg-bg/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 overflow-hidden"
    >
      <div class="text-center p-4 max-w-full max-h-full">
        <!-- Logo Spinner -->
        <div class="mb-2">
          <div class="mx-auto h-8 w-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
            <app-logo size="sm" variant="white"></app-logo>
          </div>
        </div>

        <!-- Spinner -->
        <div class="mb-2">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>

        <!-- Message -->
        <div class="text-xs text-text-muted font-medium truncate">
          {{ message || 'Loading...' }}
        </div>

        <!-- Progress dots -->
        <div class="flex justify-center space-x-1 mt-1">
          <div class="w-1 h-1 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-1 h-1 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-1 h-1 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    .animate-bounce {
      animation: bounce 1s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .7;
      }
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(-25%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `],
})
export class CardLoaderComponent {
  @Input() cardId!: string;
  @Input() message?: string;

  loaderService = inject(LoaderService);

  get isLoading(): boolean {
    return this.loaderService.isCardLoading(this.cardId);
  }
}
