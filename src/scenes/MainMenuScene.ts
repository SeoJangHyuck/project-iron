import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../config/gameConfig';
import { buildMech } from '../systems/MechBuilder';
import type { MechConfig, MechBuild } from '../systems/MechBuilder';

/**
 * 메인 메뉴 씬
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const centerX = GAME_CONFIG.WIDTH / 2;
    const centerY = GAME_CONFIG.HEIGHT / 2;

    // 배경 그라데이션 효과
    this.createBackground();

    // 타이틀
    const title = this.add.text(centerX, centerY - 120, 'PROJECT IRON', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#1a1a2e',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    // 서브타이틀
    const subtitle = this.add.text(centerX, centerY - 60, '녹슨 철로 거짓 신에 맞서라', {
      fontSize: '18px',
      color: '#cccccc',
    });
    subtitle.setOrigin(0.5);

    // 게임 시작 버튼 (기본 유닛으로 바로 게임)
    this.createButton(centerX, centerY + 40, '게임 시작', () => {
      // 기본 유닛 빌드 설정
      this.setupDefaultUnitBuilds();
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });

    // 유닛 편성 버튼 (편성 화면으로 이동)
    this.createButton(centerX, centerY + 100, '유닛 편성', () => {
      this.scene.start('UnitSetupScene');
    });

    // 설정 버튼 (비활성)
    this.createButton(centerX, centerY + 160, '설정', () => {
      console.log('설정 - 아직 구현되지 않음');
    }, true);

    // 버전 정보
    const version = this.add.text(GAME_CONFIG.WIDTH - 10, GAME_CONFIG.HEIGHT - 10, 'v0.1.0 - Phase 1 Prototype', {
      fontSize: '12px',
      color: '#666666',
    });
    version.setOrigin(1, 1);
  }

  /**
   * 배경 생성
   */
  private createBackground(): void {
    const graphics = this.add.graphics();
    
    // 그라데이션 배경
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y++) {
      const alpha = 1 - (y / GAME_CONFIG.HEIGHT) * 0.3;
      graphics.fillStyle(0x1a1a2e, alpha);
      graphics.fillRect(0, y, GAME_CONFIG.WIDTH, 1);
    }

    // 장식용 그리드 패턴
    graphics.lineStyle(1, 0x2d2d4a, 0.3);
    for (let x = 0; x < GAME_CONFIG.WIDTH; x += 50) {
      graphics.lineBetween(x, 0, x, GAME_CONFIG.HEIGHT);
    }
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 50) {
      graphics.lineBetween(0, y, GAME_CONFIG.WIDTH, y);
    }
  }

  /**
   * 기본 유닛 빌드 설정
   */
  private setupDefaultUnitBuilds(): void {
    const presets: { config: MechConfig; name: string }[] = [
      { config: { legsId: 'scout', bodyId: 'lightFrame', armsId: 'machinegun' }, name: '정찰기' },
      { config: { legsId: 'walker', bodyId: 'standardFrame', armsId: 'laser' }, name: '레이저워커' },
      { config: { legsId: 'fortress', bodyId: 'heavyArmor', armsId: 'cannon' }, name: '중전차' },
      { config: { legsId: 'swift', bodyId: 'lightFrame', armsId: 'machinegun' }, name: '스피더' },
      { config: { legsId: 'hawk', bodyId: 'standardFrame', armsId: 'laser' }, name: '호크아이' },
      { config: { legsId: 'valkyrie', bodyId: 'heavyArmor', armsId: 'missile' }, name: '발키리' },
      { config: { legsId: 'walker', bodyId: 'shieldFrame', armsId: 'shotgun' }, name: '가디언' },
      { config: { legsId: 'walker', bodyId: 'lightFrame', armsId: 'repairArm' }, name: '메딕' },
    ];

    const unitBuilds = presets
      .map((preset) => {
        const build = buildMech(preset.config);
        if (build) {
          return { build, name: preset.name };
        }
        return null;
      })
      .filter((item): item is { build: MechBuild; name: string } => item !== null);

    this.registry.set('unitBuilds', unitBuilds);
  }

  /**
   * 버튼 생성
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    disabled: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add.rectangle(0, 0, 200, 45, disabled ? 0x333333 : COLORS.UI_BACKGROUND);
    bg.setStrokeStyle(2, disabled ? 0x444444 : COLORS.UI_ACCENT);

    // 버튼 텍스트
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: disabled ? '#666666' : '#ffffff',
    });
    buttonText.setOrigin(0.5);

    container.add([bg, buttonText]);

    if (!disabled) {
      bg.setInteractive({ useHandCursor: true });

      bg.on('pointerover', () => {
        bg.setFillStyle(COLORS.UI_ACCENT);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(COLORS.UI_BACKGROUND);
      });

      bg.on('pointerdown', callback);
    }

    return container;
  }
}

