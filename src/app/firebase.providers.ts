import { Provider } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment.development';

// Este array contiene todos los proveedores necesarios para inicializar Firebase.
const firebaseProviders = [
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideFirestore(() => getFirestore()),
];

// Lo exportamos como default para que el enrutador pueda cargarlo de forma perezosa.
export default firebaseProviders;
