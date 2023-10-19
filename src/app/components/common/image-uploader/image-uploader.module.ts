import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploaderComponent } from './image-uploader.component';
import { ImageUploadIconModule } from '../../vector/image-upload-icon/image-upload-icon.module';



@NgModule({
  declarations: [
    ImageUploaderComponent
  ],
  exports: [
    ImageUploaderComponent
  ],
  imports: [
    CommonModule,
    ImageUploadIconModule
  ]
})
export class ImageUploaderModule { }
