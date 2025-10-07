import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  FormField,
  HeaderConfig,
  PdfMetadata,
  ReportData,
  ReportDocument,
} from '../../models/report.model';
import { FormDefinition } from '../../services/form/dynamic-form.service';
import { ReportDataService } from '../../services/reports/report-data.service';
import { DynamicFormService } from '../../services/form/dynamic-form.service';
import { PdfStateService } from '../../services/pdf/pdf-state.service';
import { PdfPreviewModalComponent } from '../../shared/components/pdf-preview-modal/pdf-preview-modal.component';
import { ReportCrudService } from '../../services/reports/report-crud.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DEFAULT_REPORT_TITLE } from '../../shared/constants/app.constants';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PdfPreviewModalComponent,
    LoadingSpinnerComponent,
  ],
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

  // --- INICIO DE LA REFACTORIZACIÓN DE CARGA PEREZOSA ---

  // 1. La definición del formulario ahora se guarda en una señal que empieza como null.
  //    No se carga al iniciar el componente.
  private readonly formDefinition = signal<FormDefinition | null>(null);

  // 2. Los `computed` ahora dependen de esta nueva señal y manejan el caso `null`.
  public readonly formFields = computed(() => this.formDefinition()?.fields ?? []);
  // Extraemos la configuración de la cabecera de la definición del formulario
  public readonly headerConfig = computed(
    () => this.formDefinition()?.headerConfig as HeaderConfig | undefined
  );
  public readonly pdfMetadata = computed(
    () => this.formDefinition()?.pdfMetadata as PdfMetadata | undefined
  );
  public readonly reportTitle = computed(
    () => this.formDefinition()?.title ?? DEFAULT_REPORT_TITLE
  );
  // Computed signal to generate the desired PDF filename.
  private readonly pdfFilename = computed(() => {
    const headerConfig = this.headerConfig();
    if (headerConfig?.documentCode && headerConfig?.documentTitle) {
      return `${headerConfig.documentCode} - ${headerConfig.documentTitle}`;
    }
    // Fallback to the general report title.
    return this.reportTitle();
  });

  // --- FIN DE LA REFACTORIZACIÓN ---

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
    const result = await this.reportCrudService.deleteReport(reportId);
    if (result.success) {
      this.notificationService.show('Reporte eliminado con éxito.', 'success');
      this.loadReports(this.searchTerm()); // Recarga la lista para que desaparezca el eliminado
    } else {
      this.notificationService.show('Hubo un error al eliminar el reporte.', 'error');
    }
  }

  async onViewPdf(report: ReportDocument): Promise<void> {
    // --- LÓGICA MODIFICADA PARA CARGAR PLANTILLAS DINÁMICAS ---
    // Obtenemos el ID de la plantilla desde los datos del reporte.
    // Si no existe (reporte antiguo), asumimos la plantilla por defecto.
    const templateId = (report.data['templateId'] as string) || 'valoracion-individual';

    // Forzamos la carga de la definición correcta para este reporte.
    const isDefinitionLoaded = await this.ensureFormDefinitionIsLoaded(templateId);
    if (!isDefinitionLoaded || !this.formDefinition()) {
      return;
    }

    const definition = this.formDefinition()!;
    const result = await this.pdfStateService.generatePdfPreviewFromData(
      report.data,
      definition.fields,
      definition.headerConfig,
      definition.pdfMetadata,
      this.pdfFilename(), // Usamos el nombre de archivo dinámico como título
      this.isLoading
    );

    if (!result.success) {
      this.notificationService.show('Hubo un error al generar la vista previa.', 'error');
    }
  }

  /**
   * Carga la definición del formulario bajo demanda si no es la que ya está cargada.
   */
  private async ensureFormDefinitionIsLoaded(templateId: string): Promise<boolean> {
    // CORRECCIÓN: Comparamos el ID de la plantilla, no su título.
    // El ID es 'valoracion-individual', que sí coincide con el templateId.
    if (this.formDefinition()?.id === templateId) {
      return true; // La definición correcta ya está cargada.
    }

    this.isLoading.set(true);
    try {
      // Usamos firstValueFrom para convertir el Observable en una Promesa.
      const definition = await firstValueFrom(this.dynamicFormService.createForm$(templateId));
      this.formDefinition.set(definition);
      return true;
    } catch (err) {
      this.notificationService.show('Error al cargar la configuración del formulario.', 'error');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  onDownloadPdf(): void {
    this.pdfStateService.downloadCurrentPdf();
  }

  onClosePreview(): void {
    this.pdfStateService.closePreview();
  }
}
