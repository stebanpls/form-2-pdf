import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, ReportData } from '../../../models/report.model';
import { getMainTableLayout, getPdfStyles, STYLES } from './pdf-report.config';
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

  public build(
    rawData: ReportData,
    allFields: FormField[],
    headerConfig?: HeaderConfig
  ): TDocumentDefinitions {
    const sortedFields = [...allFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const sectionsContent = this._buildSectionsContent(rawData, sortedFields);

    return {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      // Ajustamos el margen superior para dar espacio a la cabecera.
      // El margen de la cabecera se controla por separado.
      pageMargins: [40, 80, 40, 60], // [izquierda, arriba, derecha, abajo]

      // --- INICIO DE LA NUEVA CABECERA DINÁMICA ---
      header: (currentPage, pageCount) => {
        // Si no hay configuración de cabecera, no se muestra nada.
        if (!headerConfig) return null;

        return {
          // Usamos una única tabla con celdas combinadas para lograr el diseño deseado.
          table: {
            // Anchos: 2 columnas para la info, 1 para el título, 1 para el logo.
            widths: ['auto', 'auto', '*', 'auto'],
            body: [
              // --- Primera Fila ---
              [
                {
                  // Celda 1.1: Código del documento (ocupa 2 columnas).
                  text: headerConfig.documentCode ?? '',
                  colSpan: 2,
                  alignment: 'center',
                  bold: true,
                  fontSize: 9,
                },
                {}, // Placeholder para la celda 1.2
                {
                  // Celda 1.3: Texto central (ocupa 2 filas).
                  text: headerConfig.centerText ?? '',
                  alignment: 'center',
                  bold: true,
                  fontSize: 10,
                  rowSpan: 2,
                },
                // Celda 1.4: Logo (ocupa 2 filas).
                headerConfig.logoBase64
                  ? {
                      image: headerConfig.logoBase64,
                      width: 80,
                      alignment: 'center',
                      rowSpan: 2,
                    }
                  : { text: '', rowSpan: 2 },
              ],
              // --- Segunda Fila ---
              [
                {
                  // Celda 2.1: Versión
                  text: headerConfig.version ?? '',
                  alignment: 'center',
                  fontSize: 9,
                },
                {
                  // Celda 2.2: Paginación
                  text: `Página ${currentPage} de ${pageCount}`,
                  alignment: 'center',
                  fontSize: 9,
                },
                {}, // Placeholder para la celda 2.3 (ocupada por el texto central)
                {}, // Placeholder para la celda 2.4 (ocupada por el logo)
              ],
            ],
          },
          // Usamos el mismo layout que las tablas del cuerpo para consistencia.
          layout: getMainTableLayout(),
          margin: [40, 20, 40, 0],
        };
      },
      // --- FIN DE LA NUEVA CABECERA DINÁMICA ---

      content: [
        // El título principal ahora está en la cabecera, por lo que este se vuelve redundante.
        // { text: rawData['title'] || 'Reporte de Formulario', style: STYLES.HEADER },
        ...sectionsContent,
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

    const sectionsContent = groupedSections.map((section) => {
      const builder = this.sectionBuilders.find((b) => b.canHandle(section));
      if (builder) {
        return builder.build(section, rawData);
      }
      // Esto no debería ocurrir si StandardSectionBuilder está configurado como fallback.
      console.warn(`No se encontró un builder para la sección: ${section.title}`);
      return [];
    });

    // Post-procesamiento: Si hay contenido, elimina el margen inferior de la última sección.
    // Esto es más limpio que hacerlo dentro del bucle de mapeo.
    if (sectionsContent.length > 0) {
      const lastSection = sectionsContent[sectionsContent.length - 1];
      if (typeof lastSection === 'object' && lastSection !== null && 'margin' in lastSection) {
        // Clonamos el array de margen para evitar mutaciones inesperadas.
        const margin = [...((lastSection as any).margin || [0, 0, 0, 0])];
        margin[3] = 0; // Establece el margen inferior a 0.
        (lastSection as any).margin = margin;
      }
    }

    return sectionsContent;
  }
}
