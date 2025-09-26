import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-approval-view-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      *ngIf="visible"
    >
      <div
        class="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-neutral-300 overflow-hidden"
      >
        <div
          class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
        >
          <div>
            <h3 class="font-medium">Approval Details</h3>
            <div class="text-xs text-text-muted">{{ approval?._id }}</div>
          </div>
          <button
            class="p-2 hover:bg-neutral-100 rounded"
            (click)="close.emit()"
            aria-label="Close"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- Left: Images -->
          <div class="lg:col-span-5">
            <div
              class="relative border rounded-lg overflow-hidden bg-neutral-50 flex items-center justify-center"
              style="min-height: 260px;"
            >
              <button
                *ngIf="(images?.length || 0) > 1"
                class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2"
                (click)="prevImage()"
                aria-label="Previous image"
              >
                <i class="pi pi-chevron-left"></i>
              </button>
              <img
                *ngIf="(images?.length || 0) > 0; else noimg"
                [src]="imageUrl(images[activeImage])"
                class="max-h-72 w-auto object-contain"
              />
              <ng-template #noimg>
                <div class="text-text-muted text-sm">No images available</div>
              </ng-template>
              <button
                *ngIf="(images?.length || 0) > 1"
                class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2"
                (click)="nextImage()"
                aria-label="Next image"
              >
                <i class="pi pi-chevron-right"></i>
              </button>
            </div>
            <div
              *ngIf="(images?.length || 0) > 0"
              class="mt-2 flex gap-2 overflow-x-auto"
            >
              <img
                *ngFor="let img of images; let i = index"
                [src]="imageUrl(img)"
                class="w-16 h-16 object-cover rounded border cursor-pointer"
                [class.border-primary]="i === activeImage"
                (click)="activeImage = i"
                [alt]="'Image ' + (i + 1)"
              />
            </div>
          </div>

          <!-- Right: Details -->
          <div class="lg:col-span-7 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-text-muted">Machine</div>
                <div class="text-sm font-medium">
                  {{ machine?.name || '-' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-text-muted">Approval Type</div>
                <div class="text-sm">{{ approval?.approvalType }}</div>
              </div>
              <div>
                <div class="text-xs text-text-muted">Requested By</div>
                <div class="text-sm">
                  {{
                    approval?.requestedBy?.username ||
                      approval?.requestedBy?.email ||
                      '-'
                  }}
                </div>
              </div>
              <div>
                <div class="text-xs text-text-muted">Status</div>
                <span
                  class="px-2 py-1 rounded text-xs"
                  [ngClass]="{
                    'bg-amber-100 text-amber-700':
                      (approval?.status || '').toLowerCase() === 'pending',
                    'bg-green-100 text-green-700':
                      (approval?.status || '').toLowerCase() === 'approved',
                    'bg-red-100 text-red-700':
                      (approval?.status || '').toLowerCase() === 'rejected',
                  }"
                >
                  {{ approval?.status || '-' }}
                </span>
              </div>
            </div>

            <div>
              <div class="text-xs text-text-muted mb-1">Request Notes</div>
              <div class="text-sm whitespace-pre-wrap">
                {{ approval?.requestNotes || '-' }}
              </div>
            </div>

            <div>
              <div class="text-xs text-text-muted mb-1">Proposed Changes</div>
              <pre
                class="text-xs bg-neutral-50 border rounded p-2 overflow-auto max-h-48"
                >{{ pretty(approval?.proposedChanges) }}</pre
              >
            </div>

            <div *ngIf="machine?.metadata !== undefined">
              <div class="text-xs text-text-muted mb-1">Machine Metadata</div>
              <pre
                class="text-xs bg-neutral-50 border rounded p-2 overflow-auto max-h-48"
                >{{ prettyMetadata(machine?.metadata) }}</pre
              >
            </div>

            <div *ngIf="approval?.rejectionReason">
              <div class="text-xs text-text-muted mb-1">Rejection Reason</div>
              <div class="text-sm whitespace-pre-wrap">
                {{ approval?.rejectionReason }}
              </div>
            </div>
            <div *ngIf="approval?.approverNotes">
              <div class="text-xs text-text-muted mb-1">Approver Notes</div>
              <div class="text-sm whitespace-pre-wrap">
                {{ approval?.approverNotes }}
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-4 py-3 border-t border-neutral-200 flex items-center justify-end gap-2"
        >
          <button class="px-3 py-2 rounded border" (click)="close.emit()">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ApprovalViewModalComponent {
  @Input() visible = false;
  @Input() approval: any = null;
  @Input() machine: any = null;
  @Output() close = new EventEmitter<void>();

  activeImage = 0;

  get images(): string[] {
    const imgs: any = this.machine?.images;
    if (!imgs) return [];
    return Array.isArray(imgs) ? imgs : [imgs];
  }

  imageUrl(path: string): string {
    if (!path) return '';
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    return `${base}${path}`;
  }

  pretty(obj: any): string {
    try {
      return JSON.stringify(obj ?? {}, null, 2);
    } catch {
      return String(obj ?? '-');
    }
  }

  prettyMetadata(val: any): string {
    try {
      if (typeof val === 'string') {
        // Attempt to parse JSON-like strings; otherwise return raw string for transparency
        const trimmed = val.trim();
        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
          return JSON.stringify(JSON.parse(trimmed), null, 2);
        }
        return trimmed;
      }
      return JSON.stringify(val ?? {}, null, 2);
    } catch {
      return String(val ?? '-');
    }
  }

  prevImage(): void {
    if (!this.images.length) return;
    this.activeImage =
      (this.activeImage - 1 + this.images.length) % this.images.length;
  }

  nextImage(): void {
    if (!this.images.length) return;
    this.activeImage = (this.activeImage + 1) % this.images.length;
  }
}
