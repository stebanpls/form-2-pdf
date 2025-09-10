import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { FormField, ReportData } from '../../models/report.model';
import { runInInjectionContext } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ReportDataService {
  // Renaming the class
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  getFormDefinition() {
    return runInInjectionContext(this.injector, () => {
      const formDefRef = doc(this.firestore, 'form-templates', 'reportTemplate');
      return getDoc(formDefRef);
    });
  }

  getReport(id: string) {
    return runInInjectionContext(this.injector, () => {
      const reportDocRef = doc(this.firestore, 'reports', id);
      return getDoc(reportDocRef);
    });
  }

  /**
   * Adds a new report document to the 'reports' collection.
   */
  addReport(reportData: ReportData) {
    return runInInjectionContext(this.injector, () => {
      const reportsCollection = collection(this.firestore, 'reports');
      return addDoc(reportsCollection, reportData);
    });
  }

  updateReport(id: string, reportData: ReportData) {
    return runInInjectionContext(this.injector, () => {
      const reportDocRef = doc(this.firestore, 'reports', id);
      return updateDoc(reportDocRef, reportData);
    });
  }

  deleteReport(id: string) {
    return runInInjectionContext(this.injector, () => {
      const reportDocRef = doc(this.firestore, 'reports', id);
      return deleteDoc(reportDocRef);
    });
  }

  getReports() {
    return runInInjectionContext(this.injector, () => {
      const reportsCollection = collection(this.firestore, 'reports');
      // Ordenamos por 'projectName' para tener una lista consistente.
      const q = query(reportsCollection, orderBy('projectName'));
      return getDocs(q);
    });
  }

  searchReports(searchTerm: string) {
    return runInInjectionContext(this.injector, () => {
      const reportsCollection = collection(this.firestore, 'reports');
      // Esta consulta busca proyectos cuyo nombre comience con el término de búsqueda.
      // Firestore es sensible a mayúsculas y minúsculas.
      const q = query(
        reportsCollection,
        where('projectName', '>=', searchTerm),
        where('projectName', '<=', searchTerm + '\uf8ff')
      );
      return getDocs(q);
    });
  }
}
