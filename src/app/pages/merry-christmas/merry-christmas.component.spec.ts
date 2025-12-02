import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MerryChristmasComponent } from './merry-christmas.component';

describe('MerryChristmasComponent', () => {
  let component: MerryChristmasComponent;
  let fixture: ComponentFixture<MerryChristmasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MerryChristmasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MerryChristmasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});