import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';

// GLTFLoader 임포트 (타입 에러 회피)
declare const GLTFLoader: any;
declare const OutlineEffect: any;

// 동적 로딩
let GLTFLoaderClass: any;
let OutlineEffectClass: any;

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
  }> = [];

  private snowflakes: THREE.Mesh[] = [];
  public backgroundTreeNames: string[] = ['민수님', '지우님', '예린님', '준호님'];
  private backgroundTrees: THREE.Group[] = [];

  // 메시지 표시 제어
  private lastMessageTime = 0;
  private messageInterval = 3000; // 3초 간격으로 늘림
  private maxMessagesPerSecond = 1; // 한번에 1개만
  private messagesThisSecond = 0;
  private currentSecond = 0;
  private maxVisibleMessages = 2; // 최대 2개까지만 동시 표시

  // GLB 모델 로더
  private gltfLoader: any = null;
  private mainTreeGroup: any = null; // 메인 트리 참조 저장

  // 터치/마우스 컨트롤
  private isDragging = false;
  private hasMouseMoved = false; // 마우스가 움직였는지 추적
  private mouseStartPosition = { x: 0, y: 0 }; // 마우스 시작 위치
  private previousMousePosition = { x: 0, y: 0 };
  private cameraRadius = 15; // 조금 더 가까이
  private cameraAngleX = 0.4; // 트리를 위에서 바라보는 각도 (더 위에서)
  private cameraAngleY = 0; // 수평 각도 (정면)

  // 줌 컨트롤
  private minCameraRadius = 8; // 최대 줌인
  private maxCameraRadius = 25; // 최대 줌아웃
  private zoomSpeed = 0.8; // 줌 속도
  private lastTouchDistance = 0; // 이전 터치 거리
  private isZooming = false; // 줌 중인지 확인

  // 등록 이펙트
  private registrationEffect: THREE.Mesh | null = null;
  private newlyRegisteredEmoji: any = null;

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
  ownerName = '도현';

  constructor(private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.loadGLTFLoader();
    await this.loadOutlineEffect();
    this.initThreeJS();
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
    this.renderer.toneMappingExposure = 1.2;

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
    this.cameraAngleX = 0.3; // 위쪽에서 바라보는 각도
    this.cameraAngleY = 0;
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
      color: 0xFCF9FC, // 눈 덮인 흰색 바닥
      transparent: false
    });

    // OutlineEffect 파라미터 설정
    groundMaterial.userData['outlineParameters'] = {
      thickness: 0.002,
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
      color: 0x05001C, // #05001C 색상 직접 적용
      side: THREE.BackSide, // 돔 안쪽에서 보이도록
      transparent: false
    });

    // OutlineEffect 파라미터 설정
    skyMaterial.userData['outlineParameters'] = {
      thickness: 0.001,
      color: [0.02, 0.0, 0.11], // #05001C에 맞는 어두운 외곽선
      alpha: 0.4,
      visible: true
    };

    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    skyDome.position.set(0, 0, 0);
    this.scene.add(skyDome);

    // 별들 추가
    this.createStars();
    
    // 초승달 추가
    this.createCrescentMoon();
  }

  private createStars(): void {
    // 별들을 트리 정면 뒤쪽 배경에 집중 배치 (더 가깝게)
    for (let i = 0; i < 30; i++) {
      const starGeometry = new THREE.SphereGeometry(0.2, 8, 8); // 크기 증가
      const starMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00, // 노란색으로 변경
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
      color: 0xFFFF00 // 밝은 노란색
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 그림자 부분 (검은 구로 일부를 가림) - 더 날카로운 초승달을 위해
    const shadowGeometry = new THREE.SphereGeometry(6.5, 16, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x05001C // 하늘색과 같은 색으로 가림
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
        color: 0xFCF9FC, // 눈색과 같은 색상
        transparent: false
      });

      // OutlineEffect 파라미터 설정
      snowballMaterial.userData['outlineParameters'] = {
        thickness: 0.003,
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
      color: 0xFCF9FC // 눈색
    });
    snowMaterial.userData['outlineParameters'] = {
      thickness: 0.004,
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
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, -0.6, 0.8);
    snowmanGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, -0.6, 0.8);
    snowmanGroup.add(rightEye);

    // 코 (주황색 원뿔)
    const noseGeometry = new THREE.ConeGeometry(0.08, 0.4, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF6600 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -0.8, 0.85);
    nose.rotation.x = Math.PI / 2;
    snowmanGroup.add(nose);

    // 모자 (검은 실린더)
    const hatGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.8);
    const hatMaterial = new THREE.MeshToonMaterial({ color: 0x000000 });
    hatMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.1, 0.1, 0.1],
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
    const armMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });
    armMaterial.userData['outlineParameters'] = {
      thickness: 0.002,
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

    // 눈사람 위치 설정 (트리 옆)
    snowmanGroup.position.set(-8, 0, 5);
    
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
        thickness: 0.003,
        color: [0.1, 0.1, 0.1],
        alpha: 0.7,
        visible: true
      };

      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      
      // 리본 (세로)
      const ribbonVGeometry = new THREE.BoxGeometry(0.1, boxSize + 0.1, boxSize + 0.1);
      const ribbonMaterial = new THREE.MeshToonMaterial({ color: 0xFFD93D });
      ribbonMaterial.userData['outlineParameters'] = {
        thickness: 0.002,
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

      // 바닥 위치 계산
      const height = Math.sin(Math.sqrt(pos.x * pos.x + pos.z * pos.z) * 0.1) * 2 +
                    Math.sin(pos.x * 0.05) * Math.sin(pos.z * 0.05) * 1.5;
      
      giftGroup.position.set(pos.x, height - 5 + boxSize/2, pos.z);
      this.scene.add(giftGroup);
    });
  }

  private createCuteAnimals(): void {
    // 토끼 만들기
    const rabbitGroup = new THREE.Group();
    
    // 토끼 몸체
    const bodyGeometry = new THREE.SphereGeometry(0.6, 12, 12);
    const furMaterial = new THREE.MeshToonMaterial({ color: 0xFFF8F0 });
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
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
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

    rabbitGroup.position.set(4, 0, -6);
    this.scene.add(rabbitGroup);

    // 펭귄 만들기
    const penguinGroup = new THREE.Group();
    
    // 펭귄 몸체 (검은색)
    const penguinBodyGeometry = new THREE.SphereGeometry(0.7, 12, 12);
    penguinBodyGeometry.scale(1, 1.3, 1); // 세로로 늘림
    const blackMaterial = new THREE.MeshToonMaterial({ color: 0x000000 });
    blackMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.1, 0.1, 0.1],
      alpha: 0.7,
      visible: true
    };
    const penguinBody = new THREE.Mesh(penguinBodyGeometry, blackMaterial);
    penguinBody.position.y = -4.3;
    penguinGroup.add(penguinBody);

    // 펭귄 배 (흰색)
    const bellyGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    bellyGeometry.scale(1, 1.2, 0.8);
    const whiteMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    whiteMaterial.userData['outlineParameters'] = {
      thickness: 0.002,
      color: [0.9, 0.9, 0.9],
      alpha: 0.6,
      visible: true
    };
    const belly = new THREE.Mesh(bellyGeometry, whiteMaterial);
    belly.position.set(0, -4.2, 0.3);
    penguinGroup.add(belly);

    // 펭귄 부리
    const beakGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const beakMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, -3.4, 0.6);
    beak.rotation.x = Math.PI / 2;
    penguinGroup.add(beak);

    penguinGroup.position.set(-10, 0, -4);
    this.scene.add(penguinGroup);
  }

  private createChristmasDecorations(): void {
    // 캔디케인들
    for (let i = 0; i < 5; i++) {
      const candyCaneGroup = new THREE.Group();
      
      // 캔디케인 막대
      const stickGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
      const stickMaterial = new THREE.MeshToonMaterial({ color: 0xFF0000 });
      stickMaterial.userData['outlineParameters'] = {
        thickness: 0.002,
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
      candyCaneGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      
      this.scene.add(candyCaneGroup);
    }

    // 작은 크리스마스 트리들
    for (let i = 0; i < 3; i++) {
      const miniTreeGroup = new THREE.Group();
      
      const treeGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
      const treeMaterial = new THREE.MeshToonMaterial({ color: 0x228B22 });
      treeMaterial.userData['outlineParameters'] = {
        thickness: 0.002,
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
      const height = Math.sin(Math.sqrt(pos.x * pos.x + pos.z * pos.z) * 0.1) * 2 +
                    Math.sin(pos.x * 0.05) * Math.sin(pos.z * 0.05) * 1.5;
      miniTreeGroup.position.set(pos.x, height, pos.z);
      
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
            const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x45997D);
            // 카툰 재질로 교체
            child.material = new THREE.MeshToonMaterial({
              color: originalColor
            });

            // OutlineEffect 파라미터 설정
            child.material.userData['outlineParameters'] = {
              thickness: 0.006,
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
        color = 0x45997D; // 최상단
      } else if (index === 1) {
        color = 0x9DD3C8; // 중간
      } else {
        color = 0x55AD94; // 최하단
      }
      const material = new THREE.MeshToonMaterial({
        color
      });

      // OutlineEffect 파라미터 설정
      material.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0, 0.2, 0],
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
      color: 0x564338 // 어두운 갈색
    });

    // OutlineEffect 파라미터 설정
    trunkMaterial.userData['outlineParameters'] = {
      thickness: 0.005,
      color: [0.2, 0.1, 0],
      alpha: 0.8,
      visible: true
    };

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -3.8, 0);
    treeGroup.add(trunk);

    // 노란색 별 꼭대기 장식
    const starGeometry = new THREE.ConeGeometry(0.3, 0.8, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xE8C971 }); // 따뜻한 황금색
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 3.5, 0);
    treeGroup.add(star);

    // 트리 장식품들 배치
    this.addTreeDecorations(treeGroup);

    // 트리를 중앙에 1.5배 크기로 배치
    treeGroup.position.set(0, 1.8, 0);
    treeGroup.scale.set(1.5, 1.5, 1.5);
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
                const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x45997D);
                // 카툰 재질로 교체
                child.material = new THREE.MeshToonMaterial({
                  color: originalColor
                });

                // OutlineEffect 파라미터 설정
                child.material.userData['outlineParameters'] = {
                  thickness: 0.005,
                  color: [0, 0.2, 0],
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
        color = 0x45997D; // 최상단
      } else if (layerIndex === 1) {
        color = 0x9DD3C8; // 중간
      } else {
        color = 0x55AD94; // 최하단
      }
      const material = new THREE.MeshToonMaterial({
        color
      });

      // OutlineEffect 파라미터 설정
      material.userData['outlineParameters'] = {
        thickness: 0.003,
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
      color: 0x564338 // 어두운 갈색
    });

    // OutlineEffect 파라미터 설정
    trunkMaterial.userData['outlineParameters'] = {
      thickness: 0.004,
      color: [0.1, 0.05, 0],
      alpha: 0.6,
      visible: true
    };

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -1.8, 0); // 기둥 위치는 그대로
    backgroundTreeGroup.add(trunk);

    // 노란색 별 꼭대기 장식
    const starGeometry = new THREE.ConeGeometry(0.2, 0.5, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xE8C971 }); // 따뜻한 황금색
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

    // 트리에 붙는 이모지는 더 작게 설정
    const size = isAttachedToTree ? 0.8 : 2.5; // 트리 부착용은 0.8, 일반은 2.5
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
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

    const geometry = new THREE.PlaneGeometry(4.0, 1.0); // 더 큰 크기
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
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
      screenY: screenPos.y - 80,  // 이모지 위쪽에 배치
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
          }
        }, 500);
      }
      // 다음 메시지 표시 시간 설정 (8-15초 후로 길게)
      emojiData.nextMessageTime = Date.now() + Math.random() * 7000 + 8000;
    }, Math.random() * 2000 + 4000); // 4-6초로 조정
  }


  private onCanvasClick(event: MouseEvent): void {
    // 드래그한 경우 클릭 이벤트 무시
    if (this.hasMouseMoved) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.emojis.map(e => e.mesh));

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const emojiData = this.emojis.find(e => e.mesh === clickedMesh);

      if (emojiData) {
        this.showEmojiPopup(emojiData);
      }
    } else {
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

  private loadMessages(): void {
    // Scene이 초기화되었는지 확인
    if (!this.scene) {
      console.log('Scene이 아직 초기화되지 않아서 메시지 로드를 지연합니다.');
      setTimeout(() => this.loadMessages(), 500);
      return;
    }
    // 타이포그래피 이모지 예시들 (지형 위에 떠서 배치)
    const typographyEmojis = [
      { nickname: '도현', message: '웃음 가득한 크리스마스!', emoji: '( ͡° ͜ʖ ͡°)', x: -6, y: -2.5, z: 2 },
      { nickname: '민수', message: '행복한 연말 되세요', emoji: '┬─┬ ノ( ゜-゜ノ)', x: 4, y: -2.3, z: 1 },
      { nickname: '지우', message: '따뜻한 마음으로', emoji: '(╯°□°)╯', x: -3, y: -2.4, z: 4 },
      { nickname: '슬기', message: '새해 복 많이 받으세요', emoji: 'ಠ( ಠ ͜ʖ ಠ )ಠ', x: 5, y: -2.2, z: 3 },
      { nickname: '예은', message: '모두 건강하고 행복하게!', emoji: '(•̀_•́)', x: -1, y: -2.6, z: 6 },
      { nickname: '준호', message: '크리스마스 대박!', emoji: 'ლ(•́ o •̀)ლ', x: 2, y: -2.1, z: 5 }
    ];

    // 트리 이모티콘들 (트리에 실제로 붙여서 배치)
    const treeEmojis = [
      { nickname: '김영희', message: '메리 크리스마스!', emoji: '🎄', attachToTree: true, height: 8, angle: 0 },
      { nickname: '박철수', message: '행복한 연말 되세요!', emoji: '🎅', attachToTree: true, height: 6, angle: Math.PI / 3 },
      { nickname: '이수정', message: '따뜻한 크리스마스 보내요', emoji: '⭐', attachToTree: true, height: 10, angle: -Math.PI / 4 },
      { nickname: '최민수', message: '새해 복 많이 받으세요!', emoji: '🎁', attachToTree: true, height: 4, angle: Math.PI / 2 },
      { nickname: '정다은', message: '사랑하는 사람들과 함께하는 크리스마스', emoji: '❄️', attachToTree: true, height: 7, angle: -Math.PI / 2 },
      { nickname: '강민호', message: '모두 건강하고 행복한 새해!', emoji: '🤶', attachToTree: true, height: 5, angle: Math.PI },
      { nickname: '송지혜', message: '따뜻한 마음으로 크리스마스를', emoji: '🔔', attachToTree: true, height: 9, angle: 3 * Math.PI / 4 },
      { nickname: '윤서준', message: '가족과 함께하는 소중한 시간', emoji: '🕯️', attachToTree: true, height: 3, angle: -3 * Math.PI / 4 },
      { nickname: '지효', message: '만사형통!', emoji: '🎄', attachToTree: true, height: 8.5, angle: Math.PI / 6 },
      { nickname: '수민', message: '좋은 사람들과 함께', emoji: '🎅', attachToTree: true, height: 6.5, angle: -Math.PI / 6 }
    ];

    // 타이포그래피 이모지 먼저 배치
    typographyEmojis.forEach((msg, index) => {
      setTimeout(() => {
        const mesh = this.createTypographyMesh(msg.emoji, msg.x, msg.y, msg.z);
        this.emojiScene.add(mesh); // 이모지 씬에 추가

        mesh.userData['originalY'] = msg.y;
        mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003; // 0.002-0.005 속도로 이동
        mesh.userData['moveAngle'] = Math.random() * Math.PI * 2; // 랜덤 초기 각도
        mesh.userData['isTypography'] = true; // 타이포그래피 표시

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: msg.x,
          y: msg.y,
          z: msg.z,
          nextMessageTime: Date.now() + Math.random() * 5000 + 3000
        });

        this.animateEmojiEntry(mesh);
      }, index * 300);
    });

    // 트리 이모티콘들 배치 (트리 주변 가까이에)
    treeEmojis.forEach((msg, index) => {
      setTimeout(() => {
        // 트리 주변 가까운 위치에 배치
        const angle = msg.angle;
        const radius = 4 + Math.random() * 2; // 트리에서 4-6 거리
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = msg.height - 7; // 높이 조정

        const mesh = this.createEmojiMesh(msg.emoji, x, y, z); // 일반 크기로 생성
        this.emojiScene.add(mesh); // 이모지 씬에 추가

        mesh.userData['originalY'] = y;
        mesh.userData['nearTree'] = true;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: x,
          y: y,
          z: z,
          nextMessageTime: Date.now() + Math.random() * 5000 + 5000
        });

        this.animateEmojiEntry(mesh);
      }, (typographyEmojis.length * 300) + (index * 400));
    });
  }

  private animateEmojiEntry(mesh: THREE.Mesh): void {
    const startScale = 0;
    const endScale = 1;
    const duration = 500;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

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

      const scale = startScale + (endScale - startScale) * easeOutBounce(progress);
      mesh.scale.set(scale, scale, scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
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

    this.emojis.forEach((emojiData, index) => {
      if (emojiData.mesh.userData['originalY'] !== undefined) {
        // 타이포그래피 이모지 움직임 애니메이션
        if (emojiData.mesh.userData['isTypography']) {
          const moveSpeed = emojiData.mesh.userData['moveSpeed'];
          const moveAngle = emojiData.mesh.userData['moveAngle'];

          // 원형으로 천천히 움직이기
          emojiData.mesh.userData['moveAngle'] += moveSpeed;
          const currentAngle = emojiData.mesh.userData['moveAngle'];

          // 기준점에서 작은 원을 그리며 이동 (반지름 1.5)
          const baseX = emojiData.x;
          const baseZ = emojiData.z || 0;
          emojiData.mesh.position.x = baseX + Math.cos(currentAngle) * 1.5;
          emojiData.mesh.position.z = baseZ + Math.sin(currentAngle) * 1.5;

          // Y축은 지형 위로 부유하는 효과 (더 높게)
          emojiData.mesh.position.y = emojiData.mesh.userData['originalY'] + Math.sin(time * 2 + index) * 0.3 + 0.5;
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

        // 메시지 표시 체크 (빈도 제한 적용)
        if (emojiData.nextMessageTime && currentTime >= emojiData.nextMessageTime) {
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
        
        // 메시지 위치를 이모지 바로 위에 배치
        message.screenX = screenPos.x - 125; // 메시지 박스 중앙 정렬
        message.screenY = screenPos.y - 80;  // 이모지 위쪽에 배치
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

  onWriteMessage(): void {
    this.router.navigate(['/message-write']);
  }

  onShare(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `🎄 ${this.ownerName}님의 크리스마스`,
        text: '크리스마스 이모티콘 광장에서 메시지를 남겨보세요!',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
    }
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

    this.cameraAngleY -= deltaMove.x * 0.001; // 감도를 1/5로 줄임
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

      this.cameraAngleY -= deltaMove.x * 0.001; // 터치 감도를 1/5로 줄임
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

    const x = this.cameraRadius * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraRadius * Math.cos(this.cameraAngleX);
    const z = this.cameraRadius * Math.sin(this.cameraAngleX) * Math.sin(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // 등록 이펙트 생성
  private createRegistrationEffect(x: number, y: number, z: number): void {
    // 별 모양 이펙트 생성
    const starGeometry = new THREE.ConeGeometry(0.3, 1, 5);
    const starMaterial = new THREE.MeshLambertMaterial({
      color: 0xE8C971, // 따뜻한 황금색
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
}
