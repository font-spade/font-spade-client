import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EmojiService } from '../left-emoji-list/emoji.service';

@Component({
  selector: 'app-emoji-search',
  templateUrl: './emoji-search.component.html',
  styleUrls: ['./emoji-search.component.css']
})
export class EmojiSearchComponent {

  @Input() selectedEmoji: string = '';
  @Input() isRightSearch?: boolean;
  @Input() disabled?: boolean = false;
  @Output() searchResults = new EventEmitter<string[]>();
  @Output() randomize = new EventEmitter<void>();

  value: string = '';
  isSearching: boolean = false;

  constructor(private emojiService: EmojiService) {}

  onSearchChange(): void {
    this.debounceSearch();
  }

  debounceSearch(): void {
    // Implement debounce logic
    // On search complete, emit results
    this.searchResults.emit(/* search results */);
  }

  onRandomize(): void {
    this.randomize.emit();
  }

  // Other methods as required

}
