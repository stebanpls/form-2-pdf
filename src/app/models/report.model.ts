export interface FormFieldOption {
  id: string;
  label: string;
  summary?: string;
  description?: string;
}

/**
 * Define la estructura de un campo de nuestro formulario dinámico.
 * Esta interfaz es recursiva: un campo puede contener otros campos (para tablas dinámicas).
 */
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'dynamic_table' | 'detailed_multiple_choice';
  order?: number;
  defaultValue?: any;
  required?: boolean;
  sectionTitle?: string;

  // Esta propiedad se usa SOLO cuando el tipo es 'dynamic_table'.
  // Es un ARRAY de objetos FormField, donde cada objeto define una columna.
  fields?: FormField[];
  // Esta propiedad se usa SOLO cuando el tipo es 'detailed_multiple_choice'.
  options?: FormFieldOption[];

  // Etiqueta para el botón de "agregar fila" en tablas dinámicas.
  addRowLabel?: string;

  showInForm?: boolean;
}

/**
 * Representa los datos enviados desde el formulario.
 * Es un diccionario donde la clave es el 'id' del campo.
 */
export interface ReportData {
  [key: string]: any;
}

/**
 * Represents a report document fetched from Firestore, including its ID.
 */
export interface ReportDocument {
  id: string;
  data: ReportData;
}
