import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightArrowIconComponent } from './right-arrow-icon.component';

describe('RightArrowIconComponent', () => {
  let component: RightArrowIconComponent;
  let fixture: ComponentFixture<RightArrowIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RightArrowIconComponent]
    });
    fixture = TestBed.createComponent(RightArrowIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
