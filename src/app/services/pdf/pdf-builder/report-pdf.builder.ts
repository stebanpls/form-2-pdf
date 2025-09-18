import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, ReportData } from '../../../models/report.model';
import { COLORS, getPdfStyles, STYLES } from './pdf-report.config';
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

    // Layout de tabla para el encabezado con borde inferior, como en el ejemplo.
    const headerLayout = {
      // Dibuja la línea horizontal solo al final del cuerpo de la tabla.
      hLineWidth: (i: number, node: any) => (i === node.table.body.length ? 1 : 0),
      vLineWidth: () => 0, // No dibuja líneas verticales.
      hLineColor: () => '#bfbfbf', // Color del borde.
      // Padding para las celdas.
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    };
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
          table: {
            widths: ['auto', '*', 'auto'],
            body: [
              [
                // Columna 1: Código y versión (apilados)
                {
                  stack: [
                    {
                      text: headerConfig.documentCode ?? '',
                      bold: true,
                      fontSize: 9,
                      margin: [0, 0, 0, 5],
                    },
                    { text: headerConfig.version ?? '', fontSize: 9 },
                  ],
                  alignment: 'left',
                },
                // Columna 2: Título principal (centrado)
                {
                  text: headerConfig.centerText ?? '',
                  fontSize: 10,
                  bold: true,
                  alignment: 'center',
                },
                // Columna 3: Paginación y logo (apilados)
                {
                  stack: [
                    {
                      text: `Página ${currentPage} de ${pageCount}`,
                      fontSize: 9,
                      alignment: 'right',
                      margin: [0, 5, 0, 0],
                    },
                    // El logo solo se muestra si existe en la configuración
                    ...(headerConfig.logoBase64
                      ? [
                          {
                            image: headerConfig.logoBase64,
                            width: 70,
                            alignment: 'right',
                            margin: [0, 5, 0, 0],
                          },
                        ]
                      : []),
                  ],
                  alignment: 'right',
                },
              ],
            ],
          },
          // Usamos el layout personalizado que definimos arriba.
          layout: headerLayout,
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
