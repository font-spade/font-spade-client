import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MiddleEmojiListComponent } from './middle-emoji-list.component';



@NgModule({
  declarations: [
    MiddleEmojiListComponent
  ],
  exports: [
    MiddleEmojiListComponent
  ],
  imports: [
    CommonModule
  ]
})
export class MiddleEmojiListModule { }
