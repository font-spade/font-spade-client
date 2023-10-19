import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertModalService } from './alert-modal.service';

@Component({
  selector: 'app-alert-modal',
  templateUrl: './alert-modal.component.html',
  styleUrls: ['./alert-modal.component.css']
})
export class AlertModalComponent implements OnInit, OnDestroy{
  isShow: boolean = false;
  constructor( private alertModalSvc: AlertModalService) { }

  ngOnInit (): void {
    this.alertModalSvc.toggle.subscribe((data) => {
      this.isShow = !this.isShow;
    });
  }

  ngOnDestroy (): void {
    this.alertModalSvc.toggle.unsubscribe();
  }

}
