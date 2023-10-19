import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadIconComponent } from './image-upload-icon.component';



@NgModule({
  declarations: [
    ImageUploadIconComponent
  ],
  exports: [
    ImageUploadIconComponent
  ],
  imports: [
    CommonModule
  ]
})
export class ImageUploadIconModule { }
