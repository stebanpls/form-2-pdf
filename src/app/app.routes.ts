import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'formulario',
    loadComponent: () =>
      import('./pages/form-page/form-page.component').then((c) => c.FormPageComponent),
    // Carga los proveedores de Firebase solo cuando esta ruta se activa.
    loadProviders: () => import('./firebase.providers'),
  },
  {
    path: 'formulario/:id', // Ruta para editar
    loadComponent: () =>
      import('./pages/form-page/form-page.component').then((c) => c.FormPageComponent),
    loadProviders: () => import('./firebase.providers'),
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./pages/reports-page/reports-page.component').then((c) => c.ReportsPageComponent),
    loadProviders: () => import('./firebase.providers'),
  },
  // Redirige la ruta vacía a '/formulario'
  { path: '', redirectTo: '/formulario', pathMatch: 'full' },
  // Una ruta comodín para manejar URLs no encontradas
  { path: '**', redirectTo: '/formulario' },
];
