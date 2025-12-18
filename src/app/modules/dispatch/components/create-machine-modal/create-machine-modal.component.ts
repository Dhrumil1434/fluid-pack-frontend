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
import { FormsModule } from '@angular/forms';
import { BaseApiService } from '../../../../core/services/base-api.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ElementRef, ViewChild } from '@angular/core';
import { CategoryService } from '../../../../core/services/category.service';
import { SequenceGenerationRequest } from '../../../../core/models/category.model';
import { MachineService } from '../../../../core/services/machine.service';
import { SOService } from '../../../../core/services/so.service';
import { SO } from '../../../../core/models/so.model';
import { NgxDocViewerModule } from 'ngx-doc-viewer';

@Component({
  selector: 'app-create-machine-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ToastModule,
    NgxDocViewerModule,
  ],
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
              <label class="text-sm">SO (Sales Order) *</label>
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
                <span *ngIf="form.controls['so_id'].errors?.['pattern']">
                  Invalid SO ID format
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
                  <div>
                    <span class="font-medium">Status:</span>
                    <span
                      class="px-2 py-0.5 rounded text-xs"
                      [ngClass]="{
                        'bg-green-100 text-green-800': selectedSO.is_active,
                        'bg-red-100 text-red-800': !selectedSO.is_active,
                      }"
                    >
                      {{ selectedSO.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-sm">Machine Sequence</label>
                <button
                  *ngIf="selectedSO"
                  type="button"
                  class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  (click)="generateSequence()"
                  [disabled]="isGeneratingSequence"
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
              <div class="text-xs text-gray-500">
                <span *ngIf="selectedSO">
                  Sequence will be generated based on selected SO's category
                </span>
                <span *ngIf="!selectedSO">
                  Select an SO to generate sequence
                </span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">Dispatch Date (DD/MM/YYYY)</label>
              <input
                type="text"
                class="w-full border rounded px-3 py-2"
                [class.border-red-500]="
                  form.controls['dispatch_date'].touched &&
                  form.controls['dispatch_date'].invalid
                "
                formControlName="dispatch_date"
                placeholder="DD/MM/YYYY"
                maxlength="10"
                (blur)="
                  formatDispatchDate();
                  form.controls['dispatch_date'].markAsTouched()
                "
                (input)="onDispatchDateInput($event)"
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
                <span
                  *ngIf="form.controls['dispatch_date'].errors?.['invalidDate']"
                >
                  Invalid date format. Please use DD/MM/YYYY
                </span>
                <span
                  *ngIf="
                    form.controls['dispatch_date'].errors?.['invalidFormat']
                  "
                >
                  Date must be in DD/MM/YYYY format
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
                class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2"
                *ngIf="selectedDocuments.length > 0"
              >
                <div
                  class="relative group flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  *ngFor="let doc of selectedDocuments; let i = index"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 rounded-lg flex items-center justify-center"
                        [ngClass]="{
                          'bg-red-100': isPdfFile(doc),
                          'bg-blue-100': isWordFile(doc),
                          'bg-green-100': isExcelFile(doc),
                          'bg-gray-100':
                            !isPdfFile(doc) &&
                            !isWordFile(doc) &&
                            !isExcelFile(doc),
                        }"
                      >
                        <i
                          class="text-lg"
                          [ngClass]="{
                            'pi pi-file-pdf text-red-600': isPdfFile(doc),
                            'pi pi-file-word text-blue-600': isWordFile(doc),
                            'pi pi-file-excel text-green-600': isExcelFile(doc),
                            'pi pi-file text-gray-600':
                              !isPdfFile(doc) &&
                              !isWordFile(doc) &&
                              !isExcelFile(doc),
                          }"
                        ></i>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div
                        class="text-sm font-medium text-gray-900 truncate"
                        [title]="doc.name"
                      >
                        {{ doc.name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ formatFileSize(doc.size) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      (click)="previewDocument(doc, i)"
                      [title]="'Preview ' + doc.name"
                      aria-label="Preview document"
                    >
                      <i class="pi pi-eye text-sm"></i>
                    </button>
                    <button
                      type="button"
                      class="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      (click)="removeDocument(i)"
                      aria-label="Remove document"
                    >
                      <i class="pi pi-times text-sm"></i>
                    </button>
                  </div>
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

    <!-- Document Preview Modal -->
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
      *ngIf="previewDocumentVisible"
      (click)="closeDocumentPreview()"
    >
      <div
        class="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <div
          class="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              [ngClass]="{
                'bg-red-100': previewedDocument && isPdfFile(previewedDocument),
                'bg-blue-100':
                  previewedDocument && isWordFile(previewedDocument),
                'bg-green-100':
                  previewedDocument && isExcelFile(previewedDocument),
                'bg-gray-100':
                  previewedDocument &&
                  !isPdfFile(previewedDocument) &&
                  !isWordFile(previewedDocument) &&
                  !isExcelFile(previewedDocument),
              }"
            >
              <i
                class="text-xl"
                [ngClass]="{
                  'pi pi-file-pdf text-red-600':
                    previewedDocument && isPdfFile(previewedDocument),
                  'pi pi-file-word text-blue-600':
                    previewedDocument && isWordFile(previewedDocument),
                  'pi pi-file-excel text-green-600':
                    previewedDocument && isExcelFile(previewedDocument),
                  'pi pi-file text-gray-600':
                    previewedDocument &&
                    !isPdfFile(previewedDocument) &&
                    !isWordFile(previewedDocument) &&
                    !isExcelFile(previewedDocument),
                }"
              ></i>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                {{ previewedDocument?.name || 'Document Preview' }}
              </h3>
              <p class="text-sm text-gray-500" *ngIf="previewedDocument">
                {{ formatFileSize(previewedDocument.size) }}
              </p>
            </div>
          </div>
          <button
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            (click)="closeDocumentPreview()"
          >
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div
            *ngIf="previewLoading"
            class="flex items-center justify-center py-12"
          >
            <div class="flex items-center gap-3 text-gray-500">
              <i class="pi pi-spinner pi-spin text-2xl"></i>
              <span>Loading preview...</span>
            </div>
          </div>
          <div
            *ngIf="!previewLoading && previewedDocument && documentPreviewUrl"
            class="w-full"
          >
            <!-- Use ngx-doc-viewer for Office documents and PDFs -->
            <div
              *ngIf="
                isOfficeFile(previewedDocument) || isPdfFile(previewedDocument)
              "
              class="w-full border rounded-lg overflow-hidden"
            >
              <ngx-doc-viewer
                [url]="documentPreviewUrl"
                [viewer]="getViewerType(previewedDocument)"
                style="width: 100%; height: 70vh;"
              ></ngx-doc-viewer>
            </div>
            <!-- Image Preview -->
            <div
              *ngIf="isImageFile(previewedDocument)"
              class="flex justify-center"
            >
              <img
                [src]="documentPreviewUrl"
                [alt]="previewedDocument.name"
                class="max-w-full max-h-[70vh] object-contain rounded-lg border"
              />
            </div>
            <!-- Text Preview (for .txt files) -->
            <div *ngIf="isTextFile(previewedDocument)" class="w-full">
              <div
                class="bg-gray-50 border rounded-lg p-4 max-h-[70vh] overflow-y-auto"
              >
                <pre class="text-sm whitespace-pre-wrap font-mono">{{
                  previewTextContent
                }}</pre>
              </div>
            </div>
            <!-- Unsupported File Type -->
            <div
              *ngIf="
                !isOfficeFile(previewedDocument) &&
                !isPdfFile(previewedDocument) &&
                !isImageFile(previewedDocument) &&
                !isTextFile(previewedDocument)
              "
              class="flex flex-col items-center justify-center py-12"
            >
              <div
                class="w-24 h-24 rounded-full flex items-center justify-center mb-4 bg-gray-100"
              >
                <i class="pi pi-file text-4xl text-gray-600"></i>
              </div>
              <h4 class="text-lg font-semibold text-gray-900 mb-2">
                Preview Not Available
              </h4>
              <p class="text-sm text-gray-500 text-center mb-4">
                This file type cannot be previewed in the browser.
                <br />
                The file will be uploaded correctly and can be downloaded after
                creation.
              </p>
              <button
                type="button"
                class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                (click)="downloadPreviewedDocument()"
              >
                <i class="pi pi-download mr-2"></i>
                Download File
              </button>
            </div>
          </div>
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
      // Load active SOs each time modal opens
      this.loadActiveSOs();
      // Reset SO selection and sequence when modal opens
      this.selectedSO = null;
      this.soSearchInput = '';
      this.showSOSuggestions = false;
      this.form.patchValue({ so_id: '', machine_sequence: '' });
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

  // Document preview state
  previewDocumentVisible = false;
  previewedDocument: File | null = null;
  documentPreviewUrl: string | null = null;
  previewLoading = false;
  previewTextContent = '';

  // Sequence generation
  isGeneratingSequence = false;
  selectedSequence = '';

  // Metadata suggestions
  allMetadataKeys: string[] = [];
  metadataKeySuggestions: { [key: string]: string[] } = {}; // key -> array of values
  showKeySuggestions: { [index: number]: boolean } = {};
  showValueSuggestions: { [index: number]: boolean } = {};

  // SO Management
  activeSOs: SO[] = [];
  selectedSO: SO | null = null;
  soSearchInput = '';
  showSOSuggestions = false;
  soSuggestions: SO[] = [];

  constructor(
    private fb: FormBuilder,
    private baseApi: BaseApiService,
    private messageService: MessageService,
    private categoryService: CategoryService,
    private machineService: MachineService,
    private soService: SOService
  ) {
    this.form = this.fb.group({
      so_id: [
        '',
        [Validators.required, Validators.pattern(/^[0-9a-fA-F]{24}$/)],
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
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
    }
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

  // Document preview methods
  previewDocument(doc: File, _index: number): void {
    this.previewedDocument = doc;
    this.previewLoading = true;
    this.previewDocumentVisible = true;

    // Create blob URL for preview (local file preview)
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
    }

    // Create blob from file for ngx-doc-viewer
    const blob = new Blob([doc], { type: doc.type });
    this.documentPreviewUrl = URL.createObjectURL(blob);

    // For text files, read content
    if (this.isTextFile(doc)) {
      const reader = new FileReader();
      reader.onload = e => {
        this.previewTextContent = (e.target?.result as string) || '';
        this.previewLoading = false;
      };
      reader.onerror = () => {
        this.previewTextContent = 'Error reading file content.';
        this.previewLoading = false;
      };
      reader.readAsText(doc);
    } else {
      // Small delay to ensure blob URL is ready
      setTimeout(() => {
        this.previewLoading = false;
      }, 100);
    }
  }

  closeDocumentPreview(): void {
    this.previewDocumentVisible = false;
    if (this.documentPreviewUrl) {
      URL.revokeObjectURL(this.documentPreviewUrl);
      this.documentPreviewUrl = null;
    }
    this.previewedDocument = null;
    this.previewTextContent = '';
  }

  downloadPreviewedDocument(): void {
    if (!this.previewedDocument) return;
    const url = URL.createObjectURL(this.previewedDocument);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.previewedDocument.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // File type helpers
  isPdfFile(file: File): boolean {
    return (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
  }

  isWordFile(file: File): boolean {
    return (
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.doc') ||
      file.name.toLowerCase().endsWith('.docx')
    );
  }

  isExcelFile(file: File): boolean {
    return (
      file.type === 'application/vnd.ms-excel' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.xlsx')
    );
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  isTextFile(file: File): boolean {
    return (
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    );
  }

  isOfficeFile(file: File): boolean {
    return (
      this.isWordFile(file) ||
      this.isExcelFile(file) ||
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx')
    );
  }

  getViewerType(file: File): 'google' | 'office' | 'mammoth' | 'pdf' | 'url' {
    if (this.isPdfFile(file)) {
      return 'pdf';
    } else if (this.isOfficeFile(file)) {
      return 'office';
    }
    return 'url';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
    // Use machineService.createMachineForm which handles FormData creation
    const soId = this.form.value.so_id?.trim();
    if (!soId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'SO is required',
      });
      return;
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

    const machineSequence = this.form.value.machine_sequence?.trim();

    this.loading = true;
    this.machineService
      .createMachineForm({
        so_id: soId,
        dispatch_date: this.form.value.dispatch_date || undefined,
        images: this.selectedFiles.length > 0 ? this.selectedFiles : undefined,
        documents:
          this.selectedDocuments.length > 0
            ? this.selectedDocuments
            : undefined,
        metadata: Object.keys(metaObj).length > 0 ? metaObj : undefined,
      })
      .subscribe({
        next: (response: any) => {
          const machineId = response?.data?.machine?._id || response?.data?._id;

          // Auto-generate sequence after machine creation (using SO's category)
          if (machineId && !machineSequence && this.selectedSO?.category_id) {
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
    // Get category from selected SO
    if (!this.selectedSO || !this.selectedSO.category_id) {
      this.loading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Machine created and pending approval.',
      });
      this.created.emit();
      return;
    }

    const categoryId =
      typeof this.selectedSO.category_id === 'string'
        ? this.selectedSO.category_id
        : (this.selectedSO.category_id as any)?._id;

    const subcategoryId = this.selectedSO.subcategory_id
      ? typeof this.selectedSO.subcategory_id === 'string'
        ? this.selectedSO.subcategory_id
        : (this.selectedSO.subcategory_id as any)?._id
      : undefined;

    this.isGeneratingSequence = true;

    const request: SequenceGenerationRequest = {
      categoryId,
      subcategoryId,
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

  // SO Management Methods
  loadActiveSOs(): void {
    this.soService.getActiveSOs().subscribe({
      next: res => {
        if (res.success) {
          this.activeSOs = res.data || [];
          // Initialize suggestions with first 50 SOs for performance
          this.soSuggestions = this.activeSOs.slice(0, 50);
          console.log(`Loaded ${this.activeSOs.length} active SOs`);
        } else {
          console.warn('Failed to load active SOs:', res);
          this.activeSOs = [];
          this.soSuggestions = [];
        }
      },
      error: error => {
        console.error('Error loading active SOs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load SOs. Please refresh the page.',
        });
        this.activeSOs = [];
        this.soSuggestions = [];
      },
    });
  }

  onSOInputChange(): void {
    const query = this.soSearchInput.trim().toLowerCase();
    if (!query) {
      this.soSuggestions = this.activeSOs.slice(0, 50); // Limit to first 50 for performance
      this.showSOSuggestions = false;
      return;
    }

    // Enhanced search: search in SO number, Customer, PO number, Party name, and mobile number
    this.soSuggestions = this.activeSOs
      .filter(so => {
        const soNumberMatch =
          so.so_number?.toLowerCase().includes(query) || false;
        const customerMatch =
          so.customer?.toLowerCase().includes(query) || false;
        const poNumberMatch =
          so.po_number?.toLowerCase().includes(query) || false;
        const partyMatch =
          so.party_name?.toLowerCase().includes(query) || false;
        const mobileMatch =
          so.mobile_number?.toLowerCase().includes(query) || false;
        const nameMatch = so.name?.toLowerCase().includes(query) || false;

        return (
          soNumberMatch ||
          customerMatch ||
          poNumberMatch ||
          partyMatch ||
          mobileMatch ||
          nameMatch
        );
      })
      .slice(0, 50); // Limit results to 50 for performance

    // Show suggestions if there are results OR if user has typed something (to show "no results" message)
    this.showSOSuggestions = true;
  }

  selectSO(so: SO): void {
    this.selectedSO = so;
    this.form.patchValue({ so_id: so._id });
    // Display format: SO Number or Customer - Party Name
    const displayName = so.so_number || so.customer || so.name || '';
    this.soSearchInput = `${displayName}${so.party_name ? ' - ' + so.party_name : ''}`;
    this.showSOSuggestions = false;
    this.form.get('so_id')?.markAsTouched();
  }

  clearSOSelection(): void {
    this.selectedSO = null;
    this.form.patchValue({ so_id: '' });
    this.soSearchInput = '';
    this.showSOSuggestions = false;
  }

  hideSOSuggestions(): void {
    setTimeout(() => {
      this.showSOSuggestions = false;
    }, 200);
  }

  // Date formatting methods for DD/MM/YYYY format
  onDispatchDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    // Format as DD/MM/YYYY
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }

    this.form.patchValue({ dispatch_date: value }, { emitEvent: false });
  }

  formatDispatchDate(): void {
    const control = this.form.get('dispatch_date');
    if (!control) return;

    const value = control.value?.trim();
    if (!value) {
      control.setValue('');
      return;
    }

    // Validate and format DD/MM/YYYY
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);

    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);

      // Validate date
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
        const date = new Date(year, month - 1, day);
        if (
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year
        ) {
          // Valid date, format as YYYY-MM-DD for backend
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          control.setValue(formattedDate, { emitEvent: false });
          control.setErrors(null);
          return;
        }
      }
    }

    // Invalid date format
    control.setErrors({ invalidDate: true });
  }
}
