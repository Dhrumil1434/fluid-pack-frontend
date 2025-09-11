import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-pagination.component.html',
})
export class TablePaginationComponent {
  @Input() page = 1;
  @Input() pages = 1;
  @Input() total = 0;
  @Input() limit = 10;
  @Input() limits: number[] = [10, 20, 30, 50];

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  get startIndex(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get endIndex(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  get displayLimits(): number[] {
    const set = new Set<number>([...this.limits, this.limit].filter(n => !!n));
    return Array.from(set).sort((a, b) => a - b);
  }

  onPrev(): void {
    if (this.page > 1) this.pageChange.emit(this.page - 1);
  }

  onNext(): void {
    const hasMore = this.pages
      ? this.page < this.pages
      : this.endIndex < this.total;
    if (hasMore) this.pageChange.emit(this.page + 1);
  }

  onGoTo(p: number | string): void {
    const pageNum = Number(p);
    if (
      !Number.isNaN(pageNum) &&
      pageNum !== this.page &&
      pageNum >= 1 &&
      (!this.pages || pageNum <= this.pages)
    ) {
      this.pageChange.emit(pageNum);
    }
  }

  onLimitChange(value: string): void {
    const newLimit = Number(value);
    if (!Number.isNaN(newLimit) && newLimit > 0) {
      this.limitChange.emit(newLimit);
    }
  }

  // Build a short list of page numbers with ellipsis
  get pageItems(): Array<number | '…'> {
    const items: Array<number | '…'> = [];
    const total = this.pages || 1;
    const current = this.page;
    const pushUnique = (n: number | '…') => {
      if (items[items.length - 1] !== n) items.push(n);
    };

    for (let p = 1; p <= total; p += 1) {
      const isEdge = p === 1 || p === 2 || p === total || p === total - 1;
      const isNear = Math.abs(p - current) <= 1;
      if (isEdge || isNear) {
        pushUnique(p);
      } else if (items[items.length - 1] !== '…') {
        pushUnique('…');
      }
    }
    return items;
  }

  // trackBy helpers for template performance and lint compliance
  trackByLimit = (_: number, item: number) => item;
  trackByPage = (_: number, item: number | '…') => item as any;
}
