import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../config/gameConfig';
import {
  LEG_PARTS,
  BODY_PARTS,
  ARM_PARTS,
  SpeedGrade,
  MovementType,
  WeaponType,
} from '../data/parts';
import type { LegPart, BodyPart, ArmPart } from '../data/parts';
import { buildMech, validateMechConfig, DEFAULT_MECH_CONFIG } from '../systems/MechBuilder';
import type { MechConfig, MechBuild } from '../systems/MechBuilder';

// 유닛 슬롯 데이터
type UnitSlot = {
  config: MechConfig;
  customName: string | null;
  build: MechBuild | null;
};

/**
 * 유닛 편성 씬
 */
export class UnitSetupScene extends Phaser.Scene {
  // 현재 선택된 슬롯 인덱스
  private selectedSlotIndex = 0;

  // 6개 유닛 슬롯
  private unitSlots: UnitSlot[] = [];

  // 현재 편집 중인 파츠 선택
  private currentLegsId = 'walker';
  private currentBodyId = 'standardFrame';
  private currentArmsId = 'machinegun';

  // 현재 탭 (0: 다리, 1: 몸통, 2: 팔)
  private currentTab = 0;

  // UI 요소들
  private slotButtons: Phaser.GameObjects.Container[] = [];
  private partButtons: Phaser.GameObjects.Container[] = [];
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private statsText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private unitNameText!: Phaser.GameObjects.Text;
  private previewGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'UnitSetupScene' });
  }

  create(): void {
    // 슬롯 초기화 (6개, 기본 조합으로)
    this.initializeSlots();

    // 배경 생성
    this.createBackground();

    // 헤더 (타이틀 + 버튼)
    this.createHeader();

    // 슬롯 패널 (좌측)
    this.createSlotPanel();

    // 파츠 선택 패널 (우측 상단)
    this.createPartsPanel();

    // 미리보기 패널 (하단)
    this.createPreviewPanel();

    // 초기 UI 업데이트
    this.updateUI();
  }

  /**
   * 슬롯 초기화
   */
  private initializeSlots(): void {
    this.unitSlots = [];
    for (let i = 0; i < 6; i++) {
      const config = { ...DEFAULT_MECH_CONFIG };
      const build = buildMech(config);
      this.unitSlots.push({
        config,
        customName: null,
        build,
      });
    }
  }

  /**
   * 배경 생성
   */
  private createBackground(): void {
    const graphics = this.add.graphics();

    // 어두운 배경
    graphics.fillStyle(0x0d0d1a, 1);
    graphics.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // 장식용 그리드
    graphics.lineStyle(1, 0x1a1a2e, 0.5);
    for (let x = 0; x < GAME_CONFIG.WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, GAME_CONFIG.HEIGHT);
    }
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 40) {
      graphics.lineBetween(0, y, GAME_CONFIG.WIDTH, y);
    }
  }

  /**
   * 헤더 생성
   */
  private createHeader(): void {
    // 배경
    const headerBg = this.add.rectangle(GAME_CONFIG.WIDTH / 2, 30, GAME_CONFIG.WIDTH, 60, 0x16213e);
    headerBg.setDepth(10);

    // 타이틀
    const title = this.add.text(GAME_CONFIG.WIDTH / 2, 30, '유닛 편성', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(11);

    // 뒤로 버튼
    this.createButton(80, 30, '< 뒤로', () => {
      this.scene.start('MainMenuScene');
    }, 100, 35);

    // 출격 버튼
    this.createButton(GAME_CONFIG.WIDTH - 80, 30, '출격 >', () => {
      this.startGame();
    }, 100, 35, COLORS.UI_ACCENT);
  }

  /**
   * 슬롯 패널 생성 (좌측)
   */
  private createSlotPanel(): void {
    const panelX = 20;
    const panelY = 80;
    const panelWidth = 200;
    const panelHeight = 350;

    // 패널 배경
    const bg = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(2, 0x3d3d5c);

    // 패널 타이틀
    this.add.text(panelX + panelWidth / 2, panelY + 15, '유닛 슬롯', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // 슬롯 버튼들 (2x3 그리드)
    this.slotButtons = [];
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = panelX + 55 + col * 95;
      const y = panelY + 70 + row * 90;

      const container = this.createSlotButton(x, y, i);
      this.slotButtons.push(container);
    }
  }

  /**
   * 슬롯 버튼 생성
   */
  private createSlotButton(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 배경
    const bg = this.add.rectangle(0, 0, 85, 80, 0x2d2d4a);
    bg.setStrokeStyle(2, 0x4a4a6a);
    bg.setInteractive({ useHandCursor: true });

    // 슬롯 번호
    const numText = this.add.text(0, -25, `${index + 1}`, {
      fontSize: '14px',
      color: '#888888',
    });
    numText.setOrigin(0.5);

    // 유닛 이름 (짧게)
    const nameText = this.add.text(0, 5, '', {
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 80 },
    });
    nameText.setOrigin(0.5);
    nameText.setName('nameText');

    // 비용 표시
    const costText = this.add.text(0, 28, '', {
      fontSize: '10px',
      color: '#ffd700',
    });
    costText.setOrigin(0.5);
    costText.setName('costText');

    container.add([bg, numText, nameText, costText]);

    // 클릭 이벤트
    bg.on('pointerdown', () => {
      this.selectSlot(index);
    });

    bg.on('pointerover', () => {
      if (this.selectedSlotIndex !== index) {
        bg.setFillStyle(0x3d3d5c);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedSlotIndex !== index) {
        bg.setFillStyle(0x2d2d4a);
      }
    });

    return container;
  }

  /**
   * 파츠 선택 패널 생성 (우측 상단)
   */
  private createPartsPanel(): void {
    const panelX = 240;
    const panelY = 80;
    const panelWidth = GAME_CONFIG.WIDTH - 260;
    const panelHeight = 280;

    // 패널 배경
    const bg = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(2, 0x3d3d5c);

    // 탭 버튼들
    this.createTabButtons(panelX + 20, panelY + 20);

    // 파츠 목록 영역
    this.createPartsGrid(panelX + 20, panelY + 70);
  }

  /**
   * 탭 버튼 생성
   */
  private createTabButtons(startX: number, startY: number): void {
    const tabs = ['다리', '몸통', '팔/무기'];
    this.tabButtons = [];

    tabs.forEach((tabName, index) => {
      const x = startX + index * 120 + 50;
      const container = this.add.container(x, startY);

      const bg = this.add.rectangle(0, 0, 110, 35, index === 0 ? COLORS.UI_ACCENT : 0x2d2d4a);
      bg.setStrokeStyle(1, 0x4a4a6a);
      bg.setInteractive({ useHandCursor: true });

      const text = this.add.text(0, 0, tabName, {
        fontSize: '14px',
        color: '#ffffff',
      });
      text.setOrigin(0.5);

      container.add([bg, text]);
      this.tabButtons.push(container);

      bg.on('pointerdown', () => {
        this.selectTab(index);
      });
    });
  }

  /**
   * 파츠 그리드 생성
   */
  private createPartsGrid(startX: number, startY: number): void {
    // 이 메서드는 updatePartsGrid에서 동적으로 업데이트됨
    this.partButtons = [];
    this.updatePartsGrid(startX, startY);
  }

  /**
   * 파츠 그리드 업데이트
   */
  private updatePartsGrid(startX: number, startY: number): void {
    // 기존 버튼 제거
    this.partButtons.forEach((btn) => btn.destroy());
    this.partButtons = [];

    let parts: (LegPart | BodyPart | ArmPart)[] = [];
    let currentId = '';

    if (this.currentTab === 0) {
      parts = Object.values(LEG_PARTS);
      currentId = this.currentLegsId;
    } else if (this.currentTab === 1) {
      parts = Object.values(BODY_PARTS);
      currentId = this.currentBodyId;
    } else {
      parts = Object.values(ARM_PARTS);
      currentId = this.currentArmsId;
    }

    parts.forEach((part, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * 170 + 80;
      const y = startY + row * 85 + 40;

      const isSelected = part.id === currentId;
      const container = this.createPartButton(x, y, part, isSelected);
      this.partButtons.push(container);
    });
  }

  /**
   * 파츠 버튼 생성
   */
  private createPartButton(
    x: number,
    y: number,
    part: LegPart | BodyPart | ArmPart,
    isSelected: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bgColor = isSelected ? COLORS.UI_ACCENT : 0x2d2d4a;
    const bg = this.add.rectangle(0, 0, 155, 70, bgColor);
    bg.setStrokeStyle(2, isSelected ? 0xffffff : 0x4a4a6a);
    bg.setInteractive({ useHandCursor: true });

    // 파츠 이름
    const nameText = this.add.text(0, -18, part.nameKo, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);

    // 파츠 정보
    let infoStr = '';
    if ('capacity' in part) {
      // LegPart
      const leg = part as LegPart;
      const speedKo = leg.speed === SpeedGrade.FAST ? '빠름' : leg.speed === SpeedGrade.NORMAL ? '보통' : '느림';
      const typeKo = leg.movementType === MovementType.FLIGHT ? '비행' : '지상';
      infoStr = `하중: ${leg.capacity} | ${speedKo} | ${typeKo}`;
    } else if ('hp' in part) {
      // BodyPart
      const body = part as BodyPart;
      const weaponKo = body.weaponType === WeaponType.ALL ? '모든타입' : 
                       body.weaponType === WeaponType.LIGHT ? '경무장' : '중무장';
      infoStr = `HP: ${body.hp} | 무게: ${body.weight} | ${weaponKo}`;
    } else {
      // ArmPart
      const arm = part as ArmPart;
      const speedKo = arm.attackSpeed === SpeedGrade.FAST ? '빠름' : arm.attackSpeed === SpeedGrade.NORMAL ? '보통' : '느림';
      infoStr = `공격: ${arm.attack} | 무게: ${arm.weight} | ${speedKo}`;
    }

    const infoText = this.add.text(0, 5, infoStr, {
      fontSize: '10px',
      color: '#aaaaaa',
    });
    infoText.setOrigin(0.5);

    // 비용
    const costText = this.add.text(0, 22, `${part.cost} 광물`, {
      fontSize: '10px',
      color: '#ffd700',
    });
    costText.setOrigin(0.5);

    container.add([bg, nameText, infoText, costText]);

    // 클릭 이벤트
    bg.on('pointerdown', () => {
      this.selectPart(part.id);
    });

    return container;
  }

  /**
   * 미리보기 패널 생성 (하단)
   */
  private createPreviewPanel(): void {
    const panelX = 20;
    const panelY = 450;
    const panelWidth = GAME_CONFIG.WIDTH - 40;
    const panelHeight = 250;

    // 패널 배경
    const bg = this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a2e, 0.9);
    bg.setStrokeStyle(2, 0x3d3d5c);

    // 유닛 이름 (클릭하여 수정 가능)
    this.unitNameText = this.add.text(panelX + 120, panelY + 30, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.unitNameText.setOrigin(0.5);
    this.unitNameText.setInteractive({ useHandCursor: true });
    this.unitNameText.on('pointerdown', () => {
      this.editUnitName();
    });

    // 이름 수정 힌트
    this.add.text(panelX + 120, panelY + 55, '(클릭하여 이름 수정)', {
      fontSize: '10px',
      color: '#666666',
    }).setOrigin(0.5);

    // 미리보기 그래픽
    this.previewGraphics = this.add.graphics();
    this.updatePreviewGraphic(panelX + 120, panelY + 130);

    // 스탯 정보
    this.statsText = this.add.text(panelX + 280, panelY + 30, '', {
      fontSize: '14px',
      color: '#cccccc',
      lineSpacing: 8,
    });

    // 에러 메시지
    this.errorText = this.add.text(panelX + panelWidth / 2, panelY + panelHeight - 30, '', {
      fontSize: '14px',
      color: '#ff4444',
    });
    this.errorText.setOrigin(0.5);
  }

  /**
   * 미리보기 그래픽 업데이트
   */
  private updatePreviewGraphic(x: number, y: number): void {
    this.previewGraphics.clear();

    const slot = this.unitSlots[this.selectedSlotIndex];
    if (!slot.build) {
      // 유효하지 않은 조합
      this.previewGraphics.fillStyle(0x444444, 1);
      this.previewGraphics.fillCircle(x, y, 40);
      this.previewGraphics.lineStyle(3, 0xff4444);
      this.previewGraphics.strokeCircle(x, y, 40);
      return;
    }

    const isFlying = slot.build.stats.movementType === MovementType.FLIGHT;

    // 다리 (하단)
    this.previewGraphics.fillStyle(isFlying ? 0x4a90d9 : 0x6a6a8a, 1);
    if (isFlying) {
      // 비행 유닛: 호버 이펙트
      this.previewGraphics.fillTriangle(x - 25, y + 30, x + 25, y + 30, x, y + 50);
      this.previewGraphics.fillStyle(0x4a90d9, 0.5);
      this.previewGraphics.fillEllipse(x, y + 55, 60, 15);
    } else {
      // 지상 유닛: 다리
      this.previewGraphics.fillRect(x - 20, y + 20, 12, 30);
      this.previewGraphics.fillRect(x + 8, y + 20, 12, 30);
    }

    // 몸통 (중앙)
    const bodyColor = slot.build.body.hasShield ? 0x00cccc : COLORS.ALLY_PRIMARY;
    this.previewGraphics.fillStyle(bodyColor, 1);
    this.previewGraphics.fillRect(x - 25, y - 20, 50, 45);
    this.previewGraphics.lineStyle(2, 0xffffff, 0.5);
    this.previewGraphics.strokeRect(x - 25, y - 20, 50, 45);

    // 팔/무기 (상단 좌우)
    const armColor = slot.build.arms.isPiercing ? 0x00ff00 : 
                     slot.build.arms.isAoe ? 0xff8800 : 0x888888;
    this.previewGraphics.fillStyle(armColor, 1);
    this.previewGraphics.fillRect(x - 40, y - 10, 12, 25);
    this.previewGraphics.fillRect(x + 28, y - 10, 12, 25);

    // 머리
    this.previewGraphics.fillStyle(0xaaaaaa, 1);
    this.previewGraphics.fillCircle(x, y - 30, 12);
  }

  /**
   * 슬롯 선택
   */
  private selectSlot(index: number): void {
    this.selectedSlotIndex = index;

    // 현재 슬롯의 파츠 설정 로드
    const slot = this.unitSlots[index];
    this.currentLegsId = slot.config.legsId;
    this.currentBodyId = slot.config.bodyId;
    this.currentArmsId = slot.config.armsId;

    this.updateUI();
  }

  /**
   * 탭 선택
   */
  private selectTab(index: number): void {
    this.currentTab = index;

    // 탭 버튼 스타일 업데이트
    this.tabButtons.forEach((container, i) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(i === index ? COLORS.UI_ACCENT : 0x2d2d4a);
    });

    // 파츠 그리드 업데이트
    this.updatePartsGrid(260, 150);
  }

  /**
   * 파츠 선택
   */
  private selectPart(partId: string): void {
    if (this.currentTab === 0) {
      this.currentLegsId = partId;
    } else if (this.currentTab === 1) {
      this.currentBodyId = partId;
    } else {
      this.currentArmsId = partId;
    }

    // 현재 슬롯에 저장
    this.saveCurrentSlot();

    this.updateUI();
  }

  /**
   * 현재 슬롯 저장
   */
  private saveCurrentSlot(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    slot.config = {
      legsId: this.currentLegsId,
      bodyId: this.currentBodyId,
      armsId: this.currentArmsId,
    };
    slot.build = buildMech(slot.config);
  }

  /**
   * UI 전체 업데이트
   */
  private updateUI(): void {
    // 슬롯 버튼 업데이트
    this.slotButtons.forEach((container, index) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      const nameText = container.getByName('nameText') as Phaser.GameObjects.Text;
      const costText = container.getByName('costText') as Phaser.GameObjects.Text;

      const slot = this.unitSlots[index];
      const isSelected = index === this.selectedSlotIndex;

      bg.setFillStyle(isSelected ? COLORS.UI_ACCENT : 0x2d2d4a);
      bg.setStrokeStyle(2, isSelected ? 0xffffff : 0x4a4a6a);

      const name = this.generateUnitName(slot);
      nameText.setText(name.length > 10 ? name.substring(0, 10) + '..' : name);

      if (slot.build) {
        costText.setText(`${slot.build.stats.cost}광물`);
      } else {
        costText.setText('조합 불가');
        costText.setColor('#ff4444');
      }
    });

    // 파츠 그리드 업데이트
    this.updatePartsGrid(260, 150);

    // 미리보기 업데이트
    this.updatePreview();
  }

  /**
   * 미리보기 패널 업데이트
   */
  private updatePreview(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    const validation = validateMechConfig(slot.config);

    // 유닛 이름
    const name = this.generateUnitName(slot);
    this.unitNameText.setText(name);

    // 미리보기 그래픽
    this.updatePreviewGraphic(140, 580);

    if (!validation.isValid) {
      // 에러 표시
      this.errorText.setText(validation.errors.join('\n'));
      this.statsText.setText('조합이 유효하지 않습니다.');
      return;
    }

    this.errorText.setText('');

    // 스탯 표시
    const stats = slot.build!.stats;
    const speedKo = stats.speed >= 1.4 ? '빠름' : stats.speed >= 1.1 ? '보통' : '느림';
    const moveTypeKo = stats.movementType === MovementType.FLIGHT ? '비행' : '지상';

    const specials: string[] = [];
    if (stats.hasShield) specials.push('쉴드');
    if (stats.isPiercing) specials.push('관통');
    if (stats.isAoe) specials.push('범위공격');
    if (stats.isHealer) specials.push('수리');
    if (stats.defenseBonus > 0) specials.push(`방어+${Math.floor(stats.defenseBonus * 100)}%`);

    const statsStr = [
      `HP: ${stats.hp}`,
      `공격력: ${stats.attack}`,
      `속도: ${speedKo} (${stats.speed.toFixed(1)})`,
      `사거리: ${stats.range}px`,
      `이동: ${moveTypeKo}`,
      ``,
      `비용: ${stats.cost} 광물`,
      `생산시간: ${(stats.productionTime / 1000).toFixed(1)}초`,
      ``,
      `특수: ${specials.length > 0 ? specials.join(', ') : '없음'}`,
    ].join('\n');

    this.statsText.setText(statsStr);
  }

  /**
   * 유닛 이름 생성
   */
  private generateUnitName(slot: UnitSlot): string {
    if (slot.customName) {
      return slot.customName;
    }

    const legs = LEG_PARTS[slot.config.legsId];
    const body = BODY_PARTS[slot.config.bodyId];

    if (!legs || !body) {
      return '알 수 없음';
    }

    // 무게 등급 결정
    let weightClass = '';
    if (body.weight <= 10) {
      weightClass = '경량';
    } else if (body.weight <= 18) {
      weightClass = '표준';
    } else {
      weightClass = '중장';
    }

    return `${weightClass} ${legs.nameKo}`;
  }

  /**
   * 유닛 이름 편집
   */
  private editUnitName(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    const currentName = this.generateUnitName(slot);

    // 간단한 프롬프트 (브라우저 prompt 사용)
    const newName = prompt('유닛 이름을 입력하세요:', currentName);

    if (newName && newName.trim().length > 0) {
      slot.customName = newName.trim();
      this.updateUI();
    }
  }

  /**
   * 게임 시작
   */
  private startGame(): void {
    // 유효한 빌드만 필터링
    const validBuilds = this.unitSlots
      .filter((slot) => slot.build !== null)
      .map((slot) => ({
        build: slot.build!,
        name: this.generateUnitName(slot),
      }));

    if (validBuilds.length === 0) {
      this.errorText.setText('유효한 유닛이 하나도 없습니다!');
      return;
    }

    // 빌드 데이터를 레지스트리에 저장
    this.registry.set('unitBuilds', validBuilds);

    // 게임 시작
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }

  /**
   * 버튼 생성 헬퍼
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    width = 100,
    height = 35,
    bgColor = COLORS.UI_BACKGROUND
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(15);

    const bg = this.add.rectangle(0, 0, width, height, bgColor);
    bg.setStrokeStyle(2, 0x4a4a6a);
    bg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a4a6a);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', callback);

    return container;
  }
}

