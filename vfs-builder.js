import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

// --- Configuración ---
const fontSourceDir = './src/assets/fonts/arial';
const tempOutputFile = './temp-vfs.js';
const finalOutputFile = './src/assets/fonts/pdf-fonts.ts';
// -------------------

try {
  console.log('Generando archivo VFS temporal...');
  // Ejecuta el script original de pdfmake para generar el archivo en formato antiguo.
  execSync(`node ./node_modules/pdfmake/build-vfs.js "${fontSourceDir}" "${tempOutputFile}"`);

  console.log('Convirtiendo a Módulo ES puro...');
  // Lee el contenido del archivo temporal.
  const tempContent = readFileSync(tempOutputFile, 'utf8');

  // Extrae únicamente el objeto VFS del script. La lógica anterior con
  // lastIndexOf('}') era demasiado "codiciosa" y capturaba código extra.
  // Esta nueva lógica busca el final del objeto de fuentes de forma más precisa.
  const startIndex = tempContent.indexOf('{');
  const endIndex = tempContent.indexOf('};', startIndex);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      'No se pudo encontrar el objeto VFS en el archivo temporal. El formato puede haber cambiado.'
    );
  }
  const vfsObjectString = tempContent.substring(startIndex, endIndex + 1);

  // Generamos únicamente el export de ES Module, que es lo que Angular necesita.
  const esmContent = `// Este archivo es autogenerado. No editar manualmente.\nexport const vfs = ${vfsObjectString};\n`;

  // Escribe el nuevo archivo final.
  writeFileSync(finalOutputFile, esmContent, 'utf8');
  console.log(`-> Módulo ES puro creado en: ${finalOutputFile}`);
} catch (error) {
  console.error('Error durante la creación del archivo de fuentes:', error);
} finally {
  // Limpia el archivo temporal.
  if (existsSync(tempOutputFile)) {
    unlinkSync(tempOutputFile);
    console.log('-> Archivo temporal eliminado.');
  }
}
