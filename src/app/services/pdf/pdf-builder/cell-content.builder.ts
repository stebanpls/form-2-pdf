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
  private breakLongWords(html: string): string {
    const WORD_BREAK_THRESHOLD = 35;
    const ZWSP = '\u200B'; // Zero-Width Space

    // Esta regex divide el string por etiquetas HTML, manteniéndolas en el array resultante.
    // Esto nos permite procesar únicamente el contenido de texto que está entre las etiquetas.
    const parts = html.split(/(<[^>]+>)/g);

    const breakText = (text: string) => {
      // Esta regex encuentra secuencias largas de caracteres que no son espacios.
      const longWordRegex = new RegExp(`([^\\s]{${WORD_BREAK_THRESHOLD},})`, 'g');

      return text.replace(longWordRegex, (longWord: string) => {
        // La única forma de garantizar que el texto no se desborde es insertar
        // caracteres de ruptura (ZWSP). Esto se aplica a TODAS las palabras largas,
        // incluyendo URLs. Esto soluciona el problema visual, pero reintroduce el
        // problema de que los espacios aparecen al copiar y pegar la URL.
        // Priorizamos la apariencia visual del documento.
        return longWord.split('').join(ZWSP);
      });
    };

    // Reconstruimos el string procesando solo las partes que no son etiquetas.
    return parts
      .map((part) => {
        // Si una parte parece una etiqueta HTML, la dejamos intacta para no corromper atributos como 'href'.
        if (part.startsWith('<') && part.endsWith('>')) {
          return part;
        }
        // De lo contrario, es contenido de texto y es seguro procesarlo para cortar palabras.
        return breakText(part);
      })
      .join('');
  }

  /**
   * Acorta una URL para su visualización, manteniendo el inicio y el final.
   * Ej: "https://long.url/path/to/resource" -> "https://long.url/.../resource"
   * @param url La URL a acortar.
   * @returns La URL truncada visualmente.
   */
  private truncateUrl(url: string): string {
    const MAX_LENGTH = 45; // Longitud máxima antes de truncar
    if (url.length <= MAX_LENGTH) {
      return url;
    }

    try {
      // Aseguramos que el objeto URL pueda parsear el link.
      const urlObject = new URL(url.startsWith('http') ? url : `http://${url}`);
      const origin = urlObject.origin;
      const pathParts = urlObject.pathname.split('/').filter(Boolean);
      const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';

      // Si hay parámetros de búsqueda, los indicamos con '?...' para no hacer la URL larga.
      const searchIndicator = urlObject.search ? '?...' : '';

      return `${origin}/.../${lastPart}${searchIndicator}`;
    } catch (e) {
      // Si no es una URL válida (ej. un texto largo sin formato de URL), la truncamos de forma simple.
      // Si no es una URL válida, la truncamos de forma simple.
      return `${url.substring(0, 25)}...${url.substring(url.length - 15)}`;
    }
  }

  /**
   * Envuelve las URL de texto sin formato en etiquetas <a> para que puedan ser estilizadas.
   * Es cuidadoso de no envolver URLs que ya están dentro de una etiqueta <a>.
   * @param text El texto a procesar.
   * @returns El texto con las URLs envueltas en etiquetas <a>.
   */
  private linkify(text: string): string {
    if (!text) {
      return '';
    }

    // Regex para enlaces web estilo Markdown: [texto](url). No debe capturar emails.
    const markdownWebLinkRegex =
      /\[([^\]]+)\]\(((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+[^\s@)]*)\)/g;

    // Regex para enlaces de email estilo Markdown: [texto](email)
    const markdownEmailLinkRegex =
      /\[([^\]]+)\]\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g;

    // --- Regex Unificada para emails y URLs ---
    // Esta regex busca en una sola pasada para evitar conflictos.
    // Grupo 1: Captura un email completo (ej: user@example.com)
    // Grupo 2: Captura una URL que empieza con http/www (ej: https://example.com)
    // Grupo 3: Captura un dominio simple (ej: example.com), pero evita capturar la parte de un email
    //          usando un negative lookbehind `(?<!@\S*)` para asegurar que no haya un '@' antes.
    const combinedRegex =
      /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|((?:https?:\/\/|www\.)[^\s<]+)|((?<!@\S*)[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+[^\s<]*)\b/gi;

    // --- Orden de procesamiento lógico ---

    // 1. Procesar primero los formatos de Markdown.
    let processedText = text
      .replace(markdownEmailLinkRegex, '<a href="mailto:$2">$1</a>')
      .replace(markdownWebLinkRegex, (_match, linkText, url) => {
        const href = url.startsWith('http') ? url : `http://${url}`;
        return `<a href="${href}">${linkText}</a>`;
      });

    // 2. Procesa el texto restante para URLs y emails en texto plano, con cuidado de no volver a procesar
    //    las etiquetas <a> que ya hemos creado.
    const parts = processedText.split(/(<a\b[^>]*>.*?<\/a>)/gi);

    return parts
      .map((part) => {
        if (part.match(/^<a\b/i)) {
          return part;
        }
        // Usamos la regex combinada. El callback determina si es un email o una URL.
        return part.replace(combinedRegex, (match, email, urlWithProtocol, plainUrl) => {
          if (email) {
            return `<a href="mailto:${email}">${email}</a>`;
          }
          // Unificamos las dos capturas de URL.
          const url = urlWithProtocol || plainUrl;
          if (url) {
            const href = url.startsWith('http') ? url : `http://${url}`;
            const displayText = this.truncateUrl(url); // ¡Aquí acortamos el texto!
            return `<a href="${href}">${displayText}</a>`;
          }

          return match; // No debería ocurrir, pero es una salvaguarda.
        });
      })
      .join('');
  }

  /**
   * Crea el contenido de una celda.
   * @param field El campo del formulario para la celda.
   * @param isLabel Si la celda es para la etiqueta o para el valor.
   * @param options Opciones adicionales para la construcción de la celda.
   * @returns El objeto de contenido de celda para pdfmake.
   */
  public build(field: FormField, isLabel: boolean, options?: { isFullWidth?: boolean }): any {
    // --- SOLUCIÓN DIRECTA PARA ETIQUETAS DE ANCHO COMPLETO ---
    // Si es una etiqueta que debe ocupar toda la fila, usamos una ruta de construcción más simple
    // para asegurar que el centrado horizontal funcione correctamente.
    // Esto evita la complejidad de la tabla de centrado vertical que parece estar causando conflictos.
    if (isLabel && options?.isFullWidth) {
      const content = this._getContentForField(field, true);
      const style = { ...this.pdfStyles[STYLES.LABEL], alignment: 'center' };
      // Se retorna un objeto de celda simple, sin el centrado vertical.
      return { ...content, ...style };
    }

    // --- RUTA NORMAL PARA TODAS LAS DEMÁS CELDAS (CON CENTRADO VERTICAL) ---
    let content: any;
    let styleObject: Style;

    if (!isLabel && this._isFieldEmpty(field)) {
      content = this._getEmptyValueContent();
      // Usamos el estilo base de 'ANSWER' pero nos aseguramos de que no tenga color de fondo.
      styleObject = { ...this.pdfStyles[STYLES.ANSWER], fillColor: undefined };
    } else {
      content = this._getContentForField(field, isLabel);
      const styleName = isLabel ? STYLES.LABEL : STYLES.ANSWER;
      styleObject = { ...this.pdfStyles[styleName] };
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
      // Envuelve las URLs de texto plano en etiquetas <a> para que html-to-pdfmake las reconozca.
      content = this.linkify(content);
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
    // CLAVE: Usamos <span> en lugar de <div>. Un <div> es un elemento de bloque y
    // la librería html-to-pdfmake puede asignarle un estilo de bloque por defecto
    // (con alineación a la izquierda) que sobrescribe la alineación de la celda.
    // Un <span> es un elemento en línea y no sufre de este problema.
    const parsedContent = htmlToPdfmake(`<span>${content}</span>`, {
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
        a: {
          // Estilo para los hipervínculos
          color: '#108092',
          decoration: 'underline',
        },
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
        // --- LA CORRECCIÓN ---
        // Sin esto, la tabla interna intenta calcular su propio ancho basado en el contenido,
        // lo que puede hacer que se desborde de la celda padre si el contenido es muy largo.
        // Con ['*'], forzamos a la tabla interna a ocupar el 100% del ancho disponible de la celda padre.
        widths: ['*'],
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
