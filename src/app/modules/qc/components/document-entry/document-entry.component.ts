import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BaseApiService } from '../../../../core/services/base-api.service';
import { QcSidebarComponent } from '../shared/qc-sidebar/qc-sidebar.component';

@Component({
  selector: 'app-qc-document-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QcSidebarComponent],
  templateUrl: './document-entry.component.html',
  styleUrls: ['./document-entry.component.css'],
})
export class QcDocumentEntryComponent implements OnInit {
  search = signal('');
  machines = signal<{ _id: string; name: string }[]>([]);
  filteredMachines = computed(() => {
    const q = this.search().toLowerCase();
    return this.machines().filter(m => m.name.toLowerCase().includes(q));
  });
  selectedMachineId: string | null = null;
  files: File[] = [];
  reportLink = '';
  isSubmitting = false;
  message: string | null = null;

  constructor(private api: BaseApiService) {}

  ngOnInit(): void {
    this.loadApprovedMachines();
  }

  private loadApprovedMachines() {
    this.api.get<any>('/machines/approved').subscribe({
      next: res => {
        const items = Array.isArray(res?.data)
          ? res.data
          : res?.data?.machines || [];
        this.machines.set(
          items.map((m: any) => ({ _id: m._id || m.id, name: m.name })) || []
        );
      },
      error: () => {
        this.machines.set([]);
      },
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);
    }
  }

  submit() {
    if (
      !this.selectedMachineId ||
      (this.files.length === 0 && !this.reportLink)
    ) {
      this.message = 'Select a machine and provide report link or files.';
      return;
    }
    this.isSubmitting = true;
    const form = new FormData();
    form.append('machine_id', this.selectedMachineId);
    if (this.reportLink) form.append('report_link', this.reportLink);
    for (const file of this.files) form.append('files', file);
    this.api.post('/qc-machines', form).subscribe({
      next: (res: any) => {
        this.message = res?.message || 'QC entry created.';
        this.isSubmitting = false;
        this.files = [];
        this.reportLink = '';
        this.selectedMachineId = null;
      },
      error: (err: any) => {
        this.message = err?.error?.message || 'Failed to create QC entry.';
        this.isSubmitting = false;
      },
    });
  }
}
