import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfGeneratorService } from './pdf-generator.service';
import {
  ActionResult,
  FormField,
  PdfGenerationContext,
  ReportData,
} from '../../models/report.model';
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

  public readonly safePdfPreviewUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  async generatePdfPreviewFromData(
    reportData: ReportData,
    formFields: FormField[],
    defaultReportTitle: string,
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    isLoading.set(true);
    try {
      const reportTitle = reportData['title'] || defaultReportTitle;
      const dataForPdf = { ...reportData, title: reportTitle };

      const docDef = this.pdfGenerator.createDocDefinition(dataForPdf, formFields);
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
      context.defaultReportTitle,
      isLoading
    );
  }

  downloadCurrentPdf(defaultReportTitle: string): void {
    const docDef = this.docDefinition();
    if (!docDef) {
      console.error('No hay definición de documento para descargar.');
      return;
    }

    // El título ya está dentro de la definición del documento.
    const pdfTitle =
      ((docDef.content as Content[])[0] as { text: string }).text || defaultReportTitle;

    this.pdfGenerator.downloadPdf(docDef, pdfTitle);
  }

  closePreview(): void {
    const url = this.pdfPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.pdfPreviewUrl.set(null);
    this.docDefinition.set(null);
  }
}
