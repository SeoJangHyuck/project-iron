import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../config/gameConfig';
import { LEG_PARTS, BODY_PARTS, ARM_PARTS, MovementType } from '../data/parts';
import type { LegPart, BodyPart, ArmPart } from '../data/parts';
import {
  buildMech,
  validateMechConfig,
  checkPartCompatibility,
  getCurrentConstraints,
  PartTabType,
} from '../systems/MechBuilder';
import type { MechConfig, MechBuild } from '../systems/MechBuilder';

type UnitSlot = {
  config: MechConfig;
  customName: string | null;
  build: MechBuild | null;
};

// 레이아웃 상수 (카드 덱빌더 스타일)
const LAYOUT = {
  // 상단 유닛 덱 영역
  DECK_Y: 70,
  DECK_HEIGHT: 90,

  // 하단 2분할
  CONTENT_Y: 170,

  // 좌측 파츠 카드 영역
  CARDS_AREA_X: 20,
  CARDS_AREA_WIDTH: 820,

  // 우측 프리뷰 영역
  PREVIEW_AREA_X: 860,
  PREVIEW_AREA_WIDTH: 400,

  // 카드 크기
  UNIT_CARD_WIDTH: 140,
  UNIT_CARD_HEIGHT: 70,
  PART_CARD_WIDTH: 125,
  PART_CARD_HEIGHT: 80,
};

/**
 * 유닛 편성 씬 (카드 덱빌더 스타일)
 */
export class UnitSetupScene extends Phaser.Scene {
  private selectedSlotIndex = 0;
  private unitSlots: UnitSlot[] = [];

  private currentLegsId = 'walker';
  private currentBodyId = 'standardFrame';
  private currentArmsId = 'machinegun';

  // UI 요소들
  private slotCards: Phaser.GameObjects.Container[] = [];
  private legsCards: Phaser.GameObjects.Container[] = [];
  private bodyCards: Phaser.GameObjects.Container[] = [];
  private armsCards: Phaser.GameObjects.Container[] = [];

  private statsText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private unitNameText!: Phaser.GameObjects.Text;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private constraintInfoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UnitSetupScene' });
  }

  create(): void {
    this.initializeSlots();
    this.createBackground();
    this.createHeader();

    // 카드 덱빌더 레이아웃
    this.createUnitDeck(); // 상단 유닛 카드 덱
    this.createPartsCards(); // 좌측 파츠 카드 영역
    this.createPreviewPanel(); // 우측 프리뷰 영역

    this.updateUI();
  }

  private initializeSlots(): void {
    // 다양한 기본 조합 프리셋
    const presets: { config: MechConfig; name: string }[] = [
      // 1. 경량 정찰기 - 빠른 이동, 저렴
      { config: { legsId: 'scout', bodyId: 'lightFrame', armsId: 'machinegun' }, name: '정찰기' },
      // 2. 표준 레이저 - 밸런스 + 관통
      {
        config: { legsId: 'walker', bodyId: 'standardFrame', armsId: 'laser' },
        name: '레이저워커',
      },
      // 3. 중장 캐논 - 탱커 + 고화력
      { config: { legsId: 'fortress', bodyId: 'heavyArmor', armsId: 'cannon' }, name: '중전차' },
      // 4. 경량 비행기 - 빠른 비행
      { config: { legsId: 'swift', bodyId: 'lightFrame', armsId: 'machinegun' }, name: '스피더' },
      // 5. 비행 레이저 - 비행 + 관통
      { config: { legsId: 'hawk', bodyId: 'standardFrame', armsId: 'laser' }, name: '호크아이' },
      // 6. 중장 비행 미사일 - 범위공격
      { config: { legsId: 'valkyrie', bodyId: 'heavyArmor', armsId: 'missile' }, name: '발키리' },
      // 7. 쉴드 샷건 - 근접 방어형
      { config: { legsId: 'walker', bodyId: 'shieldFrame', armsId: 'shotgun' }, name: '가디언' },
      // 8. 수리 유닛 - 지원
      { config: { legsId: 'walker', bodyId: 'lightFrame', armsId: 'repairArm' }, name: '메딕' },
    ];

    this.unitSlots = presets.map((preset) => ({
      config: preset.config,
      customName: preset.name,
      build: buildMech(preset.config),
    }));
  }

  private createBackground(): void {
    const graphics = this.add.graphics();

    // 어두운 그라데이션 배경
    graphics.fillStyle(0x0a0a14, 1);
    graphics.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // 미세한 패턴
    graphics.lineStyle(1, 0x151525, 0.3);
    for (let x = 0; x < GAME_CONFIG.WIDTH; x += 30) {
      graphics.lineBetween(x, 0, x, GAME_CONFIG.HEIGHT);
    }
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 30) {
      graphics.lineBetween(0, y, GAME_CONFIG.WIDTH, y);
    }
  }

  private createHeader(): void {
    const headerBg = this.add.rectangle(GAME_CONFIG.WIDTH / 2, 30, GAME_CONFIG.WIDTH, 60, 0x12121f);
    headerBg.setDepth(10);

    const title = this.add.text(GAME_CONFIG.WIDTH / 2, 30, '⚙ 유닛 편성', {
      fontSize: '26px',
      color: '#88ccff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(11);

    this.createButton(
      80,
      30,
      '◀ 뒤로',
      () => {
        this.scene.start('MainMenuScene');
      },
      100,
      35
    );

    this.createButton(
      GAME_CONFIG.WIDTH - 80,
      30,
      '출격 ▶',
      () => {
        this.startGame();
      },
      100,
      35,
      0x2266aa
    );
  }

  /**
   * 상단 유닛 카드 덱
   */
  private createUnitDeck(): void {
    const { DECK_Y, DECK_HEIGHT, UNIT_CARD_WIDTH } = LAYOUT;

    // 덱 배경
    const deckBg = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      DECK_Y + DECK_HEIGHT / 2,
      GAME_CONFIG.WIDTH - 40,
      DECK_HEIGHT,
      0x16162a,
      0.95
    );
    deckBg.setStrokeStyle(2, 0x2a2a4a);

    // 덱 라벨
    this.add.text(30, DECK_Y + 8, '유닛 덱', {
      fontSize: '12px',
      color: '#6688aa',
    });

    // 8개 유닛 카드
    this.slotCards = [];
    const startX = 40;
    const gap = 10;

    for (let i = 0; i < 8; i++) {
      const x = startX + i * (UNIT_CARD_WIDTH + gap) + UNIT_CARD_WIDTH / 2;
      const y = DECK_Y + DECK_HEIGHT / 2 + 8;
      const card = this.createUnitCard(x, y, i);
      this.slotCards.push(card);
    }
  }

  /**
   * 유닛 카드 생성
   */
  private createUnitCard(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT } = LAYOUT;

    // 카드 배경 (둥근 모서리 효과를 위한 그래픽)
    const bg = this.add.rectangle(0, 0, UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT, 0x1e1e3a);
    bg.setStrokeStyle(2, 0x3a3a5a);
    bg.setInteractive({ useHandCursor: true });

    // 슬롯 번호 뱃지
    const badge = this.add.rectangle(
      -UNIT_CARD_WIDTH / 2 + 15,
      -UNIT_CARD_HEIGHT / 2 + 12,
      22,
      18,
      0x4466aa
    );
    const numText = this.add.text(
      -UNIT_CARD_WIDTH / 2 + 15,
      -UNIT_CARD_HEIGHT / 2 + 12,
      `${index + 1}`,
      {
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
      }
    );
    numText.setOrigin(0.5);

    // 유닛 이름
    const nameText = this.add.text(5, -8, '', {
      fontSize: '11px',
      color: '#ffffff',
    });
    nameText.setOrigin(0.5);
    nameText.setName('nameText');

    // 비용
    const costText = this.add.text(5, 12, '', {
      fontSize: '10px',
      color: '#ffcc44',
    });
    costText.setOrigin(0.5);
    costText.setName('costText');

    container.add([bg, badge, numText, nameText, costText]);

    bg.on('pointerdown', () => {
      this.selectSlot(index);
    });

    bg.on('pointerover', () => {
      if (this.selectedSlotIndex !== index) {
        bg.setFillStyle(0x2a2a4a);
        container.setScale(1.02);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedSlotIndex !== index) {
        bg.setFillStyle(0x1e1e3a);
      }
      container.setScale(1);
    });

    return container;
  }

  /**
   * 좌측 파츠 카드 영역
   */
  private createPartsCards(): void {
    const { CARDS_AREA_X, CARDS_AREA_WIDTH, CONTENT_Y } = LAYOUT;
    const areaHeight = GAME_CONFIG.HEIGHT - CONTENT_Y - 20;

    // 파츠 영역 배경
    const cardsBg = this.add.rectangle(
      CARDS_AREA_X + CARDS_AREA_WIDTH / 2,
      CONTENT_Y + areaHeight / 2,
      CARDS_AREA_WIDTH,
      areaHeight,
      0x12121f,
      0.9
    );
    cardsBg.setStrokeStyle(2, 0x2a2a4a);

    // 제약 조건 표시
    this.constraintInfoText = this.add.text(
      CARDS_AREA_X + CARDS_AREA_WIDTH - 15,
      CONTENT_Y + 18,
      '',
      {
        fontSize: '11px',
        color: '#66aaff',
        align: 'right',
      }
    );
    this.constraintInfoText.setOrigin(1, 0.5);

    // 3개 파츠 카테고리
    const rowHeight = (areaHeight - 40) / 3;

    this.createPartCardRow(
      '🦿 다리',
      CONTENT_Y + 10,
      rowHeight,
      Object.values(LEG_PARTS),
      PartTabType.LEGS,
      this.legsCards
    );
    this.createPartCardRow(
      '🛡 몸통',
      CONTENT_Y + 10 + rowHeight,
      rowHeight,
      Object.values(BODY_PARTS),
      PartTabType.BODY,
      this.bodyCards
    );
    this.createPartCardRow(
      '🔫 팔/무기',
      CONTENT_Y + 10 + rowHeight * 2,
      rowHeight,
      Object.values(ARM_PARTS),
      PartTabType.ARMS,
      this.armsCards
    );
  }

  /**
   * 파츠 카드 행 생성
   */
  private createPartCardRow(
    label: string,
    startY: number,
    rowHeight: number,
    parts: (LegPart | BodyPart | ArmPart)[],
    tabType: PartTabType,
    cardArray: Phaser.GameObjects.Container[]
  ): void {
    const { CARDS_AREA_X, PART_CARD_WIDTH, PART_CARD_HEIGHT } = LAYOUT;

    // 카테고리 라벨
    this.add.text(CARDS_AREA_X + 15, startY + 15, label, {
      fontSize: '14px',
      color: '#aaccee',
      fontStyle: 'bold',
    });

    // 구분선
    const line = this.add.rectangle(
      CARDS_AREA_X + LAYOUT.CARDS_AREA_WIDTH / 2,
      startY + rowHeight - 5,
      LAYOUT.CARDS_AREA_WIDTH - 30,
      1,
      0x2a2a4a
    );
    line.setAlpha(0.5);

    // 파츠 카드들
    const cardStartX = CARDS_AREA_X + 20;
    const cardStartY = startY + 45;
    const gap = 10;

    parts.forEach((part, index) => {
      const x = cardStartX + index * (PART_CARD_WIDTH + gap) + PART_CARD_WIDTH / 2;
      const y = cardStartY + PART_CARD_HEIGHT / 2;

      const card = this.createPartCard(x, y, part, tabType);
      cardArray.push(card);
    });
  }

  /**
   * 파츠 카드 생성
   */
  private createPartCard(
    x: number,
    y: number,
    part: LegPart | BodyPart | ArmPart,
    tabType: PartTabType
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { PART_CARD_WIDTH, PART_CARD_HEIGHT } = LAYOUT;

    // 카드 배경
    const bg = this.add.rectangle(0, 0, PART_CARD_WIDTH, PART_CARD_HEIGHT, 0x1a1a30);
    bg.setStrokeStyle(2, 0x3a3a5a);
    bg.setInteractive({ useHandCursor: true });
    bg.setName('bg');

    // 파츠 이름
    const nameText = this.add.text(0, -22, part.nameKo, {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    nameText.setName('nameText');

    // 파츠 정보
    let infoStr = '';
    if ('capacity' in part) {
      const leg = part as LegPart;
      const typeKo = leg.movementType === MovementType.FLIGHT ? '비행' : '지상';
      infoStr = `하중:${leg.capacity} | ${typeKo}`;
    } else if ('hp' in part) {
      const body = part as BodyPart;
      infoStr = `HP:${body.hp} | 무게:${body.weight}`;
    } else {
      const arm = part as ArmPart;
      infoStr = `공격:${arm.attack} | 무게:${arm.weight}`;
    }

    const infoText = this.add.text(0, 0, infoStr, {
      fontSize: '10px',
      color: '#8899aa',
    });
    infoText.setOrigin(0.5);
    infoText.setName('infoText');

    // 비용
    const costText = this.add.text(0, 22, `💰 ${part.cost}`, {
      fontSize: '10px',
      color: '#ffcc44',
    });
    costText.setOrigin(0.5);
    costText.setName('costText');

    container.add([bg, nameText, infoText, costText]);
    container.setData('partId', part.id);
    container.setData('tabType', tabType);

    // 클릭
    bg.on('pointerdown', () => {
      this.selectPart(part.id, tabType);
    });

    // 호버
    bg.on('pointerover', () => {
      const currentBg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
      if (currentBg.strokeColor !== 0x44aaff) {
        currentBg.setFillStyle(0x252545);
        container.setScale(1.03);
      }
    });

    bg.on('pointerout', () => {
      const currentBg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
      if (currentBg.strokeColor !== 0x44aaff) {
        currentBg.setFillStyle(0x1a1a30);
      }
      container.setScale(1);
    });

    return container;
  }

  /**
   * 우측 프리뷰 패널
   */
  private createPreviewPanel(): void {
    const { PREVIEW_AREA_X, PREVIEW_AREA_WIDTH, CONTENT_Y } = LAYOUT;
    const panelHeight = GAME_CONFIG.HEIGHT - CONTENT_Y - 20;

    // 프리뷰 배경
    const previewBg = this.add.rectangle(
      PREVIEW_AREA_X + PREVIEW_AREA_WIDTH / 2,
      CONTENT_Y + panelHeight / 2,
      PREVIEW_AREA_WIDTH,
      panelHeight,
      0x16162a,
      0.95
    );
    previewBg.setStrokeStyle(2, 0x3a3a6a);

    // 타이틀
    this.add.text(PREVIEW_AREA_X + 20, CONTENT_Y + 15, '현재 유닛', {
      fontSize: '14px',
      color: '#88aacc',
      fontStyle: 'bold',
    });

    // 유닛 이름 (클릭 편집)
    this.unitNameText = this.add.text(PREVIEW_AREA_X + PREVIEW_AREA_WIDTH / 2, CONTENT_Y + 55, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.unitNameText.setOrigin(0.5);
    this.unitNameText.setInteractive({ useHandCursor: true });
    this.unitNameText.on('pointerdown', () => {
      this.editUnitName();
    });

    this.add
      .text(PREVIEW_AREA_X + PREVIEW_AREA_WIDTH / 2, CONTENT_Y + 80, '(클릭하여 이름 수정)', {
        fontSize: '9px',
        color: '#556677',
      })
      .setOrigin(0.5);

    // 미리보기 그래픽
    this.previewGraphics = this.add.graphics();

    // 스탯 정보
    this.statsText = this.add.text(PREVIEW_AREA_X + 30, CONTENT_Y + 280, '', {
      fontSize: '13px',
      color: '#aabbcc',
      lineSpacing: 8,
    });

    // 에러 메시지
    this.errorText = this.add.text(
      PREVIEW_AREA_X + PREVIEW_AREA_WIDTH / 2,
      CONTENT_Y + panelHeight - 30,
      '',
      {
        fontSize: '11px',
        color: '#ff6666',
      }
    );
    this.errorText.setOrigin(0.5);
  }

  private selectSlot(index: number): void {
    this.selectedSlotIndex = index;

    const slot = this.unitSlots[index];
    this.currentLegsId = slot.config.legsId;
    this.currentBodyId = slot.config.bodyId;
    this.currentArmsId = slot.config.armsId;

    this.updateUI();
  }

  private selectPart(partId: string, tabType: PartTabType): void {
    if (tabType === PartTabType.LEGS) {
      this.currentLegsId = partId;
    } else if (tabType === PartTabType.BODY) {
      this.currentBodyId = partId;
    } else {
      this.currentArmsId = partId;
    }

    this.saveCurrentSlot();
    this.updateUI();
  }

  private saveCurrentSlot(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    slot.config = {
      legsId: this.currentLegsId,
      bodyId: this.currentBodyId,
      armsId: this.currentArmsId,
    };
    slot.build = buildMech(slot.config);
  }

  private updateUI(): void {
    this.updateSlotCards();
    this.updatePartsCards();
    this.updateConstraintInfo();
    this.updatePreview();
  }

  private updateSlotCards(): void {
    this.slotCards.forEach((container, index) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      const nameText = container.getByName('nameText') as Phaser.GameObjects.Text;
      const costText = container.getByName('costText') as Phaser.GameObjects.Text;

      const slot = this.unitSlots[index];
      const isSelected = index === this.selectedSlotIndex;

      // 선택된 카드 스타일
      if (isSelected) {
        bg.setFillStyle(0x2244aa);
        bg.setStrokeStyle(3, 0x44aaff);
        container.setScale(1.05);
      } else {
        bg.setFillStyle(0x1e1e3a);
        bg.setStrokeStyle(2, 0x3a3a5a);
        container.setScale(1);
      }

      const name = this.generateUnitName(slot);
      nameText.setText(name.length > 10 ? name.substring(0, 10) + '..' : name);

      if (slot.build) {
        costText.setText(`💰 ${slot.build.stats.cost}`);
        costText.setColor('#ffcc44');
      } else {
        costText.setText('❌ 불가');
        costText.setColor('#ff6666');
      }
    });
  }

  private updatePartsCards(): void {
    const currentSlot = this.unitSlots[this.selectedSlotIndex];
    const currentConfig = currentSlot.config;

    this.updatePartCardRow(this.legsCards, this.currentLegsId, PartTabType.LEGS, currentConfig);
    this.updatePartCardRow(this.bodyCards, this.currentBodyId, PartTabType.BODY, currentConfig);
    this.updatePartCardRow(this.armsCards, this.currentArmsId, PartTabType.ARMS, currentConfig);
  }

  private updatePartCardRow(
    cards: Phaser.GameObjects.Container[],
    selectedId: string,
    tabType: PartTabType,
    currentConfig: MechConfig
  ): void {
    cards.forEach((container) => {
      const partId = container.getData('partId') as string;
      const isSelected = partId === selectedId;
      const compatibility = checkPartCompatibility(currentConfig, tabType, partId);

      const bg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
      const nameText = container.getByName('nameText') as Phaser.GameObjects.Text;
      const infoText = container.getByName('infoText') as Phaser.GameObjects.Text;
      const costText = container.getByName('costText') as Phaser.GameObjects.Text;

      if (isSelected) {
        bg.setFillStyle(0x2255aa);
        bg.setStrokeStyle(3, 0x44aaff);
        nameText.setColor('#ffffff');
        infoText.setColor('#aabbcc');
      } else if (!compatibility.isCompatible) {
        bg.setFillStyle(0x1a1a25);
        bg.setStrokeStyle(2, 0x663333);
        bg.setAlpha(0.6);
        nameText.setColor('#666677');
        infoText.setColor('#555566');
        if (compatibility.reason) {
          costText.setText(`⚠ ${compatibility.reason}`);
          costText.setColor('#ff6666');
          costText.setFontSize(9);
        }
      } else {
        bg.setFillStyle(0x1a1a30);
        bg.setStrokeStyle(2, 0x3a3a5a);
        bg.setAlpha(1);
        nameText.setColor('#ffffff');
        infoText.setColor('#8899aa');
      }

      // 비용 복원
      if (compatibility.isCompatible || isSelected) {
        let part: LegPart | BodyPart | ArmPart | undefined;
        if (tabType === PartTabType.LEGS) part = LEG_PARTS[partId];
        else if (tabType === PartTabType.BODY) part = BODY_PARTS[partId];
        else part = ARM_PARTS[partId];

        if (part) {
          costText.setText(`💰 ${part.cost}`);
          costText.setColor('#ffcc44');
          costText.setFontSize(10);
        }
      }
    });
  }

  private updateConstraintInfo(): void {
    const currentSlot = this.unitSlots[this.selectedSlotIndex];
    const constraints = getCurrentConstraints(currentSlot.config);

    if (!constraints) {
      this.constraintInfoText.setText('');
      return;
    }

    const infoText = `⚖ 하중: ${constraints.usedWeight}/${constraints.currentCapacity} | 🔧 ${constraints.bodyWeaponTypeKo}`;
    this.constraintInfoText.setText(infoText);
  }

  private updatePreview(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    const validation = validateMechConfig(slot.config);

    const name = this.generateUnitName(slot);
    this.unitNameText.setText(name);

    // 미리보기 그래픽
    const previewX = LAYOUT.PREVIEW_AREA_X + LAYOUT.PREVIEW_AREA_WIDTH / 2;
    const previewY = LAYOUT.CONTENT_Y + 180;
    this.updatePreviewGraphic(previewX, previewY);

    if (!validation.isValid) {
      this.errorText.setText(validation.errors.join('\n'));
      this.statsText.setText('조합이 유효하지 않습니다.');
      return;
    }

    this.errorText.setText('');

    const stats = slot.build!.stats;
    const speedKo = stats.speed >= 1.4 ? '빠름' : stats.speed >= 1.1 ? '보통' : '느림';
    const moveTypeKo = stats.movementType === MovementType.FLIGHT ? '비행' : '지상';

    const specials: string[] = [];
    if (stats.hasShield) specials.push('🛡쉴드');
    if (stats.isPiercing) specials.push('⚡관통');
    if (stats.isAoe) specials.push('💥범위');
    if (stats.isHealer) specials.push('💚수리');
    if (stats.defenseBonus > 0) specials.push(`🔰+${Math.floor(stats.defenseBonus * 100)}%`);

    const statsStr = [
      `❤ HP: ${stats.hp}`,
      `⚔ 공격력: ${stats.attack}`,
      `💨 속도: ${speedKo} (${stats.speed.toFixed(1)})`,
      `🎯 사거리: ${stats.range}px`,
      `📍 이동: ${moveTypeKo}`,
      ``,
      `💰 비용: ${stats.cost} 광물`,
      `⏱ 생산: ${(stats.productionTime / 1000).toFixed(1)}초`,
      ``,
      `✨ 특수: ${specials.length > 0 ? specials.join(' ') : '없음'}`,
    ].join('\n');

    this.statsText.setText(statsStr);
  }

  private updatePreviewGraphic(x: number, y: number): void {
    this.previewGraphics.clear();

    const slot = this.unitSlots[this.selectedSlotIndex];
    if (!slot.build) {
      this.previewGraphics.fillStyle(0x333344, 1);
      this.previewGraphics.fillCircle(x, y, 45);
      this.previewGraphics.lineStyle(3, 0xff4444);
      this.previewGraphics.strokeCircle(x, y, 45);
      return;
    }

    const scale = 1.2;
    const isFlying = slot.build.stats.movementType === MovementType.FLIGHT;

    // 다리
    this.previewGraphics.fillStyle(isFlying ? 0x4a90d9 : 0x6a6a8a, 1);
    if (isFlying) {
      this.previewGraphics.fillTriangle(
        x - 30 * scale,
        y + 35 * scale,
        x + 30 * scale,
        y + 35 * scale,
        x,
        y + 55 * scale
      );
      this.previewGraphics.fillStyle(0x4a90d9, 0.4);
      this.previewGraphics.fillEllipse(x, y + 60 * scale, 70 * scale, 18 * scale);
    } else {
      this.previewGraphics.fillRect(x - 24 * scale, y + 25 * scale, 14 * scale, 35 * scale);
      this.previewGraphics.fillRect(x + 10 * scale, y + 25 * scale, 14 * scale, 35 * scale);
    }

    // 몸통
    const bodyColor = slot.build.body.hasShield ? 0x00cccc : COLORS.ALLY_PRIMARY;
    this.previewGraphics.fillStyle(bodyColor, 1);
    this.previewGraphics.fillRect(x - 30 * scale, y - 20 * scale, 60 * scale, 50 * scale);
    this.previewGraphics.lineStyle(2, 0xffffff, 0.4);
    this.previewGraphics.strokeRect(x - 30 * scale, y - 20 * scale, 60 * scale, 50 * scale);

    // 팔
    const armColor = slot.build.arms.isPiercing
      ? 0x00ff88
      : slot.build.arms.isAoe
        ? 0xff8800
        : 0x888899;
    this.previewGraphics.fillStyle(armColor, 1);
    this.previewGraphics.fillRect(x - 48 * scale, y - 10 * scale, 15 * scale, 30 * scale);
    this.previewGraphics.fillRect(x + 33 * scale, y - 10 * scale, 15 * scale, 30 * scale);

    // 머리
    this.previewGraphics.fillStyle(0xaaaaaa, 1);
    this.previewGraphics.fillCircle(x, y - 35 * scale, 15 * scale);
    this.previewGraphics.fillStyle(0x44aaff, 1);
    this.previewGraphics.fillCircle(x, y - 35 * scale, 6 * scale);
  }

  private generateUnitName(slot: UnitSlot): string {
    if (slot.customName) return slot.customName;

    const legs = LEG_PARTS[slot.config.legsId];
    const body = BODY_PARTS[slot.config.bodyId];

    if (!legs || !body) return '알 수 없음';

    let weightClass = '';
    if (body.weight <= 10) weightClass = '경량';
    else if (body.weight <= 18) weightClass = '표준';
    else weightClass = '중장';

    return `${weightClass} ${legs.nameKo}`;
  }

  private editUnitName(): void {
    const slot = this.unitSlots[this.selectedSlotIndex];
    const currentName = this.generateUnitName(slot);
    const newName = prompt('유닛 이름을 입력하세요:', currentName);

    if (newName && newName.trim().length > 0) {
      slot.customName = newName.trim();
      this.updateUI();
    }
  }

  private startGame(): void {
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

    this.registry.set('unitBuilds', validBuilds);
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    width = 100,
    height = 35,
    bgColor = 0x1a1a2e
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(15);

    const bg = this.add.rectangle(0, 0, width, height, bgColor);
    bg.setStrokeStyle(2, 0x3a3a5a);
    bg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x3a3a5a);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', callback);

    return container;
  }
}
