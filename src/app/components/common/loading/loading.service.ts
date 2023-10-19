import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  @Output()
  toggle = new EventEmitter<any>();

  constructor() { }
}
