import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdsSampleAComponent } from './ads-sample-a.component';

describe('AdsSampleAComponent', () => {
  let component: AdsSampleAComponent;
  let fixture: ComponentFixture<AdsSampleAComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdsSampleAComponent]
    });
    fixture = TestBed.createComponent(AdsSampleAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
