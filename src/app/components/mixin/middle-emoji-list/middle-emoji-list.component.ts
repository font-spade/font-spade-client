import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LeftEmojiListService } from '../left-emoji-list/left-emoji-list.service';

@Component({
  selector: 'app-middle-emoji-list',
  templateUrl: './middle-emoji-list.component.html',
  styleUrls: ['./middle-emoji-list.component.css']
})
export class MiddleEmojiListComponent implements OnInit{
  constructor () {
  }
  ngOnInit(): void {

  }
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
  @Output() clickEmoji = new EventEmitter<any>();

  handleFullEmojiRandomize(): void {
    this.fullEmojiRandomize.emit();
  }
  onClick(obj) {
    this.selectedLeftEmoji = obj.alt;
    this.clickEmoji.emit(obj);
  }

  handleImageCopy(url: any | undefined): void {
    this.imageCopy.emit(url);
  }

  handleImageDownload(url: any | undefined): void {
    this.imageDownload.emit(url);
  }

}
