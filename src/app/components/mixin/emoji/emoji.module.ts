import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiComponent } from './emoji.component';



@NgModule({
  declarations: [
    EmojiComponent
  ],
  exports: [
    EmojiComponent
  ],
  imports: [
    CommonModule
  ]
})
export class EmojiModule { }
