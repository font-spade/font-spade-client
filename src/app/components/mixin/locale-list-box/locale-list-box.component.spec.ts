import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocaleListBoxComponent } from './locale-list-box.component';

describe('LocaleListBoxComponent', () => {
  let component: LocaleListBoxComponent;
  let fixture: ComponentFixture<LocaleListBoxComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LocaleListBoxComponent]
    });
    fixture = TestBed.createComponent(LocaleListBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
