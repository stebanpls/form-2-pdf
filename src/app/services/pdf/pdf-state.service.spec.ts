import { TestBed } from '@angular/core/testing';

import { PdfStateService } from './pdf-state.service';

describe('PdfStateService', () => {
  let service: PdfStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
