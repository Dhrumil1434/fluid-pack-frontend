import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center" [class]="containerClass">
      <!-- Logo placeholder - replace with actual logo -->
      <div *ngIf="!logoSrc" class="flex items-center justify-center" [class]="logoClass">
        <svg class="text-white" [class]="iconClass" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <!-- Actual logo image -->
      <img *ngIf="logoSrc" [src]="logoSrc" [alt]="alt" [class]="logoClass" />
    </div>
  `,
  styles: []
})
export class LogoComponent {
  @Input() logoSrc: string = '';
  @Input() alt: string = 'Fluid Pack Logo';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() variant: 'default' | 'white' | 'primary' = 'default';

  get containerClass(): string {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
      xl: 'h-20 w-20'
    };
    return sizeClasses[this.size];
  }

  get logoClass(): string {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16'
    };
    
    const variantClasses = {
      default: 'text-primary',
      white: 'text-white',
      primary: 'text-primary'
    };

    return `${sizeClasses[this.size]} ${variantClasses[this.variant]}`;
  }

  get iconClass(): string {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };
    return sizeClasses[this.size];
  }
}
