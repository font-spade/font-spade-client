import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LottiService {

  constructor() { }
  @Output()
  toggle = new EventEmitter<any>();
}
