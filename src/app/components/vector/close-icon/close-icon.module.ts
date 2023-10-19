import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloseIconComponent } from './close-icon.component';



@NgModule({
  declarations: [
    CloseIconComponent
  ],
  exports: [
    CloseIconComponent
  ],
  imports: [
    CommonModule
  ]
})
export class CloseIconModule { }
