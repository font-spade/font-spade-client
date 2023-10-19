import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EarthIconComponent } from './earth-icon.component';

describe('EarthIconComponent', () => {
  let component: EarthIconComponent;
  let fixture: ComponentFixture<EarthIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EarthIconComponent]
    });
    fixture = TestBed.createComponent(EarthIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
