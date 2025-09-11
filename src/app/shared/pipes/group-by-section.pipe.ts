import { Pipe, PipeTransform } from '@angular/core';
import { FormField } from '../../models/report.model';
import { FormSection } from '../../models/form.model';
import { SectionGrouperUtil } from '../utils/section-grouper.util';

@Pipe({
  name: 'groupBySection',
  standalone: true,
})
export class GroupBySectionPipe implements PipeTransform {
  transform(allFields: FormField[] | null): FormSection[] {
    const fieldsForForm = (allFields || []).filter(
      (f) => f.id !== 'title' && f.showInForm !== false
    );
    return SectionGrouperUtil.group(fieldsForForm);
  }
}
