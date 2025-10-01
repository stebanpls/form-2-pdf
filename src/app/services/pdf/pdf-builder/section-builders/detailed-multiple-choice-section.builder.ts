import { Content, TableCell } from 'pdfmake/interfaces';
import { ReportData } from '../../../../models/report.model';
import { FormSection } from '../../../../models/form.model';
import { getLayoutForSpecialRows, STYLES, getMainTableLayout } from '../pdf-report.config';
import { ISectionBuilder } from './isection.builder';
import { CellContentBuilder } from '../cell-content.builder';

export class DetailedMultipleChoiceSectionBuilder implements ISectionBuilder {
  canHandle(section: FormSection): boolean {
    return section.fields.length === 1 && section.fields[0].type === 'detailed_multiple_choice';
  }

  build(section: FormSection, rawData: ReportData): Content {
    const field = section.fields[0];
    const cellBuilder = new CellContentBuilder(rawData);
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
        const optionContent = this._buildOptionContent(option, cellBuilder);
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
      // Esta sección no usa celdas 'isGroup', por lo que el layout principal es suficiente.
      // Usar getLayoutForSpecialRows aquí no es necesario y podría ser confuso.
      layout: getMainTableLayout(),
      margin: [0, 0, 0, 15],
    };
  }

  private _buildOptionContent(option: any, cellBuilder: CellContentBuilder): TableCell {
    // Usamos un stack para el contenido, que es más robusto para saltos de página
    // que una tabla anidada para este caso simple.
    const content = {
      stack: [
        { text: [{ text: `${option.label}: `, bold: true }, { text: option.summary || '' }] },
        { text: option.description || '', margin: [10, 2, 0, 0] },
      ],
      // CLAVE: Aplicamos el estilo directamente al stack para asegurar el tamaño de fuente.
      style: STYLES.ANSWER,
    };

    // Envolvemos el stack en la celda de centrado vertical del CellContentBuilder.
    // Esto estabiliza el renderizado en los saltos de página y evita los "cuadros vacíos".
    const centeredContent = (cellBuilder as any)._buildVerticallyCenteredCell(
      content,
      STYLES.ANSWER
    );

    return { ...centeredContent, colSpan: 2 };
  }
}
