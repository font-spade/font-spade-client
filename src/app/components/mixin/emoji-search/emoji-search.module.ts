import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiSearchComponent } from './emoji-search.component';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    EmojiSearchComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class EmojiSearchModule { }
