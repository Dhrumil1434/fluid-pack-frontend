import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tag-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded-full border text-xs px-2 py-1 whitespace-nowrap"
      [ngClass]="chipClass"
      [title]="label"
    >
      <ng-container *ngIf="icon">
        <i class="pi mr-1" [ngClass]="icon"></i>
      </ng-container>
      <span class="truncate max-w-[140px]">{{ label }}</span>
    </span>
  `,
})
export class TagChipComponent {
  @Input() label = '';
  @Input() tone: 'neutral' | 'success' | 'warning' | 'error' | 'info' =
    'neutral';
  @Input() icon: string | null = null;

  get chipClass(): string {
    switch (this.tone) {
      case 'success':
        return 'bg-success/10 border-success/30 text-text';
      case 'warning':
        return 'bg-warning/10 border-warning/30 text-text';
      case 'error':
        return 'bg-error/10 border-error/30 text-text';
      case 'info':
        return 'bg-info/10 border-info/30 text-text';
      default:
        return 'bg-bg-soft border-neutral-300 text-text-muted';
    }
  }
}
