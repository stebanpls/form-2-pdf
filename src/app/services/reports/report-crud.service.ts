import { Injectable, WritableSignal, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ReportDataService } from './report-data.service';
import { FormField, ReportData } from '../../models/report.model';
import { ActionResult } from '../../models/action-result.model';

@Injectable()
export class ReportCrudService {
  private readonly reportDataService = inject(ReportDataService);

  /**
   * Guarda un reporte, decidiendo si crearlo o actualizarlo basado en la presencia de un ID.
   */
  async saveReport(
    id: string | null,
    form: FormGroup,
    formFields: FormField[],
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    if (id) {
      return this.updateReport(id, form, formFields, isLoading);
    }
    return this.createReport(form, formFields, isLoading);
  }

  async createReport(
    form: FormGroup,
    formFields: FormField[],
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    if (form.invalid) {
      return { success: false, error: 'Formulario inválido.' };
    }

    isLoading.set(true);
    const cleanData = this._prepareDataForSave(form.getRawValue(), formFields);
    try {
      const docRef = await this.reportDataService.addReport(cleanData);
      console.log('Documento guardado en Firestore con ID: ', docRef.id);
      return { success: true };
    } catch (e) {
      console.error('Error al guardar en Firestore: ', e);
      return { success: false, error: e };
    } finally {
      isLoading.set(false);
    }
  }

  async updateReport(
    id: string,
    form: FormGroup,
    formFields: FormField[],
    isLoading: WritableSignal<boolean>
  ): Promise<ActionResult> {
    if (form.invalid) {
      return { success: false, error: 'Formulario inválido.' };
    }
    isLoading.set(true);
    const cleanData = this._prepareDataForSave(form.getRawValue(), formFields);
    try {
      await this.reportDataService.updateReport(id, cleanData);
      console.log('Documento actualizado en Firestore con ID: ', id);
      return { success: true };
    } catch (e) {
      console.error('Error al actualizar en Firestore: ', e);
      return { success: false, error: e };
    } finally {
      isLoading.set(false);
    }
  }

  async deleteReport(id: string, isLoading: WritableSignal<boolean>): Promise<ActionResult> {
    isLoading.set(true);
    try {
      await this.reportDataService.deleteReport(id);
      console.log('Documento eliminado de Firestore con ID: ', id);
      return { success: true };
    } catch (e) {
      console.error('Error al eliminar de Firestore: ', e);
      return { success: false, error: e };
    } finally {
      isLoading.set(false);
    }
  }

  /**
   * Prepara los datos del formulario para ser guardados, convirtiendo los
   * strings vacíos de campos opcionales en `null` para consistencia en la BD.
   */
  private _prepareDataForSave(rawData: ReportData, fields: FormField[]): ReportData {
    const cleanData: ReportData = {};

    for (const field of fields) {
      const value = rawData[field.id];

      if (field.type === 'dynamic_table' && Array.isArray(value)) {
        // Limpia recursivamente cada fila de la tabla dinámica
        cleanData[field.id] = value.map((row) => this._prepareDataForSave(row, field.fields || []));
      } else if (value === '') {
        // Convierte strings vacíos a null.
        // Los campos requeridos no estarán vacíos gracias a la validación del formulario.
        cleanData[field.id] = null;
      } else {
        // Mantiene el valor original para todo lo demás (números, fechas, booleanos, texto lleno).
        cleanData[field.id] = value;
      }
    }
    return cleanData;
  }
}
