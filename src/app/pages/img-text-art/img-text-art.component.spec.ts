import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImgTextArtComponent } from './img-text-art.component';

describe('ImgTextArtComponent', () => {
  let component: ImgTextArtComponent;
  let fixture: ComponentFixture<ImgTextArtComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImgTextArtComponent]
    });
    fixture = TestBed.createComponent(ImgTextArtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
