import Phaser from 'phaser';
import { GAME_CONFIG, COLORS, RESOURCE_CONFIG } from '../config/gameConfig';

interface Resources {
  minerals: number;
  energy: number;
}

interface WorkerCounts {
  mineralWorkers: number;
  energyWorkers: number;
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

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
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
    const barHeight = 16;
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
    this.createButton(100, panelY, '광산 일꾼\n(100 광물)', () => {
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('produceWorker', 'mineral');
    });

    this.createButton(230, panelY, '발전기 일꾼\n(100 광물)', () => {
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('produceWorker', 'energy');
    });

    // 구분선
    const divider = this.add.rectangle(340, panelY, 2, 60, 0x444444);
    divider.setDepth(1001);

    // 유닛 생산 버튼
    this.createButton(450, panelY, '전투 유닛\n(150 광물)', () => {
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('produceUnit');
    });

    // 자동 생산 토글 (미구현 표시)
    const autoText = this.add.text(600, panelY, '[자동생산: 미구현]', {
      fontSize: '12px',
      color: '#666666',
    });
    autoText.setOrigin(0, 0.5);
    autoText.setDepth(1001);
  }

  /**
   * 버튼 생성
   */
  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const buttonWidth = 110;
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
    this.currentResources = resources;
    this.mineralText.setText(`광물: ${Math.floor(resources.minerals)}`);
    this.energyText.setText(`에너지: ${Math.floor(resources.energy)}`);
  }

  /**
   * 일꾼 업데이트 처리
   */
  private onWorkerUpdate(counts: WorkerCounts): void {
    this.workerCounts = counts;
    this.workerText.setText(`일꾼: 광산 ${counts.mineralWorkers} | 발전기 ${counts.energyWorkers}`);
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
}

