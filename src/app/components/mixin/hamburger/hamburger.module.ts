import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HamburgerComponent } from './hamburger.component';
import { MenuIconModule } from '../../vector/menu-icon/menu-icon.module';
import { LocaleListBoxModule } from '../locale-list-box/locale-list-box.module';
import { RouterLink } from '@angular/router';



@NgModule({
  declarations: [
    HamburgerComponent
  ],
  imports: [
    CommonModule,
    MenuIconModule,
    LocaleListBoxModule,
    RouterLink
  ],
  exports: [
    HamburgerComponent
  ]
})
export class HamburgerModule { }
