import { Content, TableCell } from 'pdfmake/interfaces';
import { ReportData } from '../../../../models/report.model';
import { FormSection } from '../../../../models/form.model';
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
    let headerRowCount = 0;

    // 1. Título de la sección
    if (section.title) {
      sectionTableBody.push([
        { text: section.title, style: STYLES.SECTION_HEADER, colSpan: 2, alignment: 'center' },
        {},
      ]);
      headerRowCount++;
    }

    // 2. Etiqueta principal del campo, dividida en filas
    const labels = field.label.split(/\\n/g).filter((l) => l.trim() !== '');
    for (const label of labels) {
      sectionTableBody.push([
        { text: label, style: STYLES.DETAILED_CHOICE_LABEL, colSpan: 2, margin: [0, 2, 0, 2] },
        {},
      ]);
      headerRowCount++;
    }

    // 3. Opciones seleccionadas
    const selectedOptions = allOptions.filter((option) => selectedOptionsData[option.id] === true);

    if (selectedOptions.length > 0) {
      selectedOptions.forEach((option, index) => {
        const optionContent: TableCell = {
          stack: [
            { text: [{ text: `${option.label}: `, bold: true }, { text: option.summary || '' }] },
            { text: option.description || '', margin: [10, 2, 0, 0] },
          ],
          style: STYLES.ANSWER,
          colSpan: 2,
          margin: [0, 5, 0, 5], // Espacio vertical entre opciones
        };

        const row: any[] = [optionContent, {}];

        // CLAVE 1: Evita encabezados huérfanos. Si la primera fila de datos no cabe,
        // mueve los encabezados junto con ella a la siguiente página.
        if (index === 0) {
          (row as any).keepWithHeaderRows = true;
        }
        sectionTableBody.push(row);
      });
    } else {
      // Si no hay opciones seleccionadas, mostramos un mensaje.
      sectionTableBody.push([
        {
          text: '(No se diligenció ninguna opción)',
          style: STYLES.ANSWER,
          italics: true,
          color: 'gray',
          colSpan: 2,
          alignment: 'center',
        },
        {},
      ]);
    }

    return {
      table: {
        headerRows: headerRowCount,
        widths: ['auto', '*'],
        body: sectionTableBody,
        // CLAVE 2: Permitimos que las filas se dividan para aprovechar el espacio.
        // Al no estar `dontBreakRows: true`, pdfmake puede dividir el contenido de una celda.
      },
      layout: getMainTableLayout(),
      margin: [0, 0, 0, 15],
    };
  }
}
