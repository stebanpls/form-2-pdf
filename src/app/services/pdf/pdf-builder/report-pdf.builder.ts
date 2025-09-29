import { TDocumentDefinitions, Content, Table, TableLayout } from 'pdfmake/interfaces';
import { FormField, HeaderConfig, PdfMetadata, ReportData } from '../../../models/report.model';
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
import { LOCAL_LOGO_BASE64 } from '../../../../assets/images/local-logo';
import { DEFAULT_REPORT_TITLE } from '../../../shared/constants/app.constants';

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
    // Se elimina 'async' y la Promesa, ya que no mediremos la cabecera.
    rawData: ReportData,
    allFields: FormField[],
    headerConfig: HeaderConfig | undefined,
    pdfMetadata: PdfMetadata | undefined
  ): TDocumentDefinitions {
    // Devuelve directamente la definición.
    const sortedFields = [...allFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const sectionsContent = this._buildSectionsContent(rawData, sortedFields);

    return {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      // Ajustamos el margen superior para dar espacio a la cabecera.
      // Se restaura un margen superior fijo y generoso para evitar el solapamiento.
      pageMargins: [40, 80, 40, 60], // [izquierda, arriba, derecha, abajo] - Reducido para un espaciado más agradable.

      // --- Propiedades Estructurales del Documento ---
      // Leemos la configuración desde headerConfig, con valores por defecto recomendados.
      tagged: pdfMetadata?.tagged ?? true, // Activar accesibilidad por defecto.

      // --- Metadatos del Documento ---
      // Esto establece el título interno del PDF, similar a lo que viste en el ejemplo.
      info: {
        // Usamos el título desde pdfMetadata si existe, si no, el título del documento,
        // y como último recurso, el título por defecto que viene en rawData.
        // Se usa ['...'] para cumplir con la regla de acceso a firmas de índice.
        title:
          pdfMetadata?.title ??
          headerConfig?.documentTitle ??
          (rawData['defaultTitle'] as string) ??
          DEFAULT_REPORT_TITLE,
        author: pdfMetadata?.author ?? 'Fundación Universitaria Konrad Lorenz',
        subject: pdfMetadata?.subject ?? '',
        keywords: pdfMetadata?.keywords ?? '',
        creationDate: new Date(),
        modDate: new Date(),
        creator: pdfMetadata?.creator ?? 'form-2-pdf',
        producer: pdfMetadata?.producer ?? 'pdfmake',
        trapped: 'False',
      },

      // --- Propiedades de Seguridad ---
      // Se leen desde la configuración. Si no se proveen, el PDF no tendrá restricciones.
      userPassword: pdfMetadata?.userPassword,
      ownerPassword: pdfMetadata?.ownerPassword,
      permissions: pdfMetadata?.permissions,

      // --- INICIO DE LA NUEVA CABECERA DINÁMICA ---
      header: (currentPage, pageCount) => {
        // Si no hay configuración de cabecera, no se muestra nada.
        if (!headerConfig) {
          return null;
        }
        // El método build ahora solo delega la construcción de la cabecera.
        return {
          stack: [this._buildHeaderContent(currentPage, pageCount, headerConfig)],
          margin: [40, 20, 40, 0],
        };
      },

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

  /**
   * Construye el contenido de la cabecera. Esta es la "Fuente Única de Verdad"
   * para el diseño de la cabecera.
   */
  private _buildHeaderContent(
    currentPage: number,
    pageCount: number,
    headerConfig: HeaderConfig
  ): Content {
    // Lógica de prioridad para el logo:
    // 1. Usar el logo local si existe.
    // 2. Si no, usar el logo de la base de datos (headerConfig).
    // 3. Si ninguno existe, no se mostrará ningún logo.
    const logoToUse = LOCAL_LOGO_BASE64 || headerConfig.logoBase64;

    return {
      // Usamos una tabla principal de una fila y tres columnas.
      table: {
        widths: ['auto', '*', 'auto'],
        body: [
          [
            // --- Columna 1: Contiene una tabla anidada ---
            {
              table: {
                widths: ['auto', '*'],
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
                      noWrap: true,
                    },
                    {
                      text: `Página ${currentPage} de ${pageCount}`,
                      alignment: 'center',
                      fontSize: 9,
                      noWrap: true,
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
                vLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
                hLineColor: () => COLORS.BORDER, // Añadido para consistencia
                vLineColor: () => COLORS.BORDER, // Añadido para consistencia
                paddingTop: () => CELL_VERTICAL_PADDING / 2,
                paddingBottom: () => CELL_VERTICAL_PADDING / 2,
                paddingLeft: () => CELL_HORIZONTAL_PADDING / 2,
                paddingRight: () => CELL_HORIZONTAL_PADDING / 2,
              },
              verticalAlign: 'center',
            },
            // --- Columna 2: Texto Central ---
            {
              table: {
                widths: ['*'],
                heights: ['*', 'auto', '*'],
                body: [
                  [''],
                  [
                    {
                      text: (headerConfig.documentTitle ?? '').toUpperCase(),
                      alignment: 'center',
                      bold: true,
                      fontSize: 11,
                      color: COLORS.LABEL_TEXT,
                    },
                  ],
                  [''],
                ],
              },
              layout: 'noBorders',
            },
            // --- Columna 3: Logo ---
            {
              table: {
                widths: ['*'],
                heights: ['*', 'auto', '*'],
                body: [
                  [''],
                  [logoToUse ? { image: logoToUse, width: 80, alignment: 'center' } : {}],
                  [''],
                ],
              },
              layout: 'noBorders',
            },
          ],
        ],
      },
      layout: {
        ...getMainTableLayout(),
        paddingLeft: (i: number) => (i === 0 ? 0 : CELL_HORIZONTAL_PADDING),
        paddingRight: (i: number) => (i === 0 ? 0 : CELL_HORIZONTAL_PADDING),
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    };
  }
}
