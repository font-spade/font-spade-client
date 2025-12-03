import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { ThreeSceneService } from './three-scene.service';
import { MerryChristmasApiService } from './merry-christmas-api.service';

export interface EmojiData {
  mesh: THREE.Mesh;
  nickname: string;
  message: string;
  emoji: string;
  x: number;
  y: number;
  z?: number;
  nextMessageTime?: number;
  messageIndex?: number;
  createdAt?: number;
  removing?: boolean;
}

export interface VisibleMessage {
  id: string;
  nickname: string;
  text: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  hiding: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmojiMessageService {
  readonly emojis: EmojiData[] = [];
  readonly visibleMessages: VisibleMessage[] = [];
  messageCount = 0;

  private apiMessages: any[] = [];
  private lastMessageTime = 0;
  private messageInterval = 3000;
  private maxMessagesPerSecond = 1;
  private messagesThisSecond = 0;
  private currentSecond = 0;
  private maxVisibleMessages = 20;
  private lastEmojiUpdateTime = 0;
  private emojiUpdateInterval = 180000; // 3분 (180초)
  private isLoadingMessages = false;
  private maxEmojis = 8;
  private emojiLifetime = 600000; // 10분 (600초)

  constructor(
    private threeScene: ThreeSceneService,
    private apiService: MerryChristmasApiService
  ) {}

  private getCurrentUserNickname(): string | null {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return userInfo.nickname || null;
    } catch {
      return null;
    }
  }

  private isCurrentUserEmoji(nickname: string): boolean {
    const currentUserNickname = this.getCurrentUserNickname();
    return currentUserNickname ? currentUserNickname === nickname : false;
  }

  async loadMessages(spotId?: string): Promise<void> {
    if (this.isLoadingMessages) {
      return;
    }

    if (!this.threeScene.scene) {
      setTimeout(() => this.loadMessages(spotId), 500);
      return;
    }

    this.isLoadingMessages = true;

    if (spotId) {
      await this.loadRealMessages(spotId);
    } else {
      this.loadFallbackMessages();
    }

    this.isLoadingMessages = false;
  }

  clearAll(): void {
    this.emojis.forEach(emojiData => {
      if (emojiData.mesh.parent) {
        emojiData.mesh.parent.remove(emojiData.mesh);
      }
    });
    this.emojis.length = 0;
    this.visibleMessages.length = 0;
  }

  private scheduleLifetime(emoji: EmojiData): void {
    emoji.createdAt = Date.now();
    emoji.removing = false;
  }

  addNewMessage(nickname: string, message: string, emoji: string, placementType: 'tree' | 'field'): void {
    let x = 0;
    let y = 0;
    let z = 0;

    if (placementType === 'tree') {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 3;
      x = Math.cos(angle) * radius;
      y = Math.random() * 3 + 1;
      z = Math.sin(angle) * radius;
    } else {
      x = (Math.random() - 0.5) * 10;
      y = -4 + Math.random() * 0.5;
      z = Math.random() * 8 + 2;
    }

    this.threeScene.createRegistrationEffect(x, y, z);

    setTimeout(() => {
      const mesh = placementType === 'field'
        ? this.threeScene.createTypographyMesh(emoji, x, y, z)
        : this.threeScene.createEmojiMesh(emoji, x, y, z);

      this.threeScene.emojiScene.add(mesh);
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
      this.scheduleLifetime(this.emojis[this.emojis.length - 1]);

      this.animateEmojiEntry(mesh);
    }, 1000);
  }

  update(currentTime: number, options: { isDragging: boolean; hasSpot: boolean; isLoggedIn: boolean }): void {
    this.checkEmojiUpdate(currentTime, options);
    this.enforceEmojiLifetime(currentTime);

    const time = currentTime * 0.001;

    this.emojis.forEach((emojiData, index) => {
      if (emojiData.mesh.userData['originalY'] !== undefined) {
        if (emojiData.mesh.userData['isTypography']) {
          const moveSpeed = emojiData.mesh.userData['moveSpeed'];
          const sinePhase = emojiData.mesh.userData['sinePhase'];
          const sineAmplitude = emojiData.mesh.userData['sineAmplitude'];
          const sineFrequency = emojiData.mesh.userData['sineFrequency'];
          const previousX = emojiData.mesh.userData['previousX'];
          const previousZ = emojiData.mesh.userData['previousZ'];

          emojiData.mesh.userData['moveAngle'] += moveSpeed;
          const currentAngle = emojiData.mesh.userData['moveAngle'];

          const baseX = emojiData.x + Math.cos(currentAngle) * 2.0;
          const baseZ = (emojiData.z || 0) + Math.sin(currentAngle) * 2.0;

          const sineOffset = Math.sin(time * sineFrequency + sinePhase) * sineAmplitude;
          const perpAngle = currentAngle + Math.PI / 2;

          const newX = baseX + Math.cos(perpAngle) * sineOffset;
          const newZ = baseZ + Math.sin(perpAngle) * sineOffset;

          const deltaX = newX - previousX;
          const deltaZ = newZ - previousZ;
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaZ) > 0.001) {
            const directionAngle = Math.atan2(deltaZ, deltaX);
            emojiData.mesh.rotation.y = directionAngle;
          }

          emojiData.mesh.position.x = newX;
          emojiData.mesh.position.z = newZ;

          emojiData.mesh.userData['previousX'] = newX;
          emojiData.mesh.userData['previousZ'] = newZ;

          const groundHeight = this.threeScene.getGroundHeight(newX, newZ);
          const verticalSine = Math.sin(time * sineFrequency * 1.5 + sinePhase) * 0.3;
          const floatHeight = 0.5 + verticalSine;
          emojiData.mesh.position.y = groundHeight + floatHeight;
        } else if (emojiData.mesh.userData['nearTree']) {
          emojiData.mesh.position.y = emojiData.mesh.userData['originalY'] + Math.sin(time * 1.5 + index) * 0.2;
        }

        const cameraDirection = new THREE.Vector3();
        this.threeScene.camera.getWorldDirection(cameraDirection);
        emojiData.mesh.lookAt(
          emojiData.mesh.position.x + cameraDirection.x,
          emojiData.mesh.position.y + cameraDirection.y,
          emojiData.mesh.position.z + cameraDirection.z
        );

        if (!options.isDragging && emojiData.nextMessageTime && currentTime >= emojiData.nextMessageTime) {
          const secondNow = Math.floor(currentTime / 1000);

          if (secondNow !== this.currentSecond) {
            this.currentSecond = secondNow;
            this.messagesThisSecond = 0;
          }

          if (this.messagesThisSecond < this.maxMessagesPerSecond &&
              currentTime - this.lastMessageTime >= this.messageInterval / this.maxMessagesPerSecond &&
              this.visibleMessages.length < this.maxVisibleMessages) {

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

    this.visibleMessages.forEach(message => {
      const emojiData = this.emojis.find(e =>
        e.nickname === message.nickname && e.message === message.text
      );

      if (emojiData) {
        const messagePosition = new THREE.Vector3(
          emojiData.mesh.position.x,
          emojiData.mesh.position.y + 2.5,
          emojiData.mesh.position.z
        );

        const screenPos = this.threeScene.worldToScreen(messagePosition);

        if (isNaN(screenPos.x) || isNaN(screenPos.y)) {
          return;
        }

        if (screenPos.x < -200 || screenPos.x > window.innerWidth + 200 ||
            screenPos.y < -200 || screenPos.y > window.innerHeight + 200) {
          message.visible = false;
          return;
        }

        message.screenX = screenPos.x - 125;
        message.screenY = screenPos.y - 80;
      }
    });
  }

  private enforceEmojiLifetime(currentTime: number): void {
    this.emojis.forEach(emoji => {
      if (emoji.removing) {
        return;
      }

      const createdAt = emoji.createdAt ?? currentTime;
      if (currentTime - createdAt > this.emojiLifetime) {
        this.startEmojiRemoval(emoji);
      }
    });
  }

  private async loadRealMessages(spotId: string): Promise<void> {
    this.apiMessages = await this.apiService.fetchMessages(spotId);

    const typographyEmojis: any[] = [];
    const treeEmojis: any[] = [];

    this.apiMessages.forEach((msg, index) => {
      const actualPlacementType = msg.placementType;

      if (actualPlacementType === 'center') {
        const position = this.threeScene.generateRandomTreePosition();
        treeEmojis.push({
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          attachToTree: true,
          height: position.height,
          angle: position.angle,
          messageIndex: index
        });
      } else {
        const position = this.threeScene.generateRandomFieldPosition();
        typographyEmojis.push({
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: position.x,
          y: position.y,
          z: position.z,
          messageIndex: index
        });
      }
    });

    this.messageCount = this.apiMessages.length;
    this.clearAll();

    if (this.apiMessages.length === 0) {
      return;
    }

    this.placeEmojisFromData(typographyEmojis, treeEmojis);
  }

  private loadFallbackMessages(): void {
    const fallbackTypographyEmojis = [
      { nickname: '도현', message: '웃음 가득한 크리스마스!', emoji: '( ͡° ͜ʖ ͡°)' },
      { nickname: '민수', message: '행복한 연말 되세요', emoji: '┬─┬ ノ(  ゚- ゚ノ)' },
      { nickname: '지우', message: '따뜻한 마음으로', emoji: '(╯°□°)╯' }
    ].map(msg => ({
      ...msg,
      ...this.threeScene.generateRandomFieldPosition()
    }));

    const fallbackTreeEmojis = [
      { nickname: '김영희', message: '메리 크리스마스!', emoji: '🎄' },
      { nickname: '박철수', message: '행복한 연말 되세요!', emoji: '🎅' },
      { nickname: '이수정', message: '따뜻한 크리스마스 보내요', emoji: '⭐' },
      { nickname: '최민수', message: '새해 복 많이 받으세요!', emoji: '🎁' },
      { nickname: '정다은', message: '사랑하는 사람들과 함께하는 크리스마스', emoji: '❄️' }
    ].map(msg => {
      const position = this.threeScene.generateRandomTreePosition();
      return {
        ...msg,
        attachToTree: true,
        height: position.height,
        angle: position.angle
      };
    });

    this.messageCount = fallbackTypographyEmojis.length + fallbackTreeEmojis.length;
    this.placeEmojisFromData(fallbackTypographyEmojis, fallbackTreeEmojis);
  }

  private placeEmojisFromData(typographyEmojis: any[], treeEmojis: any[]): void {
    typographyEmojis.forEach((msg, index) => {
      setTimeout(() => {
        const groundHeight = this.threeScene.getGroundHeight(msg.x, msg.z);
        const y = groundHeight + 0.5;

        const mesh = this.threeScene.createTypographyMesh(msg.emoji, msg.x, y, msg.z);
        this.threeScene.emojiScene.add(mesh);

        mesh.userData['originalY'] = y;
        mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003;
        mesh.userData['moveAngle'] = Math.random() * Math.PI * 2;
        mesh.userData['isTypography'] = true;
        mesh.userData['sinePhase'] = Math.random() * Math.PI * 2;
        mesh.userData['sineAmplitude'] = 0.5 + Math.random() * 1.0;
        mesh.userData['sineFrequency'] = 0.8 + Math.random() * 0.4;
        mesh.userData['previousX'] = msg.x;
        mesh.userData['previousZ'] = msg.z || 0;

        this.emojis.push({
          mesh,
          nickname: msg.nickname,
          message: msg.message,
          emoji: msg.emoji,
          x: msg.x,
          y: msg.y,
          z: msg.z
        });
        this.scheduleLifetime(this.emojis[this.emojis.length - 1]);

        this.animateEmojiEntry(mesh);
      }, index * 300);
    });

    treeEmojis.forEach((msg, index) => {
      setTimeout(() => {
        const treePosition = this.threeScene.attachEmojiToTreeSurface(msg.angle, msg.height);

        const mesh = this.threeScene.createEmojiMesh(msg.emoji, treePosition.x, treePosition.y, treePosition.z);
        this.threeScene.emojiScene.add(mesh);

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
        });
        this.scheduleLifetime(this.emojis[this.emojis.length - 1]);

        this.animateEmojiEntry(mesh);
      }, (typographyEmojis.length * 300) + (index * 400));
    });
  }

  private animateEmojiEntry(mesh: THREE.Mesh): void {
    const glowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.position.copy(mesh.position);
    this.threeScene.emojiScene.add(glowSphere);

    mesh.scale.set(0.1, 0.1, 0.1);
    if (mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.opacity = 0;
    }

    const startTime = performance.now();
    const duration = 1500;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.4) {
        const glowScale = 0.1 + progress * 3.5;
        glowSphere.scale.set(glowScale, glowScale, glowScale);
        glowMaterial.opacity = 0.8 * (1 - glowProgress(progress));
      } else {
        const emojiProgress = (progress - 0.4) / 0.6;

        if (emojiProgress < 0.5) {
          glowMaterial.opacity = 0.5 * (1 - emojiProgress * 2);
          const shrinkScale = 1.6 * (1 - emojiProgress);
          glowSphere.scale.set(shrinkScale, shrinkScale, shrinkScale);
        } else if (glowSphere.parent) {
          this.threeScene.emojiScene.remove(glowSphere);
        }

        const scale = easeOutBounce(emojiProgress);
        mesh.scale.set(scale, scale, scale);

        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity = Math.min(emojiProgress * 1.5, 1);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (glowSphere.parent) {
          this.threeScene.emojiScene.remove(glowSphere);
        }
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity = 1;
        }
      }
    };

    const glowProgress = (p: number) => {
      return (p / 0.4) * 0.3;
    };

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

    animate();
  }

  private animateEmojiExit(mesh: THREE.Mesh, onComplete: () => void): void {
    const duration = 800;
    const startTime = Date.now();
    const initialScale = mesh.scale.x;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

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

  private addNextApiMessage(): void {
    if (!this.apiMessages || this.apiMessages.length === 0) {
      return;
    }

    const currentDisplayedIndices = new Set<number>();
    this.emojis.forEach(emoji => {
      if (emoji.messageIndex !== undefined) {
        currentDisplayedIndices.add(emoji.messageIndex);
      }
    });

    const availableIndices: number[] = [];
    for (let i = 0; i < this.apiMessages.length; i++) {
      if (!currentDisplayedIndices.has(i)) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      this.addRandomEmoji();
      return;
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const msg = this.apiMessages[randomIndex];

    if (msg.placementType === 'background') {
      const position = this.threeScene.generateRandomFieldPosition();
      const groundHeight = this.threeScene.getGroundHeight(position.x, position.z);
      const y = groundHeight + 0.5;
      const isCurrentUser = this.isCurrentUserEmoji(msg.nickname);
      const mesh = this.threeScene.createTypographyMesh(msg.emoji, position.x, y, position.z, isCurrentUser);
      this.threeScene.emojiScene.add(mesh);

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
      this.scheduleLifetime(this.emojis[this.emojis.length - 1]);
    } else {
      const treePosition = this.threeScene.generateRandomTreePosition();
      // 레이캐스팅을 사용하여 트리 표면에 정확히 붙이기
      const attachPosition = this.threeScene.attachEmojiToTreeSurface(treePosition.angle, treePosition.height);
      
      const isCurrentUser = this.isCurrentUserEmoji(msg.nickname);
      const mesh = this.threeScene.createEmojiMesh(msg.emoji, attachPosition.x, attachPosition.y, attachPosition.z, true, isCurrentUser);
      this.threeScene.emojiScene.add(mesh);

      mesh.userData['attachToTree'] = true;
      mesh.userData['height'] = treePosition.height;
      mesh.userData['angle'] = treePosition.angle;
      mesh.userData['actualPosition'] = attachPosition; // 실제 레이캐스팅 위치 저장
      mesh.userData['rotationSpeed'] = 0.005 + Math.random() * 0.01;

      this.emojis.push({
        mesh,
        nickname: msg.nickname,
        message: msg.message,
        emoji: msg.emoji,
        x: attachPosition.x,
        y: attachPosition.y,
        z: attachPosition.z,
        nextMessageTime: Date.now() + 3000,
        messageIndex: randomIndex
      });
    }

    this.scheduleLifetime(this.emojis[this.emojis.length - 1]);
    this.animateEmojiEntry(this.emojis[this.emojis.length - 1].mesh);
  }

  private addRandomEmoji(): void {
    const emojis = ['🎄', '🎅', '🤶', '🎁', '⭐', '❄️', '🔔', '🕯️', '🦌', '☃️', '🎊', '🎉'];
    const nicknames = ['산타', '루돌프', '눈사람', '요정', '천사', '크리스마스'];
    const messages = [
      '메리 크리스마스!',
      '새해 복 많이 받으세요!',
      '행복하세요!',
      '따뜻한 연말 되세요!',
      '멋진 선물 받으세요!'
    ];

    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const nickname = nicknames[Math.floor(Math.random() * nicknames.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const placementType = Math.random() > 0.5 ? 'tree' : 'field';
    const isCurrentUser = this.isCurrentUserEmoji(nickname);

    if (placementType === 'field') {
      const position = this.threeScene.generateRandomFieldPosition();
      const groundHeight = this.threeScene.getGroundHeight(position.x, position.z);
      const y = groundHeight + 0.5;
      const mesh = this.threeScene.createTypographyMesh(emoji, position.x, y, position.z, isCurrentUser);
      this.threeScene.emojiScene.add(mesh);

      mesh.userData['originalY'] = y;
      mesh.userData['moveSpeed'] = 0.002 + Math.random() * 0.003;
      mesh.userData['moveAngle'] = Math.random() * Math.PI * 2;
      mesh.userData['isTypography'] = true;
      mesh.userData['sinePhase'] = Math.random() * Math.PI * 2;
      mesh.userData['sineAmplitude'] = 0.5 + Math.random() * 1.0;
      mesh.userData['sineFrequency'] = 0.8 + Math.random() * 0.4;
      mesh.userData['previousX'] = position.x;
      mesh.userData['previousZ'] = position.z;

      this.emojis.push({
        mesh,
        nickname,
        message,
        emoji,
        x: position.x,
        y,
        z: position.z,
        nextMessageTime: Date.now() + Math.random() * 5000 + 3000
      });
      this.scheduleLifetime(this.emojis[this.emojis.length - 1]);
    } else {
      const treePosition = this.threeScene.generateRandomTreePosition();
      // 레이캐스팅을 사용하여 트리 표면에 정확히 붙이기
      const attachPosition = this.threeScene.attachEmojiToTreeSurface(treePosition.angle, treePosition.height);
      const mesh = this.threeScene.createEmojiMesh(emoji, attachPosition.x, attachPosition.y, attachPosition.z, true, isCurrentUser);
      this.threeScene.emojiScene.add(mesh);

      mesh.userData['attachToTree'] = true;
      mesh.userData['height'] = treePosition.height;
      mesh.userData['angle'] = treePosition.angle;
      mesh.userData['actualPosition'] = attachPosition;
      mesh.userData['rotationSpeed'] = 0.005 + Math.random() * 0.01;

      this.emojis.push({
        mesh,
        nickname,
        message,
        emoji,
        x: attachPosition.x,
        y: attachPosition.y,
        z: attachPosition.z,
        nextMessageTime: Date.now() + Math.random() * 5000 + 3000
      });
    }

    this.scheduleLifetime(this.emojis[this.emojis.length - 1]);
    this.animateEmojiEntry(this.emojis[this.emojis.length - 1].mesh);
  }

  private showRandomMessage(emojiData: EmojiData): void {
    const messageText = this.apiMessages[emojiData.messageIndex ?? -1]?.message ||
                        this.apiMessages[emojiData.messageIndex ?? -1]?.text ||
                        emojiData.message || '';

    if (!messageText || messageText.trim() === '') {
      return;
    }

    const duplicateMessage = this.visibleMessages.find(msg =>
      msg.text === messageText && msg.visible && !msg.hiding
    );
    if (duplicateMessage) {
      return;
    }

    const messagePosition = new THREE.Vector3(
      emojiData.mesh.position.x,
      emojiData.mesh.position.y + 2.5,
      emojiData.mesh.position.z
    );

    const screenPos = this.threeScene.worldToScreen(messagePosition);

    if (isNaN(screenPos.x) || isNaN(screenPos.y)) {
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    const htmlMessage: VisibleMessage = {
      id: messageId,
      nickname: emojiData.nickname,
      text: messageText,
      screenX: screenPos.x - 125,
      screenY: screenPos.y - 80,
      visible: false,
      hiding: false
    };

    this.visibleMessages.push(htmlMessage);

    setTimeout(() => {
      const msg = this.visibleMessages.find(m => m.id === messageId);
      if (msg) {
        msg.visible = true;
      }
    }, 150);

    setTimeout(() => {
      const msg = this.visibleMessages.find(m => m.id === messageId);
      if (msg) {
        msg.hiding = true;
        setTimeout(() => {
          const index = this.visibleMessages.findIndex(m => m.id === messageId);
          if (index > -1) {
            this.visibleMessages.splice(index, 1);
            this.tryShowNextMessage();
          }
        }, 500);
      }
      emojiData.nextMessageTime = Date.now() + Math.random() * 3000 + 5000;
    }, Math.random() * 2000 + 4000);
  }

  private tryShowNextMessage(): void {
    const currentVisibleCount = this.visibleMessages.filter(m => m.visible && !m.hiding).length;
    const totalMessageCount = this.apiMessages.length;
    const targetMessageCount = Math.min(totalMessageCount, this.maxVisibleMessages);

    if (currentVisibleCount >= targetMessageCount) {
      return;
    }

    const now = Date.now();

    const availableEmojis = this.emojis.filter(emoji => {
      const messageCount = this.visibleMessages.filter(msg =>
        msg.nickname === emoji.nickname && msg.visible && !msg.hiding
      ).length;
      return messageCount < 1 && (emoji.nextMessageTime ?? now) <= now;
    });

    if (availableEmojis.length > 0) {
      const currentVisibleTexts = new Set(
        this.visibleMessages
          .filter(m => m.visible && !m.hiding)
          .map(m => m.text)
      );

      const availableMessageIndex = this.apiMessages.findIndex(msg =>
        !currentVisibleTexts.has(msg.message || msg.text || '')
      );

      if (availableMessageIndex !== -1) {
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        randomEmoji.messageIndex = availableMessageIndex;
        this.showRandomMessage(randomEmoji);
      }
    }
  }

  private checkEmojiUpdate(currentTime: number, options: { isDragging: boolean; hasSpot: boolean; isLoggedIn: boolean }): void {
    if (currentTime - this.lastEmojiUpdateTime > this.emojiUpdateInterval) {
      this.lastEmojiUpdateTime = currentTime;
      // 3분 간격으로 고정
      this.emojiUpdateInterval = 180000; // 3분

      // 1개씩만 제거
      const removeCount = 1;

      if (this.emojis.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.emojis.length);
        const emojiToRemove = this.emojis[randomIndex];
        this.startEmojiRemoval(emojiToRemove);

        setTimeout(() => {
          if (!options.isLoggedIn && !options.hasSpot) {
            this.addRandomEmoji();
          } else {
            this.addNextApiMessage();
          }
        }, 1000);
      }
    }
  }

  private startEmojiRemoval(emojiData: EmojiData): void {
    if (emojiData.removing) {
      return;
    }
    emojiData.removing = true;

    this.animateEmojiExit(emojiData.mesh, () => {
      this.threeScene.emojiScene.remove(emojiData.mesh);
      const index = this.emojis.indexOf(emojiData);
      if (index > -1) {
        this.emojis.splice(index, 1);
      }
    });
  }
}
