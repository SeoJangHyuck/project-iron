import Phaser from 'phaser';
import { GAME_CONFIG, COLORS, RESOURCE_CONFIG } from '../config/gameConfig';
import type { MechBuild } from '../systems/MechBuilder';

interface Resources {
  minerals: number;
  energy: number;
}

interface WorkerCounts {
  mineralWorkers: number;
  energyWorkers: number;
}

interface UnitBuildData {
  build: MechBuild;
  name: string;
}

/**
 * UI 씬 - 게임 UI 오버레이
 */
export class UIScene extends Phaser.Scene {
  // 자원 텍스트
  private mineralText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private workerText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;

  // 기지 HP 바
  private baseHpBar!: Phaser.GameObjects.Graphics;
  private baseHpText!: Phaser.GameObjects.Text;

  // 현재 자원
  private currentResources: Resources = { minerals: 0, energy: 0 };
  private workerCounts: WorkerCounts = { mineralWorkers: 0, energyWorkers: 0 };

  // 자동생산 토글
  private autoProduceEnabled: boolean = false;
  private autoProduceButton!: Phaser.GameObjects.Rectangle;
  private autoProduceText!: Phaser.GameObjects.Text;

  // 유닛 빌드 데이터
  private unitBuilds: UnitBuildData[] = [];
  private unitButtons: Phaser.GameObjects.Container[] = [];
  private _selectedSlotIndex = 0;

  // 생산 프로그레스 바
  private productionBars: Map<number, Phaser.GameObjects.Graphics> = new Map();
  private productionTexts: Map<number, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // 유닛 빌드 데이터 가져오기
    const registryBuilds = this.registry.get('unitBuilds') as UnitBuildData[] | undefined;
    this.unitBuilds = registryBuilds ?? [];

    // 상단 리소스 바
    this.createResourceBar();

    // 기지 HP 바
    this.createBaseHpBar();

    // 하단 컨트롤 패널
    this.createControlPanel();

    // 게임 씬 이벤트 리스닝
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('resourceUpdate', this.onResourceUpdate, this);
    gameScene.events.on('workerUpdate', this.onWorkerUpdate, this);
    gameScene.events.on('waveStart', this.onWaveStart, this);
    gameScene.events.on('baseHpUpdate', this.onBaseHpUpdate, this);
    gameScene.events.on('killUpdate', this.onKillUpdate, this);

    // 생산 관련 이벤트
    gameScene.events.on('productionStart', this.onProductionStart, this);
    gameScene.events.on('productionProgress', this.onProductionProgress, this);
    gameScene.events.on('productionComplete', this.onProductionComplete, this);
  }

  /**
   * 상단 리소스 바 생성
   */
  private createResourceBar(): void {
    const barHeight = 40;

    // 배경
    const bg = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      barHeight / 2,
      GAME_CONFIG.WIDTH,
      barHeight,
      COLORS.UI_BACKGROUND,
      0.9
    );
    bg.setDepth(1000);

    // 광물
    const mineralIcon = this.add.rectangle(20, barHeight / 2, 20, 20, 0xffd700);
    mineralIcon.setDepth(1001);

    this.mineralText = this.add.text(45, barHeight / 2, `광물: ${RESOURCE_CONFIG.INITIAL_MINERALS}`, {
      fontSize: '16px',
      color: '#ffffff',
    });
    this.mineralText.setOrigin(0, 0.5);
    this.mineralText.setDepth(1001);

    // 에너지
    const energyIcon = this.add.rectangle(180, barHeight / 2, 20, 20, 0x00ffff);
    energyIcon.setDepth(1001);

    this.energyText = this.add.text(205, barHeight / 2, `에너지: ${RESOURCE_CONFIG.INITIAL_ENERGY}`, {
      fontSize: '16px',
      color: '#ffffff',
    });
    this.energyText.setOrigin(0, 0.5);
    this.energyText.setDepth(1001);

    // 일꾼 현황
    this.workerText = this.add.text(380, barHeight / 2, '일꾼: 광산 0 | 발전기 0', {
      fontSize: '14px',
      color: '#aaaaaa',
    });
    this.workerText.setOrigin(0, 0.5);
    this.workerText.setDepth(1001);

    // 웨이브 정보
    this.waveText = this.add.text(GAME_CONFIG.WIDTH - 120, barHeight / 2, '웨이브: 대기 중', {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.waveText.setOrigin(1, 0.5);
    this.waveText.setDepth(1001);

    // 처치 수
    this.killText = this.add.text(GAME_CONFIG.WIDTH - 20, barHeight / 2, '처치: 0', {
      fontSize: '14px',
      color: '#ff8888',
    });
    this.killText.setOrigin(1, 0.5);
    this.killText.setDepth(1001);
  }

  /**
   * 기지 HP 바 생성
   */
  private createBaseHpBar(): void {
    const barY = 55;
    const barWidth = 200;
    const barX = GAME_CONFIG.WIDTH / 2 - barWidth / 2;

    // 라벨
    const label = this.add.text(barX - 50, barY, '기지 HP', {
      fontSize: '12px',
      color: '#aaaaaa',
    });
    label.setOrigin(0, 0.5);
    label.setDepth(1001);

    // HP 바 그래픽
    this.baseHpBar = this.add.graphics();
    this.baseHpBar.setDepth(1001);
    this.updateBaseHpBar(100, 100);

    // HP 텍스트
    this.baseHpText = this.add.text(GAME_CONFIG.WIDTH / 2, barY, '100 / 100', {
      fontSize: '12px',
      color: '#ffffff',
    });
    this.baseHpText.setOrigin(0.5, 0.5);
    this.baseHpText.setDepth(1002);
  }

  /**
   * 기지 HP 바 업데이트
   */
  private updateBaseHpBar(current: number, max: number): void {
    const barY = 55;
    const barWidth = 200;
    const barHeight = 16;
    const barX = GAME_CONFIG.WIDTH / 2 - barWidth / 2;

    this.baseHpBar.clear();

    // 배경
    this.baseHpBar.fillStyle(0x333333);
    this.baseHpBar.fillRect(barX, barY - barHeight / 2, barWidth, barHeight);

    // HP
    const hpPercent = Math.max(0, current / max);
    const hpColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffff44 : 0xff4444;
    this.baseHpBar.fillStyle(hpColor);
    this.baseHpBar.fillRect(barX, barY - barHeight / 2, barWidth * hpPercent, barHeight);

    // 테두리
    this.baseHpBar.lineStyle(2, 0x666666);
    this.baseHpBar.strokeRect(barX, barY - barHeight / 2, barWidth, barHeight);
  }

  /**
   * 하단 컨트롤 패널 생성
   */
  private createControlPanel(): void {
    const panelHeight = 80;
    const panelY = GAME_CONFIG.HEIGHT - panelHeight / 2;

    // 배경
    const bg = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      panelY,
      GAME_CONFIG.WIDTH,
      panelHeight,
      COLORS.UI_BACKGROUND,
      0.9
    );
    bg.setDepth(1000);

    // 일꾼 생산 버튼들
    this.createButton(70, panelY, '광산 일꾼\n(100 광물)', () => {
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('produceWorker', 'mineral');
    }, 90);

    this.createButton(170, panelY, '발전기 일꾼\n(100 광물)', () => {
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('produceWorker', 'energy');
    }, 90);

    // 구분선
    const divider = this.add.rectangle(230, panelY, 2, 60, 0x444444);
    divider.setDepth(1001);

    // 유닛 슬롯 버튼들 (동적 비용 표시)
    this.createUnitSlotButtons(panelY);

    // 자동생산 토글 버튼
    this.createAutoProduceButton(GAME_CONFIG.WIDTH - 70, panelY);
  }

  /**
   * 유닛 슬롯 버튼들 생성
   */
  private createUnitSlotButtons(panelY: number): void {
    this.unitButtons = [];
    this.productionBars.clear();
    this.productionTexts.clear();

    const startX = 260;
    const buttonWidth = 72;
    const buttonHeight = 55;
    const gap = 4;

    // 최대 8개 슬롯 표시
    const maxSlots = Math.min(this.unitBuilds.length, 8);

    for (let i = 0; i < maxSlots; i++) {
      const unitData = this.unitBuilds[i];
      const x = startX + i * (buttonWidth + gap);

      const container = this.add.container(x, panelY);
      container.setDepth(1001);

      // 배경
      const bgRect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2d3436);
      bgRect.setStrokeStyle(2, i === 0 ? 0x44ff44 : COLORS.UI_ACCENT);
      bgRect.setInteractive({ useHandCursor: true });
      bgRect.setName('bg');

      // 유닛 이름 (짧게)
      const shortName = unitData.name.length > 6 ? unitData.name.substring(0, 6) + '..' : unitData.name;
      const nameText = this.add.text(0, -15, shortName, {
        fontSize: '11px',
        color: '#ffffff',
      });
      nameText.setOrigin(0.5);
      nameText.setName('nameText');

      // 비용
      const costText = this.add.text(0, 3, `${unitData.build.stats.cost}광물`, {
        fontSize: '10px',
        color: '#ffd700',
      });
      costText.setOrigin(0.5);
      costText.setName('costText');

      // 생산 프로그레스 바 (버튼 하단)
      const progressBar = this.add.graphics();
      progressBar.setDepth(1002);
      progressBar.setName('progressBar');
      this.productionBars.set(i, progressBar);

      // 생산 시간 텍스트
      const timeText = this.add.text(0, 20, '', {
        fontSize: '9px',
        color: '#88ff88',
      });
      timeText.setOrigin(0.5);
      timeText.setName('timeText');
      timeText.setVisible(false);
      this.productionTexts.set(i, timeText);

      container.add([bgRect, nameText, costText, progressBar, timeText]);
      this.unitButtons.push(container);

      // 클릭 이벤트
      const slotIndex = i;
      bgRect.on('pointerdown', () => {
        this.selectUnitSlot(slotIndex);
        const gameScene = this.scene.get('GameScene');
        gameScene.events.emit('produceUnit', slotIndex);
      });

      bgRect.on('pointerover', () => {
        const currentBg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
        if (currentBg) {
          currentBg.setFillStyle(0x4a5568);
        }
      });

      bgRect.on('pointerout', () => {
        const currentBg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
        if (currentBg) {
          currentBg.setFillStyle(0x2d3436);
        }
      });
    }

    // 빈 슬롯이 없으면 기본 버튼 생성
    if (maxSlots === 0) {
      this.createButton(350, panelY, '전투 유닛\n(150 광물)', () => {
        const gameScene = this.scene.get('GameScene');
        gameScene.events.emit('produceUnit');
      }, 100);
    }
  }

  /**
   * 유닛 슬롯 선택
   */
  private selectUnitSlot(index: number): void {
    this._selectedSlotIndex = index;

    // 버튼 스타일 업데이트
    this.unitButtons.forEach((container, i) => {
      const bgRect = container.getByName('bg') as Phaser.GameObjects.Rectangle;
      if (bgRect) {
        bgRect.setStrokeStyle(2, i === this._selectedSlotIndex ? 0x44ff44 : COLORS.UI_ACCENT);
      }
    });

    // GameScene에 선택된 슬롯 전달
    const gameScene = this.scene.get('GameScene');
    gameScene.events.emit('selectUnitSlot', this._selectedSlotIndex);
  }

  /**
   * 자동생산 토글 버튼 생성
   */
  private createAutoProduceButton(x: number, y: number): void {
    const buttonWidth = 100;
    const buttonHeight = 45;

    this.autoProduceButton = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x2d3436);
    this.autoProduceButton.setStrokeStyle(2, 0x666666);
    this.autoProduceButton.setDepth(1001);
    this.autoProduceButton.setInteractive({ useHandCursor: true });

    this.autoProduceText = this.add.text(x, y, '자동생산\nOFF', {
      fontSize: '11px',
      color: '#888888',
      align: 'center',
    });
    this.autoProduceText.setOrigin(0.5);
    this.autoProduceText.setDepth(1002);

    this.autoProduceButton.on('pointerover', () => {
      if (!this.autoProduceEnabled) {
        this.autoProduceButton.setFillStyle(0x4a5568);
      }
    });

    this.autoProduceButton.on('pointerout', () => {
      if (!this.autoProduceEnabled) {
        this.autoProduceButton.setFillStyle(0x2d3436);
      }
    });

    this.autoProduceButton.on('pointerdown', () => {
      this.toggleAutoProduce();
    });
  }

  /**
   * 자동생산 토글
   */
  private toggleAutoProduce(): void {
    this.autoProduceEnabled = !this.autoProduceEnabled;

    if (this.autoProduceEnabled) {
      this.autoProduceButton.setFillStyle(0x2d5a3d);
      this.autoProduceButton.setStrokeStyle(2, 0x44ff44);
      this.autoProduceText.setText('자동생산\nON');
      this.autoProduceText.setColor('#44ff44');
    } else {
      this.autoProduceButton.setFillStyle(0x2d3436);
      this.autoProduceButton.setStrokeStyle(2, 0x666666);
      this.autoProduceText.setText('자동생산\nOFF');
      this.autoProduceText.setColor('#888888');
    }

    // GameScene에 자동생산 상태 전달
    const gameScene = this.scene.get('GameScene');
    gameScene.events.emit('autoProduceToggle', this.autoProduceEnabled);
  }

  /**
   * 버튼 생성
   */
  private createButton(x: number, y: number, text: string, callback: () => void, width = 110): void {
    const buttonWidth = width;
    const buttonHeight = 55;

    const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x2d3436);
    bg.setStrokeStyle(2, COLORS.UI_ACCENT);
    bg.setDepth(1001);
    bg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    });
    buttonText.setOrigin(0.5);
    buttonText.setDepth(1002);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a5568);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x2d3436);
    });

    bg.on('pointerdown', callback);
  }

  /**
   * 자원 업데이트 처리
   */
  private onResourceUpdate(resources: Resources): void {
    this.currentResources = { ...resources };
    this.mineralText.setText(`광물: ${Math.floor(this.currentResources.minerals)}`);
    this.energyText.setText(`에너지: ${Math.floor(this.currentResources.energy)}`);
  }

  /**
   * 일꾼 업데이트 처리
   */
  private onWorkerUpdate(counts: WorkerCounts): void {
    this.workerCounts = { ...counts };
    this.workerText.setText(`일꾼: 광산 ${this.workerCounts.mineralWorkers} | 발전기 ${this.workerCounts.energyWorkers}`);
  }

  /**
   * 웨이브 시작 처리
   */
  private onWaveStart(waveNumber: number): void {
    this.waveText.setText(`웨이브: ${waveNumber}`);
  }

  /**
   * 기지 HP 업데이트 처리
   */
  private onBaseHpUpdate(current: number, max: number): void {
    this.updateBaseHpBar(current, max);
    this.baseHpText.setText(`${Math.max(0, Math.floor(current))} / ${max}`);
  }

  /**
   * 처치 수 업데이트
   */
  private onKillUpdate(kills: number): void {
    this.killText.setText(`처치: ${kills}`);
  }

  /**
   * 생산 시작 처리
   */
  private onProductionStart(slotIndex: number, _duration: number): void {
    const container = this.unitButtons[slotIndex];
    if (!container) return;

    // 버튼 어둡게 처리
    const bgRect = container.getByName('bg') as Phaser.GameObjects.Rectangle;
    if (bgRect) {
      bgRect.setFillStyle(0x1a1a1a);
      bgRect.setAlpha(0.7);
    }

    // 시간 텍스트 표시
    const timeText = this.productionTexts.get(slotIndex);
    if (timeText) {
      timeText.setVisible(true);
    }
  }

  /**
   * 생산 진행률 업데이트
   */
  private onProductionProgress(slotIndex: number, progress: number, remainingMs: number): void {
    const container = this.unitButtons[slotIndex];
    if (!container) return;

    // 프로그레스 바 업데이트
    const progressBar = this.productionBars.get(slotIndex);
    if (progressBar) {
      progressBar.clear();

      const barWidth = 62;
      const barHeight = 5;
      const barX = -barWidth / 2;
      const barY = 18;

      // 배경
      progressBar.fillStyle(0x333333);
      progressBar.fillRect(barX, barY, barWidth, barHeight);

      // 진행률
      progressBar.fillStyle(0x44ff44);
      progressBar.fillRect(barX, barY, barWidth * progress, barHeight);

      // 테두리
      progressBar.lineStyle(1, 0x666666);
      progressBar.strokeRect(barX, barY, barWidth, barHeight);
    }

    // 남은 시간 텍스트 업데이트
    const timeText = this.productionTexts.get(slotIndex);
    if (timeText) {
      const seconds = Math.ceil(remainingMs / 1000);
      timeText.setText(`${seconds}초`);
    }
  }

  /**
   * 생산 완료 처리
   */
  private onProductionComplete(slotIndex: number): void {
    const container = this.unitButtons[slotIndex];
    if (!container) return;

    // 버튼 복원
    const bgRect = container.getByName('bg') as Phaser.GameObjects.Rectangle;
    if (bgRect) {
      bgRect.setFillStyle(0x2d3436);
      bgRect.setAlpha(1);
    }

    // 프로그레스 바 초기화
    const progressBar = this.productionBars.get(slotIndex);
    if (progressBar) {
      progressBar.clear();
    }

    // 시간 텍스트 숨기기
    const timeText = this.productionTexts.get(slotIndex);
    if (timeText) {
      timeText.setVisible(false);
      timeText.setText('');
    }

    // 완료 피드백 (깜빡임 효과)
    this.tweens.add({
      targets: bgRect,
      alpha: { from: 1, to: 0.5 },
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (bgRect) {
          bgRect.setAlpha(1);
        }
      },
    });
  }
}

