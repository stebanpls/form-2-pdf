import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormField, HeaderConfig, PdfMetadata, ReportData } from '../../models/report.model';
import { ReportForm } from '../../models/form.model';
import { CommonModule } from '@angular/common';
import { DynamicFormService } from '../../services/form/dynamic-form.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, map, switchMap, tap, from } from 'rxjs';
import { DynamicTableComponent } from '../../shared/components/dynamic-table/dynamic-table.component';
import { PdfPreviewModalComponent } from '../../shared/components/pdf-preview-modal/pdf-preview-modal.component'; // Assuming this was added
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component'; // Assuming this was added
import { PdfStateService } from '../../services/pdf/pdf-state.service';
import { GroupBySectionPipe } from '../../shared/pipes/group-by-section.pipe';
import { ReportCrudService } from '../../services/reports/report-crud.service';
import { ReportDataService } from '../../services/reports/report-data.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { FormDefinition } from '../../services/form/dynamic-form.service';
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
  private readonly initialFormState: FormDefinition = {
    id: '',
    form: this.fb.group<{ [key: string]: any }>({}),
    fields: [] as FormField[],
    title: DEFAULT_REPORT_TITLE,
    headerConfig: undefined as HeaderConfig | undefined,
    pdfMetadata: undefined as PdfMetadata | undefined,
  };

  // A signal that holds the state of our form definition, loaded asynchronously.
  private readonly formDefinition = toSignal(
    // CORRECCIÓN: El pipe debe estar en el observable, no en la señal.
    this.route.paramMap.pipe(
      map((params) => params.get('id')),
      switchMap((reportId) => {
        // Convertimos la lógica asíncrona para obtener el templateId en un Observable
        const templateId$ = from(
          (async () => {
            if (!reportId) {
              return 'valoracion-individual';
            }
            try {
              const docSnap = await this.reportDataService.getReport(reportId);
              if (docSnap.exists()) {
                const reportData = docSnap.data() as ReportData;
                return reportData['templateId'] || 'valoracion-individual';
              }
            } catch (error) {
              console.error('Error fetching report to determine templateId:', error);
            }
            return 'valoracion-individual'; // Fallback
          })()
        );

        return templateId$.pipe(
          switchMap((templateId) => this.dynamicFormService.createForm$(templateId, reportId))
        );
      }),
      tap(() => this.isFormLoading.set(false)),
      catchError((error) => {
        console.error('Error initializing form:', error);
        this.notificationService.show('Error al cargar la configuración del formulario.', 'error');
        this.isFormLoading.set(false);
        return of(this.initialFormState);
      })
    ),
    { initialValue: this.initialFormState }
  );

  // Computed signals that derive their values from the formDefinition signal.
  // They automatically update when formDefinition changes.
  public readonly formFields = computed(() => this.formDefinition().fields);
  // CORRECCIÓN: Accedemos a la señal directamente.
  public readonly reportTitle = computed(() => this.formDefinition().title ?? DEFAULT_REPORT_TITLE);

  // Computed signal to generate the desired PDF filename.
  private readonly pdfFilename = computed(() => {
    // CORRECCIÓN: Accedemos a la señal directamente.
    const definition = this.formDefinition();
    const headerConfig = definition.headerConfig;
    if (headerConfig && headerConfig.documentCode && headerConfig.documentTitle) {
      return `${headerConfig.documentCode} - ${headerConfig.documentTitle}`;
    }
    // Fallback to the general report title if specific fields are not available.
    return this.reportTitle();
  });

  // We use a getter to access the form from the main signal and cast it to our strong type.
  public get dataForm(): FormGroup<ReportForm> {
    // CORRECCIÓN: Accedemos a la señal directamente.
    return this.formDefinition().form as FormGroup<ReportForm>;
  }

  constructor() {
    // CORRECCIÓN: Usamos un `effect` para reaccionar cuando el formulario se ha cargado.
    // Esto nos permite añadir la fila inicial para la tabla en formularios nuevos.
    effect(() => {
      const definition = this.formDefinition();
      const isEditing = !!this.reportId();

      // Si el formulario ya se inicializó, no estamos editando y no se está cargando...
      if (definition.fields.length > 0 && !isEditing && !this.isFormLoading()) {
        // Buscamos el campo de la tabla dinámica
        const dynamicTableField = definition.fields.find((f) => f.type === 'dynamic_table');
        if (dynamicTableField) {
          this.onAddRow(dynamicTableField);
        }
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

  // Method to save to the Firebase database
  async onSaveToDatabase(): Promise<void> {
    const id = this.reportId();
    const definition = this.formDefinition();

    // CLAVE: Añadimos el ID de la plantilla a los datos que se van a guardar.
    // Usamos el ID del documento de la plantilla, que es más robusto que el título.
    // CORRECCIÓN: `definition` ya es del tipo correcto.
    const templateId = definition.fields.length > 0 ? definition.id : 'valoracion-individual';
    const dataToSave = {
      ...this.dataForm.getRawValue(),
      templateId: templateId,
    };

    this.isLoading.set(true);
    // CORRECCIÓN: El servicio `saveReport` ahora solo necesita el ID y los datos.
    // El FormGroup y los fields ya no son necesarios.
    const result = await this.reportCrudService.saveReport(id ?? null, dataToSave);
    this.isLoading.set(false);

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
    const definition = this.formDefinition();
    const context = {
      form: this.dataForm,
      formFields: this.formFields(),
      headerConfig: definition.headerConfig,
      pdfMetadata: definition.pdfMetadata,
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
