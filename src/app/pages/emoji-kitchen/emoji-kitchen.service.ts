import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class EmojiKitchenService {
  emojiMetadata: EmojiData = {} as unknown as EmojiData;
  knownSupportedEmoji: Array<string> = [];
  emojiData: EmojiData = {} as unknown as EmojiData;

  constructor (private httpClient: HttpClient,
               @Inject(PLATFORM_ID) private platformId: string) {
  }

  getNotoEmojiUrl(emojiCodepoint: string): string {
    return `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u${emojiCodepoint
      .split("-")
      .filter((x) => x !== "fe0f")
      .map((x) => x.padStart(4, "0"))
      .join("_")}.svg`;

  }

  findValidEmojiCombo(leftEmojiCodepoint: string, rightEmojiCodepoint: string): any {
    const combinations = this.emojiData.combinations;
    let res = combinations
      .filter(
        (combination) =>
          combination.leftEmojiCodepoint === leftEmojiCodepoint &&
          combination.rightEmojiCodepoint === rightEmojiCodepoint
      )
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .pop();

    if (res) {
      return res;
    }

    res = combinations
      .filter(
        (combination) =>
          combination.leftEmojiCodepoint === rightEmojiCodepoint &&
          combination.rightEmojiCodepoint === leftEmojiCodepoint
      )
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .pop();

    return res;
  }
  async getEmojiData(emojiCodepoint: string) {
    const data = await this.httpClient.get<any>(`/api?path=data.${emojiCodepoint}`).toPromise();
    this.emojiData = data;
    if (this.emojiMetadata == null) {
      throw new Error("Emoji metadata not loaded");
    }
    return data;
  }

  getSupportedEmoji(): string[] {
    if (this.knownSupportedEmoji == null) {
      throw new Error("knownSupportedEmoji metadata not loaded");
    }
    return this.knownSupportedEmoji;
  }
}
export interface EmojiData {
  alt: string;
  keywords: Array<string>;
  emoji: string;
  emojiCodepoint: string;
  gBoardOrder: number;
  category: string;
  subcategory: string;
  combinations: Array<EmojiCombination>;
}

export interface EmojiCombination {
  gStaticUrl: string;
  alt: string;
  leftEmoji: string;
  leftEmojiCodepoint: string;
  rightEmoji: string;
  rightEmojiCodepoint: string;
  date: string;
}

export interface MouseCoordinates {
  mouseX: number;
  mouseY: number;
}
