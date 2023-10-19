import { Component, Input, OnDestroy, OnInit, Type, ViewChild } from '@angular/core';
import { AdDirective } from './ad.directive';

@Component({
  selector: 'app-ad-banner',
  templateUrl: './ad-banner.component.html',
  styleUrls: ['./ad-banner.component.css']
})
export class AdBannerComponent  implements OnInit, OnDestroy {
  @Input() ads: AdItem[] = [];

  currentAdIndex = -1;

  @ViewChild(AdDirective, { static: true }) adHost!: AdDirective;

  private clearTimer: VoidFunction | undefined;

  ngOnInit(): void {
    this.loadComponent();
    this.getAds();
  }

  ngOnDestroy() {
    this.clearTimer?.();
  }

  loadComponent() {
    if (!this.adHost?.viewContainerRef || this.ads.length < 1) {
      return;
    }

    const viewContainerRef = this.adHost.viewContainerRef;
    viewContainerRef.clear();

    this.currentAdIndex = (this.currentAdIndex + 1) % this.ads.length;
    const adItem = this.ads[this.currentAdIndex];

    const componentRef = viewContainerRef.createComponent<AdComponent>(
      adItem.component
    );

    componentRef.instance.data = adItem.data;
  }

  getAds() {
    const interval = setInterval(() => {
      this.loadComponent();
    }, 2000);
    this.clearTimer = () => clearInterval(interval);
  }
}

export class AdItem {
  constructor(public component: Type<any>, public data: any) {}
}
export interface AdComponent {
  data: any;
}
