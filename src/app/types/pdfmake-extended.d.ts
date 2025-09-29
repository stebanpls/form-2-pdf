// Este archivo extiende las definiciones de tipo de la librería pdfmake.
// A veces, los paquetes de @types no están completos y es necesario
// añadir manualmente las definiciones que faltan para mantener la seguridad de tipos.

import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Le decimos a TypeScript que vamos a "aumentar" el módulo 'pdfmake/build/pdfmake'.
declare module 'pdfmake/build/pdfmake' {
  // El export por defecto de pdfmake es un objeto. Le damos una interfaz.
  interface PdfMake {
    addVirtualFileSystem(vfs: any): void;
    setFonts(fonts: any): void;
    createPdf(documentDefinitions: TDocumentDefinitions): any; // Mantenemos los métodos existentes
  }

  // Sobrescribimos el 'export default' para que use nuestra interfaz extendida.
  const pdfMake: PdfMake;
  export default pdfMake;
}
