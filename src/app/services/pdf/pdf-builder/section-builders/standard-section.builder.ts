import { Content, Table, TableCell } from 'pdfmake/interfaces';
import { ReportData } from '../../../../models/report.model';
import { FormSection } from '../../../../models/form.model';
import { getLayoutForSpecialRows, STYLES } from '../pdf-report.config';
import { ISectionBuilder } from './isection.builder';
import { PdfReportTableBodyBuilder } from '../pdf-report-table-body.builder';

export class StandardSectionBuilder implements ISectionBuilder {
  // Este builder manejará cualquier sección que no sea de un tipo especial.
  canHandle(_section: FormSection): boolean {
    return true;
  }

  build(section: FormSection, rawData: ReportData): Content {
    const tableBodyBuilder = new PdfReportTableBodyBuilder(rawData);

    // Filtramos solo los campos que este constructor debe manejar.
    const standardFields = section.fields.filter(
      (f) => f.type !== 'dynamic_table' && f.type !== 'detailed_multiple_choice'
    );

    if (standardFields.length === 0) {
      return []; // No hay nada que renderizar en esta sección.
    }

    // Usamos nuestro nuevo constructor inteligente para crear las filas de los campos.
    const fieldRows = tableBodyBuilder.build(standardFields);

    const sectionTableBody: TableCell[][] = [];

    // Añadimos el título de la sección como una cabecera que ocupa toda la fila.
    if (section.title) {
      sectionTableBody.push([
        { text: section.title, style: STYLES.SECTION_HEADER, colSpan: 2, alignment: 'center' },
        {}, // Placeholder para la columna que se está abarcando (spanned).
      ]);
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
}
