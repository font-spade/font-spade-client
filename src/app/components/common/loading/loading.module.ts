import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading.component';
import { LottiModule } from '../lotti/lotti.module';



@NgModule({
  declarations: [
    LoadingComponent
  ],
  imports: [
    CommonModule,
    LottiModule
  ],
  exports: [
    LoadingComponent,
    LottiModule
  ]
})
export class LoadingModule { }
