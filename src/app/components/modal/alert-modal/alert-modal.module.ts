import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertModalComponent } from './alert-modal.component';
import { ModalExitIconModule } from '../../vector/modal-exit-icon/modal-exit-icon.module';



@NgModule({
  declarations: [
    AlertModalComponent
  ],
  exports: [
    AlertModalComponent
  ],
  imports: [
    CommonModule,
    ModalExitIconModule
  ]
})
export class AlertModalModule { }
