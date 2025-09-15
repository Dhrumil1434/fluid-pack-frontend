import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { ListFiltersComponent } from '../shared/list/list-filters.component';

@Component({
  selector: 'app-role-filters',
  standalone: true,
  imports: [CommonModule, ListFiltersComponent],
  template: `
    <app-list-filters
      searchLabel="Search"
      searchPlaceholder="Search roles"
      (apply)="apply.emit()"
      (clear)="clear.emit()"
      (searchChange)="searchChange.emit($event)"
    >
      <div filters-extra class="min-w-[180px]"></div>
    </app-list-filters>
  `,
  styles: [':host { display: block; }'],
})
export class RoleFiltersComponent {
  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
}
