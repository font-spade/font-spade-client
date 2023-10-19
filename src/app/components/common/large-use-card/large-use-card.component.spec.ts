import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LargeUseCardComponent } from './large-use-card.component';

describe('LargeUseCardComponent', () => {
  let component: LargeUseCardComponent;
  let fixture: ComponentFixture<LargeUseCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LargeUseCardComponent]
    });
    fixture = TestBed.createComponent(LargeUseCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
