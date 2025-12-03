import { Injectable } from '@angular/core';
import * as THREE from 'three';

declare const GLTFLoader: any;
declare const OutlineEffect: any;

let GLTFLoaderClass: any;
let OutlineEffectClass: any;

@Injectable({ providedIn: 'root' })
export class ThreeSceneService {
  scene!: THREE.Scene;
  emojiScene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  outlineEffect: any = null;
  gltfLoader: any = null;
  mainTreeGroup: THREE.Group | null = null;
  backgroundTrees: THREE.Group[] = [];
  snowflakes: THREE.Mesh[] = [];
  fireworks: THREE.Group[] = [];
  registrationEffect: THREE.Mesh | null = null;
  private starField: THREE.Object3D | null = null;
  private starTexture: THREE.Texture | null = null;
  lastFireworkTime = 0;
  fireworkInterval = 4000;
  lastTime = 0;

  async loadGLTFLoader(): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      GLTFLoaderClass = GLTFLoader;
      this.gltfLoader = new GLTFLoaderClass();
    } catch (error) {
      console.error('GLTFLoader 로드 실패:', error);
      this.gltfLoader = null;
    }
  }

  async loadOutlineEffect(): Promise<void> {
    try {
      const { OutlineEffect } = await import('three/examples/jsm/effects/OutlineEffect.js');
      OutlineEffectClass = OutlineEffect;
    } catch (error) {
      console.error('OutlineEffect 로드 실패:', error);
      OutlineEffectClass = null;
    }
  }

  init(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.emojiScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x05001C, 1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;

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
  }

  updateEnvironment(currentTime: number): void {
    const time = currentTime * 0.001;

    this.snowflakes.forEach(snowflake => {
      snowflake.position.y -= snowflake.userData['velocity'];
      snowflake.position.x += snowflake.userData['drift'];

      if (snowflake.position.y < -6) {
        snowflake.position.y = 15 + Math.random() * 5;
        snowflake.position.x = (Math.random() - 0.5) * 30;
        snowflake.position.z = (Math.random() - 0.5) * 30;
      }
    });

    this.checkFireworkLaunch(currentTime);
    this.updateFireworks(currentTime - (this.lastTime || currentTime));
    this.lastTime = currentTime;
  }

  render(): void {
    if (!this.renderer || !this.camera) {
      return;
    }

    if (this.outlineEffect) {
      this.outlineEffect.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.renderer.autoClear = false;
    this.renderer.render(this.emojiScene, this.camera);
    this.renderer.autoClear = true;
  }

  onWindowResize(): void {
    if (!this.camera || !this.renderer) {
      return;
    }
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateCameraPosition(cameraRadius: number, cameraAngleX: number, cameraAngleY: number): void {
    if (!this.camera) {
      return;
    }
    const centerX = 0;
    const centerY = 3;
    const centerZ = 0;

    const x = centerX + cameraRadius * Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
    const y = centerY + cameraRadius * Math.cos(cameraAngleX);
    const z = centerZ + cameraRadius * Math.sin(cameraAngleX) * Math.sin(cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(centerX, centerY, centerZ);
  }

  createRegistrationEffect(x: number, y: number, z: number): void {
    const starGeometry = new THREE.ConeGeometry(0.3, 1, 5);
    const starMaterial = new THREE.MeshLambertMaterial({
      color: 0xFFEB3B,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });

    this.registrationEffect = new THREE.Mesh(starGeometry, starMaterial);
    this.registrationEffect.position.set(x, y + 2, z);
    this.registrationEffect.userData['startTime'] = Date.now();

    for (let i = 0; i < 10; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFDFEFE,
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

      const startTime = Date.now();
      const animateParticle = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > 2000) {
          this.scene.remove(particle);
          return;
        }

        particle.position.y += 0.01;
        (particle.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - elapsed / 2000);
        requestAnimationFrame(animateParticle);
      };
      animateParticle();
    }

    this.scene.add(this.registrationEffect);
  }

  updateRegistrationEffect(currentTime: number): void {
    if (!this.registrationEffect) {
      return;
    }

    const effectTime = (currentTime - this.registrationEffect.userData['startTime']) / 1000;
    if (effectTime > 3) {
      this.scene.remove(this.registrationEffect);
      this.registrationEffect = null;
      return;
    }

    this.registrationEffect.rotation.z += 0.05;
    const scale = 1 + Math.sin(effectTime * 3) * 0.3;
    this.registrationEffect.scale.set(scale, scale, scale);
  }

  createEmojiMesh(emoji: string, x: number, y: number, z: number, isAttachedToTree: boolean = false, isCurrentUser: boolean = false): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 512;

    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "EmojiOne Color"';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.format = THREE.RGBAFormat;
    texture.needsUpdate = true;

    const size = isAttachedToTree ? 1.2 : 2.0;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    // 현재 사용자의 이모지에 빨간 외곽선 추가
    if (isCurrentUser) {
      mesh.userData['outlineParameters'] = {
        thickness: 0.008,
        color: [1, 0, 0],
        alpha: 0.9,
        visible: true
      };
    }

    return mesh;
  }

  createTypographyMesh(typographyEmoji: string, x: number, y: number, z: number, isCurrentUser: boolean = false): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(1, -1);
    context.translate(0, -canvas.height);
    context.font = 'bold 48px monospace';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(typographyEmoji, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.format = THREE.RGBAFormat;
    texture.flipY = false;
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(3.2, 0.8);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    // 현재 사용자의 타이포그래피 이모지에 빨간 외곽선 추가
    if (isCurrentUser) {
      mesh.userData['outlineParameters'] = {
        thickness: 0.008,
        color: [1, 0, 0],
        alpha: 0.9,
        visible: true
      };
    }

    return mesh;
  }

  worldToScreen(position: THREE.Vector3): { x: number; y: number } {
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

  getGroundHeight(x: number, z: number): number {
    const rayOrigin = new THREE.Vector3(x, 10, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);

    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, rayDirection);

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

    const distanceFromCenter = Math.sqrt(x * x + z * z);
    const height = Math.sin(distanceFromCenter * 0.1) * 2 +
                   Math.sin(x * 0.05) * Math.sin(z * 0.05) * 1.5;
    return height - 5;
  }

  generateRandomFieldPosition(): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -4.8;
    return { x, y, z };
  }

  generateRandomTreePosition(): { height: number; angle: number } {
    // 더 균등한 분포를 위해 다양한 높이와 각도 생성
    const randomValue = Math.random();
    // 전체 트리 높이에 걸쳐 균등하게 분포
    const height = 1 + randomValue * 9; // 1-10 높이 범위
    const angle = Math.random() * Math.PI * 2;
    return { height, angle };
  }

  attachEmojiToTreeSurface(angle: number, targetHeight: number): { x: number; y: number; z: number } {
    // 트리 메시에 직접 레이캐스팅하여 정확한 표면 위치 찾기
    const rayDistance = 15; // 더 멀리서 시작
    const rayOrigin = new THREE.Vector3(
      Math.cos(angle) * rayDistance,
      targetHeight - 5, // 트리 높이 조정
      Math.sin(angle) * rayDistance
    );

    const rayDirection = new THREE.Vector3(
      -Math.cos(angle),
      0,
      -Math.sin(angle)
    ).normalize();

    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, rayDirection);

    let intersects: THREE.Intersection[] = [];
    if (this.mainTreeGroup) {
      intersects = raycaster.intersectObject(this.mainTreeGroup, true);
    }

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const offsetDistance = 1.5;
      const position = intersection.point.clone();

      let normal: THREE.Vector3;
      if (intersection.face && intersection.face.normal) {
        normal = intersection.face.normal.clone();
        const matrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
        normal.applyMatrix3(matrix).normalize();
      } else {
        normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      }

      position.add(normal.multiplyScalar(offsetDistance));

      return {
        x: position.x,
        y: position.y,
        z: position.z
      };
    } else {
      // 레이캐스팅 실패 시 다른 각도로 재시도
      const retryAngle = angle + Math.PI * 0.5; // 90도 회전해서 재시도
      const retryOrigin = new THREE.Vector3(
        Math.cos(retryAngle) * rayDistance,
        targetHeight - 5,
        Math.sin(retryAngle) * rayDistance
      );
      const retryDirection = new THREE.Vector3(
        -Math.cos(retryAngle),
        0,
        -Math.sin(retryAngle)
      ).normalize();
      
      raycaster.set(retryOrigin, retryDirection);
      const retryIntersects = this.mainTreeGroup ? raycaster.intersectObject(this.mainTreeGroup, true) : [];
      
      if (retryIntersects.length > 0) {
        const intersection = retryIntersects[0];
        const position = intersection.point.clone();
        const normal = intersection.face?.normal ? 
          intersection.face.normal.clone().normalize() :
          new THREE.Vector3(Math.cos(retryAngle), 0, Math.sin(retryAngle));
        
        position.add(normal.multiplyScalar(1.0));
        return { x: position.x, y: position.y, z: position.z };
      }
      
      // 최종 폴백: 트리 주변 원형 배치
      const fallbackRadius = 3.5 - (targetHeight / 12) * 2; // 높이에 따라 반지름 조정
      return {
        x: Math.cos(angle) * fallbackRadius,
        y: targetHeight - 5,
        z: Math.sin(angle) * fallbackRadius
      };
    }
  }

  getTreeAttachPosition(height: number, angle: number): { x: number; y: number; z: number } {
    const minRadius = 1.2; // 최소 반지름 증가
    const maxRadius = 3.5; // 최대 반지름 증가
    const maxHeight = 12;

    const normalizedHeight = Math.max(0, Math.min(1, height / maxHeight));
    // 더 완만한 곡선으로 트리 모양 만들기
    const radiusMultiplier = Math.pow(1 - normalizedHeight, 0.7);
    const radius = minRadius + (maxRadius - minRadius) * radiusMultiplier;

    // 각도에 약간의 랜덤 변화 추가하여 중심축 집중 방지
    const angleVariation = (Math.random() - 0.5) * 0.3;
    const finalAngle = angle + angleVariation;

    return {
      x: Math.cos(finalAngle) * radius,
      y: height - 5,
      z: Math.sin(finalAngle) * radius
    };
  }

  getBackgroundTreePosition(index: number): { x: number; y: number } {
    if (index >= this.backgroundTrees.length) {
      return { x: 0, y: 0 };
    }

    const tree = this.backgroundTrees[index];
    const position = new THREE.Vector3(
      tree.position.x,
      tree.position.y + 3,
      tree.position.z
    );

    return this.worldToScreen(position);
  }

  private setupLighting(): void {
    this.scene.fog = new THREE.Fog(0x05001C, 25, 60);

    const ambientLight = new THREE.AmbientLight(0x202040, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
    directionalLight.position.set(8, 20, 10);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    const centerLight = new THREE.PointLight(0xffd700, 0.8, 15);
    centerLight.position.set(0, 8, 2);
    centerLight.castShadow = false;
    this.scene.add(centerLight);

    const fillLight = new THREE.DirectionalLight(0x9bb5ff, 0.3);
    fillLight.position.set(-10, 10, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x87ceeb, 0.4, 20);
    rimLight.position.set(0, -2, 8);
    this.scene.add(rimLight);
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const vertices = groundGeometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const y = vertices.getY(i);
      const distanceFromCenter = Math.sqrt(x * x + y * y);
      const height = Math.sin(distanceFromCenter * 0.1) * 2 +
                     Math.sin(x * 0.05) * Math.sin(y * 0.05) * 1.5;

      vertices.setZ(i, height - 5);
    }
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshToonMaterial({
      color: 0xFFFFFF,
      transparent: false
    });

    groundMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.95, 0.98],
      alpha: 0.7,
      visible: true
    };

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    this.createSkyDome();
    this.createSnowballs();
    this.createSnowman();
    this.createCuteObjects();
  }

  private createSkyDome(): void {
    const skyGeometry = new THREE.SphereGeometry(80, 32, 32);
    const skyMaterial = new THREE.MeshToonMaterial({
      color: 0x3F51B5,
      side: THREE.BackSide,
      transparent: false
    });

    skyMaterial.userData['outlineParameters'] = {
      thickness: 0.002,
      color: [0.1, 0.2, 0.6],
      alpha: 0.4,
      visible: true
    };

    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    skyDome.position.set(0, 0, 0);
    this.scene.add(skyDome);

    this.createStars();
  }

  private createStars(): void {
    if (this.starField) {
      this.scene.remove(this.starField);
    }

    if (!this.starTexture) {
      this.starTexture = this.generateStarTexture();
    }

    const starGroup = new THREE.Group();
    const starCount = 80;

    for (let i = 0; i < starCount; i++) {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: this.starTexture!,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });

      const star = new THREE.Sprite(spriteMaterial);
      // 달처럼 보이는 큰 별 제거 - 모든 별을 작고 균일하게
      const scale = i === 0 ? 0.3 : 0.5; // 첫 번째 별이 큰 달이었다면 작게 만들기
      star.scale.set(scale, scale, scale);

      const x = (Math.random() - 0.5) * 80;
      const y = Math.random() * 40 + 15;
      const z = -20 - Math.random() * 20;

      star.position.set(x, y, z);
      starGroup.add(star);
    }

    this.starField = starGroup;
    this.scene.add(starGroup);
  }

  private generateStarTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;

    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 248, 225, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 248, 225, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createSnowballs(): void {
    for (let i = 0; i < 15; i++) {
      const size = Math.random() * 0.8 + 0.3;
      const snowballGeometry = new THREE.SphereGeometry(size, 12, 12);
      const snowballMaterial = new THREE.MeshToonMaterial({
        color: 0xFFFFFF,
        transparent: false
      });

      snowballMaterial.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0.9, 0.95, 0.98],
        alpha: 0.7,
        visible: true
      };

      const snowball = new THREE.Mesh(snowballGeometry, snowballMaterial);

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 8 + 6;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const height = Math.sin(Math.sqrt(x * x + z * z) * 0.1) * 2 +
                    Math.sin(x * 0.05) * Math.sin(z * 0.05) * 1.5;

      snowball.position.set(x, height - 5 + size, z);
      this.scene.add(snowball);
    }
  }

  private createSnowman(): void {
    const snowmanGroup = new THREE.Group();

    const snowMaterial = new THREE.MeshToonMaterial({
      color: 0xFFFFFF
    });
    snowMaterial.userData['outlineParameters'] = {
      thickness: 0.005,
      color: [0.9, 0.95, 0.98],
      alpha: 0.8,
      visible: true
    };

    const bodyBottomGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const bodyBottom = new THREE.Mesh(bodyBottomGeometry, snowMaterial);
    bodyBottom.position.y = -4.5;
    snowmanGroup.add(bodyBottom);

    const bodyMiddleGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const bodyMiddle = new THREE.Mesh(bodyMiddleGeometry, snowMaterial);
    bodyMiddle.position.y = -3.2;
    snowmanGroup.add(bodyMiddle);

    const headGeometry = new THREE.SphereGeometry(0.9, 16, 16);
    const head = new THREE.Mesh(headGeometry, snowMaterial);
    head.position.y = -2;
    snowmanGroup.add(head);

    const noseGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF9800 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -2, 0.6);
    nose.rotation.x = Math.PI / 2;
    snowmanGroup.add(nose);

    const eyeGeometry = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, -2.2, 0.55);
    snowmanGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, -2.2, 0.55);
    snowmanGroup.add(rightEye);

    snowmanGroup.position.set(-5, -1, 8);
    this.scene.add(snowmanGroup);
  }

  private createCuteObjects(): void {
    this.createGiftBoxes();
    this.createCuteAnimals();
    this.createChristmasDecorations();
  }

  private createGiftBoxes(): void {
    const giftPositions = [
      { x: -3, z: 2, color: 0xFFCDD2 },
      { x: 2, z: -1, color: 0xBBDEFB },
      { x: 4, z: 3, color: 0xC8E6C9 }
    ];

    giftPositions.forEach(pos => {
      const boxSize = Math.random() * 0.6 + 0.4;
      const giftGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
      const giftMaterial = new THREE.MeshToonMaterial({ color: pos.color });
      const giftBox = new THREE.Mesh(giftGeometry, giftMaterial);

      const ribbonGeometry = new THREE.BoxGeometry(boxSize * 1.1, boxSize * 0.1, boxSize * 0.1);
      const ribbonMaterial = new THREE.MeshToonMaterial({ color: 0xFF7043 });
      const horizontalRibbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      const verticalRibbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      verticalRibbon.rotation.y = Math.PI / 2;

      const giftGroup = new THREE.Group();
      giftGroup.add(giftBox);
      giftGroup.add(horizontalRibbon);
      giftGroup.add(verticalRibbon);

      const groundHeight = this.getGroundHeight(pos.x, pos.z);
      giftGroup.position.set(pos.x, groundHeight + boxSize / 2, pos.z);
      this.scene.add(giftGroup);
    });
  }

  private createCuteAnimals(): void {
    const rabbitGroup = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(0.6, 12, 12);
    const furMaterial = new THREE.MeshToonMaterial({ color: 0xFFF3E0 });
    furMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.9, 0.85],
      alpha: 0.7,
      visible: true
    };
    const body = new THREE.Mesh(bodyGeometry, furMaterial);
    body.position.y = -4.5;
    rabbitGroup.add(body);

    const headGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    const head = new THREE.Mesh(headGeometry, furMaterial);
    head.position.y = -3.6;
    rabbitGroup.add(head);

    const earGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    earGeometry.scale(1, 2, 0.3);
    const leftEar = new THREE.Mesh(earGeometry, furMaterial);
    leftEar.position.set(-0.2, -3.0, 0);
    rabbitGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, furMaterial);
    rightEar.position.set(0.2, -3.0, 0);
    rabbitGroup.add(rightEar);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, -3.5, 0.45);
    rabbitGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, -3.5, 0.45);
    rabbitGroup.add(rightEye);

    const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xFF69B4 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -3.65, 0.48);
    rabbitGroup.add(nose);

    const rabbitGroundHeight = this.getGroundHeight(4, -6);
    rabbitGroup.position.set(4, rabbitGroundHeight + 4.5, -6);
    this.scene.add(rabbitGroup);

    const penguinGroup = new THREE.Group();

    const penguinBodyGeometry = new THREE.SphereGeometry(0.7, 12, 12);
    penguinBodyGeometry.scale(1, 1.3, 1);
    const blackMaterial = new THREE.MeshToonMaterial({ color: 0x424242 });
    blackMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.0, 0.0, 0.0],
      alpha: 0.7,
      visible: true
    };
    const penguinBody = new THREE.Mesh(penguinBodyGeometry, blackMaterial);
    penguinBody.position.y = -4.3;
    penguinGroup.add(penguinBody);

    const bellyGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    bellyGeometry.scale(1, 1.2, 0.8);
    const whiteMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
    whiteMaterial.userData['outlineParameters'] = {
      thickness: 0.003,
      color: [0.9, 0.9, 0.9],
      alpha: 0.6,
      visible: true
    };
    const belly = new THREE.Mesh(bellyGeometry, whiteMaterial);
    belly.position.set(0, -4.2, 0.3);
    penguinGroup.add(belly);

    const beakGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const beakMaterial = new THREE.MeshBasicMaterial({ color: 0xFF9800 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, -3.4, 0.6);
    beak.rotation.x = Math.PI / 2;
    penguinGroup.add(beak);

    const penguinGroundHeight = this.getGroundHeight(-10, -4);
    penguinGroup.position.set(-10, penguinGroundHeight + 4.3, -4);
    this.scene.add(penguinGroup);
  }

  private createChristmasDecorations(): void {
    for (let i = 0; i < 5; i++) {
      const candyCaneGroup = new THREE.Group();

      const stickGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
      const stickMaterial = new THREE.MeshToonMaterial({ color: 0xF44336 });
      stickMaterial.userData['outlineParameters'] = {
        thickness: 0.003,
        color: [0.5, 0.0, 0.0],
        alpha: 0.6,
        visible: true
      };
      const stick = new THREE.Mesh(stickGeometry, stickMaterial);
      stick.position.y = -4.5;
      candyCaneGroup.add(stick);

      const curve = new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI);
      const curvedPart = new THREE.Mesh(curve, stickMaterial);
      curvedPart.position.set(0, -3.7, 0);
      curvedPart.rotation.z = Math.PI / 2;
      candyCaneGroup.add(curvedPart);

      const angle = (i / 5) * Math.PI * 2;
      const radius = 12 + Math.random() * 3;
      const candyX = Math.cos(angle) * radius;
      const candyZ = Math.sin(angle) * radius;

      const candyGroundHeight = this.getGroundHeight(candyX, candyZ);
      candyCaneGroup.position.set(candyX, candyGroundHeight + 4.5, candyZ);

      this.scene.add(candyCaneGroup);
    }

    const positions = [
      { x: -12, z: 6 },
      { x: 8, z: -10 },
      { x: -6, z: 10 }
    ];

    positions.forEach((pos) => {
      const miniTreeGroup = new THREE.Group();

      const treeGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
      const treeMaterial = new THREE.MeshToonMaterial({ color: 0x4CAF50 });
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

      const miniTreeGroundHeight = this.getGroundHeight(pos.x, pos.z);
      miniTreeGroup.position.set(pos.x, miniTreeGroundHeight + 4.7, pos.z);

      this.scene.add(miniTreeGroup);
    });
  }

  private createChristmasBackground(): void {
    this.createChristmasTree();
    this.createSnowflakes();
  }

  private createChristmasTree(): void {
    if (!this.gltfLoader) {
      this.createFallbackTree();
      return;
    }

    this.gltfLoader.load(
      'assets/christmas-tree-1202.glb',
      (gltf: any) => {
        const treeGroup = gltf.scene;

        treeGroup.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x4CAF50);
            child.material = new THREE.MeshToonMaterial({
              color: originalColor
            });

            child.material.userData['outlineParameters'] = {
              thickness: 0.002,
              color: [0, 0.3, 0],
              alpha: 0.9,
              visible: true
            };
          }
        });

        this.addTreeDecorations(treeGroup);

        treeGroup.position.set(0, -5, 0);
        treeGroup.scale.set(10, 10, 10);

        this.mainTreeGroup = treeGroup;
        this.scene.add(treeGroup);
      },
      undefined,
      () => {
        this.createFallbackTree();
      }
    );
  }

  private createFallbackTree(): void {
    const treeGroup = new THREE.Group();

    const treeLayers = [
      { radius: 1.0, height: 1.5, y: 1.5 },
      { radius: 1.8, height: 2.0, y: 0 },
      { radius: 2.5, height: 2.5, y: -1.8 }
    ];

    treeLayers.forEach((layer, layerIndex) => {
      const geometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
      let color;
      if (layerIndex === 0) {
        color = 0x4CAF50;
      } else if (layerIndex === 1) {
        color = 0x9DD3C8;
      } else {
        color = 0x66BB6A;
      }
      const material = new THREE.MeshToonMaterial({
        color
      });

      material.userData['outlineParameters'] = {
        thickness: 0.004,
        color: [0, 0.1, 0],
        alpha: 0.6,
        visible: true
      };

      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(0, layer.y, 0);
      treeGroup.add(cone);
    });

    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1.2);
    const trunkMaterial = new THREE.MeshToonMaterial({
      color: 0x8D6E63
    });

    trunkMaterial.userData['outlineParameters'] = {
      thickness: 0.005,
      color: [0.1, 0.05, 0],
      alpha: 0.6,
      visible: true
    };

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, -3.0, 0);
    treeGroup.add(trunk);

    const starGeometry = new THREE.ConeGeometry(0.3, 1, 5);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFEB3B });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 2.8, 0);
    treeGroup.add(star);

    treeGroup.position.set(0, -5, 0);
    treeGroup.scale.set(4, 4, 4);

    this.mainTreeGroup = treeGroup;
    this.scene.add(treeGroup);
  }

  private createSnowflakes(): void {
    const snowflakeGeometry = new THREE.CircleGeometry(0.05, 6);
    const snowflakeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 200; i++) {
      const snowflake = new THREE.Mesh(snowflakeGeometry, snowflakeMaterial.clone());
      snowflake.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 20 + 5,
        (Math.random() - 0.5) * 30
      );
      snowflake.userData['velocity'] = Math.random() * 0.02 + 0.01;
      snowflake.userData['drift'] = (Math.random() - 0.5) * 0.02;
      this.scene.add(snowflake);
      this.snowflakes.push(snowflake);
    }
  }

  private addTreeDecorations(treeGroup: THREE.Group): void {
    const decorationColors = [0xFFCDD2, 0xBBDEFB, 0xC8E6C9, 0xFFF9C4];
    const decorationTypes = ['sphere', 'star', 'heart'];

    const type = decorationTypes[Math.floor(Math.random() * decorationTypes.length)];
    const color = decorationColors[Math.floor(Math.random() * decorationColors.length)];
    const height = Math.random() * 10 + 1;
    const angle = Math.random() * Math.PI * 2;
    const position = this.getTreeAttachPosition(height, angle);

    let decoration: THREE.Mesh;
    if (type === 'sphere') {
      const geometry = new THREE.SphereGeometry(0.25, 12, 12);
      decoration = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color }));
    } else if (type === 'star') {
      const geometry = new THREE.DodecahedronGeometry(0.3);
      decoration = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color }));
    } else {
      const geometry = new THREE.SphereGeometry(0.2, 12, 12);
      decoration = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color }));
    }

    decoration.position.set(position.x, position.y, position.z);
    decoration.userData['outlineParameters'] = {
      thickness: 0.006,
      color: [0.1, 0.4, 0.1],
      alpha: 0.7,
      visible: true
    };
    treeGroup.add(decoration);
  }

  private createFirework(targetX: number, targetY: number, targetZ: number): void {
    // 시작 위치 (지상)
    const startX = targetX + (Math.random() - 0.5) * 2;
    const startY = 0;
    const startZ = targetZ + (Math.random() - 0.5) * 2;

    // 로켓 생성
    this.createRocket(startX, startY, startZ, targetX, targetY, targetZ);
  }

  private createRocket(startX: number, startY: number, startZ: number, targetX: number, targetY: number, targetZ: number): void {
    const rocket = new THREE.Group();

    // 로켓 메시
    const rocketGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.3, 8);
    const rocketMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const rocketMesh = new THREE.Mesh(rocketGeometry, rocketMaterial);
    rocket.add(rocketMesh);

    // 꼬리 트레일을 위한 파티클들
    const trailParticles: THREE.Mesh[] = [];
    const trailPositions: THREE.Vector3[] = [];

    for (let i = 0; i < 20; i++) {
      const trailGeometry = new THREE.SphereGeometry(0.03, 6, 6);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0.5 + Math.random() * 0.5, 0),
        transparent: true,
        opacity: 0.8
      });
      const trailParticle = new THREE.Mesh(trailGeometry, trailMaterial);
      trailParticle.visible = false;
      rocket.add(trailParticle);
      trailParticles.push(trailParticle);
      trailPositions.push(new THREE.Vector3(startX, startY, startZ));
    }

    rocket.position.set(startX, startY, startZ);
    this.scene.add(rocket);

    // 로켓 데이터 설정
    const launchTime = 1.5 + Math.random() * 0.5; // 1.5-2초 발사 시간
    (rocket as any).isRocket = true;
    (rocket as any).startTime = Date.now();
    (rocket as any).launchTime = launchTime * 1000;
    (rocket as any).startPos = new THREE.Vector3(startX, startY, startZ);
    (rocket as any).targetPos = new THREE.Vector3(targetX, targetY, targetZ);
    (rocket as any).trailParticles = trailParticles;
    (rocket as any).trailPositions = trailPositions;
    (rocket as any).trailIndex = 0;

    this.fireworks.push(rocket);
  }

  private explodeRocket(position: THREE.Vector3): void {
    // 메인 폭발 (파티클 수 감소)
    this.createExplosion(position, this.getRandomFireworkColors(), 50, 8, false);

    // 15% 확률로 연속 폭발 생성 (확률 감소)
    if (Math.random() < 0.15) {
      setTimeout(() => {
        this.createChainExplosions(position, 1 + Math.floor(Math.random() * 2));
      }, 500 + Math.random() * 500);
    }
  }

  private createChainExplosions(centerPos: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 6;

        const chainPos = new THREE.Vector3(
          centerPos.x + offsetX,
          centerPos.y + offsetY,
          centerPos.z + offsetZ
        );

        this.createExplosion(chainPos, this.getRandomFireworkColors(), 50, 6, true);
      }, i * (200 + Math.random() * 300));
    }
  }

  private createExplosion(position: THREE.Vector3, colors: THREE.Color[], particleCount: number, speed: number, isChain: boolean): void {
    const explosion = new THREE.Group();
    const particles: THREE.Mesh[] = [];
    const velocities: THREE.Vector3[] = [];
    const trails: THREE.Mesh[][] = [];

    for (let i = 0; i < particleCount; i++) {
      // 메인 파티클
      const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      // 구형 폭발 패턴
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const speedMultiplier = speed + Math.random() * 4;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speedMultiplier,
        Math.sin(phi) * Math.sin(theta) * speedMultiplier * 0.8,
        Math.cos(phi) * speedMultiplier
      );

      particle.position.copy(position);
      explosion.add(particle);
      particles.push(particle);
      velocities.push(velocity);

      // 각 파티클에 트레일 추가 (트레일 수 감소)
      const trailParticles: THREE.Mesh[] = [];
      for (let j = 0; j < 8; j++) {
        const trailGeometry = new THREE.SphereGeometry(0.04, 4, 4);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: color.clone().multiplyScalar(0.7),
          transparent: true,
          opacity: 0.6
        });
        const trailParticle = new THREE.Mesh(trailGeometry, trailMaterial);
        trailParticle.position.copy(position);
        trailParticle.visible = false;
        explosion.add(trailParticle);
        trailParticles.push(trailParticle);
      }
      trails.push(trailParticles);
    }

    (explosion as any).particles = particles;
    (explosion as any).velocities = velocities;
    (explosion as any).trails = trails;
    (explosion as any).life = isChain ? 3.0 : 4.0;
    (explosion as any).maxLife = isChain ? 3.0 : 4.0;
    (explosion as any).isExplosion = true;
    (explosion as any).trailPositions = particles.map(() => []);

    this.fireworks.push(explosion);
    this.scene.add(explosion);
  }

  private getRandomFireworkColors(): THREE.Color[] {
    const colorSets = [
      [new THREE.Color(1, 0, 0), new THREE.Color(1, 0.5, 0), new THREE.Color(1, 1, 0)], // 빨강-주황-노랑
      [new THREE.Color(0, 0, 1), new THREE.Color(0.5, 0, 1), new THREE.Color(1, 1, 1)], // 파랑-보라-흰색
      [new THREE.Color(0, 1, 0), new THREE.Color(1, 1, 0), new THREE.Color(1, 1, 1)], // 초록-노랑-흰색
      [new THREE.Color(1, 0, 1), new THREE.Color(1, 0.5, 1), new THREE.Color(1, 1, 1)], // 마젠타-분홍-흰색
      [new THREE.Color(1, 1, 0), new THREE.Color(1, 0.5, 0), new THREE.Color(1, 0, 0)], // 금색-주황-빨강
    ];
    return colorSets[Math.floor(Math.random() * colorSets.length)];
  }

  private updateFireworks(deltaTime: number): void {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const firework = this.fireworks[i];

      if ((firework as any).isRocket) {
        this.updateRocket(firework, deltaTime, i);
      } else if ((firework as any).isExplosion) {
        this.updateExplosion(firework, deltaTime, i);
      }
    }
  }

  private updateRocket(rocket: THREE.Group, deltaTime: number, index: number): void {
    const currentTime = Date.now();
    const startTime = (rocket as any).startTime;
    const launchTime = (rocket as any).launchTime;
    const elapsed = currentTime - startTime;

    if (elapsed >= launchTime) {
      // 로켓이 목표에 도달했으므로 폭발
      this.explodeRocket((rocket as any).targetPos);
      this.scene.remove(rocket);
      this.fireworks.splice(index, 1);
      return;
    }

    // 로켓 위치 업데이트 (포물선 궤도)
    const progress = elapsed / launchTime;
    const startPos = (rocket as any).startPos;
    const targetPos = (rocket as any).targetPos;

    // 베지어 곡선을 사용한 포물선 궤도
    const midPoint = new THREE.Vector3(
      (startPos.x + targetPos.x) / 2,
      targetPos.y + 3, // 더 높이 올라가도록
      (startPos.z + targetPos.z) / 2
    );

    const currentPos = new THREE.Vector3();
    currentPos.lerpVectors(startPos, midPoint, progress * 2);
    if (progress > 0.5) {
      const secondProgress = (progress - 0.5) * 2;
      currentPos.lerpVectors(midPoint, targetPos, secondProgress);
    }

    rocket.position.copy(currentPos);

    // 로켓 방향 설정
    const direction = new THREE.Vector3()
      .subVectors(targetPos, currentPos)
      .normalize();
    rocket.lookAt(rocket.position.clone().add(direction));

    // 트레일 업데이트
    const trailParticles = (rocket as any).trailParticles;
    const trailPositions = (rocket as any).trailPositions;
    let trailIndex = (rocket as any).trailIndex;

    // 새로운 트레일 파티클 추가
    if (trailIndex < trailParticles.length) {
      const trailParticle = trailParticles[trailIndex];
      trailParticle.position.copy(currentPos);
      trailParticle.visible = true;
      (rocket as any).trailIndex = trailIndex + 1;
    }

    // 기존 트레일 파티클들 페이드아웃
    for (let j = 0; j < trailIndex; j++) {
      const particle = trailParticles[j];
      const age = (trailIndex - j) / trailParticles.length;
      (particle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - age);
    }
  }

  private updateExplosion(explosion: THREE.Group, deltaTime: number, index: number): void {
    const particles = (explosion as any).particles;
    const velocities = (explosion as any).velocities;
    const trails = (explosion as any).trails;
    const trailPositions = (explosion as any).trailPositions;
    let life = (explosion as any).life;
    const maxLife = (explosion as any).maxLife;

    life -= deltaTime * 0.001;
    (explosion as any).life = life;

    if (life <= 0) {
      this.scene.remove(explosion);
      this.fireworks.splice(index, 1);
      return;
    }

    for (let j = 0; j < particles.length; j++) {
      const particle = particles[j];
      const velocity = velocities[j];
      const trailParticles = trails[j];

      // 파티클 위치 업데이트
      particle.position.add(velocity.clone().multiplyScalar(deltaTime * 0.001));

      // 중력과 공기저항 적용
      velocity.y -= 15 * deltaTime * 0.001;
      velocity.multiplyScalar(0.985);

      // 파티클 투명도 업데이트
      const opacity = Math.pow(life / maxLife, 0.5);
      (particle.material as THREE.MeshBasicMaterial).opacity = opacity;

      // 트레일 업데이트
      trailPositions[j].push(particle.position.clone());

      // 트레일 길이 제한 (더 짧게)
      if (trailPositions[j].length > 8) {
        trailPositions[j].shift();
      }

      // 트레일 파티클들 위치 및 투명도 업데이트
      for (let k = 0; k < Math.min(trailPositions[j].length, trailParticles.length); k++) {
        const trailParticle = trailParticles[k];
        const trailPos = trailPositions[j][trailPositions[j].length - 1 - k];

        if (trailPos && k < trailPositions[j].length) {
          trailParticle.position.copy(trailPos);
          trailParticle.visible = true;

          const trailOpacity = opacity * (1 - k / trailParticles.length) * 0.7;
          (trailParticle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, trailOpacity);
        }
      }

      // 파티클 크기 변화
      const scale = 0.5 + opacity * 0.5;
      particle.scale.setScalar(scale);
    }
  }

  private checkFireworkLaunch(currentTime: number): void {
    if (currentTime - this.lastFireworkTime > this.fireworkInterval) {
      this.lastFireworkTime = currentTime;

      // 하나의 폭죽만 발사 (더 높게)
      const x = (Math.random() - 0.5) * 25;
      const y = Math.random() * 8 + 15; // 15-23 높이로 변경
      const z = -12 - Math.random() * 8;

      this.createFirework(x, y, z);

      // 발사 간격을 더 길게 (8-16초)
      this.fireworkInterval = 8000 + Math.random() * 8000;
    }
  }
}
