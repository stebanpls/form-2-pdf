import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SecurityContext,
  inject,
  ViewChild,
  signal,
} from '@angular/core';
import { PdfStateService } from '../../../services/pdf/pdf-state.service';
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
  // El título ahora se obtiene directamente del servicio de estado para asegurar la consistencia.

  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  @ViewChild('pdfIframe') pdfIframe!: ElementRef<HTMLIFrameElement>;

  // Signal para controlar el estado de la pantalla completa.
  public readonly isFullscreen = signal(false);

  // Inyectamos el servicio de estado para acceder al título dinámico.
  public readonly pdfStateService = inject(PdfStateService);

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
      }
    } catch (e) {
      console.error('Error al intentar imprimir el PDF directamente:', e);
      alert(
        'No se pudo activar la impresión directamente. Por favor, use la función de impresión de su navegador o descargue el PDF.'
      );
    }
  }

  /** Cambia el estado del modo de pantalla completa. */
  toggleFullscreen(): void {
    this.isFullscreen.update((value) => !value);
  }
}
