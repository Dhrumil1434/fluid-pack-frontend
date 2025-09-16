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
import { BaseApiService } from '../../../../core/services/base-api.service';
import { API_ENDPOINTS } from '../../../../core/constants/api.constants';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
          <div class="space-y-1">
            <label class="text-sm">Images</label>
            <input
              type="file"
              multiple
              (change)="onFilesSelected($event)"
              accept="image/*"
            />
            <div
              class="text-xs text-text-muted"
              *ngIf="selectedFiles.length > 0"
            >
              {{ selectedFiles.length }} file(s) selected (max 5)
            </div>
            <div
              class="flex gap-2 flex-wrap mt-2"
              *ngIf="selectedPreviews.length > 0"
            >
              <div
                class="relative"
                *ngFor="let img of selectedPreviews; let i = index"
              >
                <img
                  [src]="img"
                  class="w-16 h-16 object-cover border rounded"
                  alt="preview"
                />
                <button
                  type="button"
                  class="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                  (click)="removeFile(i)"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
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

  constructor(
    private fb: FormBuilder,
    private baseApi: BaseApiService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category_id: ['', Validators.required],
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
    const limited = files.slice(0, 5);
    this.selectedFiles = limited;
    this.selectedPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedPreviews = this.selectedFiles.map(f => URL.createObjectURL(f));
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.selectedFiles.length) return;
    const [removed] = this.selectedPreviews.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed);
    this.selectedFiles.splice(index, 1);
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    const formData = new FormData();
    formData.append('name', this.form.value.name);
    formData.append('category_id', this.form.value.category_id);
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
}
