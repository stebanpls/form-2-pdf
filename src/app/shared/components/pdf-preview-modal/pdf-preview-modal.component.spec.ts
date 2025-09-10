import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfPreviewModalComponent } from './pdf-preview-modal.component';

describe('PdfPreviewModalComponent', () => {
  let component: PdfPreviewModalComponent;
  let fixture: ComponentFixture<PdfPreviewModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfPreviewModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfPreviewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
