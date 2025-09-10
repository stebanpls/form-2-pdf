import { FormArray, FormControl, FormGroup } from '@angular/forms';

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
 * Representa una sección del formulario agrupada para la vista,
 * tal como la devuelve el GroupBySectionPipe.
 */
export interface FormSection {
  title: string;
  fields: FormField[];
}

/**
 * Encapsulates all the necessary information to generate a PDF document.
 */
export interface PdfGenerationContext {
  form: FormGroup;
  formFields: FormField[];
  defaultReportTitle: string;
}

/**
 * Represents a report document fetched from Firestore, including its ID.
 */
export interface ReportDocument {
  id: string;
  data: ReportData;
}

/**
 * Represents the result of an asynchronous operation, like saving data or generating a PDF.
 */
export interface ActionResult {
  success: boolean;
  error?: unknown;
}

// --- Strongly-typed Form Interfaces ---

/** Represents the structure of a single row in the 'beneficiaries' dynamic table. */
export interface BeneficiaryForm {
  firstName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  relationship: FormControl<string | null>;
  age: FormControl<number | null>;
}

/** Represents the structure of the 'valuation' checkbox group. */
export interface ValuationForm {
  sivim: FormControl<boolean | null>;
  sisvecos: FormControl<boolean | null>;
  vespa: FormControl<boolean | null>;
  securityPlan: FormControl<boolean | null>;
  notApplicable: FormControl<boolean | null>;
}

/** Represents the complete, strongly-typed structure of the main report form. */
export interface ReportForm {
  // General Project Data
  projectName: FormControl<string | null>;
  projectManager: FormControl<string | null>;
  projectDescription: FormControl<string | null>;
  deliveryDate: FormControl<string | null>;
  generationDate: FormControl<string | null>;

  // Dynamic Sections
  beneficiaries: FormArray<FormGroup<BeneficiaryForm>>;
  valuation: FormGroup<ValuationForm>;

  // Add other top-level form controls here if any, e.g., title
  title?: FormControl<string | null>;
}
