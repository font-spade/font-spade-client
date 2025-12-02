import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiTextComponent } from './emoji-text.component';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { CheckBoxModule } from '../../components/common/check-box/check-box.module';



@NgModule({
  declarations: [
    EmojiTextComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ColorPickerModule,
    CheckBoxModule
  ],
  exports: [
    EmojiTextComponent
  ]
})
export class EmojiTextModule { }
