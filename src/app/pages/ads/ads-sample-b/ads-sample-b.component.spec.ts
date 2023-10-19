import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdsSampleBComponent } from './ads-sample-b.component';

describe('AdsSampleBComponent', () => {
  let component: AdsSampleBComponent;
  let fixture: ComponentFixture<AdsSampleBComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdsSampleBComponent]
    });
    fixture = TestBed.createComponent(AdsSampleBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
