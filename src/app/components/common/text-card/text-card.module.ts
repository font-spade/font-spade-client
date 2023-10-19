import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextCardComponent } from './text-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { RightArrowIconModule } from '../../vector/right-arrow-icon/right-arrow-icon.module';



@NgModule({
  declarations: [
    TextCardComponent
  ],
  exports: [
    TextCardComponent
  ],
  imports: [
    CommonModule,
    TranslateModule,
    RightArrowIconModule
  ]
})
export class TextCardModule { }
