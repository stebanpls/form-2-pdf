import { FormField, ReportData } from '../../../models/report.model';
import { CELL_HORIZONTAL_PADDING, getNestedTableLayout } from './pdf-report.config';
import { FormFieldGrouper } from './form-field-grouper.builder';
import { CellContentBuilder } from './cell-content.builder';

/**
 * Clase de ayuda para construir el cuerpo dinámico de la tabla del reporte.
 * Esta clase ahora delega la agrupación de campos a FormFieldGrouper y se
 * enfoca en construir las filas de la tabla a partir de esos grupos.
 */
export class PdfReportTableBodyBuilder {
  private cellBuilder: CellContentBuilder;
  private rawData: ReportData;

  constructor(rawData: ReportData) {
    this.cellBuilder = new CellContentBuilder(rawData);
    this.rawData = rawData;
  }

  public build(formFields: FormField[]): any[][] {
    const fieldGroups = FormFieldGrouper.group(formFields, this.rawData);
    const body: any[][] = [];

    for (const group of fieldGroups) {
      if (group.type === 'long') {
        // Un campo "largo" puede ser un tipo especial como textarea, o simplemente un campo normal
        // que es demasiado largo para agruparse.
        if (group.field.type === 'textarea') {
          // Los textareas obtienen un diseño especial: etiqueta arriba, valor abajo, ambos a lo ancho.
          body.push(...this._createRowsForTextArea(group.field));
        } else {
          // Otros campos largos obtienen el diseño estándar de dos columnas.
          body.push(this._createRowForStandardLongField(group.field));
        }
      } else {
        // Si un grupo "corto" tiene solo un campo, trátalo como uno largo para evitar anidamiento innecesario.
        if (group.fields.length === 1) {
          body.push(this._createRowForStandardLongField(group.fields[0]));
        } else {
          // De lo contrario, crea una fila anidada para el grupo de campos cortos.
          body.push(this._createRowForShortFieldGroup(group.fields));
        }
      }
    }
    return body;
  }

  /**
   * Crea una fila para un grupo de campos cortos, mostrados en una tabla anidada.
   * Esta fila completa abarca las dos columnas de la tabla principal.
   * @param fields El grupo de campos cortos para mostrar en una fila.
   */
  private _createRowForShortFieldGroup(fields: FormField[]): any[] {
    // Cada campo genera 2 columnas (etiqueta y valor). Las etiquetas tienen ancho automático.
    const widths = fields.flatMap(() => ['auto', '*']);

    // Crea una única fila de celdas, intercalando etiquetas y valores.
    const interleavedRow = fields.flatMap((field) => {
      const labelContent = this.cellBuilder.build(field, true);
      const valueContent = this.cellBuilder.build(field, false);
      // Devolvemos un array con la etiqueta y el valor para que flatMap los una.
      return [labelContent, valueContent];
    });

    const nestedTable = {
      table: {
        widths: widths,
        // El cuerpo de la tabla anidada es una sola fila con todas las celdas intercaladas.
        body: [interleavedRow],
      },
      layout: getNestedTableLayout(),
    };

    // Esta celda contenedora es crucial. Ocupa 2 columnas y no tiene padding,
    // permitiendo que la tabla anidada se expanda de borde a borde.
    const containerCell = {
      ...nestedTable,
      colSpan: 2,
      /// Esta bandera es clave para que el layout de la tabla principal sepa
      // que no debe aplicar padding vertical, permitiendo que la tabla anidada ocupe todo el ancho.
      isGroup: true,
      // CLAVE: El margen horizontal negativo contrarresta el padding de la tabla padre.
      margin: [-CELL_HORIZONTAL_PADDING, 0, -CELL_HORIZONTAL_PADDING, 0],
    };

    // La fila debe tener un placeholder para la columna que se abarcó (spanned).
    return [containerCell, {}];
  }

  /**
   * Crea dos filas para un campo textarea: una para la etiqueta y otra para el valor.
   * Cada fila abarca todo el ancho de la tabla principal.
   */
  private _createRowsForTextArea(field: FormField): any[][] {
    const labelCell = this.cellBuilder.build(field, true);
    const valueCell = this.cellBuilder.build(field, false);

    // La fila de la etiqueta: una celda que abarca dos columnas, más un placeholder.
    const labelRow = [{ ...labelCell, colSpan: 2 }, {}];
    // La fila del valor: una celda que abarca dos columnas, más un placeholder.
    const valueRow = [{ ...valueCell, colSpan: 2 }, {}];

    return [labelRow, valueRow];
  }

  /**
   * Crea una única fila con dos celdas (etiqueta y valor) para un campo estándar
   * que no se agrupa.
   */
  private _createRowForStandardLongField(field: FormField): any[] {
    return [this.cellBuilder.build(field, true), this.cellBuilder.build(field, false)];
  }
}
