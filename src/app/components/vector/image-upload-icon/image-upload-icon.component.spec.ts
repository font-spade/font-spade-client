import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageUploadIconComponent } from './image-upload-icon.component';

describe('ImageUploadIconComponent', () => {
  let component: ImageUploadIconComponent;
  let fixture: ComponentFixture<ImageUploadIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImageUploadIconComponent]
    });
    fixture = TestBed.createComponent(ImageUploadIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
