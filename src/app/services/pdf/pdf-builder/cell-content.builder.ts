import { FormField, ReportData } from '../../../models/report.model';
import htmlToPdfmake from 'html-to-pdfmake';
import { getPdfStyles, STYLES } from './pdf-report.config';
import { formatDate } from '@angular/common';
import { Style } from 'pdfmake/interfaces';

/**
 * Construye el contenido de una celda individual para el reporte PDF.
 * Se encarga de obtener el valor, aplicar el estilo y convertir HTML a pdfmake.
 */
export class CellContentBuilder {
  private readonly pdfStyles = getPdfStyles();
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

  /**
   * Crea el contenido de una celda.
   * @param field El campo del formulario para la celda.
   * @param isLabel Si la celda es para la etiqueta o para el valor.
   * @returns El objeto de contenido de celda para pdfmake.
   */
  public build(field: FormField, isLabel: boolean): any {
    let content: any;
    let styleObject: Style;

    if (!isLabel && this._isFieldEmpty(field)) {
      content = this._getEmptyValueContent();
      // Usamos el estilo base de 'ANSWER' pero nos aseguramos de que no tenga color de fondo.
      styleObject = { ...this.pdfStyles[STYLES.ANSWER], fillColor: undefined };
    } else {
      content = this._getContentForField(field, isLabel);
      const styleName = isLabel ? STYLES.LABEL : STYLES.ANSWER;
      styleObject = this.pdfStyles[styleName];
    }

    // Ahora, todas las celdas (vacías o no) pasan por el mismo constructor final.
    return this._buildVerticallyCenteredCell(content, styleObject);
  }

  /** Comprueba si el valor de un campo está vacío, nulo o indefinido. */
  private _isFieldEmpty(field: FormField): boolean {
    const rawValue = this.rawData[field.id];
    return rawValue === null || rawValue === undefined || rawValue === '';
  }

  /** Genera el objeto de contenido para una celda de valor vacío. */
  private _getEmptyValueContent(): any {
    return {
      text: '(No se diligenció)',
      italics: true,
      color: 'gray',
    };
  }

  /** Obtiene, formatea y convierte el contenido de un campo a la estructura de pdfmake. */
  private _getContentForField(field: FormField, isLabel: boolean): any {
    let content = isLabel ? field.label : (this.rawData[field.id] || '').toString();

    // Pre-procesamiento
    if (!isLabel && typeof content === 'string') {
      content = this.unescapeHtml(content);
      content = this.breakLongWords(content);
    }

    // Formateo específico por tipo
    if (!isLabel && field.type === 'date' && content) {
      const isIsoDate = /^\d{4}-\d{2}-\d{2}/.test(content);
      if (isIsoDate) {
        content = formatDate(content, 'dd/MM/yyyy', 'es-CO', 'UTC');
      }
    }
    if (field.type === 'textarea') {
      content = content.replace(/\n/g, '<br>');
    }

    // Conversión de HTML a la estructura de pdfmake
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
        sub: { sub: true, fontSize: 8 },
        sup: { sup: true, fontSize: 8 },
      },
    });

    return { text: parsedContent };
  }

  /**
   * Construye la estructura final de la celda usando el truco de la "tabla invisible"
   * para forzar el centrado vertical de manera consistente.
   * @param content El objeto de contenido de texto a centrar.
   * @param styleObject El objeto de estilo completo para la celda.
   */
  private _buildVerticallyCenteredCell(content: any, styleObject: Style): any {
    // Creamos un estilo solo para el texto, quitando las propiedades que son de la celda.
    const textStyle: Style = { ...styleObject };
    delete textStyle.fillColor;

    return {
      // 1. Propiedades de la celda exterior (color de fondo).
      fillColor: styleObject.fillColor,

      // 2. Contenido: una tabla invisible que fuerza el centrado vertical.
      table: {
        // 3. La clave: dos filas flexibles ('*') y una de contenido ('auto').
        heights: ['*', 'auto', '*'],
        body: [
          // Fila superior (espaciador)
          [{ text: '', border: [false, false, false, false] }],
          // Fila del medio (nuestro contenido real)
          [{ ...content, ...textStyle, border: [false, false, false, false] }],
          // Fila inferior (espaciador)
          [{ text: '', border: [false, false, false, false] }],
        ],
      },
      // 4. El layout de la tabla anidada no debe tener bordes ni padding propio,
      // para que se fusione perfectamente con la celda exterior.
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    };
  }
}
