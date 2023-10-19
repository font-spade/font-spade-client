import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header.component';
import { ProfileMenuModule } from '../../components/mixin/profile-menu/profile-menu.module';
import { HamburgerModule } from '../../components/mixin/hamburger/hamburger.module';
import { LocaleListBoxModule } from '../../components/mixin/locale-list-box/locale-list-box.module';



@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    ProfileMenuModule,
    HamburgerModule,
    LocaleListBoxModule
  ],
  exports: [
    HeaderComponent
  ]
})
export class HeaderModule { }
