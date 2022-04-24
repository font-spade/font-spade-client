import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RightEmojiListComponent } from './right-emoji-list.component';



@NgModule({
  declarations: [
    RightEmojiListComponent
  ],
  exports: [
    RightEmojiListComponent
  ],
  imports: [
    CommonModule
  ]
})
export class RightEmojiListModule { }
