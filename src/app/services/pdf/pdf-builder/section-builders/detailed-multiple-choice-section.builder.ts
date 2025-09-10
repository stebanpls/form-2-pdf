import { Content, TableCell } from 'pdfmake/interfaces';
import { FormSection, ReportData } from '../../../../models/report.model';
import { getMainTableLayout, STYLES } from '../pdf-report.config';
import { ISectionBuilder } from './isection.builder';

export class DetailedMultipleChoiceSectionBuilder implements ISectionBuilder {
  canHandle(section: FormSection): boolean {
    return section.fields.length === 1 && section.fields[0].type === 'detailed_multiple_choice';
  }

  build(section: FormSection, rawData: ReportData): Content {
    const field = section.fields[0];
    const selectedOptionsData = rawData[field.id] || {};
    const allOptions = field.options || [];

    const sectionTableBody: TableCell[][] = [];

    // 1. Título de la sección
    sectionTableBody.push([
      { text: section.title, style: STYLES.SECTION_HEADER, colSpan: 2, alignment: 'center' },
      {},
    ]);

    // 2. Etiqueta principal del campo, dividida en filas
    const labels = field.label.split(/\\n/g);
    for (const label of labels) {
      sectionTableBody.push([
        { text: label, style: STYLES.DETAILED_CHOICE_LABEL, colSpan: 2, margin: [0, 2, 0, 2] },
        {},
      ]);
    }

    // 3. Opciones seleccionadas
    const selectedOptions = allOptions.filter((option) => selectedOptionsData[option.id] === true);

    if (selectedOptions.length === 0) {
      sectionTableBody.push([
        {
          text: '(No se diligenció ninguna opción)',
          style: STYLES.ANSWER,
          italics: true,
          color: 'gray',
          colSpan: 2,
          alignment: 'left',
          margin: [5, 5, 0, 5], // Indentar un poco
        },
        {},
      ]);
    } else {
      for (const option of selectedOptions) {
        const optionContent: TableCell = {
          stack: [
            { text: [{ text: `${option.label}: `, bold: true }, { text: option.summary || '' }] },
            { text: option.description || '', margin: [10, 2, 0, 0] },
          ],
          style: STYLES.ANSWER,
          colSpan: 2,
          margin: [0, 5, 0, 5], // Espacio vertical entre opciones
        };
        sectionTableBody.push([optionContent, {}]);
      }
    }

    // 4. Devolvemos la tabla completa
    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*'],
        body: sectionTableBody,
      },
      layout: getMainTableLayout(),
      margin: [0, 0, 0, 15],
    };
  }
}
