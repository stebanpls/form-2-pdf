import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormField, HeaderConfig, PdfMetadata } from '../../models/report.model';
import { ReportForm } from '../../models/form.model';
import { CommonModule } from '@angular/common';
import { DynamicFormService } from '../../services/form/dynamic-form.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, map, switchMap, tap } from 'rxjs';
import { DynamicTableComponent } from '../../shared/components/dynamic-table/dynamic-table.component'; // Assuming this was added
import { PdfPreviewModalComponent } from '../../shared/components/pdf-preview-modal/pdf-preview-modal.component'; // Assuming this was added
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component'; // Assuming this was added
import { PdfStateService } from '../../services/pdf/pdf-state.service';
import { GroupBySectionPipe } from '../../shared/pipes/group-by-section.pipe';
import { ReportCrudService } from '../../services/reports/report-crud.service';
import { ReportDataService } from '../../services/reports/report-data.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DEFAULT_REPORT_TITLE } from '../../shared/constants/app.constants';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    CommonModule, // Keep CommonModule for basic directives
    ReactiveFormsModule,
    DynamicTableComponent,
    PdfPreviewModalComponent,
    FormFieldComponent,
    GroupBySectionPipe, // Add the new pipe here
    LoadingSpinnerComponent,
  ],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormComponent {
  // Modern Dependency Injection with inject()
  private readonly fb = inject(FormBuilder);
  private readonly dynamicFormService = inject(DynamicFormService);
  private readonly reportDataService = inject(ReportDataService);
  private readonly reportCrudService = inject(ReportCrudService);
  public readonly pdfStateService = inject(PdfStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  // Signal to manage loading state and disable buttons
  public readonly isLoading = signal(false);
  // Signal to manage the initial loading of the form definition
  public readonly isFormLoading = signal(true);

  // Signal to track if we are in edit mode
  private readonly reportId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))));

  // Define a clear initial state for our form data.
  // This is used both as the initial value for the signal and as a fallback on error.
  private readonly initialFormState = {
    form: this.fb.group<{ [key: string]: any }>({}),
    fields: [] as FormField[],
    title: DEFAULT_REPORT_TITLE,
    headerConfig: undefined as HeaderConfig | undefined,
    pdfMetadata: undefined as PdfMetadata | undefined,
  };

  // A signal that holds the state of our form definition, loaded asynchronously.
  private readonly formDefinition = toSignal(
    this.dynamicFormService.createForm$().pipe(
      tap(() => this.isFormLoading.set(false)),
      catchError((error) => {
        console.error('Error initializing form:', error);
        // Optionally, display an error message to the user in the template.
        this.isFormLoading.set(false);
        // We return an empty state to prevent the app from crashing.
        return of(this.initialFormState);
      })
    ),
    // Provide a non-null initial value. The form will be empty until the data loads.
    { initialValue: this.initialFormState }
  );

  // Computed signals that derive their values from the formDefinition signal.
  // They automatically update when formDefinition changes.
  public readonly formFields = computed(() => this.formDefinition().fields);
  public readonly reportTitle = computed(
    () => this.formDefinition()?.title ?? DEFAULT_REPORT_TITLE
  );

  // Computed signal to generate the desired PDF filename.
  private readonly pdfFilename = computed(() => {
    const headerConfig = this.formDefinition()?.headerConfig;
    if (headerConfig?.documentCode && headerConfig?.documentTitle) {
      return `${headerConfig.documentCode} - ${headerConfig.documentTitle}`;
    }
    // Fallback to the general report title if specific fields are not available.
    return this.reportTitle();
  });

  // We use a getter to access the form from the main signal and cast it to our strong type.
  public get dataForm(): FormGroup<ReportForm> {
    return this.formDefinition().form as unknown as FormGroup<ReportForm>;
  }

  constructor() {
    effect(() => {
      const id = this.reportId();
      // This effect runs when the form is created OR when the id changes.
      // We need to ensure the form has been initialized by formDefinition.
      const form = this.formDefinition().form;
      if (Object.keys(form.controls).length === 0) return; // Form not ready

      if (id) {
        this.loadReportForEdit(id);
      } else {
        form.reset(); // Clear form when navigating from edit to new
      }
    });
  }

  // --- Métodos para la Tabla Dinámica ---

  /**
   * Obtiene un FormArray del formulario principal por su ID.
   * Esencial para enlazar el array de filas en la plantilla.
   */
  public getFormArray(fieldId: string): FormArray {
    return this.dataForm.get(fieldId) as FormArray;
  }

  /** Agrega una nueva fila a la tabla dinámica. */
  onAddRow(field: FormField): void {
    const formArray = this.getFormArray(field.id);
    this.dynamicFormService.addRowToTable(formArray, field.fields || []);
  }

  /** Elimina una fila de la tabla dinámica por su índice. */
  onRemoveRow(fieldId: string, index: number): void {
    const formArray = this.getFormArray(fieldId);
    this.dynamicFormService.removeRowFromTable(formArray, index);
  }

  private async loadReportForEdit(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const docSnap = await this.reportDataService.getReport(id);
      if (docSnap.exists()) {
        this.dataForm.patchValue(docSnap.data());
      } else {
        this.notificationService.show(
          'Reporte no encontrado. Redirigiendo a un nuevo formulario.',
          'error'
        );
        this.router.navigate(['/formulario']);
      }
    } catch (error) {
      this.notificationService.show(`Error al cargar el reporte: ${error}`, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Method to save to the Firebase database
  async onSaveToDatabase(): Promise<void> {
    const id = this.reportId();
    const result = await this.reportCrudService.saveReport(
      id ?? null,
      this.dataForm,
      this.formFields(),
      this.isLoading
    );

    if (result.success) {
      this.notificationService.show(
        `¡Reporte ${id ? 'actualizado' : 'guardado'} con éxito!`,
        'success'
      );
      this.router.navigate(['/reportes']);
    } else {
      this.notificationService.show(
        `Hubo un error al ${id ? 'actualizar' : 'guardar'} los datos.`,
        'error'
      );
    }
  }

  async onGeneratePreview(): Promise<void> {
    const context = {
      form: this.dataForm,
      formFields: this.formFields(),
      headerConfig: this.formDefinition().headerConfig,
      pdfMetadata: this.formDefinition().pdfMetadata,
      pdfTitle: this.pdfFilename(), // Usamos el nombre de archivo dinámico como título
    };
    const result = await this.pdfStateService.generatePdfPreview(context, this.isLoading);
    if (!result.success) {
      this.notificationService.show('Hubo un error al generar la vista previa.', 'error');
    }
  }

  async onDownloadPdf(): Promise<void> {
    await this.pdfStateService.downloadCurrentPdf();
  }

  onClosePreview(): void {
    this.pdfStateService.closePreview();
  }
}
