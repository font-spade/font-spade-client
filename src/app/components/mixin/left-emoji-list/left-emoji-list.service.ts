import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LeftEmojiListService {
  @Output() leftEmojiClicked = new EventEmitter<string>();
  selectedLeftEmoji: string = '';
  constructor() { }
}
