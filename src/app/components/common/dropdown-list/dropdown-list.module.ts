import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownListComponent } from './dropdown-list.component';
import { ChevronIconModule } from '../../vector/chevron-icon/chevron-icon.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
  declarations: [
    DropdownListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ChevronIconModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  exports: [
    DropdownListComponent
  ]
})
export class DropdownListModule { }
