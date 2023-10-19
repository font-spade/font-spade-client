import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LottiComponent } from './lotti.component';
import { LottieComponent, LottieModule } from 'ngx-lottie';
import player from 'lottie-web';
// Note we need a separate function as it's required
// by the AOT compiler.
export function playerFactory() {
  return player;
}




@NgModule({
  declarations: [
    LottiComponent
  ],
  imports: [
    CommonModule,
    LottieModule.forRoot({ player: playerFactory }),
    LottieComponent
  ],
  exports: [
    LottiComponent,
    LottieModule
  ]
})
export class LottiModule { }
