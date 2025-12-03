import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MerryChristmasComponent } from './merry-christmas.component';

@NgModule({
  declarations: [
    MerryChristmasComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    MerryChristmasComponent
  ]
})
export class MerryChristmasModule { }