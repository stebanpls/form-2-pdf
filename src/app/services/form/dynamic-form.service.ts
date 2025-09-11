import { Injectable, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  FormControl,
  AbstractControl,
} from '@angular/forms';
import { ReportDataService } from '../reports/report-data.service';
import { FormField, FormFieldOption } from '../../models/report.model';
import { from } from 'rxjs';

@Injectable()
export class DynamicFormService {
  private fb = inject(FormBuilder);
  private dataService = inject(ReportDataService);

  async createFormGroupFromTemplate(): Promise<{
    form: FormGroup<{ [key: string]: any }>;
    fields: FormField[];
    title: string;
  }> {
    const docSnap = await this.dataService.getFormDefinition();

    if (docSnap.exists()) {
      const data = docSnap.data(); // Safe access
      const title = (data?.['title'] as string) || 'Reporte PDF'; // Extraemos el título
      const fields = ((data?.['fields'] as FormField[]) ?? []).sort(
        // Use the variable and provide a fallback
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const formGroupConfig: { [key: string]: any } = {};

      for (const field of fields) {
        formGroupConfig[field.id] = this._createControlForField(field);
      }

      const form = this.fb.group(formGroupConfig);
      return { form, fields, title };
    } else {
      // It's better to reject the promise or throw an error if the template is not found.
      return Promise.reject('No form definition found in Firestore!');
    }
  }

  /**
   * Crea un FormGroup para una sola fila en una tabla dinámica.
   * Este método es público porque es reutilizado por el FormComponent para añadir nuevas filas.
   */
  createDynamicTableRow(rowFields: FormField[]): FormGroup {
    const rowGroupConfig: { [key: string]: any } = {};
    rowFields.forEach((col) => {
      rowGroupConfig[col.id] = this._createDefaultControl(col);
    });
    return this.fb.group(rowGroupConfig);
  }

  /** Adds a new row to a given FormArray for a dynamic table. */
  public addRowToTable(formArray: FormArray, rowFields: FormField[]): void {
    formArray.push(this.createDynamicTableRow(rowFields));
  }

  /** Removes a row from a given FormArray at a specific index. */
  public removeRowFromTable(formArray: FormArray, index: number): void {
    formArray.removeAt(index);
  }

  /** Dispatcher method to create the correct form control based on field type. */
  private _createControlForField(field: FormField): AbstractControl {
    switch (field.type) {
      case 'dynamic_table':
        return this._createDynamicTableControl(field);
      case 'detailed_multiple_choice':
        return this._createMultipleChoiceControl(field);
      default:
        return this._createDefaultControl(field);
    }
  }

  /** Creates a standard FormControl for simple input types. */
  private _createDefaultControl(field: FormField): FormControl {
    const validators = field.required ? [Validators.required] : [];
    return this.fb.control(field.defaultValue || '', validators);
  }

  /** Creates a FormArray for dynamic tables, initialized with one row. */
  private _createDynamicTableControl(field: FormField): FormArray {
    return this.fb.array([this.createDynamicTableRow(field.fields || [])]);
  }

  /** Creates a FormGroup for a group of checkboxes. */
  private _createMultipleChoiceControl(field: FormField): FormGroup {
    const group: { [key: string]: any } = {};
    (field.options || []).forEach((option: FormFieldOption) => {
      group[option.id] = this.fb.control(field.defaultValue?.[option.id] || false);
    });
    return this.fb.group(group);
  }

  createForm$() {
    return from(this.createFormGroupFromTemplate());
  }
}
