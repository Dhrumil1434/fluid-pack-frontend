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
  FormArray,
  AbstractControl,
} from '@angular/forms';
import { BaseApiService } from '../../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../../core/constants/api.constants';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ElementRef, ViewChild } from '@angular/core';
import { CategoryService } from '../../../../core/services/category.service';
import { SequenceGenerationRequest } from '../../../../core/models/category.model';
import { MachineService } from '../../../../core/services/machine.service';

@Component({
  selector: 'app-create-machine-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
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
          <h3 class="font-medium">Create Machine</h3>
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
            <div class="space-y-1">
              <label class="text-sm">Name</label>
              <input
                type="text"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['name'].touched && form.controls['name'].invalid
                "
                formControlName="name"
                (blur)="form.controls['name'].markAsTouched()"
                (input)="form.controls['name'].markAsTouched()"
              />
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['name'].touched && form.controls['name'].invalid
                "
              >
                <span *ngIf="form.controls['name'].errors?.['required']">
                  Machine name is required
                </span>
                <span *ngIf="form.controls['name'].errors?.['minlength']">
                  Machine name must be at least 2 characters long
                </span>
                <span *ngIf="form.controls['name'].errors?.['maxlength']">
                  Machine name cannot exceed 100 characters
                </span>
                <span *ngIf="form.controls['name'].errors?.['pattern']">
                  Machine name can only contain letters, numbers, spaces, and
                  common punctuation
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">Category</label>
              <select
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['category_id'].touched &&
                  form.controls['category_id'].invalid
                "
                formControlName="category_id"
                (change)="onCategoryChange()"
                (blur)="form.controls['category_id'].markAsTouched()"
              >
                <option value="" disabled>Select category</option>
                <option *ngFor="let c of categories" [value]="c._id">
                  {{ c.name }}
                </option>
              </select>
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['category_id'].touched &&
                  form.controls['category_id'].invalid
                "
              >
                <span *ngIf="form.controls['category_id'].errors?.['required']">
                  Category ID is required
                </span>
                <span *ngIf="form.controls['category_id'].errors?.['pattern']">
                  Invalid category ID format
                </span>
              </div>
            </div>
            <div class="space-y-1" *ngIf="subcategories.length > 0">
              <label class="text-sm">Subcategory (Optional)</label>
              <select
                class="w-full border rounded px-3 py-2"
                formControlName="subcategory_id"
              >
                <option value="">No subcategory</option>
                <option *ngFor="let sc of subcategories" [value]="sc._id">
                  {{ sc.name }}
                </option>
              </select>
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['subcategory_id'].touched &&
                  form.controls['subcategory_id'].invalid &&
                  form.controls['subcategory_id'].value
                "
              >
                <span
                  *ngIf="form.controls['subcategory_id'].errors?.['pattern']"
                >
                  Invalid subcategory ID format
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-sm">Machine Sequence</label>
                <button
                  type="button"
                  class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  (click)="generateSequence()"
                  [disabled]="
                    !form.get('category_id')?.value || isGeneratingSequence
                  "
                >
                  <i
                    *ngIf="isGeneratingSequence"
                    class="pi pi-spinner pi-spin mr-1"
                  ></i>
                  <i *ngIf="!isGeneratingSequence" class="pi pi-cog mr-1"></i>
                  {{ isGeneratingSequence ? 'Generating...' : 'Generate' }}
                </button>
              </div>
              <input
                type="text"
                class="w-full border rounded px-3 py-2 bg-gray-50"
                formControlName="machine_sequence"
                placeholder="Sequence will be generated automatically"
                readonly
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm">Party Name</label>
              <input
                type="text"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['party_name'].touched &&
                  form.controls['party_name'].invalid
                "
                formControlName="party_name"
                placeholder="Enter party/company name"
                (blur)="form.controls['party_name'].markAsTouched()"
                (input)="form.controls['party_name'].markAsTouched()"
              />
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['party_name'].touched &&
                  form.controls['party_name'].invalid
                "
              >
                <span *ngIf="form.controls['party_name'].errors?.['required']">
                  Party name is required
                </span>
                <span *ngIf="form.controls['party_name'].errors?.['minlength']">
                  Party name must be at least 2 characters long
                </span>
                <span *ngIf="form.controls['party_name'].errors?.['maxlength']">
                  Party name cannot exceed 100 characters
                </span>
                <span *ngIf="form.controls['party_name'].errors?.['pattern']">
                  Party name can only contain letters, numbers, spaces, and
                  common punctuation
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">Location</label>
              <input
                type="text"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['location'].touched &&
                  form.controls['location'].invalid
                "
                formControlName="location"
                placeholder="Enter city-country or location"
                (blur)="form.controls['location'].markAsTouched()"
                (input)="form.controls['location'].markAsTouched()"
              />
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['location'].touched &&
                  form.controls['location'].invalid
                "
              >
                <span *ngIf="form.controls['location'].errors?.['required']">
                  Location is required
                </span>
                <span *ngIf="form.controls['location'].errors?.['minlength']">
                  Location must be at least 2 characters long
                </span>
                <span *ngIf="form.controls['location'].errors?.['maxlength']">
                  Location cannot exceed 100 characters
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">Mobile Number</label>
              <input
                type="tel"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['mobile_number'].touched &&
                  form.controls['mobile_number'].invalid
                "
                formControlName="mobile_number"
                placeholder="Enter mobile number (e.g., +1234567890 or 123-456-7890)"
                (blur)="form.controls['mobile_number'].markAsTouched()"
                (input)="form.controls['mobile_number'].markAsTouched()"
              />
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['mobile_number'].touched &&
                  form.controls['mobile_number'].invalid
                "
              >
                <span
                  *ngIf="form.controls['mobile_number'].errors?.['required']"
                >
                  Mobile number is required
                </span>
                <span
                  *ngIf="form.controls['mobile_number'].errors?.['minlength']"
                >
                  Mobile number must be at least 10 characters long
                </span>
                <span
                  *ngIf="form.controls['mobile_number'].errors?.['maxlength']"
                >
                  Mobile number cannot exceed 20 characters
                </span>
                <span
                  *ngIf="form.controls['mobile_number'].errors?.['pattern']"
                >
                  Mobile number can only contain numbers, spaces, hyphens,
                  parentheses, and optional + prefix
                </span>
                <span
                  *ngIf="
                    form.controls['mobile_number'].errors?.[
                      'mobileNumberDigits'
                    ]
                  "
                >
                  {{
                    form.controls['mobile_number'].errors?.[
                      'mobileNumberDigits'
                    ]?.message || 'Invalid digit count'
                  }}
                </span>
                <span
                  *ngIf="
                    form.controls['mobile_number'].errors?.[
                      'mobileNumberFormat'
                    ]
                  "
                >
                  {{
                    form.controls['mobile_number'].errors?.[
                      'mobileNumberFormat'
                    ]?.message || 'Invalid phone number format'
                  }}
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">Dispatch Date</label>
              <input
                type="date"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['dispatch_date'].touched &&
                  form.controls['dispatch_date'].invalid
                "
                formControlName="dispatch_date"
                (blur)="form.controls['dispatch_date'].markAsTouched()"
              />
              <div
                class="text-xs text-error"
                *ngIf="
                  form.controls['dispatch_date'].touched &&
                  form.controls['dispatch_date'].invalid
                "
              >
                <span *ngIf="form.controls['dispatch_date'].errors?.['date']">
                  Please enter a valid date
                </span>
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm">Images</label>
              <input
                #fileInput
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                (change)="onFilesSelected($event)"
              />

              <div
                class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                [ngClass]="{
                  'border-primary': isDragging,
                  'bg-primary/5': isDragging,
                }"
                (click)="openFilePicker()"
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
                    PNG, JPG up to 10 files
                  </div>
                </div>
              </div>

              <div
                class="text-xs text-text-muted"
                *ngIf="selectedFiles.length > 0"
              >
                {{ selectedFiles.length }} file(s) selected (max 10)
              </div>

              <div
                class="grid grid-cols-5 gap-2 mt-2"
                *ngIf="selectedPreviews.length > 0"
              >
                <div
                  class="relative group"
                  *ngFor="let img of selectedPreviews; let i = index"
                >
                  <img
                    [src]="img"
                    class="w-full h-20 object-cover border rounded"
                    alt="preview"
                  />
                  <button
                    type="button"
                    class="absolute top-1 right-1 bg-white/90 hover:bg-white border rounded-full p-1 shadow"
                    (click)="removeFile(i)"
                    aria-label="Remove image"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Document upload section -->
            <div class="space-y-2">
              <label class="text-sm">Documents</label>
              <input
                #documentInput
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                class="hidden"
                (change)="onDocumentsSelected($event)"
              />

              <div
                class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer select-none transition-colors"
                [ngClass]="{
                  'border-primary': isDocumentDragging,
                  'bg-primary/5': isDocumentDragging,
                }"
                (click)="openDocumentPicker()"
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
                    PDF, DOC, DOCX, TXT, XLS, XLSX up to 10 files
                  </div>
                </div>
              </div>

              <div
                class="text-xs text-text-muted"
                *ngIf="selectedDocuments.length > 0"
              >
                {{ selectedDocuments.length }} document(s) selected (max 10)
              </div>

              <div
                class="grid grid-cols-2 gap-2 mt-2"
                *ngIf="selectedDocuments.length > 0"
              >
                <div
                  class="relative group flex items-center justify-between p-2 border rounded"
                  *ngFor="let doc of selectedDocuments; let i = index"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-file text-sm text-neutral-500"></i>
                    <span class="text-sm truncate">{{ doc.name }}</span>
                  </div>
                  <button
                    type="button"
                    class="p-1 hover:bg-neutral-100 rounded"
                    (click)="removeDocument(i)"
                    aria-label="Remove document"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Metadata dynamic fields -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium">Additional details</label>
                <button
                  type="button"
                  class="text-primary text-sm"
                  (click)="addMetadataField()"
                >
                  + Add field
                </button>
              </div>
              <div
                class="rounded border border-neutral-200 divide-y"
                formArrayName="metadata"
              >
                <div
                  class="p-3 grid grid-cols-12 gap-2 items-start"
                  *ngFor="
                    let _ of metadata.controls;
                    let i = index;
                    trackBy: trackByIndex
                  "
                  [formGroupName]="i"
                >
                  <div class="col-span-5 relative">
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      placeholder="Field name (unique)"
                      formControlName="key"
                      (focus)="showKeySuggestions[i] = true"
                      (blur)="hideKeySuggestions(i)"
                      (input)="onMetadataKeyChange(i, $event)"
                    />
                    <div
                      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
                      *ngIf="
                        showKeySuggestions[i] && getKeySuggestions(i).length > 0
                      "
                    >
                      <div
                        class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        *ngFor="let key of getKeySuggestions(i)"
                        (mousedown)="selectMetadataKey(i, key)"
                      >
                        {{ key }}
                      </div>
                    </div>
                    <div
                      class="text-xs text-error"
                      *ngIf="
                        metadata.at(i).get('key')?.touched &&
                        metadata.at(i).get('key')?.invalid
                      "
                    >
                      Key is required and must be unique
                    </div>
                  </div>
                  <div class="col-span-4 relative">
                    <input
                      type="text"
                      class="w-full border rounded px-3 py-2"
                      placeholder="Value"
                      formControlName="value"
                      (focus)="showValueSuggestions[i] = true"
                      (blur)="hideValueSuggestions(i)"
                      (input)="onMetadataValueChange(i, $event)"
                    />
                    <div
                      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
                      *ngIf="
                        showValueSuggestions[i] &&
                        getValueSuggestions(i).length > 0
                      "
                    >
                      <div
                        class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        *ngFor="let value of getValueSuggestions(i)"
                        (mousedown)="selectMetadataValue(i, value)"
                      >
                        {{ value }}
                      </div>
                    </div>
                  </div>
                  <div class="col-span-2">
                    <select
                      class="w-full border rounded px-3 py-2"
                      formControlName="type"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div class="col-span-1 flex justify-end">
                    <button
                      type="button"
                      class="p-2 hover:bg-neutral-100 rounded"
                      (click)="removeMetadataField(i)"
                      aria-label="Remove field"
                    >
                      <i class="pi pi-trash text-sm"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="p-2 text-xs text-error"
                  *ngIf="metadata.errors?.['duplicateKeys']"
                >
                  Duplicate field names are not allowed.
                </div>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded border"
                (click)="onCancel()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-3 py-2 rounded bg-primary text-white transition-colors"
                [class.opacity-50]="loading || form.invalid"
                [class.cursor-not-allowed]="loading || form.invalid"
                [disabled]="loading || form.invalid"
                title="{{
                  form.invalid
                    ? 'Please fix validation errors before submitting'
                    : ''
                }}"
              >
                <span *ngIf="!loading">Create</span>
                <span *ngIf="loading">Creating...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class CreateMachineModalComponent
  implements OnInit, OnDestroy, OnChanges
{
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('documentInput') documentInput!: ElementRef<HTMLInputElement>;
  private _visible = false;
  @Input() set visible(v: boolean) {
    this._visible = v;
    if (v) {
      // Refresh categories each time modal opens to stay in sync
      this.fetchCategories();
      // Reset subcategories and sequence when modal opens
      this.subcategories = [];
      this.form.patchValue({ subcategory_id: '', machine_sequence: '' });
      this.selectedSequence = '';
      // Load metadata suggestions
      this.loadMetadataSuggestions();
    }
  }
  get visible() {
    return this._visible;
  }
  @Output() cancel = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  form: FormGroup;
  categories: Array<{ _id: string; name: string; level?: number }> = [];
  subcategories: Array<{ _id: string; name: string }> = [];
  categoriesLoading = false;
  selectedFiles: File[] = [];
  selectedPreviews: string[] = [];
  selectedDocuments: File[] = [];
  loading = false;
  isDragging = false;
  isDocumentDragging = false;

  // Sequence generation
  isGeneratingSequence = false;
  selectedSequence = '';

  // Metadata suggestions
  allMetadataKeys: string[] = [];
  metadataKeySuggestions: { [key: string]: string[] } = {}; // key -> array of values
  showKeySuggestions: { [index: number]: boolean } = {};
  showValueSuggestions: { [index: number]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private baseApi: BaseApiService,
    private messageService: MessageService,
    private categoryService: CategoryService,
    private machineService: MachineService
  ) {
    this.form = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z0-9\s\-_&().,/]+$/),
        ],
      ],
      category_id: [
        '',
        [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)],
      ],
      subcategory_id: ['', [Validators.pattern(/^[0-9a-fA-F]{24}$/)]],
      party_name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z0-9\s\-_&().,/]+$/),
        ],
      ],
      location: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      mobile_number: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(20),
          Validators.pattern(/^[+]?[0-9\s\-()]+$/),
          this.mobileNumberValidator,
        ],
      ],
      dispatch_date: [''],
      machine_sequence: [''],
      metadata: this.fb.array([], [this.uniqueKeysValidator]),
    });
  }

  ngOnInit(): void {}

  ngOnChanges(_changes: SimpleChanges): void {}

  ngOnDestroy(): void {
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
  }

  onCancel(): void {
    if (!this.loading) this.cancel.emit();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.acceptFiles(files);
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) return;
    const [removed] = this.selectedPreviews.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed);
    this.selectedFiles.splice(index, 1);
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

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
    const files = event.dataTransfer?.files
      ? Array.from(event.dataTransfer.files)
      : [];
    this.acceptFiles(files);
  }

  private acceptFiles(files: File[]): void {
    const maxImages = 10; // Backend allows max 10 images
    const limited = files.slice(
      0,
      Math.max(0, maxImages - this.selectedFiles.length)
    );
    if (limited.length === 0) {
      if (this.selectedFiles.length >= maxImages) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Limit reached',
          detail: 'Cannot upload more than 10 images',
        });
      }
      return;
    }
    this.selectedFiles = [...this.selectedFiles, ...limited];
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedPreviews = this.selectedFiles.map(f => URL.createObjectURL(f));
  }

  // Document handling methods
  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.acceptDocuments(files);
  }

  removeDocument(index: number): void {
    if (index < 0 || index >= this.selectedDocuments.length) return;
    this.selectedDocuments.splice(index, 1);
  }

  openDocumentPicker(): void {
    this.documentInput?.nativeElement.click();
  }

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
    const files = event.dataTransfer?.files
      ? Array.from(event.dataTransfer.files)
      : [];
    this.acceptDocuments(files);
  }

  private acceptDocuments(files: File[]): void {
    const limited = files.slice(
      0,
      Math.max(0, 10 - this.selectedDocuments.length)
    );
    if (limited.length === 0) return;
    this.selectedDocuments = [...this.selectedDocuments, ...limited];
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    // Mark all metadata fields as touched
    this.metadata.controls.forEach(control => {
      control.get('key')?.markAsTouched();
    });

    if (this.form.invalid || this.loading) {
      if (this.form.invalid) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fix the errors in the form before submitting.',
        });
      }
      return;
    }
    const formData = new FormData();
    // Trim all string values before submission
    formData.append('name', this.form.value.name.trim());
    formData.append('category_id', this.form.value.category_id.trim());
    // Only append subcategory_id if it's provided and not empty
    const subcategoryId = this.form.value.subcategory_id?.trim();
    if (subcategoryId) {
      formData.append('subcategory_id', subcategoryId);
    }
    formData.append('party_name', this.form.value.party_name.trim());
    formData.append('location', this.form.value.location.trim());
    formData.append('mobile_number', this.form.value.mobile_number.trim());
    // Always append dispatch_date (empty string will be converted to null on backend)
    const dispatchDate = this.form.value.dispatch_date || '';
    formData.append('dispatch_date', dispatchDate);
    // Only append machine_sequence if it has a value
    const machineSequence = this.form.value.machine_sequence?.trim();
    if (machineSequence) {
      formData.append('machine_sequence', machineSequence);
    }

    const metaObj: Record<string, unknown> = {};
    for (const group of this.metadataControls) {
      const key = (group.get('key')?.value || '').trim();
      if (!key) continue;
      const type = group.get('type')?.value as 'string' | 'number' | 'boolean';
      const raw = group.get('value')?.value as string;
      let parsed: unknown = raw;
      if (type === 'number') parsed = raw === '' ? null : Number(raw);
      if (type === 'boolean') parsed = String(raw).toLowerCase() === 'true';
      metaObj[key] = parsed;
    }
    if (Object.keys(metaObj).length > 0) {
      formData.append('metadata', JSON.stringify(metaObj));
    }

    // Add image files
    for (const f of this.selectedFiles) formData.append('images', f);

    // Add document files
    for (const f of this.selectedDocuments) formData.append('documents', f);

    this.loading = true;
    this.baseApi.post<any>(API_ENDPOINTS.MACHINES, formData).subscribe({
      next: (response: any) => {
        const machineId = response?.data?.machine?._id || response?.data?._id;

        // Auto-generate sequence after machine creation
        if (machineId && !machineSequence) {
          this.autoGenerateSequenceAfterCreation(machineId);
        } else {
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Created',
            detail: 'Machine created and pending approval.',
          });
          this.created.emit();
        }
      },
      error: err => {
        this.loading = false;
        const detail = err?.error?.message || 'Failed to create machine';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
        });
      },
    });
  }

  private fetchCategories(): void {
    this.categoriesLoading = true;
    this.categoryService
      .getAllCategories({ includeInactive: false })
      .subscribe({
        next: res => {
          const data: any = res.data || [];
          // Filter to show only main categories (level 0) in the main dropdown
          this.categories = data.filter((cat: any) => cat.level === 0);
          this.categoriesLoading = false;
        },
        error: () => {
          this.categoriesLoading = false;
        },
      });
  }

  onCategoryChange(): void {
    // Reset subcategory and sequence when category changes
    this.subcategories = [];
    this.form.patchValue({ subcategory_id: '', machine_sequence: '' });
    this.selectedSequence = '';

    // Load subcategories for the selected category
    const categoryId = this.form.get('category_id')?.value;
    if (categoryId) {
      this.loadSubcategories(categoryId);
    }
  }

  generateSequence(): void {
    const categoryId = this.form.get('category_id')?.value;
    const subcategoryId = this.form.get('subcategory_id')?.value;

    if (!categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Category Required',
        detail: 'Please select a category first',
      });
      return;
    }

    this.isGeneratingSequence = true;

    const request: SequenceGenerationRequest = {
      categoryId: categoryId,
      subcategoryId: subcategoryId || undefined,
    };

    this.categoryService.generateSequence(request).subscribe({
      next: (response: any) => {
        this.selectedSequence = response.data.sequence;
        this.isGeneratingSequence = false;

        // Update the form with the generated sequence
        this.form.patchValue({ machine_sequence: this.selectedSequence });
      },
      error: (error: any) => {
        console.error('Error generating sequence:', error);
        this.isGeneratingSequence = false;
        const errorMessage =
          error?.error?.message || error?.message || 'Unknown error';
        this.messageService.add({
          severity: 'error',
          summary: 'Generation Failed',
          detail: `Failed to generate sequence: ${errorMessage}`,
        });
      },
    });
  }

  loadSubcategories(categoryId: string): void {
    this.categoryService
      .getAllCategories({ includeInactive: false, parentId: categoryId })
      .subscribe({
        next: res => {
          this.subcategories = res.data || [];
        },
        error: () => {
          this.subcategories = [];
        },
      });
  }

  // Metadata helpers
  get metadata(): FormArray {
    return this.form.get('metadata') as FormArray;
  }

  get metadataControls(): FormGroup[] {
    return this.metadata.controls as unknown as FormGroup[];
  }

  addMetadataField(): void {
    const group = this.fb.group({
      key: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-Z0-9_\-\. ]+$/)],
      ],
      value: [''],
      type: ['string', Validators.required],
    });
    this.metadata.push(group);
    this.metadata.updateValueAndValidity();
  }

  removeMetadataField(index: number): void {
    if (index < 0 || index >= this.metadata.length) return;
    this.metadata.removeAt(index);
    this.metadata.updateValueAndValidity();
  }

  trackByIndex(_i: number): number {
    return _i;
  }

  uniqueKeysValidator = (control: AbstractControl) => {
    const arr = (control as FormArray).controls as Array<FormGroup>;
    const seen = new Set<string>();
    for (const g of arr) {
      const key = String(g.get('key')?.value || '')
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        return { duplicateKeys: true };
      }
      seen.add(key);
    }
    return null;
  };

  // Custom mobile number validator - counts actual digits
  mobileNumberValidator = (
    control: AbstractControl
  ): { [key: string]: any } | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const value = String(control.value).trim();

    // Remove formatting characters to count actual digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    const digitCount = digitsOnly.length;

    // Validate digit count (10-15 digits is standard for phone numbers)
    if (digitCount < 10) {
      return {
        mobileNumberDigits: {
          actual: digitCount,
          required: 10,
          message: 'Mobile number must contain at least 10 digits',
        },
      };
    }

    if (digitCount > 15) {
      return {
        mobileNumberDigits: {
          actual: digitCount,
          max: 15,
          message: 'Mobile number cannot contain more than 15 digits',
        },
      };
    }

    // Additional validation: if starts with +, ensure it's followed by digits
    if (value.startsWith('+') && digitCount < 10) {
      return {
        mobileNumberFormat: {
          message:
            'Invalid phone number format. Country code must be followed by at least 10 digits',
        },
      };
    }

    return null;
  };

  // Load metadata suggestions from all existing machines (across multiple pages)
  loadMetadataSuggestions(): void {
    const keysSet = new Set<string>();
    const keyValueMap: { [key: string]: Set<string> } = {};
    const limit = 100; // Backend limit is 100
    let totalPages = 1;

    const fetchPage = (page: number): void => {
      this.machineService.getAllMachines({ limit, page }).subscribe({
        next: (response: any) => {
          const machines = response?.machines || response?.data?.machines || [];
          const total = response?.total || response?.data?.total || 0;
          totalPages = Math.ceil(total / limit);

          // Extract metadata keys and values from this page
          machines.forEach((machine: any) => {
            if (machine.metadata && typeof machine.metadata === 'object') {
              Object.keys(machine.metadata).forEach(key => {
                if (key && key.trim()) {
                  keysSet.add(key.trim());
                  if (!keyValueMap[key.trim()]) {
                    keyValueMap[key.trim()] = new Set<string>();
                  }
                  const value = machine.metadata[key];
                  if (value !== null && value !== undefined) {
                    keyValueMap[key.trim()].add(String(value));
                  }
                }
              });
            }
          });

          // If there are more pages, fetch next page (limit to 10 pages = 1000 machines)
          if (page < totalPages && page < 10) {
            fetchPage(page + 1);
          } else {
            // Done fetching, update the suggestions
            this.allMetadataKeys = Array.from(keysSet).sort();
            Object.keys(keyValueMap).forEach(key => {
              this.metadataKeySuggestions[key] = Array.from(keyValueMap[key])
                .sort()
                .slice(0, 20); // Limit to 20 values per key
            });
          }
        },
        error: () => {
          // On error, use whatever keys we've collected so far
          this.allMetadataKeys = Array.from(keysSet).sort();
          Object.keys(keyValueMap).forEach(key => {
            this.metadataKeySuggestions[key] = Array.from(keyValueMap[key])
              .sort()
              .slice(0, 20);
          });
        },
      });
    };

    fetchPage(1);
  }

  // Get filtered key suggestions based on input
  getKeySuggestions(index: number): string[] {
    const currentValue = this.metadata.at(index)?.get('key')?.value || '';
    if (!currentValue) {
      return this.allMetadataKeys.slice(0, 10);
    }
    const lowerValue = currentValue.toLowerCase();
    return this.allMetadataKeys
      .filter(key => key.toLowerCase().includes(lowerValue))
      .slice(0, 10);
  }

  // Get filtered value suggestions based on selected key
  getValueSuggestions(index: number): string[] {
    const key = this.metadata.at(index)?.get('key')?.value || '';
    const currentValue = this.metadata.at(index)?.get('value')?.value || '';
    if (!key || !this.metadataKeySuggestions[key]) {
      return [];
    }
    if (!currentValue) {
      return this.metadataKeySuggestions[key].slice(0, 10);
    }
    const lowerValue = currentValue.toLowerCase();
    return this.metadataKeySuggestions[key]
      .filter(val => String(val).toLowerCase().includes(lowerValue))
      .slice(0, 10);
  }

  // Handle metadata key input change
  onMetadataKeyChange(_index: number, _event: Event): void {
    // Suggestions are shown automatically on focus/input
  }

  // Handle metadata value input change
  onMetadataValueChange(_index: number, _event: Event): void {
    // Suggestions are shown automatically on focus/input
  }

  // Hide key suggestions with delay
  hideKeySuggestions(index: number): void {
    setTimeout(() => {
      this.showKeySuggestions[index] = false;
    }, 200);
  }

  // Hide value suggestions with delay
  hideValueSuggestions(index: number): void {
    setTimeout(() => {
      this.showValueSuggestions[index] = false;
    }, 200);
  }

  // Select a metadata key from suggestions
  selectMetadataKey(index: number, key: string): void {
    this.metadata.at(index)?.patchValue({ key });
    this.showKeySuggestions[index] = false;
    // Focus on value field
    setTimeout(() => {
      const valueInput = document.querySelector(
        'input[formcontrolname="value"]'
      ) as HTMLInputElement;
      if (valueInput) valueInput.focus();
    }, 100);
  }

  // Select a metadata value from suggestions
  selectMetadataValue(index: number, value: string): void {
    this.metadata.at(index)?.patchValue({ value: String(value) });
    this.showValueSuggestions[index] = false;
  }

  // Auto-generate sequence after machine creation
  autoGenerateSequenceAfterCreation(machineId: string): void {
    const categoryId = this.form.get('category_id')?.value;
    const subcategoryId = this.form.get('subcategory_id')?.value;

    if (!categoryId) {
      this.loading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Machine created and pending approval.',
      });
      this.created.emit();
      return;
    }

    this.isGeneratingSequence = true;

    const request: SequenceGenerationRequest = {
      categoryId: categoryId,
      subcategoryId: subcategoryId || undefined,
    };

    this.categoryService.generateSequence(request).subscribe({
      next: (response: any) => {
        const generatedSequence = response.data.sequence;

        // Update the machine with the generated sequence
        this.machineService
          .updateMachineSequence(machineId, generatedSequence)
          .subscribe({
            next: () => {
              this.isGeneratingSequence = false;
              this.loading = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Created',
                detail: `Machine created with sequence ${generatedSequence} and pending approval.`,
              });
              this.created.emit();
            },
            error: (error: any) => {
              console.error('Error updating sequence:', error);
              this.isGeneratingSequence = false;
              this.loading = false;
              // Machine was created successfully, just sequence update failed
              this.messageService.add({
                severity: 'success',
                summary: 'Created',
                detail:
                  'Machine created and pending approval. Sequence generation failed - you can generate it manually.',
              });
              this.created.emit();
            },
          });
      },
      error: (error: any) => {
        console.error('Error generating sequence:', error);
        this.isGeneratingSequence = false;
        this.loading = false;
        // Machine was created successfully, just sequence generation failed
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail:
            'Machine created and pending approval. Sequence generation failed - you can generate it manually.',
        });
        this.created.emit();
      },
    });
  }
}
