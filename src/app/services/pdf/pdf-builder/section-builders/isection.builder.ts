import { Content } from 'pdfmake/interfaces';
import { FormSection, ReportData } from '../../../../models/report.model';

/**
 * Defines the contract for a section builder.
 * Each builder is responsible for constructing a specific type of section for the PDF.
 */
export interface ISectionBuilder {
  /**
   * Determines if this builder can handle the given section.
   * @param section The section to check.
   * @returns `true` if the builder can handle the section, `false` otherwise.
   */
  canHandle(section: FormSection): boolean;

  /**
   * Builds the PDF content for the given section.
   * @param section The section data.
   * @param rawData The complete form data.
   * @returns The PDF content structure for the section.
   */
  build(section: FormSection, rawData: ReportData): Content;
}
