import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AlertModalService {

  constructor() { }
  @Output()
  toggle = new EventEmitter<any>();
}

