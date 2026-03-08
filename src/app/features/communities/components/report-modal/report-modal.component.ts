import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ReportReason {
  id: string;
  label: string;
}

export const REPORT_REASONS: ReportReason[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harcèlement' },
  { id: 'hate_speech', label: 'Discours haineux' },
  { id: 'misinformation', label: 'Désinformation' },
  { id: 'off_topic', label: 'Hors-sujet' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'violence', label: 'Violence' },
  { id: 'other', label: 'Autre' },
];

@Component({
  selector: 'app-report-modal',
  standalone: false,
  templateUrl: './report-modal.component.html',
})
export class ReportModalComponent {
  @Input() isOpen = false;
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  reasons = REPORT_REASONS;
  selectedReason: string | null = null;

  select(id: string): void {
    this.selectedReason = id;
  }

  onConfirm(): void {
    if (!this.selectedReason) return;
    this.confirm.emit(this.selectedReason);
    this.selectedReason = null;
  }

  onCancel(): void {
    this.selectedReason = null;
    this.cancel.emit();
  }
}
