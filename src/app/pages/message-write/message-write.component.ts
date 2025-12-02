import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

interface GlyphPair {
  left: string;
  right: string;
}

interface GlyphMouth {
  mouth: string;
}

@Component({
  selector: 'app-message-write',
  templateUrl: './message-write.component.html',
  styleUrls: ['./message-write.component.css']
})
export class MessageWriteComponent implements OnInit {
  nickname: string = '';
  message: string = '';
  selectedEmoji: string = '';
  
  // 배치 방식 선택
  placementType: 'tree' | 'field' = 'tree';
  
  emojiCategories = [
    {
      name: '크리스마스',
      emojis: ['🎄', '🎅', '🤶', '🎁', '🔔', '🕯️', '🦌', '☃️', '⭐', '❄️', '🎊', '🎉']
    },
    {
      name: '얼굴',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝']
    },
    {
      name: '하트',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💖', '💗', '💘', '💝', '💞', '💟']
    },
    {
      name: '동물',
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙊', '🙈', '🙉']
    },
    {
      name: '음식',
      emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅']
    }
  ];

  selectedCategory = this.emojiCategories[0];
  showEmojiPicker = false;

  // Typography Emoji Generator
  data1: { glyphset: GlyphPair[] } = { glyphset: [] };
  data2: { glyphset: GlyphPair[] } = { glyphset: [] };
  data3: { glyphset: GlyphMouth[] } = { glyphset: [] };

  selectedPair1: GlyphPair | null = null;
  selectedPair2: GlyphPair | null = null;
  selectedMouth: GlyphMouth | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  ngOnInit(): void {
    this.fetchTypographyData();
  }

  selectEmoji(emoji: string): void {
    this.selectedEmoji = emoji;
    this.showEmojiPicker = false;
  }

  selectCategory(category: any): void {
    this.selectedCategory = category;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      console.log('메시지 등록:', {
        nickname: this.nickname,
        message: this.message,
        emoji: this.selectedEmoji
      });
      
      alert('메시지가 등록되었습니다!');
      this.router.navigate(['/merry-christmas']);
    } else {
      alert('모든 필드를 입력해주세요.');
    }
  }

  isFormValid(): boolean {
    const hasValidEmoji = this.placementType === 'tree' 
      ? this.selectedEmoji !== '' 
      : this.generatedTypographyEmoji.trim() !== '';
      
    return this.nickname.trim() !== '' && 
           this.message.trim() !== '' && 
           hasValidEmoji;
  }

  onCancel(): void {
    this.router.navigate(['/merry-christmas']);
  }

  getMessageLength(): number {
    return this.message.length;
  }

  // Typography Emoji Generator Methods
  fetchTypographyData(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<{ glyphset: GlyphPair[] }>('/assets/data1.json').subscribe(data => {
        this.data1 = data;
        this.cdRef.detectChanges();
      });

      this.http.get<{ glyphset: GlyphPair[] }>('/assets/data2.json').subscribe(data => {
        this.data2 = data;
        this.cdRef.detectChanges();
      });

      this.http.get<{ glyphset: GlyphMouth[] }>('/assets/data3.json').subscribe(data => {
        this.data3 = data;
        this.cdRef.detectChanges();
      });
    }
  }

  get generatedTypographyEmoji(): string {
    let leftSide = this.selectedPair1?.left || this.generateSpaces(this.maxPair1Length);
    let middleLeft = this.selectedPair2?.left || (this.selectedPair1 ? this.generateSpaces(this.maxPair2Length) : "");
    let middle = this.selectedMouth?.mouth || (this.selectedPair1 || this.selectedPair2 ? this.generateSpaces(this.maxMouthLength) : "");
    let middleRight = this.selectedPair2?.right || (this.selectedPair1 ? this.generateSpaces(this.maxPair2Length) : "");
    let rightSide = this.selectedPair1?.right || this.generateSpaces(this.maxPair1Length);

    if(this.selectedPair2 === null && this.selectedMouth === null) {
      middle = "ㅤㅤㅤ";
    }
    if(this.selectedPair1 === null && this.selectedMouth === null) {
      middle = "ㅤ";
    }
    if(this.selectedMouth === null) {
      middle = "ㅤ";
    }
    
    return `${leftSide}${middleLeft}${middle}${middleRight}${rightSide}`;
  }

  get maxPair1Length(): number {
    if (this.data1.glyphset.length === 0) {
      return 0;
    }
    return Math.max(...this.data1.glyphset.map(pair => pair.left.length));
  }

  get maxPair2Length(): number {
    if (this.data2.glyphset.length === 0) {
      return 0;
    }
    return Math.max(...this.data2.glyphset.map(pair => pair.left.length));
  }

  get maxMouthLength(): number {
    if (this.data3.glyphset.length === 0) {
      return 0;
    }
    return Math.max(...this.data3.glyphset.map(mouth => mouth.mouth.length));
  }

  generateSpaces(length: number): string {
    return ' '.repeat(length);
  }

  selectPair1(pair: GlyphPair): void {
    this.selectedPair1 = pair;
    this.cdRef.detectChanges();
  }

  selectPair2(pair: GlyphPair): void {
    this.selectedPair2 = pair;
    this.cdRef.detectChanges();
  }

  selectMouth(mouth: GlyphMouth): void {
    this.selectedMouth = mouth;
    this.cdRef.detectChanges();
  }

  randomizeTypographySelection(): void {
    const randomPair1 = this.data1.glyphset[Math.floor(Math.random() * this.data1.glyphset.length)];
    const randomPair2 = this.data2.glyphset[Math.floor(Math.random() * this.data2.glyphset.length)];
    const randomMouth = this.data3.glyphset[Math.floor(Math.random() * this.data3.glyphset.length)];

    this.selectedPair1 = randomPair1;
    this.selectedPair2 = randomPair2;
    this.selectedMouth = randomMouth;
    this.cdRef.detectChanges();
  }

  renderArms(pair: GlyphPair): string {
    return pair.left + '        ' + pair.right;
  }

  renderEyes(pair: GlyphPair): string {
    return pair.left + '    ' + pair.right;
  }

  selectTypographyEmoji(): void {
    const typographyEmoji = this.generatedTypographyEmoji.trim();
    if (typographyEmoji) {
      this.selectedEmoji = typographyEmoji;
      this.showEmojiPicker = false;
    }
  }

  setPlacementType(type: 'tree' | 'field'): void {
    this.placementType = type;
    this.selectedEmoji = '';
    this.showEmojiPicker = false;
  }
}