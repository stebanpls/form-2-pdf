import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormComponent } from '../../components/form/form.component';

@Component({
  selector: 'app-form-page',
  imports: [FormComponent],
  templateUrl: './form-page.component.html',
  styleUrl: './form-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPageComponent {}
