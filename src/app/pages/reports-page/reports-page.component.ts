import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { FormField, ReportData, ReportDocument } from '../../models/report.model';
import { ReportDataService } from '../../services/reports/report-data.service';
import { DynamicFormService } from '../../services/form/dynamic-form.service';
import { PdfStateService } from '../../services/pdf/pdf-state.service';
import { PdfPreviewModalComponent } from '../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { ReportCrudService } from '../../services/reports/report-crud.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-reports-page',
  imports: [CommonModule, FormsModule, PdfPreviewModalComponent, LoadingSpinnerComponent],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent {
  private readonly reportDataService = inject(ReportDataService);
  private readonly dynamicFormService = inject(DynamicFormService);
  private readonly reportCrudService = inject(ReportCrudService);
  public readonly pdfStateService = inject(PdfStateService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  public readonly isLoading = signal(false);
  public readonly searchTerm = signal('');

  // Signal to hold the form fields definition, needed for PDF generation
  private readonly formDefinition = toSignal(
    this.dynamicFormService.createForm$().pipe(
      catchError((err) => {
        console.error('Error loading form definition for PDF generation', err);
        return of({ form: null, fields: [] as FormField[], title: 'Reporte' });
      })
    )
  );
  public readonly formFields = computed(() => this.formDefinition()?.fields ?? []);
  public readonly reportTitle = computed(
    () => this.formDefinition()?.title ?? 'Reporte de Actividades'
  );

  // Signal that holds the list of reports
  public readonly reports = signal<ReportDocument[]>([]);

  constructor() {
    this.loadReports();
  }

  async loadReports(searchTerm: string = ''): Promise<void> {
    this.isLoading.set(true);
    try {
      const querySnapshot = await (searchTerm
        ? this.reportDataService.searchReports(searchTerm)
        : this.reportDataService.getReports());

      const reportDocs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as ReportData,
      }));
      this.reports.set(reportDocs);
    } catch (error) {
      console.error('Error fetching reports:', error);
      this.notificationService.show('Hubo un error al cargar los reportes.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(): void {
    this.loadReports(this.searchTerm());
  }

  onEdit(reportId: string): void {
    // Navega a la ruta de edición, por ejemplo: /formulario/xyz123
    this.router.navigate(['/formulario', reportId]);
  }

  async onDelete(reportId: string, reportName: string): Promise<void> {
    // Pide confirmación al usuario
    const confirmation = confirm(
      `¿Estás seguro de que quieres eliminar el reporte "${reportName || 'sin nombre'}"?`
    );
    if (!confirmation) return;

    // Llama al servicio para eliminar el reporte
    const result = await this.reportCrudService.deleteReport(reportId, this.isLoading);
    if (result.success) {
      this.notificationService.show('Reporte eliminado con éxito.', 'success');
      this.loadReports(this.searchTerm()); // Recarga la lista para que desaparezca el eliminado
    } else {
      this.notificationService.show('Hubo un error al eliminar el reporte.', 'error');
    }
  }

  async onViewPdf(report: ReportDocument): Promise<void> {
    const fields = this.formFields();
    if (fields.length === 0) {
      this.notificationService.show(
        'No se pudo cargar la definición del formulario para generar el PDF.',
        'error'
      );
      return;
    }

    const result = await this.pdfStateService.generatePdfPreviewFromData(
      report.data,
      fields,
      this.reportTitle(),
      this.isLoading
    );

    if (!result.success) {
      this.notificationService.show('Hubo un error al generar la vista previa.', 'error');
    }
  }

  onDownloadPdf(): void {
    this.pdfStateService.downloadCurrentPdf(this.reportTitle());
  }

  onClosePreview(): void {
    this.pdfStateService.closePreview();
  }
}
