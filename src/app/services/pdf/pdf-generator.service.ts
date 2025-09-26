import { Injectable } from '@angular/core';
import { formatDate, registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { FormField, HeaderConfig, ReportData } from '../../models/report.model';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ReportPdfBuilder } from './pdf-builder/report-pdf.builder';

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  // Guardamos la instancia de pdfMake una vez que se carga para no tener que recargarla.
  private pdfMakeInstance: any | null = null;

  constructor() {
    registerLocaleData(localeEsCO);
  }

  /**
   * Carga y configura pdfmake de forma asíncrona, pero solo la primera vez.
   * Las llamadas subsecuentes devolverán la instancia ya cargada.
   */
  private async configurePdfMake() {
    if (this.pdfMakeInstance) {
      return this.pdfMakeInstance;
    }

    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const { vfs } = await import('../../../../src/assets/fonts/pdf-fonts');

    // @ts-ignore
    pdfMake.addVirtualFileSystem(vfs);

    // @ts-ignore
    pdfMake.setFonts({
      Arial: {
        normal: 'arial.ttf',
        bold: 'arialbd.ttf',
        italics: 'ariali.ttf',
        bolditalics: 'arialbi.ttf',
      },
    });

    this.pdfMakeInstance = pdfMake;
    return this.pdfMakeInstance;
  }

  public createDocDefinition(
    rawData: ReportData,
    formFields: FormField[],
    headerConfig: HeaderConfig | undefined
  ): TDocumentDefinitions {
    // La fecha de generación se debe tomar en el momento de la creación, no de la plantilla.
    const generationDate = formatDate(new Date(), 'dd/MM/yyyy', 'es-CO');
    const dataWithDate = { ...rawData, generationDate };

    const builder = new ReportPdfBuilder(this);
    const docDefinition = builder.build(dataWithDate, formFields, headerConfig);

    return docDefinition;
  }

  public async getPdfUrl(docDefinition: TDocumentDefinitions): Promise<string> {
    const pdfMake = await this.configurePdfMake();

    return new Promise((resolve) => {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        resolve(URL.createObjectURL(blob));
      });
    });
  }

  public async downloadPdf(docDefinition: TDocumentDefinitions, title: string): Promise<void> {
    const pdfMake = await this.configurePdfMake();
    const filename = this.sanitizeFilename(title) + '.pdf';
    pdfMake.createPdf(docDefinition).download(filename);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:"<>|\0]/g, '_');
  }
}
