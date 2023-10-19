import { Component, HostListener, OnInit } from '@angular/core';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit{
  show: any = true;
  private scrollEnabled = true;

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    if (!this.scrollEnabled) {
      event.preventDefault();
    }
  }

  // Function to enable scrolling
  enableScrolling(): void {
    this.scrollEnabled = true;
  }

  // Function to disable scrolling
  disableScrolling(): void {
    this.scrollEnabled = false;
  }
  constructor(private loadingSvc: LoadingService) {
    this.show = false;
  }

  ngOnInit (): void {
    this.loadingSvc.toggle.subscribe(() => {
      this.show = !this.show;
      if(this.show) {
        this.enableScrolling();
      } else {
        this.disableScrolling();
      }
    });
  }

}
