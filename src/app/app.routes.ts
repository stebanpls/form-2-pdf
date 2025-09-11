import { Routes } from '@angular/router';
import { firebaseProviders } from './firebase.providers';
import { ReportDataService } from './services/reports/report-data.service';
import { ReportCrudService } from './services/reports/report-crud.service';
import { DynamicFormService } from './services/form/dynamic-form.service';

// Agrupamos los servicios que dependen de Firebase para proveerlos junto con Firebase.
const dataAccessProviders = [ReportDataService, ReportCrudService, DynamicFormService];

export const routes: Routes = [
  {
    path: 'formulario',
    loadComponent: () =>
      import('./pages/form-page/form-page.component').then((c) => c.FormPageComponent),
    providers: [...firebaseProviders, ...dataAccessProviders],
  },
  {
    path: 'formulario/:id', // Ruta para editar
    loadComponent: () =>
      import('./pages/form-page/form-page.component').then((c) => c.FormPageComponent),
    providers: [...firebaseProviders, ...dataAccessProviders],
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./pages/reports-page/reports-page.component').then((c) => c.ReportsPageComponent),
    providers: [...firebaseProviders, ...dataAccessProviders],
  },
  // Redirige la ruta vacía a '/formulario'
  { path: '', redirectTo: '/formulario', pathMatch: 'full' },
  // Una ruta comodín para manejar URLs no encontradas
  { path: '**', redirectTo: '/formulario' },
];
