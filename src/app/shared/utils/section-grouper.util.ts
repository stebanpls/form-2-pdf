import { FormField, FormSection } from '../../models/report.model';

/**
 * Provides a centralized utility for grouping form fields into sections.
 */
export class SectionGrouperUtil {
  /**
   * Groups a list of fields by their `sectionTitle`.
   * It sorts the fields by their `order` property before grouping.
   * Fields without a `sectionTitle` are grouped under the previous section
   * or a default section named 'Información General'.
   *
   * @param fieldsToGroup The array of FormField objects to group.
   * @returns An array of `FormSection` objects.
   */
  public static group(fieldsToGroup: FormField[]): FormSection[] {
    if (!fieldsToGroup || fieldsToGroup.length === 0) {
      return [];
    }

    // Primero, ordena todos los campos para asegurar el orden interno de cada sección.
    const sortedFields = [...fieldsToGroup].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Luego, agrupa los campos por su título de sección usando un Map para evitar duplicados.
    const sectionsMap = new Map<string, FormField[]>();
    for (const field of sortedFields) {
      const sectionTitle = field.sectionTitle || 'Información General';

      if (!sectionsMap.has(sectionTitle)) {
        sectionsMap.set(sectionTitle, []);
      }
      sectionsMap.get(sectionTitle)!.push(field);
    }

    // Convierte el Map a un array de FormSection.
    const groupedSections = Array.from(sectionsMap.entries()).map(([title, fields]) => ({
      title,
      fields,
    }));

    // Finalmente, ordena las secciones basándose en el `order` del primer campo de cada una.
    return groupedSections.sort((a, b) => (a.fields[0].order ?? 0) - (b.fields[0].order ?? 0));
  }
}
