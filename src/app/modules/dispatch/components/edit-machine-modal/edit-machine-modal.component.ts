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

interface MachineRow {
  _id: string;
  so_id: string; // Reference to SO
  so?: {
    _id: string;
    name: string;
    category_id?:
      | {
          _id: string;
          name: string;
        }
      | string;
    subcategory_id?:
      | {
          _id: string;
          name: string;
        }
      | string
      | null;
    party_name?: string;
    mobile_number?: string;
  } | null; // Populated SO data (optional, for display)
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
            <!-- SO Display (Read-only) -->
            <div class="space-y-1">
              <label class="text-sm font-medium">SO (Sales Order)</label>
              <div
                class="p-3 bg-neutral-50 border border-neutral-200 rounded-md"
              >
                <div class="text-sm font-medium">
                  {{ getSOName() }}
                </div>
                <div class="text-xs text-neutral-600 mt-1">
                  Party: {{ getPartyName() }} | Category:
                  {{ getCategoryName() }}
                  <span *ngIf="getSubcategoryName() !== '-'">
                    | Subcategory: {{ getSubcategoryName() }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-neutral-500">
                SO cannot be changed after machine creation
              </p>
            </div>

            <!-- Location -->
            <div class="space-y-1">
              <label class="text-sm font-medium">Location *</label>
              <input
                type="text"
                formControlName="location"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['location'].touched &&
                  form.controls['location'].invalid
                "
                placeholder="Enter location (e.g., City-Country)"
              />
              <div
                class="text-xs text-red-500"
                *ngIf="
                  form.controls['location'].touched &&
                  form.controls['location'].invalid
                "
              >
                <span *ngIf="form.controls['location'].errors?.['required']">
                  Location is required
                </span>
                <span *ngIf="form.controls['location'].errors?.['maxlength']">
                  Location must be less than 100 characters
                </span>
              </div>
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

            <!-- Images -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Images</label>
              <div class="grid grid-cols-3 gap-2 mb-2">
                <div
                  *ngFor="let img of existingImages; let i = index"
                  class="relative group"
                >
                  <img
                    [src]="imageUrl(img)"
                    [alt]="'Image ' + (i + 1)"
                    class="w-full h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    (click)="removeExistingImage(i)"
                    title="Remove image"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              </div>
              <input
                #imageInput
                type="file"
                accept="image/*"
                multiple
                (change)="onImageSelected($event)"
                class="hidden"
              />
              <button
                type="button"
                class="px-4 py-2 border border-neutral-300 rounded text-sm hover:bg-neutral-50"
                (click)="imageInput.click()"
              >
                <i class="pi pi-image mr-2"></i>Add Images
              </button>
              <div
                *ngIf="selectedImages.length > 0"
                class="mt-2 text-xs text-neutral-600"
              >
                {{ selectedImages.length }} image(s) selected
              </div>
            </div>

            <!-- Documents -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Documents</label>
              <div class="space-y-1 mb-2">
                <div
                  *ngFor="let doc of existingDocuments; let i = index"
                  class="flex items-center justify-between p-2 bg-neutral-50 rounded border"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-file text-neutral-600"></i>
                    <span class="text-sm">{{ doc.name }}</span>
                  </div>
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700"
                    (click)="removeExistingDocument(i)"
                    title="Remove document"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>
              <input
                #documentInput
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
                (change)="onDocumentSelected($event)"
                class="hidden"
              />
              <button
                type="button"
                class="px-4 py-2 border border-neutral-300 rounded text-sm hover:bg-neutral-50"
                (click)="documentInput.click()"
              >
                <i class="pi pi-file mr-2"></i>Add Documents
              </button>
              <div
                *ngIf="selectedDocuments.length > 0"
                class="mt-2 text-xs text-neutral-600"
              >
                {{ selectedDocuments.length }} document(s) selected
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
  @Input() machine: MachineRow | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<MachineRow>();

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('documentInput') documentInput!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  submitting = false;
  selectedImages: File[] = [];
  selectedDocuments: File[] = [];
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

  constructor(
    private fb: FormBuilder,
    private machineService: MachineService,
    private messageService: MessageService,
    private baseApi: BaseApiService
  ) {
    this.form = this.fb.group({
      location: ['', [Validators.required, Validators.maxLength(100)]],
      dispatch_date: [''],
    });
  }

  ngOnInit(): void {
    if (this.machine) {
      this.loadMachineData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['machine'] && this.machine) {
      this.loadMachineData();
    }
    if (changes['visible'] && !this.visible) {
      this.resetForm();
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

    // Populate form
    this.form.patchValue({
      location: this.machine.location || '',
      dispatch_date: this.machine.dispatch_date
        ? this.formatDateForInput(this.machine.dispatch_date)
        : '',
    });

    // Load existing images and documents
    this.existingImages = this.machine.images ? [...this.machine.images] : [];
    this.existingDocuments = this.machine.documents
      ? [...this.machine.documents]
      : [];

    // Reset arrays
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.removedImages = [];
    this.removedDocuments = [];
  }

  formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  getSOName(): string {
    if (!this.machine?.so) return 'N/A';
    return this.machine.so.name || 'N/A';
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
    if (input.files && input.files.length > 0) {
      this.selectedImages = Array.from(input.files);
    }
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedDocuments = Array.from(input.files);
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

  onSubmit(): void {
    if (this.form.invalid || !this.machine) {
      this.markFormGroupTouched(this.form);
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

    this.submitting = true;

    const formData = {
      location: this.form.value.location,
      dispatch_date: this.form.value.dispatch_date || null,
      images: this.selectedImages.length > 0 ? this.selectedImages : undefined,
      documents:
        this.selectedDocuments.length > 0 ? this.selectedDocuments : undefined,
      removedImages:
        this.removedImages.length > 0 ? this.removedImages : undefined,
      removedDocuments:
        this.removedDocuments.length > 0 ? this.removedDocuments : undefined,
    };

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
    this.form.reset();
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.existingImages = [];
    this.existingDocuments = [];
    this.removedImages = [];
    this.removedDocuments = [];
    this.submitting = false;
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
