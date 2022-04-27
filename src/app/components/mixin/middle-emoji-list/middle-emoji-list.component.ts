import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-middle-emoji-list',
  templateUrl: './middle-emoji-list.component.html',
  styleUrls: ['./middle-emoji-list.component.css']
})
export class MiddleEmojiListComponent {
  @Input() selectedLeftEmoji: string = '';
  @Input() selectedRightEmoji: string = '';
  @Input() isBulkDownloading: boolean = false;
  @Input() middleList: any[] = [];
  @Input() showOneCombo: boolean = false;
  @Input() hasClipboardSupport: boolean = false;

  @Output() fullEmojiRandomize = new EventEmitter<void>();
  @Output() bulkImageDownload = new EventEmitter<void>();
  @Output() imageDownload = new EventEmitter<any>();
  @Output() imageCopy = new EventEmitter<any>();

  handleFullEmojiRandomize(): void {
    this.fullEmojiRandomize.emit();
  }

  handleImageCopy(url: any | undefined): void {
    debugger
    this.imageCopy.emit(url);
  }

  handleImageDownload(url: any | undefined): void {
    debugger
    this.imageDownload.emit(url);
  }

}
