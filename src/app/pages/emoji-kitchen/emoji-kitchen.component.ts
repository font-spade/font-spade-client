import { ChangeDetectorRef, Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { EmojiKitchenService, MouseCoordinates } from './emoji-kitchen.service';
import * as uuid from 'uuid';
import saveAs from "file-saver";
import { Clipboard } from '@angular/cdk/clipboard';
import { LeftEmojiListService } from '../../components/mixin/left-emoji-list/left-emoji-list.service';
import { RightEmojiListService } from '../../components/mixin/right-emoji-list/right-emoji-list.service';
import { ToastService } from '../../components/common/toast/toast.service';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ClassStyleService } from '../../style/class-style.service';
@Component({
  selector: 'app-emoji-kitchen',
  templateUrl: './emoji-kitchen.component.html',
  styleUrls: ['./emoji-kitchen.component.css']
})
export class EmojiKitchenComponent implements OnInit {
  selectedLeftEmoji: string = '';
  selectedRightEmoji: string = '';
  bulkDownloadMenu?: MouseCoordinates;
  isBulkDownloading: boolean = false;
  leftSearchResults: Array<string> = [];
  // rightSearchResults: Array<string> = [];
  leftMobileSearchIsOpen: boolean = false;
  rightMobileSearchIsOpen: boolean = false;
  leftUuid: string = uuid.v4();
  rightUuid: string = uuid.v4();
  showOneCombo: boolean = false;
  hasClipboardSupport: boolean = false;
  selectedEmoji: string = '';
  middleList: any[];
  knownSupportedEmoji: Array<string>;
  hasSelectedLeftEmoji: boolean;
  possibleEmoji: Array<{ left: string; right: string }>;

  constructor(private clipboard: Clipboard,
              public emojiKitchenService: EmojiKitchenService,
              private cdr: ChangeDetectorRef,
              private toastService: ToastService,
              public classStyleSvc: ClassStyleService,
              @Inject(PLATFORM_ID) private platformId: string,
              private httpClient: HttpClient,
              private rightEmojiListService: RightEmojiListService,
              private leftEmojiListService: LeftEmojiListService) {
  }

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (navigator.clipboard !== undefined) {
        this.hasClipboardSupport = 'write' in navigator.clipboard
      }
      const data = await this.httpClient.get<any>('/api?path=knownSupportedEmoji').toPromise();
      this.emojiKitchenService.knownSupportedEmoji = data;
      this.knownSupportedEmoji = data;

      this.leftEmojiListService.leftEmojiClicked.subscribe(async (p) => {
        this.handleLeftEmojiClicked(p);
        this.hasSelectedLeftEmoji = p !== '';
        if (this.hasSelectedLeftEmoji) {
          this.selectedLeftEmoji = p;
          const data = await this.emojiKitchenService.getEmojiData(this.selectedLeftEmoji);
          this.possibleEmoji = data.combinations.map(combination => ({
            left: combination.leftEmojiCodepoint,
            right: combination.rightEmojiCodepoint
          }));
        }
        this.middleList = await this.middleListChange();
      })

      this.rightEmojiListService.rightEmojiClicked.subscribe(async (p) => {
        this.handleRightEmojiClicked(p);
        this.middleList = await this.middleListChange();
      })
    }


  }

  async middleListChange() {
    if (this.selectedLeftEmoji === '' && this.selectedRightEmoji === '') {
      return [];
    } else if (this.selectedLeftEmoji !== '' && this.selectedRightEmoji === '') {
      this.showOneCombo = false;
      const combinations = this.emojiKitchenService.emojiData;
      const allOfItem  = {};
      for (let i = 0; i < combinations.combinations.length; i++) {
        allOfItem[combinations.combinations[i].rightEmojiCodepoint +'-'+ combinations.combinations[i].leftEmojiCodepoint] = combinations.combinations[i];
      }
      for (let i = 0; i < combinations.combinations.length; i++) {
        allOfItem[combinations.combinations[i].leftEmojiCodepoint +'-'+ combinations.combinations[i].rightEmojiCodepoint] = combinations.combinations[i];
      }
      // interations allOfItem
      const result = []
      for (const key in allOfItem) {
        if (allOfItem.hasOwnProperty(key)) {
          const element = allOfItem[key];
          if (key.split('-')[0] === this.selectedLeftEmoji) {
            result.push({
              alt: element.alt,
              src: element.gStaticUrl,
              date: element.date
            });
          }
        }
      }
      // sort by date
      result.sort((a, b) => (a.date > b.date ? -1 : 1))
      return result

    } else {
      this.showOneCombo = true;
      const combinations = this.emojiKitchenService.emojiData;
      let result = combinations.combinations
        .filter(combination => combination.leftEmojiCodepoint === this.selectedLeftEmoji && combination.rightEmojiCodepoint === this.selectedRightEmoji)
        .map(combination => ({ alt: combination.alt, src: combination.gStaticUrl }))
        .pop();
      if (result) {
        return [result];
      }
      result = combinations.combinations
        .filter(combination => combination.leftEmojiCodepoint === this.selectedRightEmoji && combination.rightEmojiCodepoint === this.selectedLeftEmoji)
        .map(combination => ({ alt: combination.alt, src: combination.gStaticUrl }))
        .pop();
      return [result];
    }
  }

  handleLeftEmojiClicked(clickedEmoji: string): void {
    if (this.selectedLeftEmoji === clickedEmoji) {
      this.selectedLeftEmoji = '';
      this.selectedRightEmoji = '';
    } else if (this.selectedLeftEmoji !== '' && this.selectedRightEmoji !== '') {
      this.selectedLeftEmoji = clickedEmoji;
      this.selectedRightEmoji = '';
    } else {
      this.selectedLeftEmoji = clickedEmoji;
    }
  }

  handleLeftEmojiRandomize(): void {
    const possibleEmoji = this.emojiKitchenService.getSupportedEmoji().filter(codepoint => codepoint !== this.selectedLeftEmoji);
    const randomEmoji = possibleEmoji[Math.floor(Math.random() * possibleEmoji.length)];

    this.selectedLeftEmoji = randomEmoji;
    this.selectedRightEmoji = '';
  }

  handleRightEmojiClicked(clickedEmoji: string): void {
    this.selectedRightEmoji = (clickedEmoji === this.selectedRightEmoji) ? '' : clickedEmoji;
  }
  // handleRightEmojiRandomize(): void {
  //   const data = this.emojiKitchenService.getEmojiData(this.selectedLeftEmoji);
  //   const possibleEmoji = data.combinations
  //     .flatMap(combination => [combination.leftEmojiCodepoint, combination.rightEmojiCodepoint])
  //     .filter(codepoint => codepoint !== this.selectedLeftEmoji && codepoint !== this.selectedRightEmoji);
  //
  //   const randomEmoji = possibleEmoji[Math.floor(Math.random() * possibleEmoji.length)];
  //   this.selectedRightEmoji = randomEmoji;

  // }
  // handleFullEmojiRandomize(): void {
  //   const knownSupportedEmoji = this.emojiKitchenService.getSupportedEmoji();
  //   const randomLeftEmoji = knownSupportedEmoji[Math.floor(Math.random() * knownSupportedEmoji.length)];
  //
  //   const data = this.emojiKitchenService.getEmojiData(randomLeftEmoji);
  //   const possibleRightEmoji = data.combinations
  //     .flatMap(combination => [combination.leftEmojiCodepoint, combination.rightEmojiCodepoint])
  //     .filter(codepoint => codepoint !== randomLeftEmoji);
  //
  //   const randomRightEmoji = possibleRightEmoji[Math.floor(Math.random() * possibleRightEmoji.length)];
  //
  //   this.selectedLeftEmoji = randomLeftEmoji;
  //   this.leftUuid = uuid.v4();
  //   this.leftSearchResults = [];
  //   this.selectedRightEmoji = randomRightEmoji;
  //   this.rightUuid = uuid.v4();
  //   this.rightSearchResults = [];

  // }

  handleBulkImageDownloadMenuOpen(event: MouseEvent): void {
    event.preventDefault();
    this.bulkDownloadMenu = (this.bulkDownloadMenu === undefined) ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 } : undefined;
  }
  // async handleBulkImageDownload(): Promise<void> {
  //   try {
  //     const currentDate = new Date();
  //     const dateWithOffset = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);
  //     (JSZip as any).defaults.date = dateWithOffset;
  //
  //     const zip = new JSZip();
  //     const data = getEmojiData(this.selectedLeftEmoji);
  //
  //     const photoZip = zip.folder(data.alt)!;
  //     this.isBulkDownloading = true;
  //
  //     for (let i = 0; i < data.combinations.length; i++) {
  //       const combination = data.combinations[i];
  //       const image = await fetch(combination.gStaticUrl);
  //       const imageBlob = await image.blob();
  //       photoZip.file(`${combination.alt}.png`, imageBlob);
  //     }
  //
  //     const archive = await zip.generateAsync({ type: 'blob' });
  //     saveAs(archive, data.alt);
  //
  //     this.bulkDownloadMenu = undefined;
  //     this.isBulkDownloading = false;
  //   } catch (e) {
  //     this.bulkDownloadMenu = undefined;
  //     this.isBulkDownloading = false;
  //   }
  // }

  handleImageDownload($event): void {
    let src = '';
    let alt = '';
    let combination = null;
    if ($event == null) {
      combination = this.emojiKitchenService.findValidEmojiCombo(this.selectedLeftEmoji, this.selectedRightEmoji);
      src = combination.gStaticUrl;
      alt = combination.alt;
    } else {
      combination = $event;
      src = combination.src;
      alt = combination.alt;
    }
    saveAs(combination.src, combination.alt);
  }

  async handleImageCopy($event): Promise<void> {
    let combination = null;
    if($event == null) {
      const comb = await this.emojiKitchenService.findValidEmojiCombo(this.selectedLeftEmoji, this.selectedRightEmoji);
      combination = comb.gStaticUrl;
    } else {
      combination = $event.src;
    }
    this.toastService.showToast('Copied to clipboard');

    const fetchImage = async () => {
      const image = await fetch(combination);
      return await image.blob();
    };

    if (isPlatformBrowser(this.platformId)) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "image/png": fetchImage(),
          }),
        ])
        .then(function () {})
        .catch(function (error) {
          console.log(error);
        });
    }
  }
  onClickEmoji ($event: any) {
    this.selectedEmoji = $event;
  }
}
