import { Content, Table, TableCell, TableLayout } from 'pdfmake/interfaces';
import { FormField, ReportData } from '../../../../models/report.model';
import { FormSection } from '../../../../models/form.model';
import {
  CELL_HORIZONTAL_PADDING,
  CELL_VERTICAL_PADDING,
  getNestedTableLayout,
  getLayoutForSpecialRows,
  STYLES,
} from '../pdf-report.config';
import { ISectionBuilder } from './isection.builder';
import { PdfReportTableBodyBuilder } from '../pdf-report-table-body.builder';
import { CellContentBuilder } from '../cell-content.builder';

const HEADER_FIELD_IDS = ['projectName', 'projectManager', 'generationDate', 'deliveryDate'];

export class StandardSectionBuilder implements ISectionBuilder {
  // Este builder manejará cualquier sección que no sea de un tipo especial.
  canHandle(_section: FormSection): boolean {
    return true;
  }

  build(section: FormSection, rawData: ReportData): Content {
    // Separamos los campos del encabezado de los campos del cuerpo de la sección.
    const headerFields = section.fields.filter((f) => HEADER_FIELD_IDS.includes(f.id));
    const bodyFields = section.fields.filter(
      (f) =>
        !HEADER_FIELD_IDS.includes(f.id) &&
        f.type !== 'dynamic_table' &&
        f.type !== 'detailed_multiple_choice'
    );

    if (headerFields.length === 0 && bodyFields.length === 0) {
      return []; // No hay nada que renderizar en esta sección.
    }

    // Usamos el constructor de cuerpo de tabla solo para los campos del cuerpo.
    let fieldRows: any[][] = [];
    if (bodyFields.length > 0) {
      const tableBodyBuilder = new PdfReportTableBodyBuilder(rawData);
      fieldRows = tableBodyBuilder.build(bodyFields);
    }

    const sectionTableBody: TableCell[][] = [];

    // Añadimos el título de la sección como una cabecera que ocupa toda la fila.
    if (section.title) {
      sectionTableBody.push([
        { text: section.title, style: STYLES.SECTION_HEADER, colSpan: 2, alignment: 'center' },
        {}, // Placeholder para la columna que se está abarcando (spanned).
      ]);
    }

    // Si hay campos de encabezado, los añadimos como una fila especial anidada.
    if (headerFields.length > 0) {
      sectionTableBody.push(this._createHeaderRow(headerFields, rawData));
    }

    // Añadimos las filas de campos que generamos.
    sectionTableBody.push(...fieldRows);

    const tableDef: Table = {
      // La tabla principal tiene dos columnas: una para etiquetas y otra para valores.
      widths: ['auto', '*'],
      body: sectionTableBody,
      headerRows: section.title ? 1 : 0,
    };

    return {
      table: tableDef,
      layout: getLayoutForSpecialRows(),
      margin: [0, 0, 0, 15],
    };
  }

  /**
   * Crea una fila especial para los metadatos del encabezado.
   * Esta fila contiene una tabla anidada para permitir un layout de múltiples columnas
   * que se expande para llenar el ancho completo.
   */
  private _createHeaderRow(fields: FormField[], rawData: ReportData): any[] {
    const cellBuilder = new CellContentBuilder(rawData);
    // Cada par de etiqueta/valor necesita su propio ancho 'auto' y '*'.
    const widths = fields.flatMap(() => ['auto', '*']);

    // Crea una única fila de celdas, intercalando etiquetas y valores.
    const interleavedRow = fields.flatMap((field) => [
      cellBuilder.build(field, true),
      cellBuilder.build(field, false),
    ]);

    const nestedTable = {
      table: {
        widths: widths,
        body: [interleavedRow],
      },
      // CLAVE: Usamos el layout de tabla anidada para consistencia visual (bordes, padding, etc.).
      layout: getNestedTableLayout(),
    };

    // La celda contenedora abarca las 2 columnas de la tabla principal.
    // La bandera 'isGroup' le dice al layout principal que no aplique su propio padding.
    const containerCell = {
      ...nestedTable,
      colSpan: 2,
      isGroup: true,
      // CLAVE: El margen horizontal negativo contrarresta el padding de la tabla padre.
      margin: [-CELL_HORIZONTAL_PADDING, 0, -CELL_HORIZONTAL_PADDING, 0],
    };

    // La fila completa es la celda contenedora y un placeholder para la columna abarcada.
    return [containerCell, {}];
  }
}
