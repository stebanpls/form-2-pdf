import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, ReportData } from '../../../models/report.model';
import {
  CELL_HORIZONTAL_PADDING,
  COLORS,
  getLayoutForSpecialRows,
  getPdfStyles,
  STYLES,
} from './pdf-report.config';
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

        // Layout para la tabla anidada: solo dibuja las líneas internas (la cruz).
        // Esto evita el efecto de "doble borde".
        const nestedTableLayout = {
          // Línea horizontal solo después de la primera fila.
          hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
          // Línea vertical solo después de la primera columna.
          vLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
          hLineColor: () => COLORS.BORDER,
          vLineColor: () => COLORS.BORDER,
          // Padding interno para las celdas de la tabla anidada.
          paddingTop: () => 4,
          paddingBottom: () => 4,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        };

        return {
          // Usamos una tabla principal de una fila y tres columnas.
          // La primera columna contiene una tabla anidada para el diseño complejo.
          table: {
            // Anchos: 'auto' para la info, el resto para el título, y 'auto' para el logo.
            widths: ['auto', '*', 'auto'],
            body: [
              [
                // --- Columna 1: Contiene una tabla anidada ---
                {
                  // CLAVE: Se marca como 'isGroup' para que el layout especial elimine el padding,
                  // permitiendo que la tabla anidada se alinee perfectamente con los bordes.
                  isGroup: true,
                  // CLAVE: Un margen horizontal negativo contrarresta el padding que el layout
                  // de la tabla principal aplica, forzando a la tabla anidada a ocupar todo el ancho.
                  // Esto elimina los espacios vacíos a izquierda y derecha.
                  margin: [-CELL_HORIZONTAL_PADDING, 0, -CELL_HORIZONTAL_PADDING, 0],
                  table: {
                    // Usamos 'auto' para que cada columna se ajuste al ancho de su contenido, eliminando espacios vacíos.
                    widths: ['auto', 'auto'],
                    body: [
                      // Fila 1 de la tabla anidada (código)
                      [
                        {
                          text: headerConfig.documentCode ?? '',
                          colSpan: 2,
                          alignment: 'center',
                          bold: true,
                          fontSize: 9,
                        },
                        {},
                      ],
                      // Fila 2 de la tabla anidada (versión y página)
                      [
                        { text: headerConfig.version ?? '', alignment: 'center', fontSize: 9 },
                        {
                          text: `Página ${currentPage} de ${pageCount}`,
                          alignment: 'center',
                          fontSize: 9,
                        },
                      ],
                    ],
                  },
                  layout: nestedTableLayout,
                },

                // --- Columna 2: Texto Central ---
                {
                  text: headerConfig.centerText ?? '',
                  alignment: 'center',
                  bold: true,
                  fontSize: 10,
                },

                // --- Columna 3: Logo ---
                headerConfig.logoBase64
                  ? { image: headerConfig.logoBase64, width: 80, alignment: 'center' }
                  : { text: '' },
              ],
            ],
          },
          // Usamos el layout especial que sabe cómo manejar celdas con tablas anidadas.
          layout: getLayoutForSpecialRows(),
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
