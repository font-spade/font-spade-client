import { AfterViewInit, Component, EventEmitter, Inject, Input, OnInit, Output, PLATFORM_ID } from '@angular/core';
import { EmojiKitchenService } from '../../../pages/emoji-kitchen/emoji-kitchen.service';
import { LeftEmojiListService } from '../left-emoji-list/left-emoji-list.service';
import { RightEmojiListService } from './right-emoji-list.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-right-emoji-list',
  templateUrl: './right-emoji-list.component.html',
  styleUrls: ['./right-emoji-list.component.css']
})
export class RightEmojiListComponent implements OnInit, AfterViewInit  {
  @Input() rightSearchResults: Array<string>;
  @Input() selectedLeftEmoji: string = '';
  @Input() selectedRightEmoji: string = '';
  @Input() knownSupportedEmoji: Array<string> = [];

  @Input()
  hasSelectedLeftEmoji: boolean = this.selectedLeftEmoji !== '';
  @Input()
  possibleEmoji: Array<{ left: string; right: string }> = [];

  constructor(public emojiService: EmojiKitchenService,
              private leftEmojiListService: LeftEmojiListService,
              @Inject(PLATFORM_ID) private platformId: string,
              private rightEmojiListService: RightEmojiListService) {
  }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
  }

  handleClick(emojiCodepoint: string): void {
    if (this.hasSelectedLeftEmoji && this.isValidCombo(emojiCodepoint)) {
      this.rightEmojiListService.selectedRightEmoji = emojiCodepoint;
      this.rightEmojiListService.rightEmojiClicked.emit(emojiCodepoint);
    }
  }

  // async getEmojiAlt(emojiCodepoint: string) {
  //   if (!this.hasSelectedLeftEmoji) {
  //     return '';
  //   }
  //   const data = await this.emojiService.getEmojiData(emojiCodepoint);
  //   return data.alt;
  // }


  getOpacity(emojiCodepoint: string): number {
    if (!this.hasSelectedLeftEmoji) {
      return 0.1;
    }

    return this.isValidCombo(emojiCodepoint) ? 1 : 0.1;
  }

  getBackgroundColor(emojiCodepoint: string): string {
    return this.selectedRightEmoji === emojiCodepoint ? 'gray' : 'white';
  }

  getHoverBackgroundColor(emojiCodepoint: string): string {
    return this.hasSelectedLeftEmoji ? 'yellow' : '';
  }

  private isValidCombo(emojiCodepoint: string): boolean {
    if(!this.possibleEmoji) {
      return false;
    }
    return this.possibleEmoji.some(combination => {
      if (emojiCodepoint === this.selectedLeftEmoji) {
        return emojiCodepoint === combination.left && emojiCodepoint === combination.right;
      }

      return emojiCodepoint === combination.left || emojiCodepoint === combination.right;
    });
  }
}
