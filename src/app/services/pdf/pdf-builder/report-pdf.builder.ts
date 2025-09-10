import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { FormField, FormSection, ReportData } from '../../../models/report.model';
import { getPdfStyles, STYLES } from './pdf-report.config';
import { SectionGrouperUtil } from '../../../shared/utils/section-grouper.util';
import { ISectionBuilder } from './section-builders/isection.builder';
import { DynamicTableSectionBuilder } from './section-builders/dynamic-table-section.builder';
import { DetailedMultipleChoiceSectionBuilder } from './section-builders/detailed-multiple-choice-section.builder';
import { StandardSectionBuilder } from './section-builders/standard-section.builder';

/**
 * Construye la definición del PDF agrupando los campos en tablas por sección.
 */
export class ReportPdfBuilder {
  private readonly sectionBuilders: ISectionBuilder[];

  constructor() {
    // El orden es importante: los builders más específicos deben ir primero.
    this.sectionBuilders = [
      new DynamicTableSectionBuilder(),
      new DetailedMultipleChoiceSectionBuilder(),
      new StandardSectionBuilder(), // El builder por defecto va al final.
    ];
  }

  public build(rawData: ReportData, allFields: FormField[]): TDocumentDefinitions {
    const content = this._buildSectionsContent(rawData, allFields);

    return {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: rawData['title'] || 'Reporte de Formulario', style: STYLES.HEADER },
        ...content,
      ],
      styles: getPdfStyles(),
      defaultStyle: {
        font: 'Arial',
      },
    };
  }

  /**
   * Construye el array de `Content` para el PDF iterando sobre las secciones.
   */
  private _buildSectionsContent(rawData: ReportData, allFields: FormField[]): Content[] {
    const fieldsForPdf = allFields.filter((f) => f.id !== 'title');
    const groupedSections = SectionGrouperUtil.group(fieldsForPdf);

    return groupedSections.map((section, index) => {
      const builder = this.sectionBuilders.find((b) => b.canHandle(section));
      if (builder) {
        const sectionContent = builder.build(section, rawData);

        // Si es la última sección, eliminamos el margen inferior para evitar
        // que se genere una página en blanco si el contenido llega justo al final.
        const isLastSection = index === groupedSections.length - 1;
        if (
          isLastSection &&
          typeof sectionContent === 'object' &&
          sectionContent !== null &&
          'margin' in sectionContent
        ) {
          (sectionContent as { margin?: [number, number, number, number] }).margin = [0, 0, 0, 0];
        }

        return sectionContent;
      }
      // Esto no debería ocurrir si StandardSectionBuilder está configurado como fallback.
      console.warn(`No se encontró un builder para la sección: ${section.title}`);
      return [];
    });
  }
}
