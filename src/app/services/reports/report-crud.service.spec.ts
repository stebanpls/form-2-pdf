import { TestBed } from '@angular/core/testing';

import { ReportCrudService } from './report-crud.service';

describe('ReportCrudService', () => {
  let service: ReportCrudService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportCrudService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
