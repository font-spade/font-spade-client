import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';

@Component({
  selector: 'app-merry-christmas',
  templateUrl: './merry-christmas.component.html',
  styleUrls: ['./merry-christmas.component.css']
})
export class MerryChristmasComponent implements OnInit, AfterViewInit {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  public emojis: Array<{
    mesh: THREE.Mesh;
    nickname: string;
    message: string;
    emoji: string;
    x: number;
    y: number;
    nextMessageTime?: number;
  }> = [];

  private snowflakes: THREE.Mesh[] = [];
  public backgroundTreeNames: string[] = ['민수님', '지우님', '예린님', '준호님'];
  private backgroundTrees: THREE.Group[] = [];
  
  // 메시지 표시 제어
  private lastMessageTime = 0;
  private messageInterval = 1000; // 1초 간격
  private maxMessagesPerSecond = 2;
  private messagesThisSecond = 0;
  private currentSecond = 0;
  
  // 터치/마우스 컨트롤
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraRadius = 18; // 더 뒤로 이동
  private cameraAngleX = 0.3; // 위쪽에서 바라보는 각도로 변경
  private cameraAngleY = 0; // 수평 각도
  
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

  ngOnInit(): void {
    this.initThreeJS();
  }

  ngAfterViewInit(): void {
    this.animate();
    this.loadMessages();
  }

  private initThreeJS(): void {
    this.scene = new THREE.Scene();
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
    this.renderer.setClearColor(0x050017, 1); // 어두운 보라색 배경
    // 그림자 비활성화
    this.renderer.shadowMap.enabled = false;

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
    // 어두운 분위기의 안개
    this.scene.fog = new THREE.Fog(0x050017, 10, 30);

    // 부드러운 주변 조명
    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    this.scene.add(ambientLight);

    // 메인 조명 - 따뜻한 톤 (그림자 없이)
    const directionalLight = new THREE.DirectionalLight(0xffe4b5, 0.8);
    directionalLight.position.set(5, 15, 8);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    // 트리 중심 포인트 라이트
    const centerLight = new THREE.PointLight(0xffd700, 0.5);
    centerLight.position.set(0, 5, 2);
    this.scene.add(centerLight);
  }

  private createGround(): void {
    // 지평선 느낌의 평평한 흰색 바닥
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0xCCDFDE, // 연한 민트색
      transparent: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // 수평으로 회전
    ground.position.set(0, -5, 0);
    this.scene.add(ground);
  }

  private createChristmasBackground(): void {
    this.createChristmasTree();
    this.createSnowflakes();
    this.createBackgroundTrees();
  }

  private createChristmasTree(): void {
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
      const material = new THREE.MeshLambertMaterial({ color });
      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(0, layer.y, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      treeGroup.add(cone);
    });

    // 갈색 나무 기둥
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x564338 }); // 어두운 갈색
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -3.8, 0); // 트리를 더 위로 올려서 바닥에서 나오게 함
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // 노란색 별 꼭대기 장식
    const starGeometry = new THREE.ConeGeometry(0.3, 0.8, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xE8C971 }); // 따뜻한 황금색
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 3.5, 0);
    treeGroup.add(star);

    // 트리 장식품들 배치
    this.addTreeDecorations(treeGroup);

    // 트리를 중앙에 1.5배 크기로 배치 (더 위로 올림)
    treeGroup.position.set(0, 1.8, 0);
    treeGroup.scale.set(1.5, 1.5, 1.5);
    this.scene.add(treeGroup);
  }

  private createSnowflakes(): void {
    // 떨어지는 눈 파티클 시스템
    this.snowflakes = [];

    for (let i = 0; i < 200; i++) {
      const snowflakeGeometry = new THREE.SphereGeometry(0.04, 6, 6);
      const snowflakeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFDFEFE, // 약간 따뜻한 흰색
        transparent: true,
        opacity: 0.8
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
    // 텍스트 메시지들과 장식 오브젝트들을 3층에 배치
    const decorations = [
      // 1층 (최상단)
      { text: "루무모 메리크리스마스", y: 1.5, angle: 0, type: 'text' },
      { type: 'santa', y: 1.3, angle: Math.PI / 3, color: 0xff0000 },
      { type: 'candle', y: 1.4, angle: -Math.PI / 3, color: 0xff4444 },

      // 2층 (중간)
      { text: "나은", y: 0, angle: 0, type: 'text' },
      { type: 'snowman', y: -0.2, angle: Math.PI / 2, color: 0xFDFEFE },
      { type: 'angel', y: -0.1, angle: -Math.PI / 2, color: 0xE8C971 },
      { type: 'car', y: -0.2, angle: Math.PI, color: 0xff0000 },
      { text: "사랑해요", y: 0.1, angle: Math.PI / 4, type: 'text' },

      // 3층 (최하단)
      { type: 'bottle', y: -1.8, angle: 0, color: 0x00ff00 },
      { text: "고마워요", y: -1.6, angle: Math.PI / 4, type: 'text' },
      { text: "이쁜이", y: -1.7, angle: -Math.PI / 4, type: 'text' },
      { type: 'snowglobe', y: -1.9, angle: Math.PI / 2, color: 0x87ceeb },
      { text: "화이팅", y: -1.5, angle: 3 * Math.PI / 4, type: 'text' },

      // 하단부 - 노란 전구
      { type: 'light', y: -2.5, angle: 0, color: 0xffff00 },
      { type: 'light', y: -2.6, angle: Math.PI / 3, color: 0xffff00 },
      { type: 'light', y: -2.6, angle: -Math.PI / 3, color: 0xffff00 },
    ];

    decorations.forEach(decoration => {
      if (decoration.type === 'text' && decoration.text) {
        this.addTextDecoration(treeGroup, decoration.text, decoration.y, decoration.angle);
      } else {
        this.addObjectDecoration(treeGroup, decoration.type, decoration.y, decoration.angle, decoration.color);
      }
    });
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
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'santa':
      case 'snowman':
      case 'angel':
        geometry = new THREE.SphereGeometry(0.15, 8, 8);
        break;
      case 'candle':
        geometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
        break;
      case 'car':
        geometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        break;
      case 'bottle':
        geometry = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8);
        break;
      case 'snowglobe':
        geometry = new THREE.SphereGeometry(0.12, 8, 8);
        break;
      case 'light':
        geometry = new THREE.SphereGeometry(0.08, 8, 8);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
    }

    const material = new THREE.MeshLambertMaterial({ color });
    if (type === 'light') {
      material.emissive.setHex(0x444400); // 전구 발광 효과
    }

    const mesh = new THREE.Mesh(geometry, material);

    const radius = this.getTreeRadiusAtHeight(y) + 0.2;
    mesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius * 0.8
    );

    treeGroup.add(mesh);
  }

  private getTreeRadiusAtHeight(height: number): number {
    // 높이에 따른 트리 반지름 계산 (3단 트리)
    if (height > 0.8) return 1.0;      // 1층 (최상단)
    else if (height > -0.8) return 1.8;  // 2층 (중간)
    else return 2.5;                    // 3층 (최하단)
  }

  private createBackgroundTrees(): void {
    // 좌우 측면의 메인 트리와 똑같은 크리스마스 트리들
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 2; i++) {
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
          const material = new THREE.MeshLambertMaterial({ color });
          const cone = new THREE.Mesh(geometry, material);
          cone.position.set(0, layer.y, 0);
          cone.castShadow = true;
          cone.receiveShadow = true;
          backgroundTreeGroup.add(cone);
        });

        // 갈색 나무 기둥
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x564338 }); // 어두운 갈색
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(0, -1.8, 0); // 배경 트리도 더 위로 올림
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        backgroundTreeGroup.add(trunk);

        // 노란색 별 꼭대기 장식
        const starGeometry = new THREE.ConeGeometry(0.2, 0.5, 5);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xE8C971 }); // 따뜻한 황금색
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(0, 2.3, 0);
        backgroundTreeGroup.add(star);
        
        const x = (side === 0 ? -15 : 15) + (Math.random() - 0.5) * 3;
        const z = -10 + Math.random() * 4;
        backgroundTreeGroup.position.set(x, 2.2, z); // 배경 트리도 더 위로 올림
        backgroundTreeGroup.scale.set(0.8, 0.8, 0.8); // 메인보다 약간 작게
        
        // 배경 트리 이름 라벨 데이터 저장
        const treeName = this.backgroundTreeNames[(side * 2 + i) % this.backgroundTreeNames.length];
        backgroundTreeGroup.userData = { treeName, treeIndex: side * 2 + i };
        
        this.backgroundTrees.push(backgroundTreeGroup);
        this.scene.add(backgroundTreeGroup);
      }
    }
  }

  private createEmojiMesh(emoji: string, x: number, y: number, z: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 512;

    // 투명한 배경
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // 이모지를 검은색으로 그리기 (더 크고 두껍게)
    context.font = 'bold 200px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji';
    context.fillStyle = '#000000'; // 검은색
    context.strokeStyle = '#000000'; // 외곽선도 검은색
    context.lineWidth = 8; // 두꺼운 외곽선
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 외곽선 먼저 그리기
    context.strokeText(emoji, canvas.width / 2, canvas.height / 2);
    // 채우기
    context.fillText(emoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;

    const geometry = new THREE.PlaneGeometry(2.5, 2.5); // 더 큰 크기
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide
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

    // 투명한 배경
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // 타이포그래피 이모지를 검은색으로 그리기 (더 크고 두껍게)
    context.font = 'bold 48px monospace'; // 더 큰 폰트
    context.fillStyle = '#000000'; // 검은색
    context.strokeStyle = '#000000'; // 외곽선도 검은색
    context.lineWidth = 4; // 두꺼운 외곽선
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 외곽선 먼저 그리기
    context.strokeText(typographyEmoji, canvas.width / 2, canvas.height / 2);
    // 채우기
    context.fillText(typographyEmoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    
    const geometry = new THREE.PlaneGeometry(4.0, 1.0); // 더 큰 크기
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    
    return mesh;
  }

  private worldToScreen(position: THREE.Vector3): { x: number, y: number } {
    const vector = position.clone();
    vector.project(this.camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    vector.x = (vector.x * widthHalf) + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf + 56; // 헤더 높이 보정

    return { x: vector.x, y: vector.y };
  }

  private showRandomMessage(emojiData: any): void {
    const messagePosition = new THREE.Vector3(
      emojiData.mesh.position.x,
      emojiData.mesh.position.y + 1.0,
      emojiData.mesh.position.z
    );

    const screenPos = this.worldToScreen(messagePosition);

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    const htmlMessage = {
      id: messageId,
      nickname: emojiData.nickname,
      text: emojiData.message,
      screenX: screenPos.x - 125,
      screenY: screenPos.y - 100,
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

    // 3-5초 후 메시지 숨기기 (더 짧은 시간으로)
    setTimeout(() => {
      const msg = this.visibleMessages.find(m => m.id === messageId);
      if (msg) {
        msg.hiding = true;
        // 애니메이션 완료 후 제거 (더 긴 애니메이션 시간)
        setTimeout(() => {
          const index = this.visibleMessages.findIndex(m => m.id === messageId);
          if (index > -1) {
            this.visibleMessages.splice(index, 1);
          }
        }, 500); // 더 긴 애니메이션 시간
      }
      // 다음 메시지 표시 시간 설정 (5-10초 후로 짧게)
      emojiData.nextMessageTime = Date.now() + Math.random() * 5000 + 5000;
    }, Math.random() * 1000 + 3000); // 3-4초로 짧게
  }


  private onCanvasClick(event: MouseEvent): void {
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

  private loadMessages(): void {
    // 타이포그래피 이모지 예시들 (필드에 배치)
    const typographyEmojis = [
      { nickname: '도현', message: '웃음 가득한 크리스마스!', emoji: '( ͡° ͜ʖ ͡°)', x: -6, y: -4, z: 2 },
      { nickname: '민수', message: '행복한 연말 되세요', emoji: '┬─┬ ノ( ゜-゜ノ)', x: 4, y: -4, z: 1 },
      { nickname: '지우', message: '따뜻한 마음으로', emoji: '(╯°□°)╯', x: -3, y: -4, z: 4 },
      { nickname: '슬기', message: '새해 복 많이 받으세요', emoji: 'ಠ( ಠ ͜ʖ ಠ )ಠ', x: 5, y: -4, z: 3 },
      { nickname: '예은', message: '모두 건강하고 행복하게!', emoji: '(•̀_•́)', x: -1, y: -4, z: 6 },
      { nickname: '준호', message: '크리스마스 대박!', emoji: 'ლ(•́ o •̀)ლ', x: 2, y: -4, z: 5 }
    ];

    // 트리 이모티콘들 (트리에 더 가깝게 배치)
    const treeEmojis = [
      { nickname: '김영희', message: '메리 크리스마스!', emoji: '🎄', x: -2.8, y: 1, z: -0.5 },
      { nickname: '박철수', message: '행복한 연말 되세요!', emoji: '🎅', x: 3.2, y: 2, z: 0.3 },
      { nickname: '이수정', message: '따뜻한 크리스마스 보내요', emoji: '⭐', x: -2.5, y: 3, z: 0.8 },
      { nickname: '최민수', message: '새해 복 많이 받으세요!', emoji: '🎁', x: 2.8, y: 0, z: -0.8 },
      { nickname: '정다은', message: '사랑하는 사람들과 함께하는 크리스마스', emoji: '❄️', x: 3.5, y: 2, z: -0.2 },
      { nickname: '강민호', message: '모두 건강하고 행복한 새해!', emoji: '🤶', x: -3.2, y: 1, z: 0.5 },
      { nickname: '송지혜', message: '따뜻한 마음으로 크리스마스를', emoji: '🔔', x: 2.2, y: 3, z: 0.6 },
      { nickname: '윤서준', message: '가족과 함께하는 소중한 시간', emoji: '🕯️', x: -2.5, y: 2, z: -0.7 },
      { nickname: '지효', message: '만사형통!', emoji: '🎄', x: 3.8, y: 1, z: 0.8 },
      { nickname: '수민', message: '좋은 사람들과 함께', emoji: '🎅', x: -3.8, y: 0, z: -0.3 }
    ];

    // 타이포그래피 이모지 먼저 배치
    typographyEmojis.forEach((msg, index) => {
      setTimeout(() => {
        const mesh = this.createTypographyMesh(msg.emoji, msg.x, msg.y, msg.z);
        this.scene.add(mesh);
        
        mesh.userData['originalY'] = msg.y;
        
        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: msg.x,
          y: msg.y,
          nextMessageTime: Date.now() + Math.random() * 5000 + 3000
        });

        this.animateEmojiEntry(mesh);
      }, index * 300);
    });

    // 트리 이모티콘들 배치
    treeEmojis.forEach((msg, index) => {
      setTimeout(() => {
        const mesh = this.createEmojiMesh(msg.emoji, msg.x, msg.y, msg.z);
        this.scene.add(mesh);
        
        mesh.userData['originalY'] = msg.y;
        
        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: msg.x,
          y: msg.y,
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
          
          // 이번 초에 표시할 수 있는 메시지 수를 확인
          if (this.messagesThisSecond < this.maxMessagesPerSecond && 
              currentTime - this.lastMessageTime >= this.messageInterval / this.maxMessagesPerSecond) {
            
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
          emojiData.mesh.position.y + 1.0,
          emojiData.mesh.position.z
        );

        const screenPos = this.worldToScreen(messagePosition);
        message.screenX = screenPos.x - 125; // 메시지 박스 중앙 정렬 (박스 너비의 절반)
        message.screenY = screenPos.y - 100;  // 메시지 박스를 이모지 위쪽에 배치
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

    this.renderer.render(this.scene, this.camera);
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
    
    this.cameraAngleY -= deltaMove.x * 0.001; // 감도를 1/5로 줄임
    this.cameraAngleX -= deltaMove.y * 0.001; // 감도를 1/5로 줄임
    
    // 수직 각도 제한 (위에서 아래로 더 제한적으로)
    this.cameraAngleX = Math.max(0.2, Math.min(Math.PI * 0.7, this.cameraAngleX));
    
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  private onPointerUp(): void {
    this.isDragging = false;
  }
  
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }
  
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDragging || event.touches.length !== 1) return;
    
    const deltaMove = {
      x: event.touches[0].clientX - this.previousMousePosition.x,
      y: event.touches[0].clientY - this.previousMousePosition.y
    };
    
    this.cameraAngleY -= deltaMove.x * 0.001; // 터치 감도를 1/5로 줄임
    this.cameraAngleX -= deltaMove.y * 0.001; // 터치 감도를 1/5로 줄임
    
    // 수직 각도 제한 (위에서 아래로 더 제한적으로)
    this.cameraAngleX = Math.max(0.2, Math.min(Math.PI * 0.7, this.cameraAngleX));
    
    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
  
  private updateCameraPosition(): void {
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
        
      this.scene.add(mesh);
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
