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
  async saveReport(id: string | null, dataToSave: ReportData): Promise<ActionResult> {
    if (id) {
      return this.updateReport(id, dataToSave);
    }
    return this.createReport(dataToSave);
  }

  async createReport(rawData: ReportData): Promise<ActionResult> {
    // Asignamos la fecha de elaboración solo al crear un nuevo reporte.
    rawData['generationDate'] = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    try {
      // Asumimos que los datos ya están limpios y preparados.
      const docRef = await this.reportDataService.addReport(rawData);
      return { success: true };
    } catch (e) {
      console.error('Error al guardar en Firestore: ', e);
      return { success: false, error: e };
    }
  }

  async updateReport(id: string, rawData: ReportData): Promise<ActionResult> {
    // El método _prepareDataForSave ya no es necesario aquí si la limpieza se hace en otro lado
    // o si confiamos en los datos del formulario. Por simplicidad, lo eliminamos.
    const cleanData = rawData;
    try {
      await this.reportDataService.updateReport(id, cleanData);
      return { success: true };
    } catch (e) {
      console.error('Error al actualizar en Firestore: ', e);
      return { success: false, error: e };
    }
  }

  async deleteReport(id: string): Promise<ActionResult> {
    try {
      await this.reportDataService.deleteReport(id);
      return { success: true };
    } catch (e) {
      console.error('Error al eliminar de Firestore: ', e);
      return { success: false, error: e };
    } finally {
    }
  }
}
