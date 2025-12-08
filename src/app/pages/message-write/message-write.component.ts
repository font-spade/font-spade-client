import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  youtubeUrl: string = '';

  // 배치 방식 선택
  placementType: 'tree' | 'field' = 'tree';

  // 스팟 ID
  spotId: string = '';
  apiBaseUrl = environment.apiUrl;
  canEditYoutube = false;
  youtubeTouched = false;

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
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  private isAnonymous: boolean = false;

  ngOnInit(): void {
    // URL 쿼리 파라미터에서 스팟 ID와 닉네임 가져오기
    this.route.queryParams.subscribe(params => {
      this.spotId = params['spotId'] || '';
      const userNickname = params['nickname'] || '';
      this.canEditYoutube = params['canEditYoutube'] === 'true';
      this.isAnonymous = params['anonymous'] === 'true';
      
      if (!this.spotId) {
        console.error('스팟 ID가 없습니다. 메인 페이지로 이동합니다.');
        this.router.navigate(['/4spot']);
        return;
      }
      
      // 로그인한 사용자의 닉네임이 있으면 사용, 없으면 랜덤 생성
      if (userNickname) {
        this.nickname = userNickname;
        console.log('로그인한 사용자 닉네임 사용:', userNickname);
      } else {
        this.nickname = this.generateUserNickname();
        console.log('랜덤 닉네임 생성:', this.nickname);
      }
      
      console.log('메시지 작성 페이지 로드 - 스팟 ID:', this.spotId);
      if (this.canEditYoutube) {
        this.loadExistingYoutube();
      }
    });

    this.fetchTypographyData();
    this.initializeRandomValues();
  }

  private loadExistingYoutube(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.http.get<any>(`${this.apiBaseUrl}/spots/${this.spotId}`).subscribe({
      next: (spot) => {
        if (spot && spot.youtube_url) {
          this.youtubeUrl = spot.youtube_url;
        }
        this.cdRef.detectChanges();
      },
      error: (error) => {
        console.error('스팟 정보 조회 실패:', error);
      }
    });
  }

  // 고유 사용자 닉네임 생성
  generateUserNickname(): string {
    // 세션 스토리지에서 기존 닉네임 확인
    let nickname = sessionStorage.getItem('userNickname');

    if (!nickname) {
      const adjectives = [
        '똑똑한', '활발한', '친절한', '유쾌한', '신비한',
        '용감한', '따뜻한', '밝은', '빠른', '차분한', '열정적인', '상냥한', '쿨한',
        '귀여운', '화려한', '우아한', '강한', '깔끔한', '시원한', '포근한', '달콤한', '상큼한',
        '행복한', '즐거운', '고요한', '활기찬',
        '영리한', '성실한', '정직한', '겸손한', '당당한', '씩씩한',
        '꼼꼼한', '세심한', '신중한', '대담한', '독특한', '특별한',
        '소중한', '훌륭한', '놀라운'
      ];

      const nouns = [
        '사자', '호랑이', '토끼', '고양이', '강아지', '독수리', '돌고래',
        '판다', '펭귄', '코알라', '여우', '늑대', '사슴', '다람쥐', '햄스터',
        '기린', '코끼리', '하마', '원숭이', '침팬지', '고릴라', '캥거루',
        '알파카', '라마', '염소', '당나귀',
        '돼지', '오리', '거위', '백조', '까마귀', '참새',
        '앵무새', '부엉이', '독수리', '펠리컨',
        '거북이', '다람쥐', '청설모', '족제비', '수달', '비버', '두더지', '물개',
        '얼룩말', '치타', '표범', '재규어', '퓨마', '나비'
      ];

      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

      nickname = `${randomAdjective}${randomNoun}`;
      sessionStorage.setItem('userNickname', nickname);
    }

    return nickname;
  }

  // 초기값들을 랜덤으로 설정
  initializeRandomValues(): void {
    // 닉네임은 ngOnInit에서 이미 설정됨
    
    // 배치 방식 랜덤 선택
    this.placementType = Math.random() > 0.5 ? 'tree' : 'field';

    // 이모지 랜덤 선택
    if (this.placementType === 'tree') {
      // 트리 배치 시 일반 이모지 랜덤 선택
      const allEmojis = this.emojiCategories.flatMap(category => category.emojis);
      this.selectedEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
    } else {
      // 필드 배치 시 타이포그래피 이모지 랜덤 생성
      // 데이터 로드 후 실행되도록 지연
      setTimeout(() => {
        this.randomizeAndSelectTypographyEmoji();
      }, 100);
    }
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

  async onSubmit(): Promise<void> {
    if (this.isFormValid()) {
      // 이모티콘이면 'background', 이모지면 'center'로 매핑
      const serverPlacementType = this.placementType === 'field' ? 'background' : 'center';
      
      const messageData: any = {
        nickname: this.nickname,
        message: this.message,
        emoji: this.placementType === 'field' ? '' : this.selectedEmoji,
        placement_type: serverPlacementType,
        spot_id: this.spotId,
        position_x: null,
        position_y: null,
        position_z: null
      };

      if (this.youtubeUrl.trim()) {
        messageData.youtube_url = this.youtubeUrl.trim();
      }

      console.log('메시지 등록:', messageData);

      try {
        if (isPlatformBrowser(this.platformId)) {
          await firstValueFrom(this.http.post(`${this.apiBaseUrl}/messages`, messageData));
          // 익명 상태면 anonymous 파라미터를 유지하면서 리다이렉트
          if (this.isAnonymous) {
            this.router.navigate(['/4spot', this.spotId], {
              queryParams: { anonymous: 'true' }
            });
          } else {
            this.router.navigate(['/4spot', this.spotId]);
          }
        }
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } else {
      alert('모든 필드를 입력해주세요.');
    }
  }

  isFormValid(): boolean {
    let hasValidEmoji = false;

    if (this.placementType === 'tree') {
      hasValidEmoji = this.selectedEmoji !== '';
    } else {
      // field 타입인 경우 selectedEmoji가 타이포그래피 이모지여야 함
      hasValidEmoji = this.selectedEmoji !== '' && this.generatedTypographyEmoji.trim() !== '';
    }

    return this.nickname.trim() !== '' &&
           this.message.trim() !== '' &&
           hasValidEmoji &&
           this.isYoutubeLinkValid();
  }

  isYoutubeLinkValid(): boolean {
    const value = this.youtubeUrl.trim();
    if (!value) {
      return true;
    }

    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/i,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/i
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  onCancel(): void {
    // 스팟 ID가 있으면 해당 스팟으로, 없으면 메인으로
    if (this.spotId) {
      // 익명 상태면 anonymous 파라미터를 유지하면서 리다이렉트
      if (this.isAnonymous) {
        this.router.navigate(['/4spot', this.spotId], {
          queryParams: { anonymous: 'true' }
        });
      } else {
        this.router.navigate(['/4spot', this.spotId]);
      }
    } else {
      this.router.navigate(['/4spot']);
    }
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

  randomizeAndSelectTypographyEmoji(): void {
    this.randomizeTypographySelection();
    const typographyEmoji = this.generatedTypographyEmoji.trim();
    if (typographyEmoji) {
      this.selectedEmoji = typographyEmoji;
    }
  }

  setPlacementType(type: 'tree' | 'field'): void {
    this.placementType = type;
    this.selectedEmoji = '';
    this.showEmojiPicker = false;

    // 배치 방식에 따라 적절한 이모지를 자동 선택
    if (type === 'tree') {
      // 트리 배치 시 일반 이모지 랜덤 선택
      const allEmojis = this.emojiCategories.flatMap(category => category.emojis);
      this.selectedEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
    } else if (type === 'field') {
      // 필드 배치 시 타이포그래피 이모지 랜덤 생성
      setTimeout(() => {
        this.randomizeAndSelectTypographyEmoji();
      }, 100);
    }
  }
}
