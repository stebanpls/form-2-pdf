import {
  Style,
  TableLayout,
  CustomTableLayout,
  ContentTable,
  TableCell,
  TableCellProperties,
} from 'pdfmake/interfaces';

// Umbral más estricto para evitar agrupar campos que podrían ser demasiado largos.
export const SHORT_FIELD_THRESHOLD = 45;

export interface GroupCell extends TableCellProperties {
  isGroup: true;
  table: ContentTable['table'];
}

// --- Padding Constants ---

/**
 * Padding vertical para las celdas.
 * Se exporta para que los builders puedan crear layouts consistentes.
 */
export const CELL_VERTICAL_PADDING = 8;

/**
 * Padding horizontal para las celdas.
 * Se exporta porque otros builders lo necesitan para calcular márgenes negativos.
 */
export const CELL_HORIZONTAL_PADDING = 8;

export const COLORS = {
  BORDER: '#bfbfbf',
  HEADER_BACKGROUND: '#59595c',
  HEADER_TEXT: 'white',
  LABEL_BACKGROUND: '#eeeeee',
  LABEL_TEXT: '#595a5c',
};

export const STYLES = {
  HEADER: 'header',
  LABEL: 'label',
  ANSWER: 'answer',
  TABLE_HEADER: 'tableHeader',
  SECTION_HEADER: 'sectionHeader',
  DETAILED_CHOICE_LABEL: 'detailedChoiceLabel',
  FIELD_VALUE: 'fieldValue',
};

export function getPdfStyles(): { [key: string]: Style } {
  return {
    [STYLES.HEADER]: {
      fontSize: 14,
      bold: true,
      alignment: 'center',
      // Margen: [izquierda, arriba, derecha, abajo]. Añadimos 40 puntos de espacio debajo del título.
      margin: [0, 0, 0, 20],
    },
    [STYLES.LABEL]: {
      bold: true,
      fillColor: COLORS.LABEL_BACKGROUND,
      fontSize: 10,
      alignment: 'left',
      color: COLORS.LABEL_TEXT,
      margin: [0, 0, 0, 0], // El padding horizontal ahora se maneja en el layout de la tabla.
    },
    [STYLES.ANSWER]: {
      fontSize: 10,
      alignment: 'justify',
      margin: [0, 0, 0, 0], // El padding horizontal ahora se maneja en el layout de la tabla.
    },
    [STYLES.TABLE_HEADER]: {
      bold: true,
      fontSize: 10,
      color: COLORS.LABEL_TEXT,
      fillColor: COLORS.LABEL_BACKGROUND,
      alignment: 'center',
    },
    [STYLES.SECTION_HEADER]: {
      bold: true,
      fontSize: 12,
      color: COLORS.HEADER_TEXT,
      fillColor: COLORS.HEADER_BACKGROUND, // Un gris profesional
      alignment: 'center',
      margin: [0, 4, 0, 4], // Padding vertical dentro de la celda
    },
    [STYLES.DETAILED_CHOICE_LABEL]: {
      // Hereda de LABEL pero con alineación centrada.
      bold: true,
      fillColor: COLORS.LABEL_BACKGROUND,
      fontSize: 10,
      alignment: 'center',
      color: COLORS.LABEL_TEXT,
      margin: [0, 0, 0, 0],
    },
    [STYLES.FIELD_VALUE]: {
      fontSize: 10,
      margin: [0, 0, 0, 10], // Margen para texto de campo que no está en una tabla
    },
  };
}

/**
 * Type guard to check if a cell contains a nested table group.
 * This is used to apply padding intelligently.
 */
const isGroupCell = (cell: TableCell): cell is GroupCell => {
  // Guardia de seguridad: Asegurarse de que la celda no sea nula o indefinida y sea un objeto.
  if (!cell || typeof cell !== 'object') {
    return false;
  }
  // A group cell is an object that has a 'table' property and our custom 'isGroup' flag.
  return 'table' in cell && 'isGroup' in cell && (cell as any).isGroup === true;
};

export function getMainTableLayout(): CustomTableLayout {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => COLORS.BORDER,
    vLineColor: () => COLORS.BORDER,
    paddingLeft: () => CELL_HORIZONTAL_PADDING,
    paddingRight: () => CELL_HORIZONTAL_PADDING,
    paddingTop: () => CELL_VERTICAL_PADDING,
    paddingBottom: () => CELL_VERTICAL_PADDING,
  };
}

/**
 * Un layout específico para la tabla que contiene la "fila desobediente".
 * Este layout es inteligente: quita el padding de las filas que son grupos
 * para evitar el doble padding y el encogimiento.
 */
export function getLayoutForSpecialRows(): TableLayout {
  const mainLayout = getMainTableLayout() as any;

  // NOTA: Las definiciones de tipo de @types/pdfmake para el padding son incorrectas.
  // En realidad, pdfmake pasa 3 argumentos, no 2. Usamos `as any` para evitar el error de TypeScript.

  // Para padding horizontal, `i` es columnIndex, `j` es rowIndex.
  mainLayout.paddingLeft = (i: number, node: ContentTable, j: number) =>
    isGroupCell(node.table.body[j]?.[0]) ? 0 : CELL_HORIZONTAL_PADDING;
  mainLayout.paddingRight = (i: number, node: ContentTable, j: number) =>
    isGroupCell(node.table.body[j]?.[0]) ? 0 : CELL_HORIZONTAL_PADDING;
  // Para padding vertical, `i` es rowIndex. El tercer argumento `j` (columnIndex) no se necesita.
  mainLayout.paddingTop = (i: number, node: ContentTable) =>
    isGroupCell(node.table.body[i]?.[0]) ? 0 : CELL_VERTICAL_PADDING;
  mainLayout.paddingBottom = (i: number, node: ContentTable) =>
    isGroupCell(node.table.body[i]?.[0]) ? 0 : CELL_VERTICAL_PADDING;
  return mainLayout;
}

export function getNestedTableLayout(): TableLayout {
  return {
    // Sin líneas horizontales dentro del grupo.
    hLineWidth: () => 0,
    // Dibuja líneas verticales entre todas las columnas internas.
    vLineWidth: (i: number, node: ContentTable) => {
      // No dibujar línea al principio ni al final.
      if (i === 0 || i === node.table.widths!.length) return 0;
      // Dibujar una línea de 0.5 de grosor para todas las demás.
      return 0.5;
    },
    hLineColor: () => COLORS.BORDER,
    vLineColor: () => COLORS.BORDER,
    // Usamos las mismas constantes de padding para que el espaciado interno sea consistente con el resto de la tabla.
    paddingLeft: () => CELL_HORIZONTAL_PADDING,
    paddingRight: () => CELL_HORIZONTAL_PADDING,
    paddingTop: () => CELL_VERTICAL_PADDING,
    paddingBottom: () => CELL_VERTICAL_PADDING,
  };
}

export function getDynamicTableLayout(): TableLayout {
  // Reutilizamos el layout principal para mantener la consistencia visual.
  return getMainTableLayout();
}
