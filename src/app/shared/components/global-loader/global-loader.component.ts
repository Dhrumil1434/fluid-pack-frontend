import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  template: `
    <div 
      *ngIf="loaderService.globalLoader().isLoading" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-bg rounded-2xl shadow-high p-8 max-w-sm w-full mx-4 text-center">
        <!-- Logo -->
        <div class="mb-6">
          <div class="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4 animate-pulse">
            <app-logo size="lg" variant="white"></app-logo>
          </div>
        </div>
        
        <!-- Spinner -->
        <div class="mb-4">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        <!-- Message -->
        <div class="text-text font-medium">
          {{ loaderService.globalLoader().message || 'Loading...' }}
        </div>
        
        <!-- Progress dots -->
        <div class="flex justify-center space-x-1 mt-4">
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
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
        opacity: .5;
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
export class GlobalLoaderComponent {
  loaderService = inject(LoaderService);
}
