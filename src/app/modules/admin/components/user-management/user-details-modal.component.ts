import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-details-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  templateUrl: './user-details-modal.component.html',
  styleUrls: ['./user-details-modal.component.css'],
})
export class UserDetailsModalComponent {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Input() loading = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() edit = new EventEmitter<User>();
  @Output() approve = new EventEmitter<User>();
  @Output() reject = new EventEmitter<User>();
  @Output() remove = new EventEmitter<User>();

  onEdit(): void {
    if (this.user) {
      this.edit.emit(this.user);
    }
  }

  onApprove(): void {
    if (this.user) {
      this.approve.emit(this.user);
    }
  }

  onReject(): void {
    if (this.user) {
      this.reject.emit(this.user);
    }
  }

  onRemove(): void {
    if (this.user) {
      this.remove.emit(this.user);
    }
  }

  onClose(): void {
    this.visibleChange.emit(false);
  }

  getStatusSeverity(): 'success' | 'warning' {
    return this.user?.isApproved ? 'success' : 'warning';
  }

  getStatusLabel(): string {
    return this.user?.isApproved ? 'Approved' : 'Pending';
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
