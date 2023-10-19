import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuIconComponent } from './menu-icon.component';
import { CloseIconModule } from '../close-icon/close-icon.module';



@NgModule({
  declarations: [
    MenuIconComponent
  ],
  imports: [
    CommonModule,
    CloseIconModule
  ],
  exports: [
    MenuIconComponent
  ]
})
export class MenuIconModule { }
