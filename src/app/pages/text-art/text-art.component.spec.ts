import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextArtComponent } from './text-art.component';

describe('TextArtComponent', () => {
  let component: TextArtComponent;
  let fixture: ComponentFixture<TextArtComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TextArtComponent]
    });
    fixture = TestBed.createComponent(TextArtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
