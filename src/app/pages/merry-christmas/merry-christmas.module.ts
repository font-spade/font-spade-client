import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MerryChristmasComponent } from './merry-christmas.component';

@NgModule({
  declarations: [
    MerryChristmasComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    MerryChristmasComponent
  ]
})
export class MerryChristmasModule { }