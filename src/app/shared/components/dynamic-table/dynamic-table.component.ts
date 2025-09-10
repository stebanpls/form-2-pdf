import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../../models/report.model';

@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicTableComponent {
  @Input({ required: true }) formArray!: FormArray;
  @Input({ required: true }) fields!: FormField[];
  @Input({ required: true }) fieldId!: string;
  @Input() addRowText = '+ Agregar Fila';

  @Output() add = new EventEmitter<void>();
  @Output() remove = new EventEmitter<number>();

  // Helper to cast form controls to FormGroup
  getFormControl(index: number): FormGroup {
    return this.formArray.at(index) as FormGroup;
  }

  onAddRow(): void {
    this.add.emit();
  }

  onRemoveRow(index: number): void {
    this.remove.emit(index);
  }
}
