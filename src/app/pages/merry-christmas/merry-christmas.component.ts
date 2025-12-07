import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';

import { ThreeSceneService } from '../../services/three-scene.service';
import { EmojiMessageService, EmojiData, VisibleMessage } from '../../services/emoji-message.service';
import { MerryChristmasApiService } from '../../services/merry-christmas-api.service';
import { AppSeoService, SeoData } from '../../seo/app-seo.service';
import { AuthState, Spot } from './merry-christmas.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-merry-christmas',
  templateUrl: './merry-christmas.component.html',
  styleUrls: ['./merry-christmas.component.css']
})
export class MerryChristmasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef;

  public backgroundTreeNames: string[] = ['민수님', '지우님', '예린님', '준호님'];

  // 터치/마우스 컨트롤
  public isDragging = false;
  private hasMouseMoved = false;
  private mouseStartPosition = { x: 0, y: 0 };
  private previousMousePosition = { x: 0, y: 0 };
  private cameraRadius = 20;
  private cameraAngleX = Math.PI / 2;
  private cameraAngleY = 1.8;

  private minCameraRadius = 8;
  private maxCameraRadius = 25;
  private zoomSpeed = 0.8;
  private lastTouchDistance = 0;
  private isZooming = false;

  selectedEmoji: EmojiData | null = null;
  isEmojiPopupVisible = false;
  ownerName = '익명';

  writeButtonText = '나의 트리 만들기';
  private animationId: number | null = null;
  private routerSubscription: any;
  private currentUrl: string = '';

  get messageCount(): number {
    return this.emojiService.messageCount;
  }

  get shouldShowUserTreeTitle(): boolean {
    // Show user-specific tree title if:
    // 1. User is logged in, OR
    // 2. User is visiting a specific spot (has URL parameter 'id')
    return this.authState.isLoggedIn || !!this.route.snapshot.paramMap.get('id');
  }

  get isViewingOwnTree(): boolean {
    // User is viewing their own tree if logged in and either:
    // 1. No spot ID in URL (viewing own main tree), OR
    // 2. The current spot belongs to them
    const spotId = this.route.snapshot.paramMap.get('id');
    if (!this.authState.isLoggedIn) return false;
    
    if (!spotId) {
      // No spot ID means viewing own main tree
      return true;
    }
    
    // Check if current spot belongs to logged-in user
    return this.currentSpot?.ownerId === this.authState.user?.id;
  }

  get isViewingOthersTree(): boolean {
    // User is viewing someone else's tree if:
    // 1. There's a spot ID in URL, AND
    // 2. Either not logged in OR the spot doesn't belong to them
    const spotId = this.route.snapshot.paramMap.get('id');
    if (!spotId) return false;
    
    if (!this.authState.isLoggedIn) return true;
    
    // Check if current spot belongs to someone else
    return this.currentSpot?.ownerId !== this.authState.user?.id;
  }

  private kakaoScriptLoading: Promise<void> | null = null;
  private readonly kakaoSdkUrl = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js';
  private readonly kakaoSdkIntegrity = 'sha384-tJkjbtDbvoxO+diRuDtwRO9JXR7pjWnfjfRn5ePUpl7e7RJCxKCwwnfqUAdXh53p';

  updateWriteButtonText(): void {
    this.refreshSeasonContext();
    // URL에 스팟 ID가 있으면 다른 사람의 스팟을 방문 중
    const spotId = this.route.snapshot.paramMap.get('id');

    // 계절에 따른 버튼 텍스트 결정
    const season = this.currentSeason;
    const seasonTexts = {
      'winter': { create: '나의 트리 만들기', decorate: '트리 꾸며주기' },
      'spring': { create: '나의 봄 스팟 만들기', decorate: '봄 스팟 꾸며주기' },
      'summer': { create: '나의 여름 스팟 만들기', decorate: '여름 스팟 꾸며주기' },
      'autumn': { create: '나의 가을 스팟 만들기', decorate: '가을 스팟 꾸며주기' }
    };

    if (this.authState.isLoggedIn) {
      // 로그인한 사용자는 무조건 꾸미기 모드 (스팟이 이미 생성되었으므로)
      this.writeButtonText = seasonTexts[season as keyof typeof seasonTexts].decorate;
    } else {
      // 로그인하지 않은 사용자
      if (spotId) {
        // 다른 사람의 스팟 방문
        this.writeButtonText = seasonTexts[season as keyof typeof seasonTexts].decorate;
      } else {
        // 메인 페이지 - 현재는 겨울(크리스마스) 시즌
        this.writeButtonText = seasonTexts['winter'].create;
      }
    }
  }

  // 인증 관련 프로퍼티
  authState: AuthState = { isLoggedIn: false, currentSpotId: undefined };
  currentSpot?: Spot;
  showLoginModal = false;
  showAnonymousModal = false;
  currentSeason: 'winter' | 'spring' | 'summer' | 'autumn' = 'winter';
  
  // 뷰 모드 관련
  viewMode: 'tree' | 'list' = 'tree';
  showMessageList = false;
  
  // 별 파티클 관련
  stars: Array<{x: number, y: number, delay: number, duration: number}> = [];

  // YouTube 플레이어 관련
  isYouTubeVisible = false;

  // 공유 모달 관련
  showShareModal = false;

  // 헤더 숨김 및 플로팅 메뉴 관련
  isHeaderHidden = false;
  isFloatingMenuOpen = false;
  private lastScrollY = 0;
  private scrollThreshold = 100;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    public emojiService: EmojiMessageService,
    private threeSceneService: ThreeSceneService,
    private apiService: MerryChristmasApiService,
    private seoService: AppSeoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.refreshSeasonContext();
  }

  private detectCurrentSeason(date: Date = new Date()): 'winter' | 'spring' | 'summer' | 'autumn' {
    const month = date.getMonth() + 1; // 1-12
    if (month === 12 || month <= 2) {
      return 'winter';
    }
    if (month >= 3 && month <= 5) {
      return 'spring';
    }
    if (month >= 6 && month <= 8) {
      return 'summer';
    }
    return 'autumn';
  }

  private refreshSeasonContext(): void {
    this.currentSeason = this.detectCurrentSeason();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Three.js 초기화가 완료된 후 메시지 로드
      setTimeout(() => {
        this.animate();
        this.loadMessages();
      }, 100);
    }
  }

  // 새 메시지 등록 처리
  addNewMessage(nickname: string, message: string, emoji: string, placementType: 'tree' | 'field', youtube_url?: string): void {
    this.emojiService.addNewMessage(nickname, message, emoji, placementType, youtube_url);
  }

  private registerSceneEvents(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const renderer = this.threeSceneService.renderer;
    if (!renderer) {
      return;
    }
    const canvas = renderer.domElement;

    canvas.addEventListener('click', (event) => this.onCanvasClick(event));
    canvas.addEventListener('mousedown', (event) => this.onPointerDown(event));
    canvas.addEventListener('mousemove', (event) => this.onPointerMove(event));
    canvas.addEventListener('mouseup', () => this.onPointerUp());
    canvas.addEventListener('touchstart', (event) => this.onTouchStart(event));
    canvas.addEventListener('touchmove', (event) => this.onTouchMove(event));
    canvas.addEventListener('touchend', () => this.onPointerUp());

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('scroll', () => this.handleScroll());
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.hasMouseMoved) {
      return;
    }

    const renderer = this.threeSceneService.renderer;
    const camera = this.threeSceneService.camera;
    if (!renderer || !camera) {
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(this.emojiService.emojis.map(e => e.mesh));

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const emojiData = this.emojiService.emojis.find(e => e.mesh === clickedMesh);

      if (emojiData) {
        this.showEmojiPopup(emojiData);
      }
    } else {
      this.hideEmojiPopup();
    }
  }

  public showEmojiPopup(emojiData: EmojiData): void {
    // fallback 이모지가 있으면 그것을 우선 표시
    const displayEmoji = emojiData.mesh.userData['fallbackEmoji'] || emojiData.emoji;
    this.selectedEmoji = {
      ...emojiData,
      emoji: displayEmoji
    };
    this.isEmojiPopupVisible = true;
  }

  public hideEmojiPopup(): void {
    this.isEmojiPopupVisible = false;
    this.selectedEmoji = null;
  }

  public onMessageClick(message: VisibleMessage): void {
    const emojiData = this.emojiService.emojis.find(emoji =>
      emoji.nickname === message.nickname && emoji.message === message.text
    );

    if (emojiData) {
      this.showEmojiPopup(emojiData);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const currentTime = Date.now();

    this.threeSceneService.updateEnvironment(currentTime);
    this.emojiService.update(currentTime, {
      isDragging: this.isDragging,
      hasSpot: Boolean(this.authState.currentSpotId),
      isLoggedIn: this.authState.isLoggedIn
    });
    this.threeSceneService.updateRegistrationEffect(currentTime);
    this.threeSceneService.updateCameraPosition(this.cameraRadius, this.cameraAngleX, this.cameraAngleY);
    this.threeSceneService.render();
  }

  private onWindowResize(): void {
    this.threeSceneService.onWindowResize();
  }

  onShare(): void {
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  shareToLink(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('링크가 복사되었습니다!');
      this.closeShareModal();
    }).catch(() => {
      alert('링크 복사에 실패했습니다.');
    });
  }

  async shareToKakao(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      await this.loadKakaoSdk();
      const kakao = (window as any).Kakao;
      if (!kakao) {
        throw new Error('Kakao SDK unavailable');
      }

      this.initializeKakao(kakao);

      if (typeof kakao.isInitialized === 'function' && !kakao.isInitialized()) {
        throw new Error('Kakao SDK init failed');
      }

      kakao.Share.sendScrap({
        requestUrl: this.getShareRequestUrl()
      });

      this.closeShareModal();
    } catch (error) {
      console.error('카카오톡 공유 실패:', error);
      alert('카카오톡 공유를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  shareToInstagram(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = window.location.href;
    const text = `🎄 ${this.ownerName}님의 크리스마스 트리 ${url}`;

    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      window.location.href = 'instagram://camera';
      setTimeout(() => {
        navigator.clipboard.writeText(text);
        alert('인스타그램 앱을 열어주세요. 텍스트가 복사되었습니다.');
      }, 1000);
    } else {
      navigator.clipboard.writeText(text);
      alert('인스타그램 공유용 텍스트가 복사되었습니다. 인스타그램 웹사이트에서 스토리에 붙여넣어 주세요.');
    }
    this.closeShareModal();
  }

  private async loadKakaoSdk(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.reject('window unavailable');
    }

    if ((window as any).Kakao) {
      this.initializeKakao((window as any).Kakao);
      return Promise.resolve();
    }

    if (!this.kakaoScriptLoading) {
      this.kakaoScriptLoading = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = this.kakaoSdkUrl;
        script.integrity = this.kakaoSdkIntegrity;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          const kakao = (window as any).Kakao;
          if (!kakao) {
            reject('Kakao SDK failed to load');
            return;
          }
          this.initializeKakao(kakao);
          resolve();
        };
        script.onerror = (error) => reject(error);
        document.body.appendChild(script);
      });
    }

    return this.kakaoScriptLoading!;
  }

  private initializeKakao(kakao: any): void {
    if (!kakao || typeof kakao.init !== 'function') {
      return;
    }
    if (typeof kakao.isInitialized === 'function' && kakao.isInitialized()) {
      return;
    }
    if (environment.kakaoJavascriptKey.includes('YOUR_KAKAO_JAVASCRIPT_KEY')) {
      console.warn('카카오 JavaScript 키가 설정되어 있지 않습니다. environment.kakaoJavascriptKey를 업데이트하세요.');
      return;
    }
    kakao.init(environment.kakaoJavascriptKey);
  }

  private getShareRequestUrl(): string {
    if (typeof window === 'undefined') {
      return environment.basePath;
    }
    return window.location.href || environment.basePath;
  }

  private onPointerDown(event: MouseEvent): void {
    this.isDragging = true;
    this.hasMouseMoved = false;
    this.mouseStartPosition = {
      x: event.clientX,
      y: event.clientY
    };
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  private onPointerMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaMove = {
      x: event.clientX - this.previousMousePosition.x,
      y: event.clientY - this.previousMousePosition.y
    };

    const distanceFromStart = Math.sqrt(
      Math.pow(event.clientX - this.mouseStartPosition.x, 2) +
      Math.pow(event.clientY - this.mouseStartPosition.y, 2)
    );

    if (distanceFromStart > 5) {
      this.hasMouseMoved = true;
    }

    this.cameraAngleY += deltaMove.x * 0.001;
    this.cameraAngleX -= deltaMove.y * 0.001;

    this.cameraAngleX = Math.max(0.1, Math.min(Math.PI * 0.6, this.cameraAngleX));

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  private onPointerUp(): void {
    this.isDragging = false;
    this.isZooming = false;
    this.lastTouchDistance = 0;
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1) {
      this.isDragging = true;
      this.isZooming = false;
      this.hasMouseMoved = false;
      this.mouseStartPosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      this.isDragging = false;
      this.isZooming = true;
      this.hasMouseMoved = false;

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      this.lastTouchDistance = distance;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (event.touches.length === 1 && this.isDragging) {
      const deltaMove = {
        x: event.touches[0].clientX - this.previousMousePosition.x,
        y: event.touches[0].clientY - this.previousMousePosition.y
      };

      const distanceFromStart = Math.sqrt(
        Math.pow(event.touches[0].clientX - this.mouseStartPosition.x, 2) +
        Math.pow(event.touches[0].clientY - this.mouseStartPosition.y, 2)
      );

      if (distanceFromStart > 5) {
        this.hasMouseMoved = true;
      }

      this.cameraAngleY += deltaMove.x * 0.001;
      this.cameraAngleX -= deltaMove.y * 0.001;
      this.cameraAngleX = Math.max(0.1, Math.min(Math.PI * 0.6, this.cameraAngleX));

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };

    } else if (event.touches.length === 2 && this.isZooming) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (this.lastTouchDistance > 0) {
        const distanceDelta = currentDistance - this.lastTouchDistance;
        const zoomDelta = distanceDelta * this.zoomSpeed * 0.01;

        this.cameraRadius -= zoomDelta;
        this.cameraRadius = Math.max(this.minCameraRadius,
                                   Math.min(this.maxCameraRadius, this.cameraRadius));

        this.hasMouseMoved = true;
      }

      this.lastTouchDistance = currentDistance;
    }
  }

  getBackgroundTreePosition(index: number): { x: number; y: number } {
    return this.threeSceneService.getBackgroundTreePosition(index);
  }

  // 인증 관련 메서드들
  async checkAuthStatus(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // URL 파라미터에서 트리 ID 확인
    const treeId = this.route.snapshot.paramMap.get('id');
    let isOwnerOfCurrentSpot = false;

    // 사용자 정보 확인 (localStorage에서)
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        this.authState.isLoggedIn = true;
        this.authState.user = {
          id: user.id,
          nickname: user.nickname,
          kakaoId: user.id
        };
        console.log('사용자 정보 로드:', user.nickname);

        // 스팟 데이터 로드 및 소유자 확인
        if (treeId) {
          await this.loadSpotData(treeId);
          // 현재 스팟의 소유자인지 확인
          if (this.currentSpot && this.currentSpot.ownerId === user.id) {
            isOwnerOfCurrentSpot = true;
            this.authState.currentSpotId = treeId;
            this.ownerName = user.nickname;
            console.log('내 스팟 방문:', treeId);
          } else {
            // 다른 사람의 스팟 방문
            this.authState.currentSpotId = undefined; // 내 스팟 ID는 설정하지 않음
            this.ownerName = this.currentSpot?.title || '익명의 트리';
            console.log('다른 사람의 스팟 방문:', treeId, '소유자:', this.ownerName);
          }
        } else {
          // URL에 스팟 ID가 없으면 내 스팟으로 이동
          this.ownerName = user.nickname;
          await this.loadCurrentUserSpot();
        }
      } catch (error) {
        console.error('사용자 정보 파싱 실패:', error);
      }
    } else if (treeId) {
      // 로그인하지 않고 스팟 방문
      await this.loadSpotData(treeId);
      this.authState.currentSpotId = treeId; // 방문 중인 스팟 ID 설정
    }

    // JWT 토큰 확인 (백업 방법)
    const token = localStorage.getItem('authToken');
    if (token && !this.authState.isLoggedIn) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          this.authState.isLoggedIn = true;
          this.authState.user = {
            id: payload.user_id,
            nickname: payload.nickname,
            kakaoId: payload.kakao_id
          };
          this.ownerName = payload.nickname;

          // 사용자의 스팟이 있는지 확인하고 없으면 생성
          if (!treeId) {
            await this.loadCurrentUserSpot();
          }

          // 버튼 텍스트 업데이트
          this.updateWriteButtonText();
        }
      } catch (error) {
        console.error('토큰 파싱 실패:', error);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('authToken');
        }
      }
    }

    // 로그인되지 않은 상태에서 스팟 ID가 있으면 방문자 모드
    if (!this.authState.isLoggedIn && treeId) {
      this.showVisitorOptions();
    } else if (!this.authState.isLoggedIn && !treeId) {
      // 로그인되지 않고 스팟 ID도 없으면 홈에서 로그인 유도하고 샘플 데이터 로드
      this.showLoginModal = true;
      await this.loadSampleSpotData();
    }

    // 모든 경우에 버튼 텍스트 업데이트
    this.updateWriteButtonText();

    // 스팟 ID가 있으면 메시지 로드
    if (this.authState.currentSpotId) {
      console.log('메시지 로드 시작:', this.authState.currentSpotId);
      this.loadMessages();
    }
  }

  async loadSpotData(spotId: string): Promise<void> {
    try {
      this.currentSpot = await this.apiService.getSpot(spotId);
      if (this.currentSpot) {
        this.ownerName = this.currentSpot.title || '익명의 트리';
      }
      // 스팟 데이터 로드 후 버튼 텍스트 업데이트
      this.updateWriteButtonText();
    } catch (error) {
      console.error('스팟 데이터 로드 실패:', error);
    }
  }

  // 샘플 스팟 데이터 로드 (로그인하지 않은 메인 페이지용)
  async loadSampleSpotData(): Promise<void> {
    try {
      console.log('샘플 스팟 데이터 로드 시작: sample-winter-1');
      this.currentSpot = await this.apiService.getSpot('sample-winter-1');
      if (this.currentSpot) {
        this.ownerName = this.currentSpot.title || '샘플 트리';
        this.authState.currentSpotId = 'sample-winter-1'; // 샘플 스팟 ID 설정
        console.log('샘플 스팟 로드 성공:', this.ownerName);
      }
    } catch (error) {
      console.warn('샘플 스팟 데이터 로드 실패:', error);
      this.ownerName = '샘플 트리';
    }
  }

  private async loadCurrentUserSpot(): Promise<void> {
    if (!this.authState.user) {
      return;
    }

    try {
      const spots = await this.apiService.getUserSpots(this.authState.user.id);
      const mySpot = spots.length ? spots[0] : null;

      if (mySpot) {
        this.currentSpot = mySpot;
        this.authState.currentSpotId = mySpot.id;
        if (mySpot.title) {
          this.ownerName = mySpot.title;
        } else if (this.authState.user?.nickname) {
          this.ownerName = this.authState.user.nickname;
        }

        const routeSpotId = this.route.snapshot.paramMap.get('id');
        if (!routeSpotId) {
          this.router.navigate(['/4spot', mySpot.id], { replaceUrl: true });
        }
      } else {
        await this.createUserSpot();
      }
    } catch (error) {
      console.error('내 스팟 불러오기 실패:', error);
      const httpError = error as HttpErrorResponse;
      if (httpError?.status === 404) {
        await this.createUserSpot();
      }
    }
  }

  async createUserSpot(): Promise<void> {
    if (!this.authState.user) return;

    try {
      const spotData = {
        owner_id: this.authState.user.id,
        title: `${this.authState.user.nickname}님의 트리`,
        season: this.currentSeason
      };

      const response = await this.apiService.createSpot(spotData);

      if (response) {
        this.currentSpot = response;
        this.authState.currentSpotId = response.id;
        if (response.title) {
          this.ownerName = response.title;
        }

        this.router.navigate(['/4spot', response.id], { replaceUrl: true });
      }
    } catch (error) {
      console.error('스팟 생성 실패:', error);
    }
  }

  showVisitorOptions(): void {
    this.showAnonymousModal = true;
  }

  private kakaoLoginUrl: string = '';

  getKakaoLoginUrl(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    if (!this.kakaoLoginUrl) {
      const clientId = '85c57099905117aec84375e532cb75be';
      const redirectUri = `${environment.clientUrl}/auth/kakao/callback`; // client 쪽 리다이렉트 서버 주소
      const state = this.generateRandomState();

      this.kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}&scope=profile_nickname,profile_image`;
    }

    return this.kakaoLoginUrl;
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }

  onAnonymousStart(): void {
    this.showAnonymousModal = false;
    // 로그인 상태는 유지하면서 다른 사람의 스팟을 방문하는 모드
    console.log('익명으로 다른 사람의 스팟 방문');
  }

  onCreateMyTree(): void {
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  closeAnonymousModal(): void {
    this.showAnonymousModal = false;
    // 메인 페이지로 리다이렉트
    this.router.navigate(['/']);
  }

  // 뷰 모드 토글
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'tree' ? 'list' : 'tree';
    this.showMessageList = this.viewMode === 'list';
    
    // 리스트 뷰로 전환할 때 별 생성
    if (this.viewMode === 'list') {
      this.generateStars();
    }
  }

  // 별 파티클 생성
  private generateStars(): void {
    this.stars = [];
    const starCount = 50; // 별 개수
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * 100, // 0-100% 랜덤 위치
        y: Math.random() * 100, // 0-100% 랜덤 위치
        delay: Math.random() * 10, // 0-10초 랜덤 딜레이
        duration: 15 + Math.random() * 25 // 15-40초 랜덤 회전 속도 (느리게)
      });
    }
  }

  // 이모지 URL 체크
  isEmojiUrl(emoji: string): boolean {
    return emoji.startsWith('http://') || emoji.startsWith('https://') || emoji.startsWith('/');
  }

  // 긴 이모지 체크 (배경 타입으로 추정)
  isLongEmoji(emoji: string): boolean {
    // URL이면 이미지이므로 일반 크기
    if (this.isEmojiUrl(emoji)) return false;
    
    // 텍스트 길이가 3자 이상이면 긴 이모지로 판단
    return emoji.length >= 3;
  }

  // trackBy 함수 for ngFor 성능 최적화
  trackByEmoji(index: number, emoji: EmojiData): any {
    return emoji.nickname + emoji.message + index;
  }


  private async loadMessages(): Promise<void> {
    await this.emojiService.loadMessages(this.authState.currentSpotId);
  }

  // onWriteMessage 메서드 수정
  async onWriteMessage(): Promise<void> {
    console.log('onWriteMessage 호출됨');
    console.log('로그인 상태:', this.authState.isLoggedIn);

    const visitingSpotId = this.route.snapshot.paramMap.get('id');
    console.log('방문 중인 스팟 ID:', visitingSpotId);
    console.log('내 스팟 ID:', this.authState.currentSpotId);

    if (!this.authState.isLoggedIn) {
      console.log('로그인되지 않아서 로그인 모달 표시');
      this.showLoginModal = true;
      return;
    }

    let targetSpotId = this.authState.currentSpotId; // 기본값은 내 스팟

    if (visitingSpotId) {
      // 다른 사람의 스팟을 방문 중이면 해당 스팟에 메시지 작성
      targetSpotId = visitingSpotId;
      console.log('다른 사람의 스팟에 메시지 작성:', targetSpotId);
    } else {
      // 내 스팟인 경우
      if (!targetSpotId) {
        console.log('내 스팟 ID가 없어서 로드/생성 시도');
        await this.loadCurrentUserSpot();
        if (!this.authState.currentSpotId) {
          await this.createUserSpot();
        }
        targetSpotId = this.authState.currentSpotId;
      }
    }

    console.log('최종 스팟 ID:', targetSpotId);
    if (targetSpotId) {
      const isOwnerViewing = this.authState.isLoggedIn && targetSpotId === this.authState.currentSpotId;
      console.log('메시지 작성 페이지로 이동 시도:', targetSpotId);
      try {
        const result = this.router.navigate(['/message-write'], {
          queryParams: {
            spotId: targetSpotId,
            nickname: this.authState.user?.nickname || '사용자',
            canEditYoutube: isOwnerViewing
          }
        });
        console.log('라우터 네비게이션 결과:', result);

        // 라우터 네비게이션이 Promise를 반환하므로 결과 확인
        result.then(success => {
          console.log('네비게이션 성공 여부:', success);
          if (!success) {
            console.error('네비게이션 실패 - 라우터 설정 확인 필요');
          }
        }).catch(error => {
          console.error('네비게이션 에러:', error);
        });

      } catch (error) {
        console.error('라우터 navigate 호출 에러:', error);
      }
    } else {
      console.error('스팟 ID를 확인할 수 없어서 페이지 이동 실패');
    }
  }

  // 로그아웃 메서드
  async onLogout(): Promise<void> {
    try {
      console.log('로그아웃 시작');

      await this.apiService.logout();

      console.log('서버 로그아웃 완료');
    } catch (error) {
      console.error('서버 로그아웃 실패:', error);
      // 서버 로그아웃 실패해도 클라이언트 정리는 진행
    }

    // 클라이언트 상태 초기화
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
    }

    // 인증 상태 초기화
    this.authState.isLoggedIn = false;
    this.authState.user = undefined;
    this.authState.currentSpotId = undefined;

    // UI 상태 초기화
    this.ownerName = '익명';
    this.writeButtonText = '나의 트리 만들기';
    this.showLoginModal = false;
    this.showAnonymousModal = false;

    // 이모지와 메시지 초기화
    this.emojiService.clearAll();

    console.log('로그아웃 완료 - 메인 페이지로 이동');

    // 메인 페이지로 이동
    this.router.navigate(['/4spot']);
  }


  // YouTube 관련 메소드들
  getYouTubeVideoId(url: string): string | null {
    if (!url) return null;

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }

  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    const url = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  toggleYouTube(): void {
    this.isYouTubeVisible = !this.isYouTubeVisible;
  }

  // SEO 설정 메서드
  private setupSeo(): void {
    const spotId = this.route.snapshot.paramMap.get('id');
    const isVisitingOtherSpot = spotId && !this.authState.isLoggedIn;
    
    let seoData: SeoData;

    if (isVisitingOtherSpot && this.currentSpot) {
      // 다른 사람의 트리 방문 중
      seoData = {
        title: `${this.ownerName}님의 크리스마스 트리 - 내 트리를 꾸며줘!`,
        description: `${this.ownerName}님의 특별한 크리스마스 트리를 구경하고 메시지를 남겨보세요! AI가 자동으로 이모티콘으로 꾸며드립니다.`,
        keywords: `${this.ownerName}, 크리스마스 트리, AI 이모티콘, 메시지 트리, 친구 트리, 꾸미기`,
        author: 'FontSpade',
        lang: 'ko',
        site_name: '내 트리를 꾸며줘!',
        site_url: `https://fontspade.loeaf.com/4spot/${spotId}`,
        src: `${environment.basePath}/assets/icon/open_graph.png`
      };
    } else if (this.authState.isLoggedIn && this.authState.user) {
      // 내 트리
      seoData = {
        title: `${this.authState.user.nickname}님의 크리스마스 트리 - 내 트리를 꾸며줘!`,
        description: `${this.authState.user.nickname}님의 크리스마스 트리입니다. 친구들과 함께 AI가 꾸며주는 특별한 트리를 만들어보세요!`,
        keywords: `${this.authState.user.nickname}, 내 트리, 크리스마스 트리, AI 이모티콘, 메시지 트리, 친구들과 함께`,
        author: 'FontSpade',
        lang: 'ko',
        site_name: '내 트리를 꾸며줘!',
        site_url: `https://fontspade.loeaf.com/4spot/${this.authState.currentSpotId}`,
        src: `${environment.basePath}/assets/icon/open_graph.png`
      };
    } else {
      // 메인 페이지 (로그인 전)
      seoData = {
        title: '내 트리를 꾸며줘! - AI가 만드는 크리스마스 트리',
        description: 'AI가 친구들의 메시지를 분석해서 6만 종류 이상의 이모티콘으로 자동으로 꾸며주는 크리스마스 트리 만들기. 친구들과 함께 특별한 추억을 만들어보세요!',
        keywords: '크리스마스 트리, AI 이모티콘, 메시지 트리, 친구 메시지, 이모지 트리, Christmas Tree, AI Emoji, 감성 분석, 자동 꾸미기, 트리 만들기',
        author: 'FontSpade',
        lang: 'ko',
        site_name: '내 트리를 꾸며줘!',
        site_url: `https://fontspade.loeaf.com/4spot`,
        src: `${environment.basePath}/assets/icon/open_graph.png`
      };
    }

    this.seoService.setSeoData(seoData);
    this.seoService.setJsonLd(seoData);
    this.seoService.changeLanguage('ko');
  }

  // 스크롤 처리 메서드
  private handleScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentScrollY = window.scrollY;
    
    // 스크롤 방향과 임계값 확인
    if (currentScrollY > this.scrollThreshold) {
      if (currentScrollY > this.lastScrollY) {
        // 아래로 스크롤: 헤더 숨김
        this.hideMainHeader();
        this.isHeaderHidden = true;
      } else {
        // 위로 스크롤: 헤더 표시
        this.showMainHeader();
        this.isHeaderHidden = false;
      }
    } else {
      // 상단 근처: 헤더 표시
      this.showMainHeader();
      this.isHeaderHidden = false;
    }

    this.lastScrollY = currentScrollY;
  }

  private hideMainHeader(): void {
    const header = document.querySelector('app-header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(-100%)';
      header.style.transition = 'transform 0.3s ease-in-out';
    }
  }

  private showMainHeader(): void {
    const header = document.querySelector('app-header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(0)';
      header.style.transition = 'transform 0.3s ease-in-out';
    }
  }

  // 플로팅 메뉴 메서드들
  toggleFloatingMenu(): void {
    this.isFloatingMenuOpen = !this.isFloatingMenuOpen;
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.isFloatingMenuOpen = false;
    }
  }

  goToHome(): void {
    this.router.navigate(['/']);
    this.isFloatingMenuOpen = false;
  }

  // ngOnInit 수정
  async ngOnInit(): Promise<void> {
    this.currentUrl = this.router.url;
    await this.initializeComponent();

    // 라우터 이벤트 구독하여 다른 스팟으로 이동할 때 재초기화
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && event.url.includes('/4spot') && event.url !== this.currentUrl) {
        this.currentUrl = event.url;
        setTimeout(() => {
          this.reinitializeScene();
        }, 100);
      }
    });
  }

  private async initializeComponent(): Promise<void> {
    await this.checkAuthStatus();
    this.setupSeo();

    if (isPlatformBrowser(this.platformId)) {
      await this.threeSceneService.loadGLTFLoader();
      await this.threeSceneService.loadOutlineEffect();
      this.threeSceneService.init(this.canvasRef.nativeElement);
      this.registerSceneEvents();
      this.loadKakaoSdk().catch(error => {
        console.warn('카카오 SDK 로드 실패:', error);
      });
    }
  }

  private reinitializeScene(): void {
    if (isPlatformBrowser(this.platformId)) {
      // 기존 리소스 정리
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.emojiService.clearAll();

      // 씬 재초기화
      setTimeout(() => {
        this.animate();
        this.loadMessages();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    // 라우터 구독 해제
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (isPlatformBrowser(this.platformId)) {
      // Three.js 리소스 정리
      this.threeSceneService.dispose();

      // EmojiMessage 서비스 정리
      this.emojiService.clearAll();

      // 애니메이션 프레임 정리
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    }
  }
}
