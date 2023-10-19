import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChevronIconComponent } from './chevron-icon.component';

describe('ChevronIconComponent', () => {
  let component: ChevronIconComponent;
  let fixture: ComponentFixture<ChevronIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChevronIconComponent]
    });
    fixture = TestBed.createComponent(ChevronIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
