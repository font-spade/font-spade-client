import { Component, OnInit } from '@angular/core';
import { AnimationOptions } from 'ngx-lottie';
import { AnimationItem } from 'ngx-lottie/lib/symbols';
import { LottiService } from './lotti.service';

@Component({
  selector: 'app-lotti',
  templateUrl: './lotti.component.html',
  styleUrls: ['./lotti.component.css']
})
export class LottiComponent implements OnInit{
  show = false;
  constructor(private lottiSvc: LottiService) {
  }

  options: AnimationOptions = {
    path: './assets/animation.json',
  };

  animationCreated(animationItem: AnimationItem): void {
    console.log(animationItem);
  }

  ngOnInit (): void {
    this.lottiSvc.toggle.subscribe(() => {
      this.show = !this.show;
    });
  }
}
