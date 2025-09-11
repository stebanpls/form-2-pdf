import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { FormField } from './report.model';

/**
 * Representa una sección del formulario agrupada para la vista,
 * tal como la devuelve el GroupBySectionPipe.
 */
export interface FormSection {
  title: string;
  fields: FormField[];
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
