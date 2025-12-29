import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SOService } from '../../../../core/services/so.service';
import { SO } from '../../../../core/models/so.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-so-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  template: `
    <p-toast></p-toast>
    <div
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"
      *ngIf="visible"
      (click)="onCancel()"
    >
      <div
        class="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-xl border border-neutral-300 flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0"
        >
          <h3 class="text-lg font-semibold text-gray-900">
            Search Sales Order
          </h3>
          <button
            class="p-2 hover:bg-neutral-100 rounded transition-colors"
            (click)="onCancel()"
            type="button"
          >
            <i class="pi pi-times text-gray-500"></i>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <div class="relative">
            <input
              #searchInput
              type="text"
              class="w-full border rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              placeholder="Search by SO number, Customer, PO number, Party name, or Mobile..."
              [ngModelOptions]="{ standalone: true }"
            />
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            ></i>
            <button
              *ngIf="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              (click)="clearSearch()"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading State -->
          <div *ngIf="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3 text-gray-500">
              <i class="pi pi-spinner pi-spin text-2xl"></i>
              <span>Loading SOs...</span>
            </div>
          </div>

          <!-- SO List -->
          <div *ngIf="!loading && sos.length > 0" class="p-6">
            <div class="space-y-2">
              <div
                *ngFor="let so of sos"
                class="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-primary cursor-pointer transition-colors"
                (click)="selectSO(so)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h4 class="font-semibold text-gray-900">
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
                      </h4>
                      <span
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        [ngClass]="{
                          'bg-green-100 text-green-800': so.is_active,
                          'bg-red-100 text-red-800': !so.is_active,
                        }"
                      >
                        {{ so.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </div>
                    <div
                      class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600"
                    >
                      <div *ngIf="so.customer">
                        <span class="font-medium">Customer:</span>
                        {{ so.customer }}
                      </div>
                      <div *ngIf="so.po_number">
                        <span class="font-medium">PO Number:</span>
                        {{ so.po_number }}
                      </div>
                      <div *ngIf="so.party_name">
                        <span class="font-medium">Party:</span>
                        {{ so.party_name }}
                      </div>
                      <div *ngIf="so.location">
                        <span class="font-medium">Location:</span>
                        {{ so.location }}
                      </div>
                      <div *ngIf="so.mobile_number">
                        <span class="font-medium">Mobile:</span>
                        {{ so.mobile_number }}
                      </div>
                      <div>
                        <span class="font-medium">Category:</span>
                        {{
                          so.category_id && typeof so.category_id === 'object'
                            ? so.category_id.name
                            : 'N/A'
                        }}
                      </div>
                      <div>
                        <span class="font-medium">Subcategory:</span>
                        {{ so.subcategory_id?.name || 'N/A' }}
                      </div>
                      <div *ngIf="so.createdAt">
                        <span class="font-medium">Created:</span>
                        {{ formatDate(so.createdAt) }}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="ml-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
                    (click)="selectSO(so); $event.stopPropagation()"
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            *ngIf="!loading && sos.length === 0"
            class="flex flex-col items-center justify-center py-12 px-6"
          >
            <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
            <p class="text-gray-500 text-center">
              <span *ngIf="searchQuery"
                >No SOs found matching "{{ searchQuery }}"</span
              >
              <span *ngIf="!searchQuery">No SOs available</span>
            </p>
          </div>
        </div>

        <!-- Pagination -->
        <div
          *ngIf="!loading && totalPages > 1"
          class="px-6 py-4 border-t border-neutral-200 flex items-center justify-between flex-shrink-0"
        >
          <div class="text-sm text-gray-600">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to
            {{ Math.min(currentPage * pageSize, total) }} of {{ total }} SOs
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 border rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              [disabled]="currentPage === 1"
              (click)="goToPage(currentPage - 1)"
            >
              <i class="pi pi-chevron-left"></i>
            </button>
            <div class="flex items-center gap-1">
              <button
                *ngFor="let page of getPageNumbers()"
                type="button"
                class="px-3 py-1.5 border rounded-lg transition-colors"
                [class.bg-primary]="page === currentPage"
                [class.text-white]="page === currentPage"
                [class.hover:bg-neutral-50]="page !== currentPage"
                [class.border-primary]="page === currentPage"
                (click)="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 border rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              [disabled]="currentPage === totalPages"
              (click)="goToPage(currentPage + 1)"
            >
              <i class="pi pi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SOSearchModalComponent implements OnInit, OnChanges {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Input() visible = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() soSelected = new EventEmitter<SO>();

  searchQuery = '';
  sos: SO[] = [];
  loading = false;
  currentPage = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;
  Math = Math;

  private searchTimeout: any;

  constructor(
    private soService: SOService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.visible) {
      this.loadSOs();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      // Reset state when modal opens
      this.searchQuery = '';
      this.currentPage = 1;
      this.sos = [];
      // Load SOs and focus search input
      setTimeout(() => {
        this.loadSOs();
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  onSearchInput(): void {
    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1; // Reset to first page on new search
      this.loadSOs();
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadSOs();
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  loadSOs(): void {
    this.loading = true;
    const filters: any = {
      page: this.currentPage,
      limit: this.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc', // Latest first
    };

    if (this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
    }

    this.soService.getAllSOs(filters).subscribe({
      next: response => {
        if (response.success) {
          const data = response.data;
          this.sos = data.sos || [];
          this.total = data.total || 0;
          this.currentPage = data.page || 1;
          this.totalPages = data.pages || 0;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load SOs',
          });
          this.sos = [];
        }
        this.loading = false;
      },
      error: error => {
        console.error('Error loading SOs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'Failed to load SOs',
        });
        this.sos = [];
        this.loading = false;
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadSOs();
      // Scroll to top of list
      const content = document.querySelector('.overflow-y-auto');
      if (content) {
        content.scrollTop = 0;
      }
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxPagesToShow / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  selectSO(so: SO): void {
    this.soSelected.emit(so);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
