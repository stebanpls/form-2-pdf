import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../../models/report.model';

@Component({
  selector: 'app-form-field',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) form!: FormGroup;

  get control(): AbstractControl | null {
    return this.form.get(this.field.id);
  }
}
