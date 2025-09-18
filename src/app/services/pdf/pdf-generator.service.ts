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
  constructor() {
    registerLocaleData(localeEsCO);
  }

  private async configurePdfMake() {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;

    // Usamos una importación dinámica para obtener el objeto vfs de tu archivo de fuentes.
    const { vfs } = await import('../../../../src/assets/fonts/pdf-fonts');

    // Ahora, con el objeto vfs en mano, se lo pasamos al sistema de archivos virtual de pdfMake.
    // @ts-ignore
    pdfMake.addVirtualFileSystem(vfs);

    // Y aquí, le decimos a pdfmake cómo se llama la fuente que usaremos.
    // Los nombres 'arial.ttf', 'arialbd.ttf', etc., ahora se encontrarán en el VFS.
    // @ts-ignore
    pdfMake.setFonts({
      Arial: {
        normal: 'arial.ttf',
        bold: 'arialbd.ttf',
        italics: 'ariali.ttf',
        bolditalics: 'arialbi.ttf',
      },
    });

    return pdfMake;
  }

  public createDocDefinition(
    rawData: ReportData,
    formFields: FormField[],
    headerConfig: HeaderConfig | undefined
  ): TDocumentDefinitions {
    const generationDate = formatDate(new Date(), 'dd/MM/yyyy', 'es-CO');
    const dataWithDate = { ...rawData, generationDate };

    const builder = new ReportPdfBuilder();
    const docDefinition = builder.build(dataWithDate, formFields, headerConfig);

    docDefinition.defaultStyle = {
      font: 'Arial',
    };

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
    const filename = this.sanitizeFilename(title || 'reporte') + '.pdf';
    pdfMake.createPdf(docDefinition).download(filename);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:"<>|\0]/g, '_');
  }
}
