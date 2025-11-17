import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-format-change-confirm-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
  ],
  styleUrls: ['./format-change-confirm-modal.component.css'],
  template: `
    <p-dialog
      [visible]="visible"
      (visibleChange)="onClose()"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="fp-dialog rounded-xl"
      [style]="{ width: '550px' }"
      [contentStyle]="{ background: 'var(--color-bg)', padding: '1.5rem' }"
      [header]="'Confirm Format Change'"
      (keydown.escape)="onClose()"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <i
            class="pi pi-exclamation-triangle text-orange-500 text-2xl mt-1"
          ></i>
          <div class="flex-1 space-y-4">
            <div>
              <p class="text-text font-medium mb-3">
                You are changing the sequence format:
              </p>
              <div
                class="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3"
              >
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-gray-700 min-w-[50px]"
                    >From:</span
                  >
                  <span
                    class="font-mono text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded border border-red-200"
                    >{{ oldFormat }}</span
                  >
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-gray-700 min-w-[50px]"
                    >To:</span
                  >
                  <span
                    class="font-mono text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200"
                    >{{ newFormat }}</span
                  >
                </div>
              </div>
            </div>

            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div class="flex items-start gap-2">
                <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
                <div class="flex-1 space-y-2">
                  <p class="text-sm font-medium text-blue-900">
                    What happens next?
                  </p>
                  <ul
                    class="text-sm text-blue-800 space-y-1 list-disc list-inside"
                  >
                    <li>The current sequence number will remain unchanged</li>
                    <li>New sequences will use the new format</li>
                    <li>
                      You can optionally update existing machine sequences below
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div class="flex items-start gap-3">
                <p-checkbox
                  [(ngModel)]="updateExistingMachines"
                  [binary]="true"
                  inputId="updateMachines"
                  class="mt-0.5"
                ></p-checkbox>
                <label for="updateMachines" class="flex-1 cursor-pointer">
                  <p class="text-sm font-medium text-amber-900 mb-1">
                    Update existing machine sequences
                  </p>
                  <p class="text-xs text-amber-700">
                    If checked, all existing machine sequences for this category
                    will be regenerated using the new format. This action cannot
                    be undone.
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <button
            pButton
            type="button"
            label="Cancel"
            icon="pi pi-times"
            [outlined]="true"
            severity="secondary"
            (click)="onClose()"
            [disabled]="loading"
            class="p-button-sm"
          ></button>
          <button
            pButton
            type="button"
            [label]="updateExistingMachines ? 'Update & Continue' : 'Continue'"
            icon="pi pi-check"
            severity="success"
            (click)="onConfirm()"
            [loading]="loading"
            [disabled]="loading"
            class="p-button-sm"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
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
