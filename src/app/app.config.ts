import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { requestInterceptor } from './core/interceptors/request.interceptor';
import { responseInterceptor } from './core/interceptors/response.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        // Order matters - Request interceptor runs first
        requestInterceptor,
        responseInterceptor,
        authInterceptor,
        loaderInterceptor,
      ])
    ),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: 'Aura',
        options: {
          prefix: 'p',
          darkModeSelector: '.dark-mode',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      }
    }),
    MessageService,
  ],
};
