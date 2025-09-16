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
        class="bg-white w-full max-w-lg rounded-xl shadow-xl border border-neutral-300"
      >
        <div
          class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
        >
          <h3 class="font-medium">Create Machine</h3>
          <button class="p-2 hover:bg-neutral-100 rounded" (click)="onCancel()">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <form class="p-4 space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="space-y-1">
            <label class="text-sm">Name</label>
            <input
              type="text"
              class="w-full border rounded px-3 py-2"
              formControlName="name"
            />
            <div
              class="text-xs text-error"
              *ngIf="
                form.controls['name'].touched && form.controls['name'].invalid
              "
            >
              Name is required (min 2 characters)
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-sm">Category</label>
            <select
              class="w-full border rounded px-3 py-2"
              formControlName="category_id"
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
              Category is required
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
                  <span class="text-primary font-medium">Click to upload</span>
                  or drag and drop
                </div>
                <div class="text-xs text-neutral-500">
                  PNG, JPG up to 5 files
                </div>
              </div>
            </div>

            <div
              class="text-xs text-text-muted"
              *ngIf="selectedFiles.length > 0"
            >
              {{ selectedFiles.length }} file(s) selected (max 5)
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
                <div class="col-span-5">
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2"
                    placeholder="Field name (unique)"
                    formControlName="key"
                  />
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
                <div class="col-span-4">
                  <input
                    type="text"
                    class="w-full border rounded px-3 py-2"
                    placeholder="Value"
                    formControlName="value"
                  />
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
              class="px-3 py-2 rounded bg-primary text-white"
              [disabled]="loading || form.invalid"
            >
              <span *ngIf="!loading">Create</span>
              <span *ngIf="loading">Creating...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CreateMachineModalComponent
  implements OnInit, OnDestroy, OnChanges
{
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private _visible = false;
  @Input() set visible(v: boolean) {
    this._visible = v;
    if (v) {
      // Refresh categories each time modal opens to stay in sync
      this.fetchCategories();
    }
  }
  get visible() {
    return this._visible;
  }
  @Output() cancel = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  form: FormGroup;
  categories: Array<{ _id: string; name: string }> = [];
  categoriesLoading = false;
  selectedFiles: File[] = [];
  selectedPreviews: string[] = [];
  loading = false;
  isDragging = false;

  constructor(
    private fb: FormBuilder,
    private baseApi: BaseApiService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category_id: ['', Validators.required],
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
    const limited = files.slice(0, Math.max(0, 5 - this.selectedFiles.length));
    if (limited.length === 0) return;
    this.selectedFiles = [...this.selectedFiles, ...limited];
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedPreviews = this.selectedFiles.map(f => URL.createObjectURL(f));
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    const formData = new FormData();
    formData.append('name', this.form.value.name);
    formData.append('category_id', this.form.value.category_id);
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
    for (const f of this.selectedFiles) formData.append('images', f);

    this.loading = true;
    this.baseApi.post<any>(API_ENDPOINTS.MACHINES, formData).subscribe({
      next: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Machine created and pending approval.',
        });
        this.created.emit();
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
    this.baseApi.get<any>(API_ENDPOINTS.CATEGORY_ACTIVE).subscribe({
      next: res => {
        const data: any = (res as any).data || res;
        this.categories = Array.isArray(data)
          ? data
          : data.categories || data?.data?.categories || [];
        this.categoriesLoading = false;
      },
      error: () => {
        this.categoriesLoading = false;
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
}
