import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckBoxComponent } from './check-box.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
  declarations: [
    CheckBoxComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,

  ],
  exports: [
    CheckBoxComponent
  ]
})
export class CheckBoxModule { }
