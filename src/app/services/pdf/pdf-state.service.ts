import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfGeneratorService } from './pdf-generator.service';
import { FormField, HeaderConfig, ReportData } from '../../models/report.model';
import { ActionResult } from '../../models/action-result.model';
import { PdfGenerationContext } from '../../models/pdf.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class PdfStateService {
  private readonly pdfGenerator = inject(PdfGeneratorService);
  private readonly sanitizer = inject(DomSanitizer);

  // --- State Management for PDF Preview ---
  public readonly docDefinition = signal<TDocumentDefinitions | null>(null);
  private readonly pdfPreviewUrl = signal<string | null>(null);
  public readonly pdfTitle = signal<string>('Vista Previa del Documento');

  public readonly safePdfPreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  async generatePdfPreviewFromData(
    reportData: ReportData,
    formFields: FormField[],
    headerConfig: HeaderConfig | undefined, // Mantener para la construcción del PDF
    pdfTitle: string, // Nuevo parámetro para el título dinámico
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    isLoading.set(true);
    try {
      this.pdfTitle.set(pdfTitle); // Guardamos el título dinámico en nuestra señal
      const dataForPdf = { ...reportData, title: pdfTitle };

      const docDef = this.pdfGenerator.createDocDefinition(dataForPdf, formFields, headerConfig);
      this.docDefinition.set(docDef);

      const url = await this.pdfGenerator.getPdfUrl(docDef);
      this.pdfPreviewUrl.set(url);
      return { success: true };
    } catch (error) {
      console.error('Error al generar la vista previa del PDF:', error);
      return { success: false, error };
    } finally {
      isLoading.set(false);
    }
  }

  async generatePdfPreview(
    context: PdfGenerationContext,
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    if (context.form.invalid) {
      return { success: false, error: 'Formulario inválido.' };
    }
    const rawData = context.form.getRawValue();
    return this.generatePdfPreviewFromData(
      rawData,
      context.formFields,
      context.headerConfig, // Pasamos el headerConfig
      context.pdfTitle, // Pasamos el título dinámico
      isLoading
    );
  }

  async downloadCurrentPdf(): Promise<void> {
    const docDef = this.docDefinition();
    if (!docDef) {
      console.error('No hay definición de documento para descargar.');
      return;
    }
    const pdfTitle = this.pdfTitle(); // Usamos el título guardado en el estado del servicio

    // Usamos directamente el título que nos pasa el componente.
    // Es más simple, más seguro y no depende de la estructura interna del PDF.
    await this.pdfGenerator.downloadPdf(docDef, pdfTitle);
  }

  closePreview(): void {
    const url = this.pdfPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.pdfPreviewUrl.set(null);
    this.docDefinition.set(null);
    this.pdfTitle.set('Vista Previa del Documento'); // Reseteamos el título
  }
}
