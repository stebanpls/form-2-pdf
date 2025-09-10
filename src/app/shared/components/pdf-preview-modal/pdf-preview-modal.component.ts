import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-preview-modal',
  imports: [CommonModule],
  templateUrl: './pdf-preview-modal.component.html',
  styleUrl: './pdf-preview-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreviewModalComponent {
  @Input({ required: true }) url!: SafeResourceUrl;

  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  // Stop propagation to prevent the overlay click from being triggered
  onContainerClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
