import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiKitchenComponent } from './emoji-kitchen.component';
import { LeftEmojiListModule } from '../../components/mixin/left-emoji-list/left-emoji-list.module';
import { RightEmojiListModule } from '../../components/mixin/right-emoji-list/right-emoji-list.module';
import { MiddleEmojiListModule } from '../../components/mixin/middle-emoji-list/middle-emoji-list.module';



@NgModule({
  declarations: [
    EmojiKitchenComponent
  ],
  imports: [
    CommonModule,
    LeftEmojiListModule,
    RightEmojiListModule,
    MiddleEmojiListModule
  ],
  exports: [
    EmojiKitchenComponent
  ]
})
export class EmojiKitchenModule { }
