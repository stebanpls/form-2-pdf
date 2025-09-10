import { ReportPdfBuilder } from './report-pdf.builder';
import { ReportData, FormField } from '../../../models/report.model';

describe('ReportPdfBuilder', () => {
  let builder: ReportPdfBuilder;

  beforeEach(() => {
    // No se necesita TestBed para una clase simple.
    // Simplemente creamos una nueva instancia.
    builder = new ReportPdfBuilder();
  });

  it('should be created', () => {
    expect(builder).toBeTruthy();
  });

  // Ejemplo de una prueba más útil
  it('should build a valid document definition', () => {
    // Preparamos datos de prueba
    const mockData: ReportData = {
      projectName: 'Proyecto de Prueba',
    };
    const mockFields: FormField[] = [
      { id: 'projectName', label: 'Nombre', type: 'text', order: 1 },
    ];

    // Ejecutamos el método a probar
    const docDefinition = builder.build(mockData, mockFields);

    // Verificamos que el resultado tiene la estructura esperada
    expect(docDefinition).toBeDefined();
    expect(docDefinition.content).toBeInstanceOf(Array);
    expect(docDefinition.styles).toBeDefined();
    // TypeScript no puede saber que 'content' es un array aquí, así que hacemos una aserción de tipo.
    // La línea anterior `toBeInstanceOf(Array)` ya verifica esto en tiempo de ejecución, por lo que es seguro.
    expect((docDefinition.content as any[]).length).toBeGreaterThan(0);
  });
});
