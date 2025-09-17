import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SecurityContext,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-preview-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-preview-modal.component.html',
  styleUrl: './pdf-preview-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreviewModalComponent {
  @Input({ required: true }) url!: SafeResourceUrl;
  @Input() title = 'Vista Previa del Documento';

  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  @ViewChild('pdfIframe') pdfIframe!: ElementRef<HTMLIFrameElement>;

  constructor(private sanitizer: DomSanitizer) {}

  // Stop propagation to prevent the overlay click from being triggered
  onContainerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Intenta imprimir el contenido del iframe.
   * Si falla (por políticas de seguridad del navegador), abre el PDF en una nueva pestaña.
   */
  onPrint(): void {
    const iframe = this.pdfIframe.nativeElement;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        this.openInNewTabAndPrint();
      }
    } catch (e) {
      console.error('Error al intentar imprimir el PDF directamente:', e);
      this.openInNewTabAndPrint();
    }
  }

  /** Abre el PDF en una nueva pestaña del navegador. */
  onOpenInNewTab(): void {
    const rawUrl = this.sanitizer.sanitize(SecurityContext.URL, this.url);
    if (rawUrl) {
      window.open(rawUrl, '_blank');
    }
  }

  /** Muestra una alerta y abre el PDF para impresión manual como fallback. */
  private openInNewTabAndPrint(): void {
    alert(
      'No se pudo activar la impresión directamente. Por favor, use la función de impresión del navegador en la nueva pestaña que se abrirá.'
    );
    this.onOpenInNewTab();
  }
}
