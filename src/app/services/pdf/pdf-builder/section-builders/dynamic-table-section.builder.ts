import { Content, TableCell } from 'pdfmake/interfaces';
import { ReportData } from '../../../../models/report.model';
import { FormSection } from '../../../../models/form.model';
import { getDynamicTableLayout, STYLES } from '../pdf-report.config';
import { ISectionBuilder } from './isection.builder';
import { CellContentBuilder } from '../cell-content.builder';

export class DynamicTableSectionBuilder implements ISectionBuilder {
  canHandle(section: FormSection): boolean {
    return section.fields.length === 1 && section.fields[0].type === 'dynamic_table';
  }

  build(section: FormSection, rawData: ReportData): Content {
    const field = section.fields[0];
    const tableData: any[] = rawData[field.id] || [];
    const tableColumns = field.fields!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const dynamicTableBody: TableCell[][] = [];

    // Fila 1: Título de la sección
    dynamicTableBody.push([
      {
        text: section.title,
        style: STYLES.SECTION_HEADER,
        colSpan: tableColumns.length,
        alignment: 'center',
      },
      ...Array(tableColumns.length - 1).fill({}),
    ]);

    // Fila 2: Encabezados de las columnas
    dynamicTableBody.push(
      tableColumns.map((col) => ({ text: col.label, style: STYLES.TABLE_HEADER }))
    );

    // Filas de datos
    if (tableData.length > 0) {
      const dataRows = tableData.map((rowData) =>
        tableColumns.map((col) => new CellContentBuilder(rowData).build(col, false))
      );
      dynamicTableBody.push(...dataRows);
    } else {
      dynamicTableBody.push([
        {
          text: '(No se agregaron datos)',
          style: STYLES.ANSWER,
          italics: true,
          color: 'gray',
          colSpan: tableColumns.length,
          alignment: 'center',
        },
        ...Array(tableColumns.length - 1).fill({}),
      ]);
    }

    return {
      table: {
        headerRows: 2,
        widths: Array(tableColumns.length).fill('*'),
        body: dynamicTableBody,
      },
      layout: getDynamicTableLayout(),
      margin: [0, 0, 0, 15],
    };
  }
}
