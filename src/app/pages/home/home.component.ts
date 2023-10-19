import { Component, OnInit } from '@angular/core';
import { AlertModalService } from '../../components/modal/alert-modal/alert-modal.service';
import { AdItem } from '../../components/common/ad-banner/ad-banner.component';
import { AdService } from '../../components/common/ad-banner/ad.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit{

  ads: AdItem[] = [];
  constructor (private alertModalSvc: AlertModalService, private adService: AdService) {
  }
  ngOnInit (): void {
    // setTimeout(() => {
    //   this.alertModalSvc.toggle.next({});
    // })

    this.initData();

  }
  async initData() {
    const componentsName = ['AdsSampleA', 'AdsSampleB'];

    this.ads = await this.adService.getAdsAsync(componentsName);
  }

}
