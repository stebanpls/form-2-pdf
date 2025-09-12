import { FormField, ReportData } from '../../../models/report.model';
import htmlToPdfmake from 'html-to-pdfmake';
import { STYLES } from './pdf-report.config';
import { formatDate } from '@angular/common';

/**
 * Construye el contenido de una celda individual para el reporte PDF.
 * Se encarga de obtener el valor, aplicar el estilo y convertir HTML a pdfmake.
 */
export class CellContentBuilder {
  constructor(private rawData: ReportData) {}

  private unescapeHtml(safeHtml: string): string {
    const a = document.createElement('textarea');
    a.innerHTML = safeHtml;
    return a.value;
  }

  /**
   * Inserta espacios de ancho cero en palabras muy largas para permitir que pdfmake
   * las divida correctamente, evitando desbordamientos.
   * @param text El texto a procesar.
   * @returns El texto con los cortes de palabra insertados.
   */
  private breakLongWords(text: string): string {
    const WORD_BREAK_THRESHOLD = 35;
    const ZWSP = '\u200B'; // Zero-Width Space

    // Esta regex encuentra secuencias de caracteres sin espacios que excedan el umbral.
    // Ignora el contenido dentro de las etiquetas HTML (como <br>) para no romperlas.
    const longWordRegex = new RegExp(`([^\\s<>]{${WORD_BREAK_THRESHOLD},})`, 'g');

    return text.replace(longWordRegex, (longWord: string) => {
      // Inserta un ZWSP entre cada caracter de la palabra larga.
      // Esto le da a pdfmake máxima flexibilidad para el corte de línea.
      return longWord.split('').join(ZWSP);
    });
  }

  private _buildEmptyValueCell(): any {
    return {
      text: '(No se diligenció)',
      style: STYLES.ANSWER,
      italics: true,
      color: 'gray',
    };
  }

  /**
   * Crea el contenido de una celda.
   * @param field El campo del formulario para la celda.
   * @param isLabel Si la celda es para la etiqueta o para el valor.
   * @returns El objeto de contenido de celda para pdfmake.
   */
  public build(field: FormField, isLabel: boolean): any {
    if (!isLabel) {
      const rawValue = this.rawData[field.id];
      const valueIsEmpty = rawValue === null || rawValue === undefined || rawValue === '';
      if (valueIsEmpty) {
        return this._buildEmptyValueCell();
      }
    }

    let content = isLabel ? field.label : (this.rawData[field.id] || '').toString();
    const style = isLabel ? STYLES.LABEL : STYLES.ANSWER;

    // 1. Pre-procesamiento para valores de campo
    if (!isLabel && typeof content === 'string') {
      content = this.unescapeHtml(content);
      content = this.breakLongWords(content);
    }

    // 2. Formateo específico por tipo
    if (!isLabel && field.type === 'date' && content) {
      const isIsoDate = /^\d{4}-\d{2}-\d{2}/.test(content);
      if (isIsoDate) {
        content = formatDate(content, 'dd/MM/yyyy', 'es-CO', 'UTC');
      }
    }

    if (field.type === 'textarea') {
      content = content.replace(/\n/g, '<br>');
    }

    // 3. Conversión final a la estructura de pdfmake
    const parsedContent = htmlToPdfmake(`<div>${content}</div>`, {
      removeExtraBlanks: true,
      defaultStyles: {
        b: { bold: true },
        strong: { bold: true },
        u: { decoration: 'underline' },
        s: { decoration: 'lineThrough' },
        i: { italics: true },
        em: { italics: true },
        small: { fontSize: 8 },
        big: { fontSize: 12 },
        // Dejamos que html-to-pdfmake maneje las etiquetas <sub> y <sup>.
        // Esto creará un array de partes de texto.
        sub: { sub: true, fontSize: 8 },
        sup: { sup: true, fontSize: 8 },
      },
    });

    // CLAVE: Para arreglar el espaciado alrededor de <sub> y <sup>, envolvemos
    // el array generado por htmlToPdfmake dentro de un objeto { text: [...] }.
    // Esto le indica a pdfmake que renderice las partes de forma contigua.
    const finalContent = { text: parsedContent };

    // TRUCO para centrado vertical: Envolver el contenido en una estructura de 'columns'
    // con una sola columna. Es una peculiaridad de pdfmake que esto centre
    // verticalmente el contenido dentro de una celda de tabla que es más alta que su contenido.
    return {
      // Aplicamos el estilo a la celda para que tome propiedades como fillColor y alignment.
      style: style,
      // Usamos el truco de 'columns' para el centrado vertical. El contenido dentro
      // de la columna heredará las propiedades de texto (como alignment) del estilo de la celda.
      columns: [finalContent],
    };
  }
}
