import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImgTextArtComponent } from './img-text-art.component';
import { FormsModule } from '@angular/forms';
import { ImageUploaderModule } from '../../components/common/image-uploader/image-uploader.module';



@NgModule({
  declarations: [
    ImgTextArtComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ImageUploaderModule
  ]
})
export class ImgTextArtModule { }
