import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface QcEntry {
  id: string;
  machineName: string;
  machineId: string;
  addedBy: string;
  addedAt: string;
  reportLink?: string;
  status: 'completed' | 'pending' | 'in-progress';
  type: 'inspection' | 'maintenance' | 'quality-check';
}

@Component({
  selector: 'app-qc-recent-entries',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qc-recent-entries.component.html',
  styleUrls: ['./qc-recent-entries.component.css'],
})
export class QcRecentEntriesComponent {
  @Input() data: QcEntry[] = [];

  trackByEntryId(index: number, entry: QcEntry): string {
    return entry.id;
  }

  getEntryTypeClass(type: string): string {
    const classes = {
      inspection: 'bg-blue-100 text-blue-800 border-blue-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      'quality-check': 'bg-green-100 text-green-800 border-green-200',
    };
    return (
      classes[type as keyof typeof classes] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  }

  getStatusClass(status: string): string {
    const classes = {
      completed: 'bg-success text-white',
      pending: 'bg-warning text-white',
      'in-progress': 'bg-info text-white',
    };
    return classes[status as keyof typeof classes] || 'bg-gray-500 text-white';
  }

  getTypeIcon(type: string): string {
    const icons = {
      inspection: 'pi pi-search',
      maintenance: 'pi pi-wrench',
      'quality-check': 'pi pi-check-circle',
    };
    return icons[type as keyof typeof icons] || 'pi pi-file';
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const entryTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - entryTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return entryTime.toLocaleDateString();
  }

  viewEntry(entry: QcEntry): void {
    // Navigate to entry details or open modal
    console.log('Viewing entry:', entry);
  }

  downloadReport(entry: QcEntry): void {
    if (entry.reportLink) {
      // Open report link
      window.open(entry.reportLink, '_blank');
    }
  }
}
