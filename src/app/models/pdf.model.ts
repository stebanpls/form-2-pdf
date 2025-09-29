import { FormGroup } from '@angular/forms';
import { FormField, HeaderConfig, PdfMetadata } from './report.model';

/**
 * Encapsulates all the necessary information to generate a PDF document.
 */
export interface PdfGenerationContext {
  form: FormGroup;
  formFields: FormField[];
  headerConfig: HeaderConfig | undefined;
  pdfMetadata: PdfMetadata | undefined;
  pdfTitle: string;
}
