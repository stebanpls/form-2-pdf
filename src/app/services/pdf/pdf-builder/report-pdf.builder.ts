import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, ReportData } from '../../../models/report.model';
import {
  CELL_HORIZONTAL_PADDING,
  CELL_VERTICAL_PADDING,
  COLORS,
  getPdfStyles,
  getMainTableLayout,
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
          // CLAVE: Controlamos el padding por fila para un ajuste perfecto.
          paddingTop: (i: number) =>
            i === 0 ? CELL_VERTICAL_PADDING / 2 : CELL_VERTICAL_PADDING / 1.5,
          paddingBottom: (i: number) => (i === 0 ? CELL_VERTICAL_PADDING / 1.5 : 0),
          paddingLeft: () => CELL_HORIZONTAL_PADDING,
          paddingRight: () => CELL_HORIZONTAL_PADDING,
        };

        // Layout personalizado para la tabla principal de la cabecera.
        // Esto nos permite controlar el padding de forma precisa para cada columna.
        const headerTableLayout = {
          ...getMainTableLayout(), // Empezamos con el layout base para consistencia.
          // Sobrescribimos las funciones de padding.
          paddingLeft: (i: number) => {
            // La primera columna (i=0), que contiene la tabla anidada, no necesita padding izquierdo.
            return i === 0 ? 0 : CELL_HORIZONTAL_PADDING;
          },
          paddingRight: (i: number) => {
            // Tampoco necesita padding derecho.
            return i === 0 ? 0 : CELL_HORIZONTAL_PADDING;
          },
          // CLAVE: Eliminamos el padding vertical de la tabla principal.
          // La altura de la fila será determinada por el contenido de la celda más alta (la sección 1),
          // y el centrado de las otras celdas se forzará con una tabla anidada.
          paddingTop: () => 0,
          paddingBottom: () => 0,
        };

        return {
          // Usamos una tabla principal de una fila y tres columnas.
          // La primera columna contiene una tabla anidada para el diseño complejo.
          table: {
            widths: ['auto', '*', 'auto'],
            body: [
              [
                // --- Columna 1: Contiene una tabla anidada ---
                {
                  table: {
                    // Usamos '*' para que las columnas se expandan y llenen el espacio disponible.
                    widths: ['*', '*'],
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
                  // Contenido envuelto en una tabla invisible para forzar el centrado vertical.
                  table: {
                    widths: ['*'],
                    heights: ['*', 'auto', '*'],
                    body: [
                      [{ text: '', border: [false, false, false, false] }],
                      [
                        {
                          text: headerConfig.centerText ?? '',
                          alignment: 'center',
                          bold: true,
                          fontSize: 10,
                          border: [false, false, false, false],
                        },
                      ],
                      [{ text: '', border: [false, false, false, false] }],
                    ],
                  },
                  layout: 'noBorders',
                },

                // --- Columna 3: Logo ---
                headerConfig.logoBase64
                  ? {
                      // Contenido envuelto en una tabla invisible para forzar el centrado vertical.
                      table: {
                        widths: ['*'],
                        heights: ['*', 'auto', '*'],
                        body: [
                          [{ text: '', border: [false, false, false, false] }],
                          [
                            {
                              image: headerConfig.logoBase64,
                              width: 80,
                              alignment: 'center',
                              border: [false, false, false, false],
                            },
                          ],
                          [{ text: '', border: [false, false, false, false] }],
                        ],
                      },
                      layout: 'noBorders',
                    }
                  : { text: '' },
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
