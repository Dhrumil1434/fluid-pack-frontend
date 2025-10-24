import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MachineDocument } from '../../../core/models/machine.model';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.css'],
})
export class DocumentUploadComponent {
  @Input() documents: MachineDocument[] = [];
  @Output() documentsChange = new EventEmitter<MachineDocument[]>();

  documentTypes = [
    'User Manual',
    'Technical Specification',
    'Maintenance Guide',
    'Warranty Document',
    'Certification',
    'Installation Guide',
    'Parts Catalog',
    'Other',
  ];

  newDocument: { name: string; file: File | null; document_type: string } = {
    name: '',
    file: null,
    document_type: '',
  };

  addDocument(): void {
    if (!this.newDocument.name || !this.newDocument.file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const document: MachineDocument = {
        name: this.newDocument.name,
        file_path: this.newDocument.file?.name || '',
        document_type: this.newDocument.document_type,
        uploaded_at: new Date(),
      };

      this.documents.push(document);
      this.documentsChange.emit(this.documents);

      // Reset form
      this.newDocument = {
        name: '',
        file: null,
        document_type: '',
      };
    };

    reader.readAsDataURL(this.newDocument.file);
  }

  removeDocument(index: number): void {
    this.documents.splice(index, 1);
    this.documentsChange.emit(this.documents);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newDocument.file = input.files[0];
    }
  }

  // TrackBy functions for ngFor directives
  trackByDocumentType = (index: number, type: string): string => {
    return type;
  };

  trackByDocument = (index: number, doc: MachineDocument): string => {
    return doc.name + doc.document_type + doc.uploaded_at.toString();
  };
}
