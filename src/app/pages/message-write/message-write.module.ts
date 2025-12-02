import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MessageWriteComponent } from './message-write.component';

@NgModule({
  declarations: [
    MessageWriteComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  exports: [
    MessageWriteComponent
  ]
})
export class MessageWriteModule { }