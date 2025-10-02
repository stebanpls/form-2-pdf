import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { doc, docData, Firestore, DocumentData } from '@angular/fire/firestore';
import { map, switchMap, of, forkJoin, Observable, firstValueFrom, first, tap } from 'rxjs';
import { FormField, HeaderConfig, PdfMetadata, ReportData } from '../../models/report.model';

// Define la estructura completa de una plantilla cargada
export interface FormDefinition {
  id: string; // El ID de la plantilla (ej. 'valoracion-individual')
  form: FormGroup;
  fields: FormField[];
  title: string;
  headerConfig?: HeaderConfig;
  pdfMetadata?: PdfMetadata;
}

@Injectable({
  providedIn: 'root',
})
export class DynamicFormService {
  private readonly fb = inject(FormBuilder);
  private readonly firestore: Firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  /**
   * Crea la definición completa del formulario, cargando la plantilla y sus configuraciones asociadas.
   * @param templateId El ID de la plantilla a cargar (ej. 'valoracion-individual').
   * @param reportId (Opcional) El ID de un reporte existente para precargar sus datos.
   */
  createForm$(
    templateId: string = 'valoracion-individual',
    reportId?: string | null
  ): Observable<FormDefinition> {
    return runInInjectionContext(this.injector, () => {
      // 1. Obtener la plantilla base desde 'form-templates'
      const templateDocRef = doc(this.firestore, `form-templates/${templateId}`);

      return docData(templateDocRef, { idField: 'id' }).pipe(
        switchMap((templateData: DocumentData | undefined) => {
          if (!templateData) {
            throw new Error(`No se encontró la plantilla con ID: ${templateId}`);
          }

          // Aquí definimos la forma que esperamos de la plantilla.
          const template = templateData as {
            fields: FormField[];
            title: string;
            headerConfigId: string;
            pdfMetadataId: string;
          };

          const fields = template.fields || [];
          const title = template.title || 'Reporte';
          const headerConfigId = templateData['headerConfigId'] as string;
          const pdfMetadataId = templateData['pdfMetadataId'] as string;

          // --- CORRECCIÓN: Envolvemos las llamadas internas a Firebase ---
          // 2. Crear observables para cargar las configuraciones, asegurando el contexto.
          const headerConfig$ = runInInjectionContext(this.injector, () =>
            headerConfigId // Usamos first() para que el observable se complete después de la primera emisión.
              ? docData(doc(this.firestore, `pdf-configurations/${headerConfigId}`)).pipe(first())
              : of(undefined)
          );

          const pdfMetadata$ = runInInjectionContext(this.injector, () =>
            pdfMetadataId // Usamos first() para que el observable se complete después de la primera emisión.
              ? docData(doc(this.firestore, `pdf-configurations/${pdfMetadataId}`)).pipe(first())
              : of(undefined)
          );

          // 3. Usar forkJoin para esperar a que todas las configuraciones se carguen en paralelo
          return forkJoin({
            headerConfig: headerConfig$,
            pdfMetadata: pdfMetadata$,
          }).pipe(
            map(({ headerConfig, pdfMetadata }) => {
              // 4. Construir el FormGroup a partir de los campos de la plantilla
              const formGroup = this.buildFormGroup(fields);

              // 5. Devolver la definición completa del formulario
              return {
                id: templateData['id'], // Guardamos el ID de la plantilla
                form: formGroup,
                fields: fields,
                title: title,
                // Los datos de Firebase vienen anidados, los extraemos.
                headerConfig: (headerConfig as any)?.headerConfig as HeaderConfig,
                pdfMetadata: (pdfMetadata as any)?.pdfMetadata as PdfMetadata,
              };
            })
          );
        }),
        // 6. (Opcional) Si se proporciona un reportId, cargar y parchear los datos
        switchMap(async (formDefinition) => {
          // CORRECCIÓN: Envolvemos la carga de datos en el contexto de inyección
          // y usamos una función de parcheo personalizada para manejar las tablas.
          return runInInjectionContext(this.injector, async () => {
            if (reportId) {
              await this.patchFormWithReportData(formDefinition, reportId);
            }
            return formDefinition;
          });
        })
      );
    });
  }

  // --- Métodos de ayuda para construir el formulario ---

  /**
   * Carga los datos de un reporte y los parchea en el formulario,
   * manejando correctamente los FormArrays (tablas dinámicas).
   */
  private async patchFormWithReportData(
    definition: FormDefinition,
    reportId: string
  ): Promise<void> {
    const reportDocRef = doc(this.firestore, `reports/${reportId}`);
    const reportData = (await firstValueFrom(docData(reportDocRef))) as ReportData;

    if (!reportData) return;

    // Itera sobre los campos de la plantilla para parchear los datos
    definition.fields.forEach((field) => {
      const value = reportData[field.id];
      if (field.type === 'dynamic_table' && Array.isArray(value)) {
        const formArray = definition.form.get(field.id) as FormArray;
        formArray.clear(); // Limpiamos el array antes de llenarlo
        value.forEach((rowData) => {
          const rowGroup = this.buildFormGroup(field.fields || []);
          rowGroup.patchValue(rowData);
          formArray.push(rowGroup);
        });
      }
    });
    definition.form.patchValue(reportData); // Parchea el resto de los campos
  }

  private buildFormGroup(fields: FormField[]): FormGroup {
    const group: { [key: string]: any } = {};
    fields.forEach((field) => {
      if (field.type === 'dynamic_table') {
        group[field.id] = this.fb.array([]);
      } else if (field.type === 'detailed_multiple_choice') {
        const choiceGroup: { [key: string]: any } = {};
        (field.options || []).forEach((option) => {
          choiceGroup[option.id] = this.fb.control(field.defaultValue?.[option.id] || false);
        });
        group[field.id] = this.fb.group(choiceGroup);
      } else {
        const validators = field.required ? [Validators.required] : [];
        group[field.id] = [field.defaultValue ?? null, validators];
      }
    });
    return this.fb.group(group);
  }

  public addRowToTable(formArray: FormArray, columns: FormField[]): void {
    const rowGroup = this.buildFormGroup(columns);
    formArray.push(rowGroup);
  }

  public removeRowFromTable(formArray: FormArray, index: number): void {
    formArray.removeAt(index);
  }
}
