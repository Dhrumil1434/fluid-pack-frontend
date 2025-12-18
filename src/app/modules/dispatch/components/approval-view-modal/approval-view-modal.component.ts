import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  HostListener,
} from '@angular/core';
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
        class="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-xl border border-neutral-300 flex flex-col"
      >
        <div
          class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Approval Details
            </h3>
            <div class="text-sm text-gray-500 mt-1">{{ approval?._id }}</div>
          </div>
          <button
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="close.emit()"
            aria-label="Close"
          >
            <i class="pi pi-times text-gray-500"></i>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-6">
            <!-- Approval Information -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-gray-900 mb-3">
                Approval Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Machine</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getMachineName() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Approval Type</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ approval?.approvalType || '-' }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Status</label
                  >
                  <span
                    class="inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800':
                        (approval?.status || '').toLowerCase() === 'pending',
                      'bg-green-100 text-green-800':
                        (approval?.status || '').toLowerCase() === 'approved',
                      'bg-red-100 text-red-800':
                        (approval?.status || '').toLowerCase() === 'rejected',
                    }"
                  >
                    {{ approval?.status || '-' }}
                  </span>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Requested By</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{
                      approval?.requestedBy?.username ||
                        approval?.requestedBy?.email ||
                        '-'
                    }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Created</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ approval?.createdAt | date: 'medium' }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Updated</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ approval?.updatedAt | date: 'medium' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Machine Details -->
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-gray-900 mb-3">
                Machine Details
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Machine Name</label
                  >
                  <p class="text-sm text-gray-900 mt-1 font-medium">
                    {{ getMachineName() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Machine Sequence</label
                  >
                  <p class="text-sm text-gray-900 mt-1 font-mono">
                    {{
                      machine?.machine_sequence ||
                        machine?.machineSequence ||
                        '-'
                    }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >S.O. Number</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getSONumber() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >P.O. Number</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getPONumber() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Customer</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getCustomer() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Party Name</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getPartyName() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Location</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getLocation() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Mobile Number</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getMobileNumber() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >S.O. Date</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getSODate() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >P.O. Date</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getPODate() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Dispatch Date</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{
                      machine?.dispatch_date
                        ? (machine?.dispatch_date | date: 'dd-MM-yyyy')
                        : '-'
                    }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Category</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getCategoryName() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Subcategory</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ getSubcategoryName() }}
                  </p>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Approved</label
                  >
                  <span
                    class="inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1"
                    [ngClass]="
                      machine?.is_approved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    "
                  >
                    {{ machine?.is_approved ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div>
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Created By</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ machine?.created_by?.username || '-' }}
                    <span
                      *ngIf="machine?.created_by?.email"
                      class="text-gray-500"
                    >
                      ({{ machine?.created_by?.email }})
                    </span>
                  </p>
                </div>
                <div *ngIf="machine?.updatedBy">
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Updated By</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ machine?.updatedBy?.username || '-' }}
                    <span
                      *ngIf="machine?.updatedBy?.email"
                      class="text-gray-500"
                    >
                      ({{ machine?.updatedBy?.email }})
                    </span>
                  </p>
                </div>
                <div *ngIf="machine?.createdAt">
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Created At</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ machine?.createdAt | date: 'dd-MM-yyyy HH:mm' }}
                  </p>
                </div>
                <div *ngIf="machine?.updatedAt">
                  <label
                    class="text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >Updated At</label
                  >
                  <p class="text-sm text-gray-900 mt-1">
                    {{ machine?.updatedAt | date: 'dd-MM-yyyy HH:mm' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Images Section -->
            <div
              *ngIf="(machine?.images?.length || 0) > 0"
              class="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-gray-900 mb-3">Images</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div
                  *ngFor="
                    let img of machine?.images;
                    let i = index;
                    trackBy: trackByIndex
                  "
                  class="relative group cursor-pointer"
                  (click)="openImagePreview(i)"
                >
                  <img
                    [src]="imageUrl(img)"
                    class="w-full h-20 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    [alt]="'Image ' + (i + 1)"
                    (error)="handleImageError($event)"
                  />
                  <div
                    class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center"
                  >
                    <i
                      class="pi pi-eye text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Documents Section -->
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-900">Documents</h4>
                <button
                  *ngIf="machine?.documents?.length"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  (click)="openDocumentsModal()"
                >
                  <i class="pi pi-file mr-1.5"></i>
                  View All ({{ machine?.documents?.length || 0 }})
                </button>
              </div>
              <div
                *ngIf="machine?.documents?.length; else nodocs"
                class="space-y-2"
              >
                <div
                  *ngFor="
                    let doc of machine?.documents | slice: 0 : 5;
                    let i = index;
                    trackBy: trackByIndex
                  "
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"
                    >
                      <i class="pi pi-file text-blue-600 text-sm"></i>
                    </div>
                    <div>
                      <p
                        class="text-sm font-medium text-gray-900 truncate max-w-xs"
                      >
                        {{ getDocumentName(doc) }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ getDocumentType(doc) }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      (click)="previewDocument(doc)"
                      title="Preview"
                    >
                      <i class="pi pi-eye text-sm"></i>
                    </button>
                    <button
                      class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      (click)="downloadDocument(doc)"
                      title="Download"
                    >
                      <i class="pi pi-download text-sm"></i>
                    </button>
                  </div>
                </div>
                <div
                  *ngIf="(machine?.documents?.length || 0) > 5"
                  class="text-center py-2"
                >
                  <span class="text-xs text-gray-500"
                    >+{{ (machine?.documents?.length || 0) - 5 }} more
                    documents</span
                  >
                </div>
              </div>
              <ng-template #nodocs>
                <div class="text-center py-8">
                  <i class="pi pi-file text-3xl text-gray-300 mb-2"></i>
                  <p class="text-sm text-gray-500">No documents attached</p>
                </div>
              </ng-template>
            </div>

            <!-- Request Notes -->
            <div
              *ngIf="approval?.requestNotes"
              class="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-gray-900 mb-3">
                Request Notes
              </h4>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">
                {{ approval?.requestNotes }}
              </p>
            </div>

            <!-- Proposed Changes -->
            <div
              *ngIf="approval?.proposedChanges"
              class="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-gray-900 mb-3">
                Proposed Changes
              </h4>
              <pre
                class="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-48 text-gray-700"
                >{{ pretty(approval?.proposedChanges) }}</pre
              >
            </div>

            <!-- Rejection Reason -->
            <div
              *ngIf="approval?.rejectionReason"
              class="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-red-900 mb-3">
                Rejection Reason
              </h4>
              <p class="text-sm text-red-700 whitespace-pre-wrap">
                {{ approval?.rejectionReason }}
              </p>
            </div>

            <!-- Approver Notes -->
            <div
              *ngIf="approval?.approverNotes"
              class="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-blue-900 mb-3">
                Approver Notes
              </h4>
              <p class="text-sm text-blue-700 whitespace-pre-wrap">
                {{ approval?.approverNotes }}
              </p>
            </div>

            <!-- Metadata -->
            <div
              *ngIf="machine?.metadata"
              class="bg-white border border-gray-200 rounded-lg p-4"
            >
              <h4 class="text-sm font-semibold text-gray-900 mb-3">
                Additional Information
              </h4>
              <div class="space-y-2">
                <div
                  *ngFor="
                    let kv of machine?.metadata | keyvalue;
                    trackBy: trackByKey
                  "
                  class="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span class="text-sm font-medium text-gray-600">{{
                    kv.key
                  }}</span>
                  <span
                    class="text-sm text-gray-900 text-right max-w-xs truncate"
                    >{{ kv.value }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0"
        >
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            (click)="close.emit()"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Documents Modal -->
    <div
      *ngIf="documentsVisible"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 bg-black/40"
        (click)="documentsVisible = false"
        role="button"
        tabindex="0"
        (keydown.enter)="documentsVisible = false"
        (keydown.space)="documentsVisible = false"
      ></div>
      <div
        class="relative bg-bg border border-neutral-300 rounded-xl shadow-medium w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div
          class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0"
        >
          <h3 class="text-lg font-semibold text-text">
            Machine Documents - {{ getMachineName() }}
          </h3>
          <button
            class="p-2 text-text-muted hover:bg-neutral-100 rounded-md"
            (click)="documentsVisible = false"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <div *ngIf="machine?.documents?.length; else noDocuments">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                *ngFor="
                  let doc of machine?.documents;
                  let i = index;
                  trackBy: trackByIndex
                "
                class="border border-neutral-300 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0">
                    <div
                      class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"
                    >
                      <i class="pi pi-file text-primary text-xl"></i>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-medium text-sm text-text truncate"
                      [title]="getDocumentName(doc)"
                    >
                      {{ getDocumentName(doc) }}
                    </h4>
                    <p class="text-xs text-text-muted mt-1">
                      {{ getDocumentType(doc) }}
                    </p>
                    <div class="flex gap-2 mt-3">
                      <button
                        class="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-light"
                        (click)="downloadDocument(doc)"
                      >
                        <i class="pi pi-download mr-1"></i>
                        Download
                      </button>
                      <button
                        class="px-3 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-50"
                        (click)="previewDocument(doc)"
                      >
                        <i class="pi pi-eye mr-1"></i>
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noDocuments>
            <div class="text-center py-12">
              <i class="pi pi-file text-4xl text-neutral-400 mb-4"></i>
              <h3 class="text-lg font-medium text-text mb-2">No Documents</h3>
              <p class="text-text-muted">
                This machine doesn't have any documents attached.
              </p>
            </div>
          </ng-template>
        </div>
        <div
          class="flex items-center justify-end gap-2 p-4 border-t border-neutral-200 flex-shrink-0"
        >
          <button
            class="px-3 py-2 rounded-md border border-neutral-300 text-text hover:bg-neutral-50"
            (click)="documentsVisible = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Image Preview Modal -->
    <div
      *ngIf="imagePreviewVisible"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div class="relative w-full max-w-6xl mx-4">
        <!-- Close Button -->
        <button
          class="absolute -top-12 right-0 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
          (click)="closeImagePreview()"
        >
          <i class="pi pi-times text-2xl"></i>
        </button>

        <!-- Main Image Container -->
        <div class="bg-black rounded-lg overflow-hidden">
          <div
            class="relative flex items-center justify-center"
            style="min-height: 70vh;"
          >
            <!-- Previous Button -->
            <button
              *ngIf="(previewImages?.length || 0) > 1"
              class="absolute left-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
              (click)="previousImage()"
            >
              <i class="pi pi-chevron-left text-xl"></i>
            </button>

            <!-- Main Image -->
            <img
              *ngIf="(previewImages?.length || 0) > 0"
              [src]="imageUrl(previewImages[currentImageIndex])"
              class="max-h-[70vh] w-auto object-contain"
              [alt]="'Image ' + (currentImageIndex + 1)"
              (error)="handleImageError($event)"
            />

            <!-- Next Button -->
            <button
              *ngIf="(previewImages?.length || 0) > 1"
              class="absolute right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors z-10"
              (click)="nextImage()"
            >
              <i class="pi pi-chevron-right text-xl"></i>
            </button>
          </div>

          <!-- Thumbnail Strip -->
          <div
            *ngIf="(previewImages?.length || 0) > 1"
            class="p-4 bg-gray-900 flex gap-2 overflow-x-auto"
          >
            <img
              *ngFor="
                let img of previewImages;
                let i = index;
                trackBy: trackByIndex
              "
              [src]="imageUrl(img)"
              class="w-16 h-16 object-cover rounded border-2 cursor-pointer transition-all"
              [class.border-blue-500]="i === currentImageIndex"
              [class.border-gray-600]="i !== currentImageIndex"
              (click)="goToImage(i)"
              (error)="handleImageError($event)"
              [alt]="'Thumbnail ' + (i + 1)"
            />
          </div>

          <!-- Image Counter -->
          <div
            *ngIf="(previewImages?.length || 0) > 1"
            class="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm"
          >
            {{ currentImageIndex + 1 }} / {{ previewImages.length }}
          </div>
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
  documentsVisible = false;
  imagePreviewVisible = false;
  previewImages: string[] = [];
  currentImageIndex = 0;

  get images(): string[] {
    const imgs: any = this.machine?.images;
    if (!imgs) return [];
    return Array.isArray(imgs) ? imgs : [imgs];
  }

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Ensure we build from server origin, not /api base (same as admin machines)
    const base = environment.apiUrl.replace(/\/?api\/?$/, '');
    if (path.startsWith('/')) return `${base}${path}`;
    return `${base}/${path}`;
  }

  pretty(obj: any): string {
    try {
      return JSON.stringify(obj ?? {}, null, 2);
    } catch {
      return String(obj ?? '-');
    }
  }

  // Documents helpers
  openDocumentsModal(): void {
    this.documentsVisible = true;
  }

  downloadDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path);
    const fileName = this.getDocumentFileName(doc);

    // For Cloudinary URLs, we need to fetch and create a blob to ensure proper filename
    if (url.startsWith('http://') || url.startsWith('https://')) {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // Clean up the blob URL
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Error downloading document:', error);
          // Fallback to direct link
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } else {
      // For local files, use direct download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get the proper filename for a document with extension
   */
  getDocumentFileName(doc: any): string {
    let fileName = doc.name || doc.originalname || doc.filename || 'document';

    // Remove any existing extension to avoid duplicates
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Get extension from file_path if available, or from document_type
    let extension = '';
    if (doc.file_path) {
      const match = doc.file_path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (match) {
        extension = match[1];
      }
    }

    // If no extension from URL, try to get from document_type/mimetype
    if (!extension && doc.document_type) {
      const mimeToExt: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          'xlsx',
        'text/plain': 'txt',
        'application/zip': 'zip',
        'application/x-rar-compressed': 'rar',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
      };
      extension = mimeToExt[doc.document_type] || '';
    }

    // If still no extension, try to extract from original filename
    if (!extension && (doc.originalname || doc.name)) {
      const originalName = doc.originalname || doc.name;
      const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        extension = match[1];
      }
    }

    // Return filename with extension
    return extension ? `${nameWithoutExt}.${extension}` : fileName;
  }

  previewDocument(doc: any): void {
    const url = this.documentUrl(doc.file_path);
    window.open(url, '_blank');
  }

  documentUrl(filePath: string): string {
    if (!filePath) return '';
    // If it's already a full URL (Cloudinary or other external URLs), return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    // Construct the full URL for the document using environment baseUrl (same as admin machines)
    const baseUrl = environment.baseUrl;
    // Ensure filePath starts with / if it doesn't already
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${baseUrl}${normalizedPath}`;
  }

  // trackBy helpers
  trackByIndex = (i: number) => i;
  trackByKey = (_: number, item: any) => item.key;

  // Helper methods to extract machine data from SO structure
  getMachineName(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      // Prioritize customer name, then name, then SO number
      if (soId.customer && soId.customer.trim()) {
        return soId.customer.trim();
      }
      if (soId.name && soId.name.trim()) {
        return soId.name.trim();
      }
      if (soId.so_number && soId.so_number.trim()) {
        return soId.so_number.trim();
      }
    }
    // Fallback to machine name if SO is not populated
    if (this.machine.name && this.machine.name.trim()) {
      return this.machine.name.trim();
    }
    return '-';
  }

  getSONumber(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.so_number || '-';
    }
    return '-';
  }

  getPONumber(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.po_number || '-';
    }
    return '-';
  }

  getCustomer(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.customer || '-';
    }
    return '-';
  }

  getPartyName(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.party_name || '-';
    }
    return this.machine.party_name || '-';
  }

  getLocation(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.location || this.machine.location || '-';
    }
    return this.machine.location || '-';
  }

  getMobileNumber(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      return soId.mobile_number || '-';
    }
    return this.machine.mobile_number || '-';
  }

  getCategoryName(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      const categoryId = soId.category_id;
      if (categoryId && typeof categoryId === 'object' && categoryId !== null) {
        return categoryId.name || '-';
      }
      if (typeof categoryId === 'string') return categoryId;
    }
    // Fallback to machine's category_id if SO is not populated
    const categoryId = this.machine.category_id;
    if (categoryId && typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name || '-';
    }
    if (typeof categoryId === 'string') return categoryId;
    return '-';
  }

  getSubcategoryName(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null) {
      const subcategoryId = soId.subcategory_id;
      if (
        subcategoryId &&
        typeof subcategoryId === 'object' &&
        subcategoryId !== null
      ) {
        return subcategoryId.name || '-';
      }
      if (typeof subcategoryId === 'string') return subcategoryId;
    }
    // Fallback to machine's subcategory_id if SO is not populated
    const subcategoryId = this.machine.subcategory_id;
    if (
      subcategoryId &&
      typeof subcategoryId === 'object' &&
      subcategoryId !== null
    ) {
      return subcategoryId.name || '-';
    }
    if (typeof subcategoryId === 'string') return subcategoryId;
    return '-';
  }

  getSODate(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null && soId.so_date) {
      return new Date(soId.so_date).toLocaleDateString('en-GB');
    }
    return '-';
  }

  getPODate(): string {
    if (!this.machine) return '-';
    const soId = this.machine.so_id;
    if (soId && typeof soId === 'object' && soId !== null && soId.po_date) {
      return new Date(soId.po_date).toLocaleDateString('en-GB');
    }
    return '-';
  }

  // Helper method for document properties
  getDocumentName(doc: any): string {
    return doc?.name || '';
  }

  getDocumentType(doc: any): string {
    return doc?.document_type || 'Document';
  }

  // Image preview methods
  openImagePreview(index: number): void {
    if (!this.images || this.images.length === 0) return;
    this.previewImages = [...this.images];
    this.currentImageIndex = Math.max(
      0,
      Math.min(index, this.images.length - 1)
    );
    this.imagePreviewVisible = true;
  }

  closeImagePreview(): void {
    this.imagePreviewVisible = false;
    this.previewImages = [];
    this.currentImageIndex = 0;
  }

  nextImage(): void {
    if (!this.previewImages.length) return;
    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.previewImages.length;
  }

  previousImage(): void {
    if (!this.previewImages.length) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.previewImages.length) %
      this.previewImages.length;
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.previewImages.length) {
      this.currentImageIndex = index;
    }
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12"%3EImage not found%3C/text%3E%3C/svg%3E';
  }

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.imagePreviewVisible) return;

    switch (event.key) {
      case 'Escape':
        this.closeImagePreview();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previousImage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextImage();
        break;
    }
  }
}
