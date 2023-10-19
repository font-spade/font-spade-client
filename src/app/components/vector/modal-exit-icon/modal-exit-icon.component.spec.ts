import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExitIconComponent } from './modal-exit-icon.component';

describe('ModalExitIconComponent', () => {
  let component: ModalExitIconComponent;
  let fixture: ComponentFixture<ModalExitIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalExitIconComponent]
    });
    fixture = TestBed.createComponent(ModalExitIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
