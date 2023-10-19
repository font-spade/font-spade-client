import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HamburgerComponent } from './hamburger.component';
import { MenuIconModule } from '../../vector/menu-icon/menu-icon.module';
import { LocaleListBoxModule } from '../locale-list-box/locale-list-box.module';



@NgModule({
  declarations: [
    HamburgerComponent
  ],
  imports: [
    CommonModule,
    MenuIconModule,
    LocaleListBoxModule
  ],
  exports: [
    HamburgerComponent
  ]
})
export class HamburgerModule { }
