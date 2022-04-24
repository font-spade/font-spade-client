import { EventEmitter, Injectable, Input, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RightEmojiListService {
  selectedRightEmoji: string;
  @Output() rightEmojiClicked = new EventEmitter<string>();

  constructor() { }
}
