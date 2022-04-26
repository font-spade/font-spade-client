import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EmojiKitchenService } from '../../../pages/emoji-kitchen/emoji-kitchen.service';
import { LeftEmojiListService } from './left-emoji-list.service';

@Component({
  selector: 'app-left-emoji-list',
  templateUrl: './left-emoji-list.component.html',
  styleUrls: ['./left-emoji-list.component.css']
})
export class LeftEmojiListComponent implements OnInit {
  @Input() leftSearchResults: Array<string>;
  @Input() selectedLeftEmoji: string;
  @Output() bulkImageDownloadMenuOpen = new EventEmitter<MouseEvent>();

  knownSupportedEmoji: Array<string>;
  constructor (public emojiService: EmojiKitchenService,
               private leftEmojiListService: LeftEmojiListService,
               private http: HttpClient) {
  }

  ngOnInit() {
    this.knownSupportedEmoji = this.emojiService.getSupportedEmoji();
    if(this.leftSearchResults == null) {
      return;
    }
    if (this.leftSearchResults.length > 0) {
      this.knownSupportedEmoji = this.knownSupportedEmoji.filter(emoji =>
        this.leftSearchResults.includes(emoji)
      );
    }
  }

  // 나머지 코드는 위의 React 코드와 비슷하게 구현할 수 있음
  handleLeftEmojiClicked (emojiCodepoint: string) {
    this.selectedLeftEmoji = emojiCodepoint;
    this.leftEmojiListService.selectedLeftEmoji = emojiCodepoint;
    this.leftEmojiListService.leftEmojiClicked.emit(emojiCodepoint);
  }
}
