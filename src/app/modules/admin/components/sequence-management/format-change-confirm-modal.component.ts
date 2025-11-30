import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-format-change-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './format-change-confirm-modal.component.html',
  styleUrls: ['./format-change-confirm-modal.component.css'],
})
export class FormatChangeConfirmModalComponent {
  @Input() visible = false;
  @Input() oldFormat = '';
  @Input() newFormat = '';
  @Input() loading = false;

  updateExistingMachines = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit(this.updateExistingMachines);
  }

  onClose(): void {
    this.updateExistingMachines = false;
    this.cancel.emit();
    this.visibleChange.emit(false);
  }
}
