import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocaleListBoxComponent } from './locale-list-box.component';
import { EarthIconModule } from '../../vector/earth-icon/earth-icon.module';
import { ChevronIconModule } from '../../vector/chevron-icon/chevron-icon.module';



@NgModule({
  declarations: [
    LocaleListBoxComponent
  ],
  imports: [
    CommonModule,
    EarthIconModule,
    ChevronIconModule
  ],
  exports: [
    LocaleListBoxComponent
  ]
})
export class LocaleListBoxModule { }
