import { FormField, ReportData } from '../../../models/report.model';
import { SHORT_FIELD_THRESHOLD } from './pdf-report.config';

// Tipos para representar los grupos de campos
export interface LongFieldGroup {
  type: 'long';
  field: FormField;
}

export interface ShortFieldGroup {
  type: 'short';
  fields: FormField[];
}

export type FieldGroup = LongFieldGroup | ShortFieldGroup;

/**
 * Agrupa los campos del formulario en "largos" (una fila completa) o "cortos"
 * (pueden compartir una fila).
 */
export class FormFieldGrouper {
  /**
   * Agrupa una lista de campos de formulario.
   * @param formFields Los campos a agrupar.
   * @returns Un array de objetos FieldGroup.
   */
  public static group(formFields: FormField[], rawData: ReportData): FieldGroup[] {
    const MAX_COLUMNS_PER_ROW = 3;
    const groups: FieldGroup[] = [];
    let i = 0;

    while (i < formFields.length) {
      const currentField = formFields[i];

      if (!FormFieldGrouper._isShortField(currentField, rawData)) {
        groups.push({ type: 'long', field: currentField });
        i++;
        continue;
      }

      // Si es un campo corto, recolectamos todos los campos cortos consecutivos para una fila.
      const shortFieldsBucket: FormField[] = [];
      while (
        i < formFields.length &&
        shortFieldsBucket.length < MAX_COLUMNS_PER_ROW &&
        FormFieldGrouper._isShortField(formFields[i], rawData)
      ) {
        shortFieldsBucket.push(formFields[i]);
        i++;
      }
      groups.push({ type: 'short', fields: shortFieldsBucket });
    }

    return groups;
  }

  /**
   * Determina si un campo se considera "corto" basado en su tipo y la longitud
   * combinada de su etiqueta y valor.
   */
  private static _isShortField(field: FormField | null, rawData: ReportData): boolean {
    if (!field || field.type === 'textarea' || field.type === 'detailed_multiple_choice') {
      return false;
    }

    const value = (rawData[field.id] || '').toString();

    // No agrupar campos que contengan HTML para evitar problemas de renderizado.
    if (value.includes('<') || field.label.includes('<')) {
      return false;
    }

    return field.label.length + value.length < SHORT_FIELD_THRESHOLD;
  }
}
