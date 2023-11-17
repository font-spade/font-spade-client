import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextArtComponent } from './text-art.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    TextArtComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    TextArtComponent
  ]
})
export class TextArtModule { }
