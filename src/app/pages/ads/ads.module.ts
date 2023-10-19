import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdsSampleAComponent } from './ads-sample-a/ads-sample-a.component';
import { AdsSampleBComponent } from './ads-sample-b/ads-sample-b.component';



@NgModule({
  declarations: [
    AdsSampleAComponent,
    AdsSampleBComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AdsSampleAComponent,
    AdsSampleBComponent
  ]
})
export class AdsModule { }
