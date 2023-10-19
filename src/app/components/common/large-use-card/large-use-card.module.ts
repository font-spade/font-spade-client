import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LargeUseCardComponent } from './large-use-card.component';
import { RightArrowIconModule } from '../../vector/right-arrow-icon/right-arrow-icon.module';
import { TranslateModule } from '@ngx-translate/core';



@NgModule({
  declarations: [
    LargeUseCardComponent
  ],
  exports: [
    LargeUseCardComponent
  ],
  imports: [
    CommonModule,
    RightArrowIconModule,
    TranslateModule
  ]
})
export class LargeUseCardModule { }
