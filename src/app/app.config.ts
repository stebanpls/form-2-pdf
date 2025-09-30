import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { firebaseProviders } from './firebase.providers';
import { ReportDataService } from './services/reports/report-data.service';
import { ReportCrudService } from './services/reports/report-crud.service';
import { DynamicFormService } from './services/form/dynamic-form.service';

// Agrupamos los servicios que dependen de Firebase para proveerlos junto con Firebase.
const dataAccessProviders = [ReportDataService, ReportCrudService, DynamicFormService];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Proveemos todos los servicios de acceso a datos y Firebase a nivel de aplicación.
    ...firebaseProviders,
    ...dataAccessProviders,
  ],
};
