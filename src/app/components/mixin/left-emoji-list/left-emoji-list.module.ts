import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeftEmojiListComponent } from './left-emoji-list.component';



@NgModule({
  declarations: [
    LeftEmojiListComponent
  ],
  exports: [
    LeftEmojiListComponent
  ],
  imports: [
    CommonModule
  ]
})
export class LeftEmojiListModule { }
