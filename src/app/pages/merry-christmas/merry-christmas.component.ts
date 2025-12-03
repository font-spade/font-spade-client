import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as THREE from 'three';

// GLTFLoader 임포트 (타입 에러 회피)
declare const GLTFLoader: any;
declare const OutlineEffect: any;

// 동적 로딩
let GLTFLoaderClass: any;
let OutlineEffectClass: any;

// 인터페이스 정의
interface User {
  id: string;
  nickname: string;
  profileImage?: string;
  kakaoId?: number;
}

interface Spot {
  id: string;
  ownerId: string;
  title: string;
  season: string;  // spring, summer, autumn, winter
  theme_data?: any;
  shareUrl: string;
  youtube_url?: string;
  youtube_video_id?: string;
  message_count?: number;
}

interface AuthState {
  isLoggedIn: boolean;
  user?: User;
  currentSpotId?: string;  // currentTreeId → currentSpotId로 변경
}

@Component({
  selector: 'app-merry-christmas',
  templateUrl: './merry-christmas.component.html',
  styleUrls: ['./merry-christmas.component.css']
})
export class MerryChristmasComponent implements OnInit, AfterViewInit {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef;

  private scene!: THREE.Scene;
  private emojiScene!: THREE.Scene; // 이모지 전용 씬
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private outlineEffect: any = null; // OutlineEffect 인스턴스
  public emojis: Array<{
    mesh: THREE.Mesh;
    nickname: string;
    message: string;
    emoji: string;
    x: number;
    y: number;
    z?: number;
    nextMessageTime?: number;
    messageIndex?: number; // API 메시지 인덱스 추가
  }> = [];

  public messageCount: number = 0;
  private apiMessages: any[] = []; // API에서 받은 메시지들 저장

  private snowflakes: THREE.Mesh[] = [];
  public backgroundTreeNames: string[] = ['민수님', '지우님', '예린님', '준호님'];
  private backgroundTrees: THREE.Group[] = [];

  // 메시지 표시 제어
  private lastMessageTime = 0;
  private messageInterval = 3000; // 3초 간격으로 표시
  private maxMessagesPerSecond = 1; // 한번에 1개만 허용
  private messagesThisSecond = 0;
  private currentSecond = 0;
  private maxVisibleMessages = 20; // 화면에 최대 20개까지 메시지 표시 가능

  // GLB 모델 로더
  private gltfLoader: any = null;
  private mainTreeGroup: any = null; // 메인 트리 참조 저장

  // 터치/마우스 컨트롤
  public isDragging = false;
  private hasMouseMoved = false; // 마우스가 움직였는지 추적
  private mouseStartPosition = { x: 0, y: 0 }; // 마우스 시작 위치
  private previousMousePosition = { x: 0, y: 0 };
  private cameraRadius = 20; // 초기에 더 멀리서 시작
  private cameraAngleX = Math.PI / 2; // 트리를 정면에서 바라보는 각도
  private cameraAngleY = 1.8; // 수평 각도 (180도, 뒤쪽에서 시작)

  // 줌 컨트롤
  private minCameraRadius = 8; // 최대 줌인
  private maxCameraRadius = 25; // 최대 줌아웃
  private zoomSpeed = 0.8; // 줌 속도
  private lastTouchDistance = 0; // 이전 터치 거리
  private isZooming = false; // 줌 중인지 확인

  // 등록 이펙트
  private registrationEffect: THREE.Mesh | null = null;
  private newlyRegisteredEmoji: any = null;

  // 불꽃 효과
  private fireworks: THREE.Group[] = [];
  private lastFireworkTime = 0;
  private fireworkInterval = 4000; // 6초마다 불꽃 발사
  private lastTime = 0;

  // 이모지 동적 관리
  private lastEmojiUpdateTime = 0;
  private emojiUpdateInterval = 7000; // 7초마다 이모지 업데이트
  private isLoadingMessages = false; // 메시지 로딩 중 플래그
  private maxEmojis = 8; // 최대 이모지 개수 제한
  private emojiLifetime = 20000; // 이모지 수명 20초

  visibleMessages: Array<{
    id: string;
    nickname: string;
    text: string;
    screenX: number;
    screenY: number;
    visible: boolean;
    hiding: boolean;
  }> = [];

  selectedEmoji: any = null;
  isEmojiPopupVisible = false;
  ownerName = '익명';

  // 버튼 텍스트 동적 변경
  writeButtonText = '나의 트리 만들기';

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

  // YouTube 플레이어 관련
  isYouTubeVisible = false;

  // 공유 모달 관련
  showShareModal = false;

  apiBaseUrl = 'http://localhost:8000'; // 서버 URL

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private sanitizer: DomSanitizer
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

  private getAuthHeaders(): { [header: string]: string } | undefined {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : undefined;
  }

  private mapSpotResponse(data: any): Spot {
    return {
      id: data.id,
      ownerId: data.owner_id || data.ownerId,
      title: data.title,
      season: data.season,
      theme_data: data.theme_data,
      shareUrl: data.share_url || data.shareUrl,
      youtube_url: data.youtube_url,
      youtube_video_id: data.youtube_video_id,
      message_count: data.message_count
    };
  }


  private async loadGLTFLoader(): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      GLTFLoaderClass = GLTFLoader;
      this.gltfLoader = new GLTFLoaderClass();
    } catch (error) {
      console.error('GLTFLoader 로드 실패:', error);
      this.gltfLoader = null;
    }
  }

  private async loadOutlineEffect(): Promise<void> {
    try {
      const { OutlineEffect } = await import('three/examples/jsm/effects/OutlineEffect.js');
      OutlineEffectClass = OutlineEffect;
    } catch (error) {
      console.error('OutlineEffect 로드 실패:', error);
      OutlineEffectClass = null;
    }
  }

  ngAfterViewInit(): void {
    // Three.js 초기화가 완료된 후 메시지 로드
    setTimeout(() => {
      this.animate();
      this.loadMessages();
    }, 100);
  }

  private initThreeJS(): void {
    this.scene = new THREE.Scene();
    this.emojiScene = new THREE.Scene(); // 이모지 전용 씬 초기화
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x05001C, 1); // 하늘색과 같은 색상
    // 그림자 비활성화
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;

    // OutlineEffect 초기화
    if (OutlineEffectClass) {
      this.outlineEffect = new OutlineEffectClass(this.renderer, {
        defaultThickness: 0.003,
        defaultColor: [0, 0, 0],
        defaultAlpha: 0.8,
        defaultKeepAlive: true
      });
    }

    this.setupLighting();
    this.createGround();
    this.createChristmasBackground();

    // 초기 카메라 설정 (터치 컨트롤로 제어됨)
    this.cameraAngleX = Math.PI / 2; // 정면에서 바라보는 각도
    this.cameraAngleY = 1.2; // 초기 180도 회전 (뒤쪽에서 시작)
    this.updateCameraPosition();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (event) => this.onCanvasClick(event));

    // 터치 및 마우스 이벤트 추가
    canvas.addEventListener('mousedown', (event) => this.onPointerDown(event));
    canvas.addEventListener('mousemove', (event) => this.onPointerMove(event));
    canvas.addEventListener('mouseup', () => this.onPointerUp());
    canvas.addEventListener('touchstart', (event) => this.onTouchStart(event));
    canvas.addEventListener('touchmove', (event) => this.onTouchMove(event));
    canvas.addEventListener('touchend', () => this.onPointerUp());

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting(): void {
    // 자연스러운 안개 효과 (연한 보라색)
    this.scene.fog = new THREE.Fog(0x05001C, 25, 60); // 안개 시작 거리를 늘려서 별/달이 보이도록

    // 어두운 밤하늘에 맞는 주변 조명
    const ambientLight = new THREE.AmbientLight(0x202040, 0.8);
    this.scene.add(ambientLight);

    // 메인 조명 - 카툰 스타일에 맞게 더 밝게
    const directionalLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
    directionalLight.position.set(8, 20, 10);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    // 트리 중심 따뜻한 포인트 라이트
    const centerLight = new THREE.PointLight(0xffd700, 0.8, 15);
    centerLight.position.set(0, 8, 2);
    centerLight.castShadow = false;
    this.scene.add(centerLight);

    // 추가 보조 조명 (차가운 톤)
    const fillLight = new THREE.DirectionalLight(0x9bb5ff, 0.3);
    fillLight.position.set(-10, 10, -5);
    this.scene.add(fillLight);

    // 하단 림 라이트
    const rimLight = new THREE.PointLight(0x87ceeb, 0.4, 20);
    rimLight.position.set(0, -2, 8);
    this.scene.add(rimLight);
  }

  private createGround(): void {
    // 자연스러운 지형 생성
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

    // 높이맵으로 지형 변형
    const vertices = groundGeometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const y = vertices.getY(i);

      // 중심에서 멀어질수록 높아지는 언덕 형태
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      const height = Math.sin(distanceFromCenter * 0.1) * 2 +
                     Math.sin(x * 0.05) * Math.sin(y * 0.05) * 1.5;

      vertices.setZ(i, height - 5);
    }
    groundGeometry.computeVertexNormals();

    // 눈 덮인 바닥 재질 (카툰 렌더링)
    const groundMaterial = new THREE.MeshToonMaterial({
      color: 0xFFFFFF, // 카툰 순백 바닥
      transparent: false
    });

    // OutlineEffect 파라미터 설정
    groundMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.95, 0.98], // 눈색에 맞는 밝은 외곽선
      alpha: 0.7,
      visible: true
    };

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // 하늘 돔 추가
    this.createSkyDome();

    // 눈덩이들 추가
    this.createSnowballs();

    // 눈사람 추가
    this.createSnowman();

    // 귀여운 오브젝트들 추가
    this.createCuteObjects();
  }

  private createSkyDome(): void {
    // 하늘 돔 생성
    const skyGeometry = new THREE.SphereGeometry(80, 32, 32);

    // 카툰 렌더링 적용
    const skyMaterial = new THREE.MeshToonMaterial({
      color: 0x3F51B5, // 카툰 브라이트 블루 하늘
      side: THREE.BackSide, // 돔 안쪽에서 보이도록
      transparent: false
    });

    // OutlineEffect 파라미터 설정
    skyMaterial.userData['outlineParameters'] = {
      thickness: 0.002,
      color: [0.1, 0.2, 0.6], // 카툰 브라이트 블루 외곽선
      alpha: 0.4,
      visible: true
    };

    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    skyDome.position.set(0, 0, 0);
    this.scene.add(skyDome);

    // 별들 추가
    this.createStars();

    // 초승달 추가
    // this.createCrescentMoon(); // 초승달 제거
  }

  private createStars(): void {
    // 별들을 트리 정면 뒤쪽 배경에 집중 배치 (더 가깝게)
    for (let i = 0; i < 30; i++) {
      const starGeometry = new THREE.SphereGeometry(0.2, 8, 8); // 크기 증가
      const starMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFEB3B, // 카툰 브라이트 노란 별
        transparent: false
      });

      const star = new THREE.Mesh(starGeometry, starMaterial);

      // 배경에 배치 (적당한 거리)
      const x = (Math.random() - 0.5) * 60; // 좌우 넓게 분포
      const y = Math.random() * 40 + 20; // 위쪽에 배치
      const z = -22 - Math.random() * 3; // 뒤쪽에 배치 (-22 ~ -25)

      star.position.set(x, y, z);
      this.scene.add(star);
    }
  }

  private createCrescentMoon(): void {
    // 초승달 생성 (두 개의 구를 사용)
    const moonGroup = new THREE.Group();

    // 메인 달 (더 크고 밝게)
    const moonGeometry = new THREE.SphereGeometry(6, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFEB3B // 카툰 브라이트 노란 달
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);

    // 그림자 부분 (검은 구로 일부를 가림) - 더 날카로운 초승달을 위해
    const shadowGeometry = new THREE.SphereGeometry(6.5, 16, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3F51B5 // 카툰 브라이트 블루로 가림
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.x = 4.5; // 더 많이 오른쪽으로 이동하여 날카로운 초승달 모양 만들기

    moonGroup.add(moon);
    moonGroup.add(shadow);

    // 달 위치 설정 (배경에 적당한 거리로)
    moonGroup.position.set(18, 25, -23);

    this.scene.add(moonGroup);
  }

  private createSnowballs(): void {
    // 바닥 주변에 눈덩이들 생성
    for (let i = 0; i < 15; i++) {
      // 다양한 크기의 눈덩이
      const size = Math.random() * 0.8 + 0.3; // 0.3~1.1 크기
      const snowballGeometry = new THREE.SphereGeometry(size, 12, 12);
      const snowballMaterial = new THREE.MeshToonMaterial({
        color: 0xFFFFFF, // 카툰 순백 눈
        transparent: false
      });

      // OutlineEffect 파라미터 설정
      snowballMaterial.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0.9, 0.95, 0.98], // 밝은 외곽선
        alpha: 0.7,
        visible: true
      };

      const snowball = new THREE.Mesh(snowballGeometry, snowballMaterial);

      // 트리 주변에 랜덤 배치 (트리에서 일정 거리 유지)
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 8 + 6; // 트리에서 6-14 거리
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // 바닥 위에 배치 (지형 높이 고려)
      const height = Math.sin(Math.sqrt(x * x + z * z) * 0.1) * 2 +
                    Math.sin(x * 0.05) * Math.sin(z * 0.05) * 1.5;

      snowball.position.set(x, height - 5 + size, z); // 바닥에 닿게 배치

      this.scene.add(snowball);
    }
  }

  private createSnowman(): void {
    const snowmanGroup = new THREE.Group();

    // 눈사람 몸체 재질
    const snowMaterial = new THREE.MeshToonMaterial({
      color: 0xFFFFFF // 카툰 순백 눈사람
    });
    snowMaterial.userData['outlineParameters'] = {
      thickness: 0.005,
      color: [0.9, 0.95, 0.98],
      alpha: 0.8,
      visible: true
    };

    // 하단 몸체 (가장 큰 구)
    const bodyBottomGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const bodyBottom = new THREE.Mesh(bodyBottomGeometry, snowMaterial);
    bodyBottom.position.y = -4.5; // 바닥에 닿게
    snowmanGroup.add(bodyBottom);

    // 중간 몸체
    const bodyMiddleGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const bodyMiddle = new THREE.Mesh(bodyMiddleGeometry, snowMaterial);
    bodyMiddle.position.y = -2.5;
    snowmanGroup.add(bodyMiddle);

    // 머리 (가장 작은 구)
    const headGeometry = new THREE.SphereGeometry(0.9, 16, 16);
    const head = new THREE.Mesh(headGeometry, snowMaterial);
    head.position.y = -0.8;
    snowmanGroup.add(head);

    // 눈 (검은 구)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // 카툰 순검정
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, -0.6, 0.8);
    snowmanGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, -0.6, 0.8);
    snowmanGroup.add(rightEye);

    // 코 (주황색 원뿔)
    const noseGeometry = new THREE.ConeGeometry(0.08, 0.4, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF9800 }); // 카툰 브라이트 오렌지
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -0.8, 0.85);
    nose.rotation.x = Math.PI / 2;
    snowmanGroup.add(nose);

    // 모자 (검은 실린더)
    const hatGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.8);
    const hatMaterial = new THREE.MeshToonMaterial({ color: 0x212121 }); // 카툰 다크 그레이
    hatMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.0, 0.0, 0.0], // 카툰 강한 검정 외곽선
      alpha: 0.8,
      visible: true
    };
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 0.2;
    snowmanGroup.add(hat);

    // 모자 챙
    const brimGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.1);
    const brim = new THREE.Mesh(brimGeometry, hatMaterial);
    brim.position.y = -0.25;
    snowmanGroup.add(brim);

    // 단추들 (검은 구)
    const buttonGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(buttonGeometry, eyeMaterial);
      button.position.set(0, -1.8 + i * 0.3, 1.15);
      snowmanGroup.add(button);
    }

    // 팔 (갈색 원뿔)
    const armMaterial = new THREE.MeshToonMaterial({ color: 0x8D6E63 }); // 카툰 브라운
    armMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.3, 0.2, 0.1],
      alpha: 0.6,
      visible: true
    };

    const armGeometry = new THREE.ConeGeometry(0.05, 1.2, 6);

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-1.5, -2.3, 0);
    leftArm.rotation.z = Math.PI / 3;
    snowmanGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(1.5, -2.3, 0);
    rightArm.rotation.z = -Math.PI / 3;
    snowmanGroup.add(rightArm);

    // 눈사람 위치 설정 (트리 옆) - Raycast로 바닥 높이 계산
    const snowmanGroundHeight = this.getGroundHeight(-8, 5);
    snowmanGroup.position.set(-8, snowmanGroundHeight + 4.5, 5); // 눈사람이 바닥 위에 올바르게 서도록

    this.scene.add(snowmanGroup);
  }

  private createCuteObjects(): void {
    // 선물 상자들
    this.createGiftBoxes();

    // 귀여운 동물들
    this.createCuteAnimals();

    // 작은 크리스마스 장식들
    this.createChristmasDecorations();
  }

  private createGiftBoxes(): void {
    // 여러 개의 선물 상자 생성
    const giftPositions = [
      { x: 6, z: 8 },
      { x: -5, z: -8 },
      { x: 10, z: -3 }
    ];

    giftPositions.forEach((pos, index) => {
      const giftGroup = new THREE.Group();

      // 선물 상자 본체
      const boxSize = 0.8 + Math.random() * 0.4; // 0.8~1.2 크기
      const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
      const boxColors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xFECA57];
      const boxMaterial = new THREE.MeshToonMaterial({
        color: boxColors[index % boxColors.length]
      });
      boxMaterial.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0.0, 0.0, 0.0], // 카툰 강한 검정 외곽선
        alpha: 0.7,
        visible: true
      };

      const box = new THREE.Mesh(boxGeometry, boxMaterial);

      // 리본 (세로)
      const ribbonVGeometry = new THREE.BoxGeometry(0.1, boxSize + 0.1, boxSize + 0.1);
      const ribbonMaterial = new THREE.MeshToonMaterial({ color: 0xE91E63 }); // 카툰 브라이트 핑크 리본
      ribbonMaterial.userData['outlineParameters'] = {
        thickness: 0.003,
        color: [0.8, 0.7, 0.0],
        alpha: 0.6,
        visible: true
      };
      const ribbonV = new THREE.Mesh(ribbonVGeometry, ribbonMaterial);

      // 리본 (가로)
      const ribbonHGeometry = new THREE.BoxGeometry(boxSize + 0.1, 0.1, boxSize + 0.1);
      const ribbonH = new THREE.Mesh(ribbonHGeometry, ribbonMaterial);

      giftGroup.add(box);
      giftGroup.add(ribbonV);
      giftGroup.add(ribbonH);

      // Raycast로 바닥 높이 계산
      const groundHeight = this.getGroundHeight(pos.x, pos.z);

      giftGroup.position.set(pos.x, groundHeight + boxSize/2, pos.z);
      this.scene.add(giftGroup);
    });
  }

  private createCuteAnimals(): void {
    // 토끼 만들기
    const rabbitGroup = new THREE.Group();

    // 토끼 몸체
    const bodyGeometry = new THREE.SphereGeometry(0.6, 12, 12);
    const furMaterial = new THREE.MeshToonMaterial({ color: 0xFFF3E0 }); // 카툰 크림
    furMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.9, 0.85],
      alpha: 0.7,
      visible: true
    };
    const body = new THREE.Mesh(bodyGeometry, furMaterial);
    body.position.y = -4.5;
    rabbitGroup.add(body);

    // 토끼 머리
    const headGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    const head = new THREE.Mesh(headGeometry, furMaterial);
    head.position.y = -3.6;
    rabbitGroup.add(head);

    // 토끼 귀
    const earGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    earGeometry.scale(1, 2, 0.3); // 길쭉하게
    const leftEar = new THREE.Mesh(earGeometry, furMaterial);
    leftEar.position.set(-0.2, -3.0, 0);
    rabbitGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, furMaterial);
    rightEar.position.set(0.2, -3.0, 0);
    rabbitGroup.add(rightEar);

    // 토끼 눈
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // 카툰 순검정
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, -3.5, 0.45);
    rabbitGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, -3.5, 0.45);
    rabbitGroup.add(rightEye);

    // 토끼 코
    const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF69B4 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -3.65, 0.48);
    rabbitGroup.add(nose);

    // Raycast로 바닥 높이 계산 (토끼 몸체 높이 고려)
    const rabbitGroundHeight = this.getGroundHeight(4, -6);
    rabbitGroup.position.set(4, rabbitGroundHeight + 4.5, -6); // 토끼가 바닥 위에 올바르게 서도록
    this.scene.add(rabbitGroup);

    // 펭귄 만들기
    const penguinGroup = new THREE.Group();

    // 펭귄 몸체 (검은색)
    const penguinBodyGeometry = new THREE.SphereGeometry(0.7, 12, 12);
    penguinBodyGeometry.scale(1, 1.3, 1); // 세로로 늘림
    const blackMaterial = new THREE.MeshToonMaterial({ color: 0x424242 }); // 카툰 다크 그레이
    blackMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.0, 0.0, 0.0], // 카툰 강한 검정 외곽선
      alpha: 0.7,
      visible: true
    };
    const penguinBody = new THREE.Mesh(penguinBodyGeometry, blackMaterial);
    penguinBody.position.y = -4.3;
    penguinGroup.add(penguinBody);

    // 펭귄 배 (흰색)
    const bellyGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    bellyGeometry.scale(1, 1.2, 0.8);
    const whiteMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF }); // 카툰 순백
    whiteMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.9, 0.9],
      alpha: 0.6,
      visible: true
    };
    const belly = new THREE.Mesh(bellyGeometry, whiteMaterial);
    belly.position.set(0, -4.2, 0.3);
    penguinGroup.add(belly);

    // 펭귄 부리
    const beakGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const beakMaterial = new THREE.MeshBasicMaterial({ color: 0xFF9800 }); // 카툰 브라이트 오렌지
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, -3.4, 0.6);
    beak.rotation.x = Math.PI / 2;
    penguinGroup.add(beak);

    // Raycast로 바닥 높이 계산 (펭귄 몸체 높이 고려)
    const penguinGroundHeight = this.getGroundHeight(-10, -4);
    penguinGroup.position.set(-10, penguinGroundHeight + 4.3, -4); // 펭귄이 바닥 위에 올바르게 서도록
    this.scene.add(penguinGroup);
  }

  private createChristmasDecorations(): void {
    // 캔디케인들
    for (let i = 0; i < 5; i++) {
      const candyCaneGroup = new THREE.Group();

      // 캔디케인 막대
      const stickGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
      const stickMaterial = new THREE.MeshToonMaterial({ color: 0xF44336 }); // 카툰 브라이트 레드
      stickMaterial.userData['outlineParameters'] = {
        thickness: 0.003,
        color: [0.5, 0.0, 0.0],
        alpha: 0.6,
        visible: true
      };
      const stick = new THREE.Mesh(stickGeometry, stickMaterial);
      stick.position.y = -4.5;
      candyCaneGroup.add(stick);

      // 캔디케인 곡선 부분
      const curve = new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI);
      const curvedPart = new THREE.Mesh(curve, stickMaterial);
      curvedPart.position.set(0, -3.7, 0);
      curvedPart.rotation.z = Math.PI / 2;
      candyCaneGroup.add(curvedPart);

      const angle = (i / 5) * Math.PI * 2;
      const radius = 12 + Math.random() * 3;
      const candyX = Math.cos(angle) * radius;
      const candyZ = Math.sin(angle) * radius;

      // Raycast로 바닥 높이 계산 (캔디케인 높이 고려)
      const candyGroundHeight = this.getGroundHeight(candyX, candyZ);
      candyCaneGroup.position.set(candyX, candyGroundHeight + 4.5, candyZ); // 캔디케인이 바닥 위에 올바르게 서도록

      this.scene.add(candyCaneGroup);
    }

    // 작은 크리스마스 트리들
    for (let i = 0; i < 3; i++) {
      const miniTreeGroup = new THREE.Group();

      const treeGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
      const treeMaterial = new THREE.MeshToonMaterial({ color: 0x4CAF50 }); // 카툰 브라이트 그린
      treeMaterial.userData['outlineParameters'] = {
        thickness: 0.003,
        color: [0.0, 0.3, 0.0],
        alpha: 0.6,
        visible: true
      };
      const miniTree = new THREE.Mesh(treeGeometry, treeMaterial);
      miniTree.position.y = -4.2;
      miniTreeGroup.add(miniTree);

      const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2);
      const trunkMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = -4.7;
      miniTreeGroup.add(trunk);

      const positions = [
        { x: -12, z: 6 },
        { x: 8, z: -10 },
        { x: -6, z: 10 }
      ];

      const pos = positions[i];
      // Raycast로 바닥 높이 계산 (미니 트리 높이 고려)
      const miniTreeGroundHeight = this.getGroundHeight(pos.x, pos.z);
      miniTreeGroup.position.set(pos.x, miniTreeGroundHeight + 4.7, pos.z); // 미니 트리가 바닥 위에 올바르게 서도록

      this.scene.add(miniTreeGroup);
    }
  }

  private createChristmasBackground(): void {
    this.createChristmasTree();
    this.createSnowflakes();
    // 배경 트리들 제거 - 메인 트리만 사용
    // this.createBackgroundTrees();
  }

  private createChristmasTree(): void {
    // GLTFLoader가 로드되었는지 확인
    if (!this.gltfLoader) {
      console.log('GLTFLoader가 없어서 기본 트리를 생성합니다.');
      this.createFallbackTree();
      return;
    }

    // GLB 파일에서 크리스마스 트리 로드
    this.gltfLoader.load(
      'assets/christmas-tree-1202.glb',
      (gltf: any) => {
        const treeGroup = gltf.scene;

        // 트리를 카툰 스타일로 변경
        treeGroup.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            // 기존 재질의 색상 가져오기
            const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x4CAF50);
            // 카툰 재질로 교체
            child.material = new THREE.MeshToonMaterial({
              color: originalColor
            });

            // OutlineEffect 파라미터 설정
            child.material.userData['outlineParameters'] = {
              thickness: 0.002,
              color: [0, 0.3, 0],
              alpha: 0.9,
              visible: true
            };
          }
        });

        // 트리 장식품들 배치
        this.addTreeDecorations(treeGroup);

        // 트리를 바닥에 붙여서 배치
        treeGroup.position.set(0, -5, 0);
        treeGroup.scale.set(10, 10, 10); // 크기를 10배로 증가

        // 메인 트리 참조 저장
        this.mainTreeGroup = treeGroup;
        this.scene.add(treeGroup);
      },
      (progress: any) => {
        console.log('Loading progress: ', (progress.loaded / progress.total * 100) + '%');
      },
      (error: any) => {
        console.error('GLB 파일 로드 에러:', error);
        // 에러 시 기존 코드 트리로 폴백
        this.createFallbackTree();
      }
    );
  }

  private createFallbackTree(): void {
    // GLB 로드 실패 시 기존 코드 트리 생성
    const treeGroup = new THREE.Group();

    // 3단 구조의 귀여운 트리
    const treeLayers = [
      { radius: 1.0, height: 1.5, y: 1.5 }, // 1층 (최상단)
      { radius: 1.8, height: 2.0, y: 0 }, // 2층 (중간)
      { radius: 2.5, height: 2.5, y: -1.8 }  // 3층 (최하단)
    ];

    treeLayers.forEach((layer, index) => {
      const geometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
      let color;
      if (index === 0) {
        color = 0x4CAF50; // 카툰 브라이트 그린 최상단
      } else if (index === 1) {
        color = 0x9DD3C8; // 중간
      } else {
        color = 0x66BB6A; // 카툰 브라이트 그린 중간
      }
      const material = new THREE.MeshToonMaterial({
        color
      });

      // OutlineEffect 파라미터 설정
      material.userData['outlineParameters'] = {
        thickness: 0.005,
        color: [0.1, 0.4, 0.1], // 카툰 강한 그린 외곽선
        alpha: 0.8,
        visible: true
      };

      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(0, layer.y, 0);
      treeGroup.add(cone);
    });

    // 갈색 나무 기둥
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2);
    const trunkMaterial = new THREE.MeshToonMaterial({
      color: 0x8D6E63 // 카툰 브라운
    });

    // OutlineEffect 파라미터 설정
    trunkMaterial.userData['outlineParameters'] = {
      thickness: 0.006,
      color: [0.3, 0.2, 0.1], // 카툰 강한 갈색 외곽선
      alpha: 0.8,
      visible: true
    };

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -3.8, 0);
    treeGroup.add(trunk);

    // 노란색 별 꼭대기 장식
    const starGeometry = new THREE.ConeGeometry(0.3, 0.8, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFEB3B }); // 카툰 브라이트 노란
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 3.5, 0);
    treeGroup.add(star);

    // 트리 장식품들 배치
    this.addTreeDecorations(treeGroup);

    // 트리를 중앙에 1.5배 크기로 배치
    treeGroup.position.set(0, 1.8, 0);
    treeGroup.scale.set(1.5, 1.5, 1.5);

    // 메인 트리 참조 저장 (폴백 트리)
    this.mainTreeGroup = treeGroup;
    this.scene.add(treeGroup);
  }

  private createSnowflakes(): void {
    // 떨어지는 눈 파티클 시스템
    this.snowflakes = [];

    for (let i = 0; i < 200; i++) {
      // 다양한 크기의 눈송이 (0.02 ~ 0.08)
      const size = Math.random() * 0.06 + 0.02;
      const snowflakeGeometry = new THREE.SphereGeometry(size, 6, 6);
      const snowflakeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFCF9FC, // 지정된 눈 색상
        transparent: true,
        opacity: Math.random() * 0.4 + 0.6 // 투명도도 다양하게 (0.6~1.0)
      });
      const snowflake = new THREE.Mesh(snowflakeGeometry, snowflakeMaterial);

      snowflake.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 20 + 10,
        (Math.random() - 0.5) * 30
      );

      // 각 눈송이에 개별 속도 설정
      snowflake.userData = {
        velocity: Math.random() * 0.02 + 0.01,
        drift: (Math.random() - 0.5) * 0.005
      };

      this.snowflakes.push(snowflake);
      this.scene.add(snowflake);
    }
  }

  private addTreeDecorations(treeGroup: THREE.Group): void {
    // 모든 트리 장식을 제거 - 깨끗한 GLB 트리만 사용
    return;
  }

  // 불꽃 효과 생성
  private createFirework(x: number, y: number, z: number): void {
    const firework = new THREE.Group();
    const particleCount = 80;
    const particles: THREE.Mesh[] = [];
    const velocities: THREE.Vector3[] = [];

    // 불꽃 색상 (크리스마스 테마)
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffaa00, 0xff44aa, 0x44ffaa];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const geometry = new THREE.SphereGeometry(0.08, 8, 8);

    // 카툰 스타일 머티리얼 (Toon 셰이딩)
    const material = new THREE.MeshToonMaterial({
      color: color,
      transparent: true,
      opacity: 1.0
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry.clone(), material.clone());

      // 구형으로 파티클 분산
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

      const speed = Math.random() * 15 + 5;
      const velocity = new THREE.Vector3(
        speed * sinTheta * Math.cos(phi),
        speed * sinTheta * Math.sin(phi),
        speed * cosTheta
      );

      particle.position.set(x, y, z);
      particles.push(particle);
      velocities.push(velocity);
      firework.add(particle);
    }

    // 불꽃 데이터 저장
    (firework as any).particles = particles;
    (firework as any).velocities = velocities;
    (firework as any).life = 2.0; // 2초 동안 지속
    (firework as any).maxLife = 2.0;

    this.fireworks.push(firework);
    this.scene.add(firework);
  }

  // 불꽃 업데이트
  private updateFireworks(deltaTime: number): void {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const firework = this.fireworks[i];
      const particles = (firework as any).particles;
      const velocities = (firework as any).velocities;
      let life = (firework as any).life;
      const maxLife = (firework as any).maxLife;

      life -= deltaTime * 0.001;
      (firework as any).life = life;

      if (life <= 0) {
        // 불꽃 제거
        this.scene.remove(firework);
        this.fireworks.splice(i, 1);
        continue;
      }

      // 파티클 업데이트
      for (let j = 0; j < particles.length; j++) {
        const particle = particles[j];
        const velocity = velocities[j];

        // 위치 업데이트 (중력 적용)
        particle.position.add(velocity.clone().multiplyScalar(deltaTime * 0.001));
        velocity.y -= 20 * deltaTime * 0.001; // 중력

        // 공기 저항
        velocity.multiplyScalar(0.99);

        // 투명도 업데이트
        const opacity = life / maxLife;
        (particle.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  }

  // 불꽃 발사 체크
  private checkFireworkLaunch(currentTime: number): void {
    if (currentTime - this.lastFireworkTime > this.fireworkInterval) {
      this.lastFireworkTime = currentTime;

      // 1-3개의 불꽃을 발사 (시간차 적용)
      const fireworkCount = Math.floor(Math.random() * 3) + 1; // 1, 2, 또는 3개

      for (let i = 0; i < fireworkCount; i++) {
        // 트리 뒤쪽 랜덤 위치에서 불꽃 발사
        const x = (Math.random() - 0.5) * 25; // 좀 더 넓은 범위
        const y = Math.random() * 12 + 5; // 높이도 다양하게
        const z = -12 - Math.random() * 8;

        // 첫 번째는 즉시, 나머지는 시간차를 두어 발사
        const delay = i === 0 ? 0 : 300 + Math.random() * 400; // 0.3~0.7초 랜덤 시간차
        setTimeout(() => {
          this.createFirework(x, y, z);
        }, delay);
      }

      // 다음 불꽃 간격 랜덤화 (4-8초)
      this.fireworkInterval = 4000 + Math.random() * 4000;
    }
  }

  // 이모지 동적 업데이트 (사라짐/등장)
  private checkEmojiUpdate(currentTime: number): void {
    if (currentTime - this.lastEmojiUpdateTime > this.emojiUpdateInterval) {
      this.lastEmojiUpdateTime = currentTime;

      // 5~10초 간격 랜덤화
      this.emojiUpdateInterval = 5000 + Math.random() * 5000;

      console.log('이모지 업데이트 실행 - 현재 이모지 수:', this.emojis.length);

      // 현재 이모지 중 몇개를 제거할지 결정 (1-3개)
      const removeCount = Math.min(Math.floor(Math.random() * 3) + 1, this.emojis.length);

      if (this.emojis.length > 0) {
        // 랜덤하게 이모지 선택해서 제거
        for (let i = 0; i < removeCount; i++) {
          const randomIndex = Math.floor(Math.random() * this.emojis.length);
          const emojiToRemove = this.emojis[randomIndex];

          // 사라지는 애니메이션
          this.animateEmojiExit(emojiToRemove.mesh, () => {
            this.emojiScene.remove(emojiToRemove.mesh);
            console.log('이모지 제거:', emojiToRemove.emoji, '인덱스:', emojiToRemove.messageIndex);
            this.emojis.splice(this.emojis.indexOf(emojiToRemove), 1);
          });
        }

        // 새로운 이모지 추가 (제거한 만큼)
        setTimeout(() => {
          if (!this.authState.isLoggedIn && !this.authState.currentSpotId) {
            // 로그인하지 않은 상태: 랜덤 이모지 추가
            for (let i = 0; i < removeCount; i++) {
              this.addRandomEmoji();
            }
          } else {
            // 로그인한 상태: API 메시지에서 다음 메시지 추가
            for (let i = 0; i < removeCount; i++) {
              this.addNextApiMessage();
            }
          }
        }, 1000); // 1초 후 새로운 이모지 추가
      }
    }
  }

  // 이모지 사라지는 애니메이션
  private animateEmojiExit(mesh: THREE.Mesh, onComplete: () => void): void {
    const duration = 800;
    const startTime = Date.now();
    const initialScale = mesh.scale.x;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 스케일이 줄어들면서 투명해짐
      const scale = initialScale * (1 - progress);
      mesh.scale.set(scale, scale, scale);

      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = 1 - progress;
      }

      if (progress >= 1) {
        onComplete();
      } else {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // API 메시지에서 다음 메시지 추가 (로그인 상태일 때)
  private addNextApiMessage(): void {
    if (!this.apiMessages || this.apiMessages.length === 0) {
      console.log('API 메시지가 없음');
      return;
    }

    // 현재 화면에 표시된 이모지들의 인덱스 수집
    const currentDisplayedIndices = new Set<number>();
    this.emojis.forEach(emoji => {
      if (emoji.messageIndex !== undefined) {
        currentDisplayedIndices.add(emoji.messageIndex);
      }
    });

    console.log('현재 표시된 메시지 인덱스:', Array.from(currentDisplayedIndices));
    console.log('전체 메시지 개수:', this.apiMessages.length);

    // 화면에 표시되지 않은 메시지 중에서 선택
    const availableIndices = [];
    for (let i = 0; i < this.apiMessages.length; i++) {
      if (!currentDisplayedIndices.has(i)) {
        availableIndices.push(i);
      }
    }

    console.log('사용 가능한 메시지 인덱스:', availableIndices);

    // 사용 가능한 메시지가 없으면 아무것도 하지 않음
    if (availableIndices.length === 0) {
      console.log('모든 메시지가 현재 화면에 표시되어 새로운 메시지를 추가하지 않음');
      return;
    }

    if (availableIndices.length > 0) {
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const msg = this.apiMessages[randomIndex];
      console.log(`새로운 메시지 추가: ${msg.nickname} - ${msg.emoji} (인덱스: ${randomIndex})`);

      // center 타입을 랜덤하게 field 또는 tree로 분배 (50:50)
      let actualPlacementType = msg.placementType;
      if (actualPlacementType === 'background') {
        // 필드 배치 타이포그래피 이모지
        const position = this.generateRandomFieldPosition();
        const groundHeight = this.getGroundHeight(position.x, position.z);
        const y = groundHeight + 0.5;
        const mesh = this.createTypographyMesh(msg.emoji, position.x, y, position.z);
        this.emojiScene.add(mesh);

        mesh.userData['originalY'] = y;
        mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003;
        mesh.userData['moveAngle'] = Math.random() * Math.PI * 2;
        mesh.userData['isTypography'] = true;
        mesh.userData['sinePhase'] = Math.random() * Math.PI * 2;
        mesh.userData['sineAmplitude'] = 0.5 + Math.random() * 1.0;
        mesh.userData['sineFrequency'] = 0.8 + Math.random() * 0.4;
        mesh.userData['previousX'] = position.x;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: position.x,
          y: y,
          z: position.z,
          nextMessageTime: Date.now() + 3000,
          messageIndex: randomIndex
        });
      } else {
        // 트리 배치 이모지
        const position = this.generateRandomTreePosition();
        const mesh = this.createEmojiMesh(msg.emoji, 0, position.height, 0, true);
        this.emojiScene.add(mesh);

        mesh.userData['attachToTree'] = true;
        mesh.userData['height'] = position.height;
        mesh.userData['angle'] = position.angle;
        mesh.userData['rotationSpeed'] = 0.005 + Math.random() * 0.01;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: 0,
          y: position.height,
          z: 0,
          nextMessageTime: Date.now() + 3000,
          messageIndex: randomIndex
        });
      }

      this.animateEmojiEntry(this.emojis[this.emojis.length - 1].mesh);
    }
  }

  // 랜덤 이모지 추가 - 로그인하지 않은 상태에서만
  private addRandomEmoji(): void {
    // 로그인한 상태거나 실제 스팟이 있으면 랜덤 이모지 추가하지 않음
    if (this.authState.isLoggedIn || this.authState.currentSpotId) {
      console.log('로그인 상태이므로 랜덤 이모지 추가하지 않음');
      return;
    }

    console.log('addRandomEmoji 호출됨');
    const emojis = ['🎄', '🎅', '🤶', '🎁', '⭐', '❄️', '🔔', '🕯️', '🦌', '☃️', '🎊', '🎉'];
    const nicknames = ['산타', '루돌프', '눈사람', '요정', '천사', '크리스마스'];
    const messages = [
      '메리 크리스마스!',
      '새해 복 많이 받으세요!',
      '행복한 연말 되세요!',
      '따뜻한 크리스마스 보내요',
      '사랑하는 사람들과 함께',
      '모두 건강하고 행복하게!'
    ];

    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const nickname = nicknames[Math.floor(Math.random() * nicknames.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];

    // 랜덤 위치 (트리 주변)
    const isFieldType = Math.random() > 0.7; // 30% 확률로 필드 타입

    if (isFieldType) {
      // 필드 배치
      const x = (Math.random() - 0.5) * 25;
      const z = (Math.random() - 0.5) * 25;

      // Raycast로 바닥 높이 계산
      const groundHeight = this.getGroundHeight(x, z);
      const y = groundHeight + 0.5; // 바닥에서 약간 띄워서

      const mesh = this.createTypographyMesh('( ͡° ͜ʖ ͡°)', x, y, z);
      this.emojiScene.add(mesh);
      this.animateEmojiEntry(mesh);

      mesh.userData['originalY'] = y;
      mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003;
      mesh.userData['moveAngle'] = Math.random() * Math.PI * 2;
      mesh.userData['isTypography'] = true;
      // 사인 그래프 움직임을 위한 새 파라미터들
      mesh.userData['sinePhase'] = Math.random() * Math.PI * 2; // 사인 파형 위상
      mesh.userData['sineAmplitude'] = 0.5 + Math.random() * 1.0; // 사인 파형 진폭 (0.5-1.5)
      mesh.userData['sineFrequency'] = 0.8 + Math.random() * 0.4; // 사인 파형 주파수 (0.8-1.2)
      mesh.userData['previousX'] = x; // 이전 위치 (방향 계산용)
      mesh.userData['previousZ'] = z || 0;

      this.emojis.push({
        mesh,
        emoji: '( ͡° ͜ʖ ͡°)',
        nickname,
        message,
        x,
        y,
        z,
        nextMessageTime: Date.now() + 3000 + Math.random() * 5000
      });
    } else {
      // 트리 배치 - 기존과 동일하게 트리 표면에 붙이기
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 12 + 3;

      // 트리 표면에 정확히 부착
      const treePosition = this.attachEmojiToTreeSurface(angle, height);
      const mesh = this.createEmojiMesh(emoji, treePosition.x, treePosition.y, treePosition.z, true);

      this.emojiScene.add(mesh);
      this.animateEmojiEntry(mesh);

      mesh.userData['originalY'] = treePosition.y;
      mesh.userData['nearTree'] = true;

      this.emojis.push({
        mesh,
        emoji,
        nickname,
        message,
        x: treePosition.x,
        y: treePosition.y,
        z: treePosition.z,
        nextMessageTime: Date.now() + 3000 + Math.random() * 5000
      });
    }
  }

  private addTextDecoration(treeGroup: THREE.Group, text: string, y: number, angle: number): void {
    // 텍스트를 위한 캔버스 텍스처 생성
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = '#ffffff';
    context.font = '20px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });

    const geometry = new THREE.PlaneGeometry(1.5, 0.4);
    const textMesh = new THREE.Mesh(geometry, material);

    const radius = this.getTreeRadiusAtHeight(y) + 0.3;
    textMesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    textMesh.lookAt(0, y, 10); // 카메라 방향을 바라보도록

    treeGroup.add(textMesh);
  }

  private addObjectDecoration(treeGroup: THREE.Group, type: string, y: number, angle: number, color: number): void {
    // 모든 오브젝트 장식을 생성하지 않음 - 텍스트만 사용
    return;
  }

  private getTreeRadiusAtHeight(height: number): number {
    // 높이에 따른 트리 반지름 계산 (3단 트리)
    if (height > 0.8) return 1.0;      // 1층 (최상단)
    else if (height > -0.8) return 1.8;  // 2층 (중간)
    else return 2.5;                    // 3층 (최하단)
  }

  private createBackgroundTrees(): void {
    // 좌우 측면의 GLB 크리스마스 트리들
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 2; i++) {
        if (!this.gltfLoader) {
          this.createFallbackBackgroundTree(side, i);
          continue;
        }

        this.gltfLoader.load(
          'assets/christmas-tree-1202.glb',
          (gltf: any) => {
            const backgroundTreeGroup = gltf.scene.clone();

            // 배경 트리를 카툰 스타일로 변경
            backgroundTreeGroup.traverse((child: any) => {
              if (child instanceof THREE.Mesh) {
                // 기존 재질의 색상 가져오기
                const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x4CAF50);
                // 카툰 재질로 교체
                child.material = new THREE.MeshToonMaterial({
                  color: originalColor
                });

                // OutlineEffect 파라미터 설정
                child.material.userData['outlineParameters'] = {
                  thickness: 0.006,
                  color: [0.1, 0.4, 0.1], // 카툰 강한 그린 외곽선
                  alpha: 0.7,
                  visible: true
                };
              }
            });

            const x = (side === 0 ? -15 : 15) + (Math.random() - 0.5) * 3;
            const z = -10 + Math.random() * 4;
            backgroundTreeGroup.position.set(x, 0, z);
            backgroundTreeGroup.scale.set(5, 5, 5); // 배경 트리도 더 크게 (메인의 절반 크기)

            // 배경 트리 이름 라벨 데이터 저장
            const treeName = this.backgroundTreeNames[(side * 2 + i) % this.backgroundTreeNames.length];
            backgroundTreeGroup.userData = { treeName, treeIndex: side * 2 + i };

            this.backgroundTrees.push(backgroundTreeGroup);
            this.scene.add(backgroundTreeGroup);
          },
          undefined,
          (error: any) => {
            console.error('배경 트리 GLB 파일 로드 에러:', error);
            // 에러 시 기존 코드 트리로 폴백
            this.createFallbackBackgroundTree(side, i);
          }
        );
      }
    }
  }

  private createFallbackBackgroundTree(side: number, i: number): void {
    // 배경 트리 폴백 생성
    const backgroundTreeGroup = new THREE.Group();

    // 3단 구조의 귀여운 트리 (메인과 동일)
    const treeLayers = [
      { radius: 0.7, height: 1.0, y: 1.0 }, // 최상단
      { radius: 1.2, height: 1.4, y: 0 }, // 중간
      { radius: 1.7, height: 1.8, y: -1.2 } // 최하단
    ];

    treeLayers.forEach((layer, layerIndex) => {
      const geometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
      let color;
      if (layerIndex === 0) {
        color = 0x4CAF50; // 카툰 브라이트 그린 최상단
      } else if (layerIndex === 1) {
        color = 0x9DD3C8; // 중간
      } else {
        color = 0x66BB6A; // 카툰 브라이트 그린 중간
      }
      const material = new THREE.MeshToonMaterial({
        color
      });

      // OutlineEffect 파라미터 설정
      material.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0, 0.1, 0],
        alpha: 0.6,
        visible: true
      };

      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(0, layer.y, 0);
      backgroundTreeGroup.add(cone);
    });

    // 갈색 나무 기둥
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.8);
    const trunkMaterial = new THREE.MeshToonMaterial({
      color: 0x8D6E63 // 카툰 브라운
    });

    // OutlineEffect 파라미터 설정
    trunkMaterial.userData['outlineParameters'] = {
      thickness: 0.005,
      color: [0.1, 0.05, 0],
      alpha: 0.6,
      visible: true
    };

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -1.8, 0); // 기둥 위치는 그대로
    backgroundTreeGroup.add(trunk);

    // 노란색 별 꼭대기 장식
    const starGeometry = new THREE.ConeGeometry(0.2, 0.5, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFEB3B }); // 카툰 브라이트 노란
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 2.3, 0);
    backgroundTreeGroup.add(star);

    const x = (side === 0 ? -15 : 15) + (Math.random() - 0.5) * 3;
    const z = -10 + Math.random() * 4;
    backgroundTreeGroup.position.set(x, -4.8, z); // 배경 트리도 바닥에 붙이기
    backgroundTreeGroup.scale.set(0.8, 0.8, 0.8); // 메인보다 약간 작게

    // 배경 트리 이름 라벨 데이터 저장
    const treeName = this.backgroundTreeNames[(side * 2 + i) % this.backgroundTreeNames.length];
    backgroundTreeGroup.userData = { treeName, treeIndex: side * 2 + i };

    this.backgroundTrees.push(backgroundTreeGroup);
    this.scene.add(backgroundTreeGroup);
  }

  private createEmojiMesh(emoji: string, x: number, y: number, z: number, isAttachedToTree: boolean = false): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 512;

    // 완전 투명한 배경 설정
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 이모지를 컬러로 그리기 (원래 색상 유지)
    context.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "EmojiOne Color"';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // 이모지 그리기 (외곽선 없이)
    context.fillText(emoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.format = THREE.RGBAFormat;
    texture.needsUpdate = true; // 텍스처 업데이트 강제

    // 모든 이모지를 동일한 크기로 통일
    const size = isAttachedToTree ? 1.2 : 2.0; // 트리 부착용은 1.2, 일반은 2.0
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01, // alphaTest 값을 낮춰서 이모지가 보이도록
      side: THREE.DoubleSide, // 양쪽 면 렌더링
      depthWrite: false, // 투명 객체는 depthWrite false
      fog: false // 안개 영향 받지 않음
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    return mesh;
  }

  private createTypographyMesh(typographyEmoji: string, x: number, y: number, z: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    // 완전 투명한 배경 설정
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 캔버스를 수직으로 뒤집기 (Three.js에서 올바르게 보이도록)
    context.scale(1, -1);
    context.translate(0, -canvas.height);

    // 타이포그래피 이모지를 검정색으로 그리기
    context.font = 'bold 48px monospace';
    context.fillStyle = '#000000'; // 검정색
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // 검정색 채우기
    context.fillText(typographyEmoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.format = THREE.RGBAFormat;
    texture.flipY = false; // 텍스처 뒤집힘 방지
    texture.needsUpdate = true; // 텍스처 업데이트 강제

    const geometry = new THREE.PlaneGeometry(3.2, 0.8); // 4:1 비율 유지하면서 적당한 크기
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01, // alphaTest 값을 낮춰서 타이포그래피 이모지가 보이도록
      side: THREE.DoubleSide, // 양쪽 면 렌더링
      depthWrite: false, // 투명 객체는 depthWrite false
      fog: false // 안개 영향 받지 않음
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    return mesh;
  }

  private worldToScreen(position: THREE.Vector3): { x: number, y: number } {
    // 카메라나 renderer가 없으면 기본값 반환
    if (!this.camera || !this.renderer) {
      return { x: 0, y: 0 };
    }

    const vector = position.clone();
    vector.project(this.camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    return { x: vector.x, y: vector.y };
  }

  private showRandomMessage(emojiData: any): void {
    // 현재 메시지 텍스트가 이미 다른 곳에서 표시 중인지 확인 (텍스트 기반 중복 체크만)
    const messageText = this.apiMessages[emojiData.messageIndex]?.message ||
                        this.apiMessages[emojiData.messageIndex]?.text ||
                        emojiData.message || '';

    const duplicateMessage = this.visibleMessages.find(msg =>
      msg.text === messageText && msg.visible && !msg.hiding
    );
    if (duplicateMessage) {
      console.log(`동일한 메시지가 이미 표시 중입니다: ${messageText}`);
      return;
    }

    console.log(`메시지 표시 시도: ${emojiData.nickname} - ${messageText}`);

    const messagePosition = new THREE.Vector3(
      emojiData.mesh.position.x,
      emojiData.mesh.position.y + 2.5, // 이모지 바로 위에 더 가깝게 배치
      emojiData.mesh.position.z
    );

    const screenPos = this.worldToScreen(messagePosition);

    // 화면 좌표가 유효한지 확인
    if (isNaN(screenPos.x) || isNaN(screenPos.y)) {
      return; // 유효하지 않은 좌표면 메시지를 생성하지 않음
    }

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    const htmlMessage = {
      id: messageId,
      nickname: emojiData.nickname,
      text: emojiData.message,
      screenX: screenPos.x - 125, // 메시지 박스 중앙 정렬
      screenY: screenPos.y - 80, // 이모지 위쪽에 배치하여 가리지 않도록
      visible: false,
      hiding: false
    };

    this.visibleMessages.push(htmlMessage);

    // 귀여운 등장 애니메이션 (약간의 지연으로 부드럽게)
    setTimeout(() => {
      const msg = this.visibleMessages.find(m => m.id === messageId);
      if (msg) {
        msg.visible = true;
      }
    }, 150);

    // 4-6초 후 메시지 숨기기 (적당한 시간으로)
    setTimeout(() => {
      const msg = this.visibleMessages.find(m => m.id === messageId);
      if (msg) {
        msg.hiding = true;
        // 애니메이션 완료 후 제거
        setTimeout(() => {
          const index = this.visibleMessages.findIndex(m => m.id === messageId);
          if (index > -1) {
            this.visibleMessages.splice(index, 1);
            // 메시지가 사라진 직후 새로운 메시지 표시 시도
            this.tryShowNextMessage();
          }
        }, 500);
      }
      // 다음 메시지 표시 시간 설정 (5-8초 후로 단축)
      emojiData.nextMessageTime = Date.now() + Math.random() * 3000 + 5000;
    }, Math.random() * 2000 + 4000); // 4-6초로 조정
  }

  // 메시지가 사라진 후 대기 중인 메시지를 즉시 표시하는 함수
  private tryShowNextMessage(): void {
    // 현재 표시 중인 메시지 개수 확인
    const currentVisibleCount = this.visibleMessages.filter(m => m.visible && !m.hiding).length;
    const totalMessageCount = this.apiMessages.length;

    // 가능한 메시지 개수에 맞춰서 표시 (최대 20개, 실제 메시지 개수까지)
    const targetMessageCount = Math.min(totalMessageCount, this.maxVisibleMessages);

    if (currentVisibleCount >= targetMessageCount) {
      return;
    }

    // 드래그 중이면 중단
    if (this.isDragging) {
      return;
    }

    const now = Date.now();

    // 표시 가능한 이모지 찾기 (메시지가 적게 표시된 이모지 우선)
    const availableEmojis = this.emojis.filter(emoji => {
      // 해당 이모지에서 현재 표시 중인 메시지 개수 확인
      const messageCount = this.visibleMessages.filter(msg =>
        msg.nickname === emoji.nickname && msg.visible && !msg.hiding
      ).length;
      // 메시지가 없거나 1개만 있는 이모지만 선택 (너무 많이 겹치지 않게)
      return messageCount < 1;
    });

    if (availableEmojis.length > 0) {
      // 현재 표시 중인 메시지 텍스트 수집 (더 엄격한 중복 체크)
      const currentVisibleTexts = new Set(
        this.visibleMessages
          .filter(m => m.visible && !m.hiding)
          .map(m => m.text)
      );

      // 사용 가능한 메시지 찾기 (텍스트 기반 중복 체크)
      const availableMessageIndex = this.apiMessages.findIndex(msg =>
        !currentVisibleTexts.has(msg.message || msg.text || '')
      );

      if (availableMessageIndex !== -1) {
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        randomEmoji.messageIndex = availableMessageIndex;
        this.showRandomMessage(randomEmoji);
      } else {
        console.log('모든 메시지가 현재 표시 중이어서 중복 방지됨');
      }
    }
  }

  private onCanvasClick(event: MouseEvent): void {
    console.log('Canvas 클릭됨, hasMouseMoved:', this.hasMouseMoved);

    // 드래그한 경우 클릭 이벤트 무시
    if (this.hasMouseMoved) {
      console.log('마우스 이동으로 인해 클릭 이벤트 무시');
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    console.log('마우스 좌표:', mouse.x, mouse.y);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.emojis.map(e => e.mesh));
    console.log('Raycasting 결과:', intersects.length, '개의 이모지 감지');

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const emojiData = this.emojis.find(e => e.mesh === clickedMesh);

      if (emojiData) {
        console.log('이모지 클릭됨:', emojiData.emoji, emojiData.nickname);
        this.showEmojiPopup(emojiData);
      }
    } else {
      console.log('이모지 클릭되지 않음');
      this.hideEmojiPopup();
    }
  }

  private showEmojiPopup(emojiData: any): void {
    this.selectedEmoji = emojiData;
    this.isEmojiPopupVisible = true;
  }

  public hideEmojiPopup(): void {
    this.isEmojiPopupVisible = false;
    this.selectedEmoji = null;
  }

  // 메시지 클릭 핸들러
  public onMessageClick(message: any): void {
    // 메시지 ID를 기반으로 해당 이모지 데이터 찾기
    const emojiData = this.emojis.find(emoji => {
      return emoji.nickname === message.nickname && emoji.message === message.text;
    });

    if (emojiData) {
      this.showEmojiPopup(emojiData);
    }
  }

  // 레이캐스팅으로 이모지를 트리 표면에 붙이는 함수
  private attachEmojiToTreeSurface(angle: number, targetHeight: number): { x: number, y: number, z: number } {
    // 바깥쪽에서 트리 중심으로 레이를 쏘는 방식으로 변경
    const rayDistance = 10; // 트리 바깥쪽 시작점 거리
    const rayOrigin = new THREE.Vector3(
      Math.cos(angle) * rayDistance,
      targetHeight - 7,
      Math.sin(angle) * rayDistance
    );

    const rayDirection = new THREE.Vector3(
      -Math.cos(angle), // 트리 중심 방향
      0,
      -Math.sin(angle)
    ).normalize();

    // 레이캐스터 생성
    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, rayDirection);

    // 메인 트리와 교차점 찾기
    let intersects: THREE.Intersection[] = [];
    if (this.mainTreeGroup) {
      intersects = raycaster.intersectObject(this.mainTreeGroup, true);

      // 디버그 로그
      console.log(`Raycast for angle ${angle.toFixed(2)}: ${intersects.length} intersections`);
      if (intersects.length > 0) {
        console.log('Intersection point:', intersects[0].point);
      }
    }

    // 교차점이 있으면 그 위치에, 없으면 기본 위치에 배치
    if (intersects.length > 0) {
      const intersection = intersects[0];
      // 교차점에서 약간 바깥쪽으로 이동 (이모지가 트리에 묻히지 않게)
      const offsetDistance = 1.5; // 트리 표면에서 더 멀리 떨어뜨려 이모지가 트리 안에 들어가지 않도록
      const position = intersection.point.clone();

      // face normal이 있으면 사용, 없으면 중심에서 바깥쪽 방향 사용
      let normal: THREE.Vector3;
      if (intersection.face && intersection.face.normal) {
        normal = intersection.face.normal.clone();
        // 월드 좌표계로 변환
        const matrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
        normal.applyMatrix3(matrix).normalize();
      } else {
        // 폴백: 트리 중심에서 바깥쪽 방향
        normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      }

      position.add(normal.multiplyScalar(offsetDistance));

      console.log('Final position:', position);

      return {
        x: position.x,
        y: position.y,
        z: position.z
      };
    } else {
      // 폴백: 기존 방식으로 배치
      console.log('No intersection found, using fallback position');
      const radius = 4;
      return {
        x: Math.cos(angle) * radius,
        y: targetHeight - 7,
        z: Math.sin(angle) * radius
      };
    }
  }

  // 바닥 높이 계산 (Raycast 사용)
  private getGroundHeight(x: number, z: number): number {
    // 위에서 아래로 레이를 쏴서 지면 높이 계산
    const rayOrigin = new THREE.Vector3(x, 10, z); // 위쪽에서 시작
    const rayDirection = new THREE.Vector3(0, -1, 0); // 아래쪽으로

    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, rayDirection);

    // 지면과 교차점 찾기 (지면 mesh만 대상으로)
    const groundObjects = this.scene.children.filter(child =>
      child instanceof THREE.Mesh &&
      child.geometry instanceof THREE.PlaneGeometry
    );

    if (groundObjects.length > 0) {
      const intersects = raycaster.intersectObjects(groundObjects);
      if (intersects.length > 0) {
        return intersects[0].point.y;
      }
    }

    // 폴백: 수식으로 계산 (createGround에서 사용한 공식과 동일)
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    const height = Math.sin(distanceFromCenter * 0.1) * 2 +
                   Math.sin(x * 0.05) * Math.sin(z * 0.05) * 1.5;
    return height - 5; // 바닥 위치
  }

  // 이모지의 화면 위치 계산
  getEmojiScreenPosition(emojiData: any): { x: number, y: number } {
    if (!emojiData.mesh) return { x: 0, y: 0 };

    const position = new THREE.Vector3(
      emojiData.mesh.position.x,
      emojiData.mesh.position.y + 0.5, // 이모지 위쪽에 라벨 표시
      emojiData.mesh.position.z
    );

    return this.worldToScreen(position);
  }

  // 배경 트리의 화면 위치 계산
  getBackgroundTreePosition(index: number): { x: number, y: number } {
    if (index >= this.backgroundTrees.length) {
      return { x: 0, y: 0 };
    }

    const tree = this.backgroundTrees[index];
    const position = new THREE.Vector3(
      tree.position.x,
      tree.position.y + 3, // 트리 위쪽에 라벨 표시
      tree.position.z
    );

    return this.worldToScreen(position);
  }

  // 트리 부착 위치 계산 (원통형 트리 표면에 배치)
  private getTreeAttachPosition(height: number, angle: number): { x: number, y: number, z: number } {
    // 트리의 대략적인 반지름 계산 (높이에 따라 변화)
    const maxRadius = 3; // 트리 하단 최대 반지름
    const minRadius = 0.5; // 트리 상단 최소 반지름
    const maxHeight = 12; // 트리 최대 높이

    // 높이에 따른 반지름 계산 (아래가 넓고 위가 좁은 원뿔 형태)
    const normalizedHeight = Math.max(0, Math.min(1, height / maxHeight));
    const radius = minRadius + (maxRadius - minRadius) * (1 - normalizedHeight);

    return {
      x: Math.cos(angle) * radius,
      y: height - 5, // 트리 바닥 위치 보정
      z: Math.sin(angle) * radius
    };
  }

  // 동적 위치 생성 메서드들
  private generateRandomFieldPosition(): { x: number, y: number, z: number } {
    // 트리 주변 반경 2-8 범위에서 랜덤 위치 생성
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 6; // 2-8 반경
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -4.8; // 고정된 바닥 높이
    return { x, y, z };
  }

  private generateRandomTreePosition(): { height: number, angle: number } {
    // 트리 높이와 각도 랜덤 생성 (가중치를 적용해 하단~중간 부분 선호)
    const randomValue = Math.random();
    // 제곱근을 사용해 낮은 높이에 더 많이 배치 (하단 선호)
    const weightedRandom = Math.sqrt(randomValue);
    const height = 2.5 + weightedRandom * 7; // 2.5-9.5 높이 범위 (꼭대기 피하기)
    const angle = Math.random() * Math.PI * 2; // 0-2π 각도 범위
    return { height, angle };
  }


  private clearAllEmojis(): void {
    // 기존 이모지들을 모두 제거
    this.emojis.forEach(emojiData => {
      if (emojiData.mesh.parent) {
        emojiData.mesh.parent.remove(emojiData.mesh);
      }
    });
    this.emojis = [];
    this.visibleMessages = [];
    console.log('기존 이모지들을 모두 제거했습니다.');
  }

  private async loadMessages(): Promise<void> {
    // 이미 로딩 중이면 중단
    if (this.isLoadingMessages) {
      console.log('이미 메시지 로딩 중입니다. 중복 호출 방지');
      return;
    }

    // Scene이 초기화되었는지 확인
    if (!this.scene) {
      console.log('Scene이 아직 초기화되지 않아서 메시지 로드를 지연합니다.');
      setTimeout(() => this.loadMessages(), 500);
      return;
    }

    this.isLoadingMessages = true;

    // 스팟 ID가 있으면 실제 메시지 로드, 없으면 더미 데이터 사용
    if (this.authState.currentSpotId) {
      console.log('실제 스팟 메시지 로드:', this.authState.currentSpotId);
      await this.loadRealMessages();
    } else {
      console.log('스팟 없음 - 더미 데이터 사용');
      this.loadFallbackMessages();
    }

    this.isLoadingMessages = false;
  }

  private async loadRealMessages(): Promise<void> {
    try {
      // API에서 메시지 데이터 가져오기
      this.apiMessages = await this.fetchMessagesFromAPI();

      // API 데이터를 placementType에 따라 분류하고 동적 위치 생성
      const typographyEmojis: any[] = [];
      const treeEmojis: any[] = [];

      this.apiMessages.forEach((msg, index) => {
        console.log(`메시지 처리: ${msg.nickname} - placementType: ${msg.placementType}`);

        // center 타입을 랜덤하게 field 또는 tree로 분배 (50:50)
        let actualPlacementType = msg.placementType;

        if (actualPlacementType === 'center') {
          // 트리 배치 일반 이모지
          const position = this.generateRandomTreePosition();
          treeEmojis.push({
            nickname: msg.nickname,
            message: msg.message,
            emoji: msg.emoji,
            attachToTree: true,
            height: position.height,
            angle: position.angle,
            messageIndex: index // API 메시지 인덱스 추가
          });
        } else {
          const position = this.generateRandomFieldPosition();
          typographyEmojis.push({
            nickname: msg.nickname,
            message: msg.message,
            emoji: msg.emoji,
            x: position.x,
            y: position.y,
            z: position.z,
            messageIndex: index // API 메시지 인덱스 추가
          });
        }
      });

      console.log(`API에서 로드된 메시지: ${this.apiMessages.length}개 (타이포그래피: ${typographyEmojis.length}, 트리: ${treeEmojis.length})`);

      // 메시지 개수 업데이트
      this.messageCount = this.apiMessages.length;

      // 기존 이모지들을 모두 제거 (깔끔하게 시작)
      this.clearAllEmojis();

      // API에 데이터가 없으면 빈 상태로 유지 (로그인 사용자는 더미 데이터 사용 안함)
      if (this.apiMessages.length === 0) {
        console.log('아직 메시지가 없습니다. 첫 번째 메시지를 남겨보세요!');
        return;
      }

      // API에서 받은 데이터로 이모지 배치
      this.placeEmojisFromData(typographyEmojis, treeEmojis);

    } catch (error) {
      console.error('메시지 로드 중 오류 발생:', error);
      // 로그인한 상태에서는 fallback 메시지 사용 안함
      console.log('API 오류로 인해 메시지를 로드할 수 없습니다.');
    }
  }

  // 개발 단계용 fallback 데이터
  private loadFallbackMessages(): void {
    // 기본 타이포그래피 이모지들
    const fallbackTypographyEmojis = [
      { nickname: '도현', message: '웃음 가득한 크리스마스!', emoji: '( ͡° ͜ʖ ͡°)' },
      { nickname: '민수', message: '행복한 연말 되세요', emoji: '┬─┬ ノ(  ゚- ゚ノ)' },
      { nickname: '지우', message: '따뜻한 마음으로', emoji: '(╯°□°)╯' }
    ].map(msg => ({
      ...msg,
      ...this.generateRandomFieldPosition()
    }));

    // 기본 트리 이모지들
    const fallbackTreeEmojis = [
      { nickname: '김영희', message: '메리 크리스마스!', emoji: '🎄' },
      { nickname: '박철수', message: '행복한 연말 되세요!', emoji: '🎅' },
      { nickname: '이수정', message: '따뜻한 크리스마스 보내요', emoji: '⭐' },
      { nickname: '최민수', message: '새해 복 많이 받으세요!', emoji: '🎁' },
      { nickname: '정다은', message: '사랑하는 사람들과 함께하는 크리스마스', emoji: '❄️' }
    ].map(msg => {
      const position = this.generateRandomTreePosition();
      return {
        ...msg,
        attachToTree: true,
        height: position.height,
        angle: position.angle
      };
    });

    this.placeEmojisFromData(fallbackTypographyEmojis, fallbackTreeEmojis);
  }

  // 이모지 배치 공통 로직
  private placeEmojisFromData(typographyEmojis: any[], treeEmojis: any[]): void {
    console.log(`이모지 배치 시작: 타이포그래피 ${typographyEmojis.length}개, 트리 ${treeEmojis.length}개`);

    // 타이포그래피 이모지 먼저 배치
    typographyEmojis.forEach((msg, index) => {
      setTimeout(() => {
        console.log(`타이포그래피 이모지 생성: ${msg.nickname} - ${msg.emoji} at (${msg.x}, ${msg.z})`);

        // Raycast로 바닥 높이 계산
        const groundHeight = this.getGroundHeight(msg.x, msg.z);
        const y = groundHeight + 0.5;

        const mesh = this.createTypographyMesh(msg.emoji, msg.x, y, msg.z);
        this.emojiScene.add(mesh); // 이모지 씬에 추가

        mesh.userData['originalY'] = y;
        mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003; // 0.002-0.005 속도로 이동
        mesh.userData['moveAngle'] = Math.random() * Math.PI * 2; // 랜덤 초기 각도
        mesh.userData['isTypography'] = true; // 타이포그래피 표시
        // 사인 그래프 움직임을 위한 새 파라미터들
        mesh.userData['sinePhase'] = Math.random() * Math.PI * 2; // 사인 파형 위상
        mesh.userData['sineAmplitude'] = 0.5 + Math.random() * 1.0; // 사인 파형 진폭 (0.5-1.5)
        mesh.userData['sineFrequency'] = 0.8 + Math.random() * 0.4; // 사인 파형 주파수 (0.8-1.2)
        mesh.userData['previousX'] = msg.x; // 이전 위치 (방향 계산용)
        mesh.userData['previousZ'] = msg.z || 0;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: msg.x,
          y: msg.y,
          z: msg.z
          // nextMessageTime을 설정하지 않음으로써 메시지 표시 비활성화
        });

        this.animateEmojiEntry(mesh);
      }, index * 300);
    });

    // 트리 이모티콘들 배치 (레이캐스팅으로 트리 표면에 붙이기)
    treeEmojis.forEach((msg, index) => {
      setTimeout(() => {
        // 레이캐스팅으로 트리 표면에 정확히 붙이기
        const treePosition = this.attachEmojiToTreeSurface(msg.angle, msg.height);

        const mesh = this.createEmojiMesh(msg.emoji, treePosition.x, treePosition.y, treePosition.z);
        this.emojiScene.add(mesh); // 이모지 씬에 추가

        mesh.userData['originalY'] = treePosition.y;
        mesh.userData['nearTree'] = true;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: treePosition.x,
          y: treePosition.y,
          z: treePosition.z
          // nextMessageTime을 설정하지 않음으로써 메시지 표시 비활성화
        });

        this.animateEmojiEntry(mesh);
      }, (typographyEmojis.length * 300) + (index * 400));
    });
  }

  private animateEmojiEntry(mesh: THREE.Mesh): void {
    // 1단계: 노란 빛 구체 생성
    const glowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFEB3B,
      transparent: true,
      opacity: 0.8
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.position.copy(mesh.position);
    this.emojiScene.add(glowSphere);

    // 이모지는 처음에 투명하게 설정
    if (mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.transparent = true;
      mesh.material.opacity = 0;
    }
    mesh.scale.set(0, 0, 0);

    const totalDuration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      if (progress < 0.4) {
        // 전반부 40%: 노란 빛이 커짐
        const glowProgress = progress / 0.4;
        const glowScale = 0.1 + glowProgress * 1.5;
        glowSphere.scale.set(glowScale, glowScale, glowScale);
        glowMaterial.opacity = 0.8 * (1 - glowProgress * 0.3);
      } else {
        // 후반부 60%: 이모지 등장, 빛 사라짐
        const emojiProgress = (progress - 0.4) / 0.6;

        // 빛 사라지기
        if (emojiProgress < 0.5) {
          glowMaterial.opacity = 0.5 * (1 - emojiProgress * 2);
          const shrinkScale = 1.6 * (1 - emojiProgress);
          glowSphere.scale.set(shrinkScale, shrinkScale, shrinkScale);
        } else if (glowSphere.parent) {
          this.emojiScene.remove(glowSphere);
        }

        // 이모지 등장 (바운스 효과)
        const easeOutBounce = (t: number) => {
          if (t < 1 / 2.75) {
            return 7.5625 * t * t;
          } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
          } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
          } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
          }
        };

        const scale = easeOutBounce(emojiProgress);
        mesh.scale.set(scale, scale, scale);

        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity = Math.min(emojiProgress * 1.5, 1);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 정리
        if (glowSphere.parent) {
          this.emojiScene.remove(glowSphere);
        }
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity = 1;
        }
      }
    };

    animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;
    const currentTime = Date.now();

    // 떨어지는 눈 애니메이션
    this.snowflakes.forEach(snowflake => {
      snowflake.position.y -= snowflake.userData['velocity'];
      snowflake.position.x += snowflake.userData['drift'];

      // 바닥에 닿으면 다시 위로
      if (snowflake.position.y < -6) {
        snowflake.position.y = 15 + Math.random() * 5;
        snowflake.position.x = (Math.random() - 0.5) * 30;
        snowflake.position.z = (Math.random() - 0.5) * 30;
      }
    });

    // 불꽃 효과 업데이트
    this.checkFireworkLaunch(currentTime);
    this.updateFireworks(currentTime - (this.lastTime || currentTime));
    this.lastTime = currentTime;

    // 이모지 동적 업데이트
    this.checkEmojiUpdate(currentTime);

    this.emojis.forEach((emojiData, index) => {
      if (emojiData.mesh.userData['originalY'] !== undefined) {
        // 타이포그래피 이모지 사인 그래프 움직임 애니메이션
        if (emojiData.mesh.userData['isTypography']) {
          const moveSpeed = emojiData.mesh.userData['moveSpeed'];
          const sinePhase = emojiData.mesh.userData['sinePhase'];
          const sineAmplitude = emojiData.mesh.userData['sineAmplitude'];
          const sineFrequency = emojiData.mesh.userData['sineFrequency'];
          const previousX = emojiData.mesh.userData['previousX'];
          const previousZ = emojiData.mesh.userData['previousZ'];

          // 기본 이동 방향 각도 업데이트
          emojiData.mesh.userData['moveAngle'] += moveSpeed;
          const currentAngle = emojiData.mesh.userData['moveAngle'];

          // 기본 직선 이동
          const baseX = emojiData.x + Math.cos(currentAngle) * 2.0;
          const baseZ = (emojiData.z || 0) + Math.sin(currentAngle) * 2.0;

          // 사인 그래프 형태로 좌우 흔들림 추가
          const sineOffset = Math.sin(time * sineFrequency + sinePhase) * sineAmplitude;
          const perpAngle = currentAngle + Math.PI / 2; // 수직 방향

          const newX = baseX + Math.cos(perpAngle) * sineOffset;
          const newZ = baseZ + Math.sin(perpAngle) * sineOffset;

          // 방향 변화 계산 및 회전
          const deltaX = newX - previousX;
          const deltaZ = newZ - previousZ;
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaZ) > 0.001) {
            const directionAngle = Math.atan2(deltaZ, deltaX);
            emojiData.mesh.rotation.y = directionAngle;
          }

          // 위치 업데이트
          emojiData.mesh.position.x = newX;
          emojiData.mesh.position.z = newZ;

          // 이전 위치 저장
          emojiData.mesh.userData['previousX'] = newX;
          emojiData.mesh.userData['previousZ'] = newZ;

          // Raycast로 바닥 높이 계산
          const groundHeight = this.getGroundHeight(newX, newZ);

          // 사인 그래프 형태의 위아래 움직임
          const verticalSine = Math.sin(time * sineFrequency * 1.5 + sinePhase) * 0.3;
          const floatHeight = 0.5 + verticalSine;
          emojiData.mesh.position.y = groundHeight + floatHeight;
        } else {
          // 일반 이모지도 부유하는 효과 추가
          if (emojiData.mesh.userData['nearTree']) {
            emojiData.mesh.position.y = emojiData.mesh.userData['originalY'] + Math.sin(time * 1.5 + index) * 0.2;
          }
        }

        // 이모지가 항상 카메라를 정면으로 바라보도록 설정 (빌보드 효과)
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        emojiData.mesh.lookAt(
          emojiData.mesh.position.x + cameraDirection.x,
          emojiData.mesh.position.y + cameraDirection.y,
          emojiData.mesh.position.z + cameraDirection.z
        );

        // 메시지 표시 체크 (드래그 중이 아닐 때만, 빈도 제한 적용)
        if (!this.isDragging && emojiData.nextMessageTime && currentTime >= emojiData.nextMessageTime) {
          const secondNow = Math.floor(currentTime / 1000);

          // 새로운 초가 시작되면 카운터 리셋
          if (secondNow !== this.currentSecond) {
            this.currentSecond = secondNow;
            this.messagesThisSecond = 0;
          }

          // 이번 초에 표시할 수 있는 메시지 수와 최대 동시 표시 개수 확인
          if (this.messagesThisSecond < this.maxMessagesPerSecond &&
              currentTime - this.lastMessageTime >= this.messageInterval / this.maxMessagesPerSecond &&
              this.visibleMessages.length < this.maxVisibleMessages) {

            // 해당 이모지의 기존 메시지가 있는지 확인
            const hasMessage = this.visibleMessages.some(msg =>
              msg.nickname === emojiData.nickname && msg.text === emojiData.message
            );

            if (!hasMessage) {
              this.showRandomMessage(emojiData);
              this.lastMessageTime = currentTime;
              this.messagesThisSecond++;
            }
          }
        }
      }
    });

    // HTML 메시지 위치 업데이트
    this.visibleMessages.forEach(message => {
      const emojiData = this.emojis.find(e =>
        e.nickname === message.nickname && e.message === message.text
      );

      if (emojiData) {
        const messagePosition = new THREE.Vector3(
          emojiData.mesh.position.x,
          emojiData.mesh.position.y + 2.5, // 이모지 바로 위에 더 가깝게 배치
          emojiData.mesh.position.z
        );

        const screenPos = this.worldToScreen(messagePosition);

        // 화면 좌표가 유효한지 확인
        if (isNaN(screenPos.x) || isNaN(screenPos.y)) {
          return; // 유효하지 않은 좌표면 업데이트하지 않음
        }

        // 이모지가 화면에 보이는 범위에 있는지 확인
        if (screenPos.x < -200 || screenPos.x > window.innerWidth + 200 ||
            screenPos.y < -200 || screenPos.y > window.innerHeight + 200) {
          message.visible = false; // 화면 밖에 있으면 숨김
          return;
        }

        // 메시지 위치를 이모지 위쪽에 배치
        message.screenX = screenPos.x - 125; // 메시지 박스 중앙 정렬
        message.screenY = screenPos.y - 80; // 이모지 위쪽에 배치하여 가리지 않도록
      }
    });

    // 등록 이펙트 애니메이션
    if (this.registrationEffect) {
      const effectTime = (currentTime - this.registrationEffect.userData['startTime']) / 1000;
      if (effectTime > 3) {
        // 3초 후 이펙트 제거
        this.scene.remove(this.registrationEffect);
        this.registrationEffect = null;
      } else {
        // 별 이펙트 회전 및 스케일 애니메이션
        this.registrationEffect.rotation.z += 0.05;
        const scale = 1 + Math.sin(effectTime * 3) * 0.3;
        this.registrationEffect.scale.set(scale, scale, scale);
      }
    }

    // 카메라 위치 업데이트 (원형 궤도)
    this.updateCameraPosition();

    // 1. 메인 씬을 OutlineEffect로 렌더링 (3D 오브젝트들)
    if (this.outlineEffect) {
      this.outlineEffect.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 2. 이모지 씬을 기본 렌더러로 오버레이 렌더링 (투명도 유지)
    this.renderer.autoClear = false; // 자동 클리어 비활성화
    this.renderer.render(this.emojiScene, this.camera);
    this.renderer.autoClear = true; // 다음 프레임을 위해 다시 활성화
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }


  onShare(): void {
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  shareToLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('링크가 복사되었습니다!');
      this.closeShareModal();
    }).catch(() => {
      alert('링크 복사에 실패했습니다.');
    });
  }

  shareToKakao(): void {
    const url = window.location.href;
    const title = `🎄 ${this.ownerName}님의 크리스마스 트리`;
    const description = '크리스마스 이모티콘 광장에서 메시지를 남겨보세요!';

    // 카카오톡 공유하기 API 사용
    if ((window as any).Kakao) {
      (window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: description,
          imageUrl: 'https://your-domain.com/christmas-tree-image.png', // 이미지 URL 추가
          link: {
            mobileWebUrl: url,
            webUrl: url
          }
        },
        buttons: [
          {
            title: '트리 보러가기',
            link: {
              mobileWebUrl: url,
              webUrl: url
            }
          }
        ]
      });
    } else {
      // 카카오톡이 설치되지 않은 경우 또는 API가 로드되지 않은 경우
      window.open(`https://www.kakaocorp.com/page/service/service/KakaoTalk`);
    }
    this.closeShareModal();
  }

  shareToInstagram(): void {
    const url = window.location.href;
    const text = `🎄 ${this.ownerName}님의 크리스마스 트리 ${url}`;

    // 인스타그램 앱이 설치된 경우 시도
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      // 모바일 환경에서 인스타그램 앱 시도
      window.location.href = `instagram://camera`;
      setTimeout(() => {
        // 앱이 열리지 않으면 클립보드에 복사
        navigator.clipboard.writeText(text);
        alert('인스타그램 앱을 열어주세요. 텍스트가 복사되었습니다.');
      }, 1000);
    } else {
      // 데스크톱 환경에서는 클립보드에 복사
      navigator.clipboard.writeText(text);
      alert('인스타그램 공유용 텍스트가 복사되었습니다. 인스타그램 웹사이트에서 스토리에 붙여넣어 주세요.');
    }
    this.closeShareModal();
  }

  // 터치/마우스 컨트롤 메서드들
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

    // 마우스가 움직였는지 체크 (5px 이상 움직이면 드래그로 간주)
    const distanceFromStart = Math.sqrt(
      Math.pow(event.clientX - this.mouseStartPosition.x, 2) +
      Math.pow(event.clientY - this.mouseStartPosition.y, 2)
    );

    if (distanceFromStart > 5) {
      this.hasMouseMoved = true;
    }

    this.cameraAngleY += deltaMove.x * 0.001; // 감도를 1/5로 줄임
    this.cameraAngleX -= deltaMove.y * 0.001; // 감도를 1/5로 줄임

    // 수직 각도 제한 (위에서 아래로 더 제한적으로)
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
      // 단일 터치 - 회전 컨트롤
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
      // 두 손가락 터치 - 줌 컨트롤
      this.isDragging = false;
      this.isZooming = true;
      this.hasMouseMoved = false;

      // 두 터치 포인트 간의 거리 계산
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
      // 단일 터치 - 회전 컨트롤
      const deltaMove = {
        x: event.touches[0].clientX - this.previousMousePosition.x,
        y: event.touches[0].clientY - this.previousMousePosition.y
      };

      // 터치가 움직였는지 체크 (5px 이상 움직이면 드래그로 간주)
      const distanceFromStart = Math.sqrt(
        Math.pow(event.touches[0].clientX - this.mouseStartPosition.x, 2) +
        Math.pow(event.touches[0].clientY - this.mouseStartPosition.y, 2)
      );

      if (distanceFromStart > 5) {
        this.hasMouseMoved = true;
      }

      this.cameraAngleY += deltaMove.x * 0.001; // 터치 감도를 1/5로 줄임
      this.cameraAngleX -= deltaMove.y * 0.001; // 터치 감도를 1/5로 줄임

      // 수직 각도 제한 (위에서 아래로 더 제한적으로)
      this.cameraAngleX = Math.max(0.1, Math.min(Math.PI * 0.6, this.cameraAngleX));

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };

    } else if (event.touches.length === 2 && this.isZooming) {
      // 두 손가락 터치 - 줌 컨트롤
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (this.lastTouchDistance > 0) {
        const distanceDelta = currentDistance - this.lastTouchDistance;
        const zoomDelta = distanceDelta * this.zoomSpeed * 0.01; // 줌 속도 조절

        // 줌 인/아웃
        this.cameraRadius -= zoomDelta;

        // 줌 한계 설정
        this.cameraRadius = Math.max(this.minCameraRadius,
                                   Math.min(this.maxCameraRadius, this.cameraRadius));

        this.hasMouseMoved = true; // 줌도 움직임으로 간주
      }

      this.lastTouchDistance = currentDistance;
    }
  }

  private updateCameraPosition(): void {
    // 카메라가 초기화되지 않았으면 업데이트하지 않음
    if (!this.camera || !this.camera.position) {
      return;
    }

    // 회전 중심점은 트리 위치 (0, 3, 0)로 설정
    const centerX = 0;
    const centerY = 3;
    const centerZ = 0;

    // 구형 좌표계로 카메라 위치 계산
    const x = centerX + this.cameraRadius * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = centerY + this.cameraRadius * Math.cos(this.cameraAngleX);
    const z = centerZ + this.cameraRadius * Math.sin(this.cameraAngleX) * Math.sin(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(centerX, centerY, centerZ); // 트리 중심을 바라보도록
  }

  // 등록 이펙트 생성
  private createRegistrationEffect(x: number, y: number, z: number): void {
    // 별 모양 이펙트 생성
    const starGeometry = new THREE.ConeGeometry(0.3, 1, 5);
    const starMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFEB3B, // 카툰 브라이트 노란
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });

    this.registrationEffect = new THREE.Mesh(starGeometry, starMaterial);
    this.registrationEffect.position.set(x, y + 2, z);
    this.registrationEffect.userData['startTime'] = Date.now();

    // 파티클 이펙트 추가
    for (let i = 0; i < 10; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFDFEFE, // 약간 따뜻한 흰색
        transparent: true,
        opacity: 0.8
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      const angle = (i / 10) * Math.PI * 2;
      particle.position.set(
        x + Math.cos(angle) * 0.5,
        y + 1.5 + Math.random() * 0.5,
        z + Math.sin(angle) * 0.5
      );

      this.scene.add(particle);

      // 파티클 애니메이션
      const startTime = Date.now();
      const animateParticle = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > 2000) {
          this.scene.remove(particle);
          return;
        }

        particle.position.y += 0.01;
        particle.material.opacity = 0.8 * (1 - elapsed / 2000);
        requestAnimationFrame(animateParticle);
      };
      animateParticle();
    }

    this.scene.add(this.registrationEffect);
  }

  // 새 메시지 등록 처리
  addNewMessage(nickname: string, message: string, emoji: string, placementType: 'tree' | 'field'): void {
    let x, y, z;

    if (placementType === 'tree') {
      // 트리 주변에 랜덤 배치
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 3;
      x = Math.cos(angle) * radius;
      y = Math.random() * 3 + 1;
      z = Math.sin(angle) * radius;
    } else {
      // 필드에 랜덤 배치
      x = (Math.random() - 0.5) * 10;
      y = -4 + Math.random() * 0.5;
      z = Math.random() * 8 + 2;
    }

    // 등록 이펙트 먼저 생성
    this.createRegistrationEffect(x, y, z);

    // 1초 후 실제 이모지 생성
    setTimeout(() => {
      const mesh = placementType === 'field'
        ? this.createTypographyMesh(emoji, x, y, z)
        : this.createEmojiMesh(emoji, x, y, z);

      this.emojiScene.add(mesh); // 이모지 씬에 추가
      mesh.userData['originalY'] = y;

      this.emojis.push({
        mesh,
        nickname,
        message,
        emoji,
        x,
        y,
        nextMessageTime: Date.now() + Math.random() * 5000 + 3000
      });

      this.animateEmojiEntry(mesh);

      // 새로 등록된 이모지로 설정
      this.newlyRegisteredEmoji = this.emojis[this.emojis.length - 1];

      // 5초 후 하이라이트 제거
      setTimeout(() => {
        this.newlyRegisteredEmoji = null;
      }, 5000);

    }, 1000);
  }

  // 인증 관련 메서드들
  async checkAuthStatus(): Promise<void> {
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
        localStorage.removeItem('authToken');
      }
    }

    // 로그인되지 않은 상태에서 스팟 ID가 있으면 방문자 모드
    if (!this.authState.isLoggedIn && treeId) {
      this.showVisitorOptions();
    } else if (!this.authState.isLoggedIn && !treeId) {
      // 로그인되지 않고 스팟 ID도 없으면 홈에서 로그인 유도
      this.showLoginModal = true;
    }

    // 모든 경우에 버튼 텍스트 업데이트
    this.updateWriteButtonText();

    // 스팟 ID가 있으면 메시지 로드 (한 번만)
    if (this.authState.currentSpotId && !this.isLoadingMessages) {
      console.log('메시지 로드 시작:', this.authState.currentSpotId);
      this.loadMessages();
    }
  }

  async loadSpotData(spotId: string): Promise<void> {
    try {
      const response = await this.http.get<any>(`${this.apiBaseUrl}/spots/${spotId}`).toPromise();
      debugger;
      this.currentSpot = this.mapSpotResponse(response);
      if (this.currentSpot) {
        this.ownerName = this.currentSpot.title || '익명의 트리';
      }
      // 스팟 데이터 로드 후 버튼 텍스트 업데이트
      this.updateWriteButtonText();
    } catch (error) {
      console.error('스팟 데이터 로드 실패:', error);
    }
  }

  private async loadCurrentUserSpot(): Promise<void> {
    if (!this.authState.user) {
      return;
    }

    try {
      const headers = this.getAuthHeaders();
      const options = headers ? { headers } : {};
      const response = await this.http
        .get<any[]>(`${this.apiBaseUrl}/users/${this.authState.user.id}/spots`, options)
        .toPromise();

      const mySpot = response && response.length ? response[0] : null;

      if (mySpot) {
        const mappedSpot = this.mapSpotResponse(mySpot);
        this.currentSpot = mappedSpot;
        this.authState.currentSpotId = mappedSpot.id;
        if (mappedSpot.title) {
          this.ownerName = mappedSpot.title;
        } else if (this.authState.user?.nickname) {
          this.ownerName = this.authState.user.nickname;
        }

        const routeSpotId = this.route.snapshot.paramMap.get('id');
        if (!routeSpotId) {
          this.router.navigate(['/4spot', mappedSpot.id], { replaceUrl: true });
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
      const headers = this.getAuthHeaders();
      if (!headers) {
        console.error('인증 토큰이 없어 스팟을 생성할 수 없습니다.');
        return;
      }

      const spotData = {
        owner_id: this.authState.user.id,
        title: `${this.authState.user.nickname}님의 트리`,
        season: this.currentSeason
      };

      const response = await this.http.post<{spot_id: string, share_url: string, title: string}>(
        `${this.apiBaseUrl}/spots`, spotData,
        { headers }
      ).toPromise();

      if (response) {
        this.currentSpot = {
          id: response.spot_id,
          ownerId: this.authState.user.id,
          title: response.title,
          season: this.currentSeason,
          shareUrl: response.share_url
        };
        this.authState.currentSpotId = response.spot_id;
        if (response.title) {
          this.ownerName = response.title;
        }

        // URL을 스팟 ID가 포함된 주소로 변경
        this.router.navigate(['/4spot', response.spot_id], { replaceUrl: true });
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
    if (!this.kakaoLoginUrl) {
      const clientId = '85c57099905117aec84375e532cb75be';
      const redirectUri = 'http://localhost/auth/kakao/callback';
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

  // 기존 fetchMessagesFromAPI 메서드 수정
  private async fetchMessagesFromAPI(): Promise<any[]> {
    try {
      if (!this.authState.currentSpotId) {
        return [];
      }

      const response = await this.http.get<any[]>(`${this.apiBaseUrl}/messages/${this.authState.currentSpotId}`).toPromise();
      return response || [];
    } catch (error) {
      console.error('API에서 메시지를 가져오는데 실패했습니다:', error);
      return [];
    }
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
      console.log('메시지 작성 페이지로 이동 시도:', targetSpotId);
      try {
        const result = this.router.navigate(['/message-write'], {
          queryParams: {
            spotId: targetSpotId,
            nickname: this.authState.user?.nickname || '사용자'
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

      // 서버에 로그아웃 요청 (카카오 로그아웃 포함)
      const token = localStorage.getItem('authToken');
      if (token) {
        await this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).toPromise();
      }

      console.log('서버 로그아웃 완료');
    } catch (error) {
      console.error('서버 로그아웃 실패:', error);
      // 서버 로그아웃 실패해도 클라이언트 정리는 진행
    }

    // 클라이언트 상태 초기화
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');

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
    this.clearAllEmojis();

    console.log('로그아웃 완료 - 메인 페이지로 이동');

    // 메인 페이지로 이동
    this.router.navigate(['/4spot']);
  }

  // YouTube 관련 메소드들
  getYouTubeEmbedUrl(videoId: string): SafeResourceUrl {
    const url = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  toggleYouTube(): void {
    this.isYouTubeVisible = !this.isYouTubeVisible;
  }

  // ngOnInit 수정
  async ngOnInit(): Promise<void> {
    await this.checkAuthStatus(); // 인증 상태 확인 먼저
    await this.loadGLTFLoader();
    await this.loadOutlineEffect();
    this.initThreeJS();
  }
}
