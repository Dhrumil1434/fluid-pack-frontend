import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { BaseApiService } from '../../../../core/services/base-api.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ElementRef, ViewChild } from '@angular/core';
import { MachineService } from '../../../../core/services/machine.service';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { environment } from '../../../../../environments/environment';
import { SO } from '../../../../core/models/so.model';
import { SOService } from '../../../../core/services/so.service';

interface MachineRow {
  _id: string;
  so_id: string; // Reference to SO
  so?: SO | null; // Populated SO data (optional, for display)
  images?: string[];
  documents?: Array<{
    _id?: string;
    name: string;
    file_path: string;
    document_type?: string;
  }>;
  is_approved: boolean;
  location?: string;
  machine_sequence?: string;
  dispatch_date?: string | Date;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: { username?: string };
  metadata?: Record<string, any>;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string | null;
  approverNotes?: string | null;
  decisionByName?: string | null;
  decisionDate?: string | null;
  created_by?: { username: string; email?: string };
}

@Component({
  selector: 'app-edit-machine-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ToastModule,
    NgxDocViewerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      *ngIf="visible"
    >
      <div
        class="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl border border-neutral-300 flex flex-col"
      >
        <div
          class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between flex-shrink-0"
        >
          <h3 class="font-medium">Edit Machine</h3>
          <button class="p-2 hover:bg-neutral-100 rounded" (click)="onCancel()">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <form
            class="p-4 space-y-4"
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
          >
            <!-- Warning Alert for Deleted SO -->
            <div
              *ngIf="machine && !machine.so"
              class="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div class="flex items-start gap-2">
                <i
                  class="pi pi-exclamation-triangle text-orange-600 mt-0.5"
                ></i>
                <div class="flex-1">
                  <h4 class="text-sm font-semibold text-orange-900 mb-1">
                    SO Deleted Warning
                  </h4>
                  <p class="text-xs text-orange-800">
                    This machine currently references a deleted SO (ID:
                    {{ machine.so_id }}). Please select a new active SO below.
                    The deleted SO can be restored by an admin if needed.
                  </p>
                </div>
              </div>
            </div>
            <!-- SO Selection (Editable) -->
            <div class="space-y-1">
              <label class="text-sm font-medium">SO (Sales Order) *</label>
              <div class="relative">
                <input
                  type="text"
                  class="w-full border rounded px-3 py-2"
                  [class.border-red-500]="
                    form.controls['so_id'].touched &&
                    form.controls['so_id'].invalid
                  "
                  [(ngModel)]="soSearchInput"
                  (input)="onSOInputChange()"
                  (focus)="onSOInputChange()"
                  (blur)="hideSOSuggestions()"
                  placeholder="Search by SO number, Customer, PO number, or Party name..."
                  [ngModelOptions]="{ standalone: true }"
                />
                <button
                  *ngIf="selectedSO"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-50 rounded"
                  (click)="clearSOSelection(); $event.stopPropagation()"
                  title="Clear selection"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
                <!-- SO Suggestions Dropdown -->
                <div
                  *ngIf="showSOSuggestions"
                  class="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  <ng-container *ngIf="soSuggestions.length > 0">
                    <div
                      *ngFor="let so of soSuggestions"
                      class="px-3 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b border-neutral-100 last:border-b-0"
                      (mousedown)="selectSO(so)"
                    >
                      <div class="font-medium text-gray-900">
                        <span *ngIf="so.so_number" class="text-primary"
                          >SO: {{ so.so_number }}</span
                        >
                        <span
                          *ngIf="!so.so_number && so.customer"
                          class="text-primary"
                          >Customer: {{ so.customer }}</span
                        >
                        <span
                          *ngIf="!so.so_number && !so.customer && so.name"
                          class="text-primary"
                          >{{ so.name }}</span
                        >
                      </div>
                      <div class="text-xs text-neutral-600 mt-1">
                        <span *ngIf="so.customer"
                          >Customer: {{ so.customer }}</span
                        >
                        <span *ngIf="so.customer && so.po_number"> | </span>
                        <span *ngIf="so.po_number">PO: {{ so.po_number }}</span>
                        <span *ngIf="so.party_name">
                          | Party: {{ so.party_name }}</span
                        >
                        <span *ngIf="so.mobile_number">
                          | Mobile: {{ so.mobile_number }}</span
                        >
                      </div>
                    </div>
                  </ng-container>
                  <div
                    *ngIf="soSuggestions.length === 0 && soSearchInput.trim()"
                    class="px-3 py-4 text-sm text-neutral-500 text-center"
                  >
                    No SOs found matching "{{ soSearchInput }}"
                  </div>
                </div>
              </div>
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['so_id'].touched &&
                  form.controls['so_id'].invalid
                "
              >
                <span *ngIf="form.controls['so_id'].errors?.['required']">
                  SO is required
                </span>
              </div>
              <!-- Selected SO Details Display -->
              <div
                *ngIf="selectedSO"
                class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md"
              >
                <div class="text-sm font-medium text-blue-900 mb-2">
                  Selected SO Details:
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div *ngIf="selectedSO.customer">
                    <span class="font-medium">Customer:</span>
                    {{ selectedSO.customer }}
                  </div>
                  <div *ngIf="selectedSO.so_number">
                    <span class="font-medium">SO Number:</span>
                    {{ selectedSO.so_number }}
                  </div>
                  <div *ngIf="selectedSO.po_number">
                    <span class="font-medium">PO Number:</span>
                    {{ selectedSO.po_number }}
                  </div>
                  <div *ngIf="selectedSO.party_name">
                    <span class="font-medium">Party:</span>
                    {{ selectedSO.party_name }}
                  </div>
                  <div *ngIf="selectedSO.location">
                    <span class="font-medium">Location:</span>
                    {{ selectedSO.location }}
                  </div>
                  <div>
                    <span class="font-medium">Category:</span>
                    {{
                      selectedSO.category_id &&
                      typeof selectedSO.category_id === 'object'
                        ? selectedSO.category_id.name
                        : 'N/A'
                    }}
                  </div>
                  <div>
                    <span class="font-medium">Subcategory:</span>
                    {{ selectedSO.subcategory_id?.name || 'N/A' }}
                  </div>
                  <div *ngIf="selectedSO.mobile_number">
                    <span class="font-medium">Mobile:</span>
                    {{ selectedSO.mobile_number }}
                  </div>
                </div>
              </div>
              <p class="text-xs text-neutral-500">
                Changing SO will regenerate the machine sequence based on the
                new SO's category
              </p>
            </div>

            <!-- Dispatch Date -->
            <div class="space-y-1">
              <label class="text-sm font-medium">Dispatch Date</label>
              <input
                type="date"
                formControlName="dispatch_date"
                class="w-full border rounded px-3 py-2"
              />
            </div>

            <!-- Additional Fields (Metadata) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium">Additional Fields</label>
                <button
                  type="button"
                  class="px-2 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50"
                  (click)="addMetadataRow()"
                >
                  Add Field
                </button>
              </div>
              <div class="space-y-2">
                <div
                  class="grid grid-cols-5 gap-2"
                  *ngFor="
                    let m of metadataEntries;
                    let i = index;
                    trackBy: trackByIndex
                  "
                >
                  <input
                    class="col-span-2 border rounded px-2 py-1 text-sm"
                    placeholder="Key"
                    [(ngModel)]="metadataEntries[i].key"
                    [ngModelOptions]="{ standalone: true }"
                    name="meta_key_{{ i }}"
                    (input)="onMetadataChange()"
                  />
                  <input
                    class="col-span-3 border rounded px-2 py-1 text-sm"
                    placeholder="Value"
                    [(ngModel)]="metadataEntries[i].value"
                    [ngModelOptions]="{ standalone: true }"
                    name="meta_val_{{ i }}"
                    (input)="onMetadataChange()"
                  />
                  <div class="col-span-5 flex justify-end">
                    <button
                      type="button"
                      class="px-2 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-50"
                      (click)="removeMetadataRow(i)"
                      *ngIf="metadataEntries.length > 1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Images -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Images</label>
              <input
                #imageInput
                type="file"
                accept="image/*"
                multiple
                (change)="onImageSelected($event)"
                class="hidden"
              />
              <div
                class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                [ngClass]="{
                  'border-primary': isDragging,
                  'bg-primary/5': isDragging,
                }"
                (click)="imageInput.click()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
              >
                <div class="flex flex-col items-center gap-1">
                  <i class="pi pi-image text-2xl text-neutral-500"></i>
                  <div class="text-sm">
                    <span class="text-primary font-medium"
                      >Click to upload</span
                    >
                    or drag and drop
                  </div>
                  <div class="text-xs text-neutral-500">
                    PNG, JPG, GIF up to 10 files
                  </div>
                </div>
              </div>
              <div
                class="text-xs text-neutral-600"
                *ngIf="previewImages.length > 0"
              >
                {{ previewImages.length }} image(s) selected (max 10)
              </div>
              <div
                class="grid grid-cols-5 gap-2 mt-2"
                *ngIf="previewImages.length > 0"
              >
                <div
                  class="relative group"
                  *ngFor="let img of previewImages; let i = index"
                >
                  <img
                    [src]="img"
                    class="w-full h-16 object-cover rounded border"
                  />
                  <button
                    type="button"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    (click)="removeFile(i)"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              </div>

              <!-- Existing Images -->
              <div *ngIf="existingImages.length > 0" class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium">Existing Images</label>
                  <span class="text-xs text-neutral-600"
                    >{{ existingImages.length }} image(s)</span
                  >
                </div>
                <div class="grid grid-cols-5 gap-2">
                  <div
                    class="relative group"
                    *ngFor="let img of existingImages; let i = index"
                  >
                    <img
                      [src]="imageUrl(img)"
                      class="w-full h-16 object-cover rounded border"
                    />
                    <button
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      (click)="removeExistingImage(i)"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Documents -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Documents</label>
              <input
                #documentInput
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                multiple
                (change)="onDocumentSelected($event)"
                class="hidden"
              />
              <div
                class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                [ngClass]="{
                  'border-primary': isDocumentDragging,
                  'bg-primary/5': isDocumentDragging,
                }"
                (click)="documentInput.click()"
                (dragover)="onDocumentDragOver($event)"
                (dragleave)="onDocumentDragLeave($event)"
                (drop)="onDocumentDrop($event)"
              >
                <div class="flex flex-col items-center gap-1">
                  <i class="pi pi-file text-2xl text-neutral-500"></i>
                  <div class="text-sm">
                    <span class="text-primary font-medium"
                      >Click to upload</span
                    >
                    or drag and drop
                  </div>
                  <div class="text-xs text-neutral-500">
                    PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR up to 10 files
                  </div>
                </div>
              </div>
              <div
                class="text-xs text-neutral-600"
                *ngIf="selectedDocuments.length > 0"
              >
                {{ selectedDocuments.length }} document(s) selected (max 10)
              </div>
              <div class="space-y-2 mt-2" *ngIf="selectedDocuments.length > 0">
                <div
                  class="flex items-center justify-between p-2 bg-neutral-50 rounded border"
                  *ngFor="let doc of selectedDocuments; let i = index"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-file text-neutral-500"></i>
                    <span class="text-sm">{{ doc.name }}</span>
                    <span class="text-xs text-neutral-500"
                      >({{ doc.size | number }} bytes)</span
                    >
                  </div>
                  <button
                    type="button"
                    class="p-1 text-red-500 hover:bg-red-50 rounded"
                    (click)="removeDocument(i)"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              </div>

              <!-- Existing Documents -->
              <div *ngIf="existingDocuments.length > 0" class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium">Existing Documents</label>
                  <span class="text-xs text-neutral-600"
                    >{{ existingDocuments.length }} document(s)</span
                  >
                </div>
                <div class="space-y-2">
                  <div
                    class="flex items-center justify-between p-2 bg-neutral-50 rounded border"
                    *ngFor="let doc of existingDocuments; let i = index"
                  >
                    <div class="flex items-center gap-2">
                      <i class="pi pi-file text-neutral-500"></i>
                      <span class="text-sm">{{ doc.name }}</span>
                      <span class="text-xs text-neutral-500">{{
                        doc.document_type || 'Document'
                      }}</span>
                    </div>
                    <button
                      type="button"
                      class="p-1 text-red-500 hover:bg-red-50 rounded"
                      (click)="removeExistingDocument(i)"
                      title="Remove"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                class="px-4 py-2 border border-neutral-300 rounded text-sm hover:bg-neutral-50"
                (click)="onCancel()"
                [disabled]="submitting"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                [disabled]="form.invalid || submitting"
              >
                <i
                  class="pi"
                  [class.pi-spin]="submitting"
                  [class.pi-spinner]="submitting"
                  [class.pi-check]="!submitting"
                ></i>
                {{ submitting ? 'Updating...' : 'Update Machine' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class EditMachineModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() machine: any = null; // Using any to handle type compatibility between different MachineRow definitions
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<MachineRow>();

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('documentInput') documentInput!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  submitting = false;
  selectedImages: File[] = [];
  selectedDocuments: File[] = [];
  previewImages: string[] = [];
  existingImages: string[] = [];
  existingDocuments: Array<{
    _id?: string;
    name: string;
    file_path: string;
    document_type?: string;
  }> = [];
  removedImages: string[] = [];
  removedDocuments: Array<{
    _id?: string;
    name?: string;
    file_path?: string;
    document_type?: string;
  }> = [];
  isDragging = false;
  isDocumentDragging = false;
  metadataEntries: Array<{ key: string; value: string }> = [];

  // SO search properties
  soSearchInput = '';
  soSuggestions: SO[] = [];
  showSOSuggestions = false;
  selectedSO: SO | null = null;
  originalSOId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private machineService: MachineService,
    private messageService: MessageService,
    private baseApi: BaseApiService,
    private soService: SOService
  ) {
    this.form = this.fb.group({
      so_id: ['', [Validators.required]],
      dispatch_date: [''],
    });
  }

  ngOnInit(): void {
    if (this.machine) {
      this.loadMachineData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['machine'] && this.machine && this.visible) {
      // Load data when machine changes and modal is visible
      setTimeout(() => {
        this.loadMachineData();
      }, 0);
    }
    if (changes['visible']) {
      if (this.visible && this.machine) {
        // Load data when modal becomes visible
        setTimeout(() => {
          this.loadMachineData();
        }, 0);
      } else if (!this.visible) {
        // Reset form when modal closes
        this.resetForm();
      }
    }
  }

  ngOnDestroy(): void {}

  loadMachineData(): void {
    if (!this.machine) return;

    // Validate that machine is not approved
    if (this.machine.is_approved) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cannot Edit',
        detail: 'Approved machines cannot be edited.',
      });
      this.onCancel();
      return;
    }

    // Get current SO - handle both populated and unpopulated cases
    const currentSO = this.machine.so || null;
    let currentSOId: string | null = null;

    if (currentSO) {
      // SO is populated
      currentSOId = (currentSO as any)._id || (currentSO as any).id || null;
    } else if (this.machine.so_id) {
      // SO is not populated, use so_id directly
      currentSOId = String(this.machine.so_id);
    }

    this.originalSOId = currentSOId;

    // Set selected SO and search input
    if (currentSO && currentSOId) {
      this.selectedSO = currentSO as SO;
      const displayName =
        currentSO.so_number || currentSO.customer || currentSO.name || '';
      this.soSearchInput = `${displayName}${currentSO.party_name ? ' - ' + currentSO.party_name : ''}`;

      // Populate form with SO ID
      this.form.patchValue({
        so_id: currentSOId,
        dispatch_date: this.machine.dispatch_date
          ? this.formatDateForInput(this.machine.dispatch_date)
          : '',
      });
    } else if (currentSOId) {
      // Load SO by ID if not populated
      this.loadSOById(currentSOId);

      // Populate form with SO ID (will be updated when SO loads)
      this.form.patchValue({
        so_id: currentSOId,
        dispatch_date: this.machine.dispatch_date
          ? this.formatDateForInput(this.machine.dispatch_date)
          : '',
      });
    } else {
      // No SO found
      this.form.patchValue({
        so_id: '',
        dispatch_date: this.machine.dispatch_date
          ? this.formatDateForInput(this.machine.dispatch_date)
          : '',
      });
    }

    // Load existing images and documents
    this.existingImages = this.machine.images ? [...this.machine.images] : [];
    this.existingDocuments = this.machine.documents
      ? [...this.machine.documents]
      : [];

    // Pre-fill metadata entries
    try {
      const meta =
        this.machine?.metadata && typeof this.machine.metadata === 'object'
          ? (this.machine.metadata as Record<string, unknown>)
          : {};
      const keys = Object.keys(meta);
      this.metadataEntries = keys.length
        ? keys.map(k => ({ key: k, value: String((meta as any)[k] ?? '') }))
        : [{ key: '', value: '' }];
    } catch {
      this.metadataEntries = [{ key: '', value: '' }];
    }

    // Reset arrays
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.previewImages = [];
    this.removedImages = [];
    this.removedDocuments = [];
    this.isDragging = false;
    this.isDocumentDragging = false;
  }

  loadSOById(soId: string): void {
    this.soService.getSOById(soId).subscribe({
      next: (response: any) => {
        const so = response?.data || response;
        if (so) {
          this.selectedSO = so;
          const displayName = so.so_number || so.customer || so.name || '';
          this.soSearchInput = `${displayName}${so.party_name ? ' - ' + so.party_name : ''}`;

          // Update form with SO ID
          this.form.patchValue({ so_id: soId });
          this.form.get('so_id')?.updateValueAndValidity();
        }
      },
      error: error => {
        console.error('Error loading SO:', error);
        // If SO not found, clear selection
        this.selectedSO = null;
        this.soSearchInput = '';
        this.form.patchValue({ so_id: '' });
      },
    });
  }

  onSOInputChange(): void {
    const query = this.soSearchInput.trim();
    if (!query) {
      this.soSuggestions = [];
      this.showSOSuggestions = false;
      return;
    }

    this.showSOSuggestions = true;

    // Search SOs by name, party_name, mobile_number, and category/subcategory names
    this.soService.getActiveSOs().subscribe({
      next: (response: any) => {
        const sos: SO[] = response?.data || response || [];
        const queryLower = query.toLowerCase();

        const filtered = sos.filter(so => {
          // Search in SO name or customer
          if (
            so.name?.toLowerCase().includes(queryLower) ||
            so.customer?.toLowerCase().includes(queryLower)
          )
            return true;
          // Search in party name
          if (so.party_name?.toLowerCase().includes(queryLower)) return true;
          // Search in mobile number
          if (so.mobile_number?.includes(query)) return true;
          // Search in SO number
          if (so.so_number?.toLowerCase().includes(queryLower)) return true;
          // Search in PO number
          if (so.po_number?.toLowerCase().includes(queryLower)) return true;
          // Search in category name
          if (
            typeof so.category_id === 'object' &&
            so.category_id !== null &&
            so.category_id.name?.toLowerCase().includes(queryLower)
          )
            return true;
          // Search in subcategory name
          if (
            so.subcategory_id &&
            typeof so.subcategory_id === 'object' &&
            so.subcategory_id !== null &&
            so.subcategory_id.name?.toLowerCase().includes(queryLower)
          )
            return true;
          return false;
        });

        // Limit to 50 for performance
        this.soSuggestions = filtered.slice(0, 50);
      },
      error: () => {
        this.soSuggestions = [];
      },
    });
  }

  selectSO(so: SO): void {
    this.selectedSO = so;
    this.form.patchValue({ so_id: so._id });
    this.form.get('so_id')?.markAsTouched(); // Mark control as touched
    this.form.get('so_id')?.updateValueAndValidity(); // Update validation
    this.form.markAsDirty(); // Mark form as dirty when SO changes
    const displayName = so.so_number || so.customer || so.name || '';
    this.soSearchInput = `${displayName}${so.party_name ? ' - ' + so.party_name : ''}`;
    this.showSOSuggestions = false;
  }

  clearSOSelection(): void {
    this.selectedSO = null;
    this.form.patchValue({ so_id: '' });
    this.soSearchInput = '';
    this.soSuggestions = [];
    this.showSOSuggestions = false;
  }

  hideSOSuggestions(): void {
    setTimeout(() => {
      this.showSOSuggestions = false;
    }, 200);
  }

  formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  getSOName(): string {
    if (!this.machine?.so) return 'N/A';
    return this.machine.so.name || this.machine.so.customer || 'N/A';
  }

  getPartyName(): string {
    if (!this.machine?.so?.party_name) return 'N/A';
    return this.machine.so.party_name;
  }

  getCategoryName(): string {
    if (!this.machine?.so?.category_id) return 'N/A';
    const catId = this.machine.so.category_id;
    if (typeof catId === 'object' && catId !== null) {
      return catId.name || 'N/A';
    }
    return 'N/A';
  }

  getSubcategoryName(): string {
    if (!this.machine?.so?.subcategory_id) return '-';
    const subcatId = this.machine.so.subcategory_id;
    if (typeof subcatId === 'object' && subcatId !== null) {
      return subcatId.name || '-';
    }
    return '-';
  }

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${environment.apiUrl}/${path}`;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files ? Array.from(input.files) : [];

    if (files.length === 0) {
      return;
    }

    // Calculate total images: existing + already selected + new
    const totalExisting = this.existingImages.length;
    const totalSelected = this.selectedImages.length;

    // Limit total images (existing + selected + new) to 10
    const maxTotalImages = 10;
    const availableSlots = Math.max(
      0,
      maxTotalImages - totalExisting - totalSelected
    );

    if (availableSlots === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Image Limit Reached',
        detail: `Maximum ${maxTotalImages} images allowed. Please remove some existing images first.`,
      });
      // Clear the input
      if (input) {
        input.value = '';
      }
      return;
    }

    const limited = files.slice(0, availableSlots);

    // Append new files to existing selectedImages instead of replacing
    this.selectedImages.push(...limited);

    // Limit total to 10 if somehow exceeded
    const totalNow = this.existingImages.length + this.selectedImages.length;
    if (totalNow > maxTotalImages) {
      const excess = totalNow - maxTotalImages;
      this.selectedImages.splice(-excess);
      this.messageService.add({
        severity: 'warn',
        summary: 'Image Limit',
        detail: `Only ${limited.length} image(s) added. Maximum ${maxTotalImages} images allowed.`,
      });
    }

    // Create preview URLs for new files only (append to existing previews)
    const newPreviews = limited.map(f => URL.createObjectURL(f));
    this.previewImages.push(...newPreviews);

    // Clear the input so same file can be selected again
    if (input) {
      input.value = '';
    }
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files ? Array.from(input.files) : [];

    if (files.length === 0) {
      return;
    }

    // Filter valid document types
    const validFiles = files.filter(file => {
      const validTypes = [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.txt',
        '.zip',
        '.rar',
      ];
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(extension);
    });

    // Calculate total documents: existing + already selected + new
    const totalExisting = this.existingDocuments.length;
    const totalSelected = this.selectedDocuments.length;

    // Limit total documents (existing + selected + new) to 10
    const maxTotalDocuments = 10;
    const availableSlots = Math.max(
      0,
      maxTotalDocuments - totalExisting - totalSelected
    );

    if (availableSlots === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Document Limit Reached',
        detail: `Maximum ${maxTotalDocuments} documents allowed. Please remove some existing documents first.`,
      });
      // Clear the input
      if (input) {
        input.value = '';
      }
      return;
    }

    const limited = validFiles.slice(0, availableSlots);

    if (limited.length < validFiles.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Limit Reached',
        detail: `Maximum ${maxTotalDocuments} documents allowed. Only ${limited.length} document(s) added.`,
      });
    }

    // Append new documents to existing selectedDocuments instead of replacing
    this.selectedDocuments.push(...limited);

    // Clear the input so same file can be selected again
    if (input) {
      input.value = '';
    }
  }

  removeExistingImage(index: number): void {
    const image = this.existingImages[index];
    if (image) {
      this.removedImages.push(image);
      this.existingImages.splice(index, 1);
    }
  }

  removeExistingDocument(index: number): void {
    const doc = this.existingDocuments[index];
    if (doc) {
      this.removedDocuments.push({
        _id: doc._id,
        name: doc.name,
        file_path: doc.file_path,
        document_type: doc.document_type,
      });
      this.existingDocuments.splice(index, 1);
    }
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedImages.length) return;
    const [removed] = this.previewImages.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed);
    this.selectedImages.splice(index, 1);
  }

  removeDocument(index: number): void {
    if (index < 0 || index >= this.selectedDocuments.length) return;
    this.selectedDocuments.splice(index, 1);
  }

  // Drag and drop handlers for images
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);

      if (files.length === 0) {
        return;
      }

      // Calculate total images: existing + already selected + new
      const totalExisting = this.existingImages.length;
      const totalSelected = this.selectedImages.length;

      // Limit total images (existing + selected + new) to 10
      const maxTotalImages = 10;
      const availableSlots = Math.max(
        0,
        maxTotalImages - totalExisting - totalSelected
      );

      if (availableSlots === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Image Limit Reached',
          detail: `Maximum ${maxTotalImages} images allowed. Please remove some existing images first.`,
        });
        return;
      }

      const limited = files.slice(0, availableSlots);

      // Append new files to existing selectedImages instead of replacing
      this.selectedImages.push(...limited);

      // Limit total to 10 if somehow exceeded
      const totalNow = this.existingImages.length + this.selectedImages.length;
      if (totalNow > maxTotalImages) {
        const excess = totalNow - maxTotalImages;
        this.selectedImages.splice(-excess);
        this.messageService.add({
          severity: 'warn',
          summary: 'Image Limit',
          detail: `Only ${limited.length} image(s) added. Maximum ${maxTotalImages} images allowed.`,
        });
      }

      // Create preview URLs for new files only (append to existing previews)
      const newPreviews = limited.map(f => URL.createObjectURL(f));
      this.previewImages.push(...newPreviews);
    }
  }

  // Drag and drop handlers for documents
  onDocumentDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = true;
  }

  onDocumentDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = false;
  }

  onDocumentDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDocumentDragging = false;
    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);

      if (files.length === 0) {
        return;
      }

      // Filter valid document types
      const validFiles = files.filter(file => {
        const validTypes = [
          '.pdf',
          '.doc',
          '.docx',
          '.xls',
          '.xlsx',
          '.txt',
          '.zip',
          '.rar',
        ];
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return validTypes.includes(extension);
      });

      // Calculate total documents: existing + already selected + new
      const totalExisting = this.existingDocuments.length;
      const totalSelected = this.selectedDocuments.length;

      // Limit total documents (existing + selected + new) to 10
      const maxTotalDocuments = 10;
      const availableSlots = Math.max(
        0,
        maxTotalDocuments - totalExisting - totalSelected
      );

      if (availableSlots === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Document Limit Reached',
          detail: `Maximum ${maxTotalDocuments} documents allowed. Please remove some existing documents first.`,
        });
        return;
      }

      const limited = validFiles.slice(0, availableSlots);

      if (limited.length < validFiles.length) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Limit Reached',
          detail: `Maximum ${maxTotalDocuments} documents allowed. Only ${limited.length} document(s) added.`,
        });
      }

      // Append new documents to existing selectedDocuments instead of replacing
      this.selectedDocuments.push(...limited);
    }
  }

  // Metadata/Additional Fields methods
  addMetadataRow(): void {
    this.metadataEntries.push({ key: '', value: '' });
    this.form.markAsDirty();
  }

  removeMetadataRow(i: number): void {
    if (this.metadataEntries.length <= 1) return;
    this.metadataEntries.splice(i, 1);
    this.form.markAsDirty();
  }

  onMetadataChange(): void {
    this.form.markAsDirty();
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSubmit(): void {
    if (!this.machine) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Machine data is missing.',
      });
      return;
    }

    // Validate machine is not approved
    if (this.machine.is_approved) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cannot Edit',
        detail: 'Approved machines cannot be edited.',
      });
      return;
    }

    // Validate SO is selected
    if (!this.form.value.so_id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select an SO.',
      });
      this.form.get('so_id')?.markAsTouched();
      return;
    }

    this.submitting = true;

    // Build metadata object from dynamic rows
    const metadataEntries = this.metadataEntries.filter(
      e => (e.key || '').trim().length > 0
    );
    const metadata: Record<string, unknown> = metadataEntries.reduce<
      Record<string, unknown>
    >((acc, e) => {
      acc[e.key.trim()] = e.value;
      return acc;
    }, {});

    const formData: any = {
      dispatch_date: this.form.value.dispatch_date || null,
      images: this.selectedImages.length > 0 ? this.selectedImages : undefined,
      documents:
        this.selectedDocuments.length > 0 ? this.selectedDocuments : undefined,
      removedImages:
        this.removedImages.length > 0 ? this.removedImages : undefined,
      removedDocuments:
        this.removedDocuments.length > 0 ? this.removedDocuments : undefined,
      metadata: metadata, // Always include metadata (empty object clears existing metadata)
    };

    // Include SO ID if it changed
    const newSOId = this.form.value.so_id;
    if (newSOId && newSOId !== this.originalSOId) {
      formData.so_id = newSOId;
    }

    // Check if there are any changes to submit
    const originalDispatchDate = this.machine.dispatch_date
      ? this.formatDateForInput(this.machine.dispatch_date)
      : null;
    const newDispatchDate = this.form.value.dispatch_date || null;
    const dispatchDateChanged = originalDispatchDate !== newDispatchDate;

    // Check if metadata changed
    const originalMetadata = this.machine.metadata || {};
    const metadataChanged =
      JSON.stringify(metadata) !== JSON.stringify(originalMetadata);

    const hasChanges =
      formData.so_id || // SO changed
      dispatchDateChanged || // Dispatch date changed
      metadataChanged || // Metadata changed
      formData.images || // New images
      formData.documents || // New documents
      formData.removedImages || // Images removed
      formData.removedDocuments; // Documents removed

    if (!hasChanges) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Changes',
        detail: 'No changes detected. Please make changes before updating.',
      });
      this.submitting = false;
      return;
    }

    this.machineService
      .updateMachineForm(this.machine._id, formData)
      .subscribe({
        next: response => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Machine updated successfully',
          });
          this.saved.emit(response.data as any);
          this.resetForm();
          this.close.emit();
        },
        error: error => {
          console.error('Error updating machine:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              error.message ||
              'Failed to update machine',
          });
        },
        complete: () => {
          this.submitting = false;
        },
      });
  }

  onCancel(): void {
    this.resetForm();
    this.close.emit();
  }

  resetForm(): void {
    this.form.reset({
      so_id: '',
      dispatch_date: '',
    });
    // Revoke preview URLs before clearing
    this.previewImages.forEach(url => URL.revokeObjectURL(url));
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.previewImages = [];
    this.existingImages = [];
    this.existingDocuments = [];
    this.removedImages = [];
    this.removedDocuments = [];
    this.metadataEntries = [{ key: '', value: '' }];
    this.submitting = false;
    this.soSearchInput = '';
    this.soSuggestions = [];
    this.showSOSuggestions = false;
    this.selectedSO = null;
    this.originalSOId = null;
    this.isDragging = false;
    this.isDocumentDragging = false;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
