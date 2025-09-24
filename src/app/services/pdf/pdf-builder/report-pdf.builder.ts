import { TDocumentDefinitions, Content, Table, TableLayout } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, ReportData } from '../../../models/report.model';
import {
  CELL_HORIZONTAL_PADDING,
  CELL_VERTICAL_PADDING,
  COLORS,
  getPdfStyles,
  getMainTableLayout,
  STYLES,
} from './pdf-report.config';
import { PdfGeneratorService } from '../pdf-generator.service';
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

  constructor(private pdfGeneratorService: PdfGeneratorService) {
    // El orden es importante: los builders más específicos deben ir primero.
    this.sectionBuilders = [
      new DynamicTableSectionBuilder(),
      new DetailedMultipleChoiceSectionBuilder(),
      new StandardSectionBuilder(),
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
          // CLAVE: Padding ajustado para que la caja se vea más compacta, como sugeriste.
          paddingTop: () => 4,
          paddingBottom: () => 4,
          paddingLeft: () => 4,
          paddingRight: () => 4,
        };

        // Layout personalizado para la tabla principal de la cabecera.
        // Esto nos permite controlar el padding de forma precisa para cada columna.
        const headerTableLayout = {
          ...getMainTableLayout(), // Empezamos con el layout base para consistencia.
          // Sobrescribimos las funciones de padding.
          paddingLeft: (i: number) => {
            // La primera columna (i=0), que contiene la tabla anidada, no necesita padding izquierdo.
            return i === 0 ? 0 : CELL_HORIZONTAL_PADDING; // Sin padding para la columna 0
          },
          paddingRight: (i: number) => {
            // La primera columna tampoco necesita padding derecho.
            return i === 0 ? 0 : CELL_HORIZONTAL_PADDING;
          },
          paddingTop: () => 0, // El centrado vertical lo maneja cada celda.
          paddingBottom: () => 0,
        };

        return {
          // Usamos una tabla principal de una fila y tres columnas.
          // La primera columna contiene una tabla anidada para el diseño complejo.
          table: {
            // Anchos flexibles: 30% para la primera columna, el resto para la del medio,
            // y lo que necesite el logo para la tercera.
            widths: ['30%', '*', 'auto'],
            body: [
              [
                // --- Columna 1: Contiene una tabla anidada ---
                {
                  table: {
                    // CLAVE: 'auto' para la primera columna (Versión) y '*' para la segunda (Página).
                    // Esto evita que el texto "Página X de Y" se corte.
                    widths: ['*', '*'],
                    body: [
                      [
                        {
                          text: headerConfig.documentCode ?? '',
                          colSpan: 2,
                          alignment: 'center',
                          bold: true,
                          fontSize: 9,
                          fillColor: COLORS.HEADER_BACKGROUND,
                          color: COLORS.HEADER_TEXT,
                        },
                        {},
                      ],
                      [
                        {
                          text: headerConfig.version ?? '',
                          alignment: 'center',
                          fontSize: 9,
                        },
                        {
                          text: `Página ${currentPage} de ${pageCount}`,
                          alignment: 'center',
                          fontSize: 9,
                        },
                      ],
                    ],
                  },
                  layout: nestedTableLayout,
                  verticalAlign: 'center',
                },

                // --- Columna 2: Texto Central ---
                {
                  // CLAVE: Se aplica la tabla de centrado a la Sección 2 para consistencia.
                  // Este método es más robusto que 'verticalAlign' para asegurar el centrado.
                  table: {
                    widths: ['*'],
                    heights: ['*', 'auto', '*'],
                    body: [
                      [''], // Espaciador superior
                      [
                        {
                          text: (headerConfig.centerText ?? '').toUpperCase(),
                          alignment: 'center',
                          bold: true,
                          fontSize: 11,
                          color: COLORS.LABEL_TEXT,
                        },
                      ],
                      [''], // Espaciador inferior
                    ],
                  },
                  layout: 'noBorders',
                },

                // --- Columna 3: Logo (también con centrado vertical forzado) ---
                {
                  // CLAVE: Volvemos a la tabla invisible para el logo, que es el método más
                  // robusto para el centrado vertical de imágenes.
                  table: {
                    widths: ['*'],
                    heights: ['*', 'auto', '*'],
                    body: [
                      [''], // Espaciador superior
                      [
                        // El contenido real (la imagen) va en la fila del medio.
                        headerConfig.logoBase64
                          ? {
                              image: headerConfig.logoBase64,
                              width: 80,
                              alignment: 'center',
                            }
                          : {},
                      ],
                      [''], // Espaciador inferior
                    ],
                  },
                  // La tabla de centrado no debe tener bordes.
                  layout: 'noBorders',
                },
              ],
            ],
          },
          // Usamos nuestro layout personalizado para la cabecera.
          layout: headerTableLayout,
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
