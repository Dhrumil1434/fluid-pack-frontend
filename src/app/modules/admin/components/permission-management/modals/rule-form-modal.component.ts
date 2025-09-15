import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rule-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="visible"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-bg border border-neutral-300 rounded-xl shadow-high w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div
          class="px-5 py-3 border-b border-neutral-300 flex items-center justify-between sticky top-0 bg-bg rounded-t-xl"
        >
          <h3 class="text-lg font-semibold">
            {{ mode === 'create' ? 'Add Rule' : 'Edit Rule' }}
          </h3>
          <button
            class="p-2 text-text-muted hover:bg-neutral-100 rounded-lg"
            (click)="cancel.emit()"
            title="Close"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div
          class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 min-h-0"
        >
          <div class="md:col-span-2">
            <label class="block text-xs text-text-muted mb-1">Name</label>
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.name"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-text-muted mb-1"
              >Description</label
            >
            <textarea
              rows="2"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.description"
            ></textarea>
            <div
              *ngIf="errors?.['description']?.length"
              class="text-error text-xs mt-1"
            >
              {{ errors?.['description'][0] }}
            </div>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Action</label>
            <select
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.action"
            >
              <option value="">Select action</option>
              <option value="CREATE_MACHINE">Create Machine</option>
              <option value="EDIT_MACHINE">Edit Machine</option>
              <option value="DELETE_MACHINE">Delete Machine</option>
              <option value="APPROVE_MACHINE">Approve Machine</option>
              <option value="VIEW_MACHINE">View Machine</option>
            </select>
            <div
              *ngIf="errors?.['action']?.length"
              class="text-error text-xs mt-1"
            >
              {{ errors?.['action'][0] }}
            </div>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Permission</label>
            <select
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.permission"
            >
              <option value="ALLOWED">Allowed</option>
              <option value="REQUIRES_APPROVAL">Requires Approval</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
          <div
            *ngIf="form.permission === 'REQUIRES_APPROVAL'"
            class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label class="block text-xs text-text-muted mb-1"
                >Approver Roles</label
              >
              <select
                multiple
                class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="form.approverRoles"
              >
                <option *ngFor="let r of roles" [ngValue]="r._id">
                  {{ r.name }}
                </option>
              </select>
              <div
                *ngIf="errors?.['approverRoles']?.length"
                class="text-error text-xs mt-1"
              >
                {{ errors?.['approverRoles'][0] }}
              </div>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1"
                >Approver Users (optional)</label
              >
              <input
                class="w-full px-3 py-2 border border-neutral-300 rounded-md mb-2"
                placeholder="Search users by name/email"
                (input)="onUserInput($event)"
              />
              <select
                multiple
                class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="form.users"
              >
                <option *ngFor="let u of userOptions" [ngValue]="u._id">
                  {{ u.username }} <span *ngIf="u.email">({{ u.email }})</span>
                </option>
              </select>
            </div>
          </div>
          <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs text-text-muted mb-1">Roles</label>
              <select
                multiple
                class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="form.roles"
              >
                <option *ngFor="let r of roles" [ngValue]="r._id">
                  {{ r.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1"
                >Departments</label
              >
              <select
                multiple
                class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="form.departments"
              >
                <option *ngFor="let d of departments" [ngValue]="d._id">
                  {{ d.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1"
                >Categories</label
              >
              <select
                multiple
                class="w-full px-3 py-2 border border-neutral-300 rounded-md"
                [(ngModel)]="form.categories"
              >
                <option *ngFor="let c of categories" [ngValue]="c._id">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <div class="md:col-span-3" *ngIf="errors?.['scope']?.length">
              <div class="text-error text-xs mt-1">
                {{ errors?.['scope'][0] }}
              </div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-text-muted mb-1"
              >Specific Users (optional)</label
            >
            <input
              class="w-full px-3 py-2 border border-neutral-300 rounded-md mb-2"
              placeholder="Search users by name/email"
              (input)="onUserInput($event)"
            />
            <select
              multiple
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.users"
            >
              <option *ngFor="let u of userOptions" [ngValue]="u._id">
                {{ u.username }} <span *ngIf="u.email">({{ u.email }})</span>
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Max Value</label>
            <input
              type="number"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.maxValue"
            />
            <div
              *ngIf="errors?.['maxValue']?.length"
              class="text-error text-xs mt-1"
            >
              {{ errors?.['maxValue'][0] }}
            </div>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Priority</label>
            <input
              type="number"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md"
              [(ngModel)]="form.priority"
            />
            <div
              *ngIf="errors?.['priority']?.length"
              class="text-error text-xs mt-1"
            >
              {{ errors?.['priority'][0] }}
            </div>
          </div>
          <div class="md:col-span-2 flex items-center gap-2">
            <input id="active" type="checkbox" [(ngModel)]="form.active" />
            <label for="active" class="text-sm text-text-muted">Active</label>
          </div>
          <div class="md:col-span-2" *ngIf="errors?.form?.length">
            <div
              class="px-3 py-2 rounded-md border border-error text-error bg-error/10 text-sm"
            >
              {{ errors?.form[0] }}
            </div>
          </div>
        </div>
        <div
          class="px-5 py-3 border-t border-neutral-300 flex justify-end gap-2 sticky bottom-0 bg-bg rounded-b-xl"
        >
          <button
            class="px-3 py-2 border border-neutral-300 rounded-md bg-bg hover:bg-neutral-50"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            [disabled]="saving"
            (click)="save.emit(form)"
          >
            <span *ngIf="!saving">{{
              mode === 'create' ? 'Save' : 'Update'
            }}</span>
            <span *ngIf="saving" class="inline-flex items-center gap-2"
              ><i class="pi pi-spin pi-spinner"></i>Saving</span
            >
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RuleFormModalComponent {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() form: any = {
    name: '',
    description: '',
    action: '',
    permission: 'ALLOWED',
    approverRoles: [],
    roles: [],
    departments: [],
    categories: [],
    users: [],
    maxValue: undefined,
    priority: undefined,
    active: true,
  };
  @Input() roles: Array<{ _id: string; name: string }> = [];
  @Input() departments: Array<{ _id: string; name: string }> = [];
  @Input() categories: Array<{ _id: string; name: string }> = [];
  @Input() userOptions: Array<{
    _id: string;
    username: string;
    email?: string;
  }> = [];
  @Input() saving = false;
  @Input() errors: { [key: string]: string[] } | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  @Output() searchUsers = new EventEmitter<string>();

  onUserInput(event: Event): void {
    const q = (event.target as HTMLInputElement)?.value || '';
    this.searchUsers.emit(q);
  }
}
