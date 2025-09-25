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
      <div
        class="bg-bg rounded-2xl shadow-high p-8 max-w-sm w-full mx-4 text-center"
      >
        <!-- Animated Logo -->
        <div class="mb-6">
          <div
            class="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-4 logo-shell"
          >
            <img src="assets/logo/avtaar.png" alt="Logo" class="logo-img" />
            <div class="ring"></div>
          </div>
        </div>

        <!-- Subtle caption -->
        <div class="mb-2 text-text-muted text-sm">Please wait</div>

        <!-- Message -->
        <div class="text-text font-medium">
          {{ loaderService.globalLoader().message || 'Loading...' }}
        </div>

        <!-- Progress dots -->
        <div class="flex justify-center space-x-1 mt-4">
          <div
            class="w-2 h-2 bg-primary rounded-full animate-bounce"
            style="animation-delay: 0ms"
          ></div>
          <div
            class="w-2 h-2 bg-primary rounded-full animate-bounce"
            style="animation-delay: 150ms"
          ></div>
          <div
            class="w-2 h-2 bg-primary rounded-full animate-bounce"
            style="animation-delay: 300ms"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .logo-shell {
        position: relative;
        background: radial-gradient(
          ellipse at 50% 50%,
          rgba(0, 107, 60, 0.1),
          rgba(0, 0, 0, 0)
        );
        box-shadow:
          0 10px 30px rgba(0, 107, 60, 0.25),
          inset 0 0 20px rgba(255, 255, 255, 0.06);
        animation: pulse 2.2s ease-in-out infinite;
        overflow: hidden;
      }

      .logo-img {
        width: 3.5rem;
        height: 3.5rem;
        object-fit: contain;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
        z-index: 1;
      }

      .ring {
        position: absolute;
        inset: -6px;
        border-radius: 1rem;
        border: 2px solid transparent;
        background: conic-gradient(
            from 0deg,
            var(--color-primary),
            transparent 60%
          )
          border-box;
        -webkit-mask:
          linear-gradient(#000, #000) padding-box,
          linear-gradient(#000, #000);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: rotate 1.4s linear infinite;
        opacity: 0.9;
      }

      @keyframes rotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .animate-bounce {
        animation: bounce 1s infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
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
        0%,
        100% {
          transform: translateY(-25%);
          animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
        }
        50% {
          transform: translateY(0);
          animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
      }
    `,
  ],
})
export class GlobalLoaderComponent {
  loaderService = inject(LoaderService);
}
