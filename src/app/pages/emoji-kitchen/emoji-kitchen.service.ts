import { Injectable } from '@angular/core';
import metaData from './metadata.json';
@Injectable({
  providedIn: 'root'
})
export class EmojiKitchenService {
  private emojiMetadata: EmojiMetadata = metaData as unknown as EmojiMetadata;

  constructor () {
  }

  getNotoEmojiUrl(emojiCodepoint: string): string {
    return `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u${emojiCodepoint
      .split("-")
      .filter((x) => x !== "fe0f")
      .map((x) => x.padStart(4, "0"))
      .join("_")}.svg`;
  }

  findValidEmojiCombo(leftEmojiCodepoint: string, rightEmojiCodepoint: string): EmojiCombination | undefined {
    const combinations = this.getEmojiData(leftEmojiCodepoint).combinations;

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
  getEmojiData(emojiCodepoint: string): EmojiData {
    if (this.emojiMetadata == null) {
      throw new Error("Emoji metadata not loaded");
    }
    return this.emojiMetadata.data[emojiCodepoint];
  }

  getSupportedEmoji(): string[] {
    if (this.emojiMetadata == null) {
      throw new Error("Emoji metadata not loaded");
    }
    return this.emojiMetadata.knownSupportedEmoji;
  }
}
export interface EmojiMetadata {
  knownSupportedEmoji: Array<string>;
  data: {
    [emojiCodepoint: string]: EmojiData;
  };
}

export interface EmojiData {
  alt: string;
  keywords: Array<string>;
  emojiCodepoint: string;
  gBoardOrder: number;
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
