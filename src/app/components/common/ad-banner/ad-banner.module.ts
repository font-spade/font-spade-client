import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdBannerComponent } from './ad-banner.component';
import { AdDirective } from './ad.directive';
import { AdService } from './ad.service';



@NgModule({
  declarations: [
    AdBannerComponent,
  ],
  exports: [
    AdBannerComponent,
  ],
  imports: [
    CommonModule,
    AdDirective
  ],
  providers: [AdService],
})
export class AdBannerModule { }
