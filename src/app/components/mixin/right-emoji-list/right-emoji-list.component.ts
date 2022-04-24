import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { EmojiKitchenService } from '../../../pages/emoji-kitchen/emoji-kitchen.service';
import { LeftEmojiListService } from '../left-emoji-list/left-emoji-list.service';
import { RightEmojiListService } from './right-emoji-list.service';

@Component({
  selector: 'app-right-emoji-list',
  templateUrl: './right-emoji-list.component.html',
  styleUrls: ['./right-emoji-list.component.css']
})
export class RightEmojiListComponent implements OnInit, AfterViewInit  {
  @Input() rightSearchResults: Array<string>;
  @Input() selectedLeftEmoji: string = '';
  @Input() selectedRightEmoji: string = '';

  knownSupportedEmoji: Array<string> = this.emojiService.getSupportedEmoji();
  hasSelectedLeftEmoji: boolean = this.selectedLeftEmoji !== '';
  possibleEmoji: Array<{ left: string; right: string }> = [];

  constructor(public emojiService: EmojiKitchenService,
              private leftEmojiListService: LeftEmojiListService,
              private rightEmojiListService: RightEmojiListService) {
    this.leftEmojiListService.leftEmojiClicked.subscribe(p => {
      this.hasSelectedLeftEmoji = this.leftEmojiListService.selectedLeftEmoji !== '';
      if (this.hasSelectedLeftEmoji) {
        this.selectedLeftEmoji = p;
        const data = this.emojiService.getEmojiData(this.selectedLeftEmoji);
        this.possibleEmoji = data.combinations.map(combination => ({
          left: combination.leftEmojiCodepoint,
          right: combination.rightEmojiCodepoint
        }));
      }
    })
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

  getEmojiAlt(emojiCodepoint: string): string {
    const data = this.emojiService.getEmojiData(emojiCodepoint);
    return data.alt;
  }


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
    return this.possibleEmoji.some(combination => {
      if (emojiCodepoint === this.selectedLeftEmoji) {
        return emojiCodepoint === combination.left && emojiCodepoint === combination.right;
      }

      return emojiCodepoint === combination.left || emojiCodepoint === combination.right;
    });
  }
}
