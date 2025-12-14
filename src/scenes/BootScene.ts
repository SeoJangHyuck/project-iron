import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';

/**
 * 부트 씬 - 에셋 로딩 및 초기화
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 바 생성
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, '로딩 중...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    // 로딩 진행률 업데이트
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.ALLY_PRIMARY, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // 플레이스홀더 텍스처 생성
    this.createPlaceholderTextures();
  }

  /**
   * 플레이스홀더 텍스처 생성 (임시 에셋)
   */
  private createPlaceholderTextures(): void {
    // 아군 유닛 (파란색 사각형)
    const allyGraphics = this.make.graphics({ x: 0, y: 0 });
    allyGraphics.fillStyle(COLORS.ALLY_PRIMARY);
    allyGraphics.fillRect(0, 0, 32, 32);
    allyGraphics.lineStyle(2, COLORS.ALLY_SECONDARY);
    allyGraphics.strokeRect(0, 0, 32, 32);
    allyGraphics.generateTexture('unit_ally', 32, 32);
    allyGraphics.destroy();

    // 적 유닛 (빨간색 사각형)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(COLORS.ENEMY_PRIMARY);
    enemyGraphics.fillRect(0, 0, 32, 32);
    enemyGraphics.lineStyle(2, COLORS.ENEMY_SECONDARY);
    enemyGraphics.strokeRect(0, 0, 32, 32);
    enemyGraphics.generateTexture('unit_enemy', 32, 32);
    enemyGraphics.destroy();

    // 일꾼 (초록색 작은 사각형)
    const workerGraphics = this.make.graphics({ x: 0, y: 0 });
    workerGraphics.fillStyle(COLORS.WORKER);
    workerGraphics.fillRect(0, 0, 16, 16);
    workerGraphics.generateTexture('worker', 16, 16);
    workerGraphics.destroy();

    // 아이소메트릭 타일
    const tileGraphics = this.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(COLORS.TILE_NORMAL);
    tileGraphics.beginPath();
    tileGraphics.moveTo(16, 0);
    tileGraphics.lineTo(32, 8);
    tileGraphics.lineTo(16, 16);
    tileGraphics.lineTo(0, 8);
    tileGraphics.closePath();
    tileGraphics.fillPath();
    tileGraphics.lineStyle(1, 0x5c5c7a);
    tileGraphics.strokePath();
    tileGraphics.generateTexture('tile', 32, 16);
    tileGraphics.destroy();

    // 광산 건물 (황금색)
    const mineGraphics = this.make.graphics({ x: 0, y: 0 });
    mineGraphics.fillStyle(0xffd700);
    mineGraphics.fillRect(4, 4, 24, 24);
    mineGraphics.fillStyle(0xb8860b);
    mineGraphics.fillRect(8, 8, 16, 16);
    mineGraphics.lineStyle(2, 0x8b6914);
    mineGraphics.strokeRect(4, 4, 24, 24);
    mineGraphics.generateTexture('building_mine', 32, 32);
    mineGraphics.destroy();

    // 발전기 건물 (청록색)
    const generatorGraphics = this.make.graphics({ x: 0, y: 0 });
    generatorGraphics.fillStyle(0x00ffff);
    generatorGraphics.fillRect(4, 4, 24, 24);
    generatorGraphics.fillStyle(0x008b8b);
    generatorGraphics.fillRect(8, 8, 16, 16);
    generatorGraphics.lineStyle(2, 0x006666);
    generatorGraphics.strokeRect(4, 4, 24, 24);
    generatorGraphics.generateTexture('building_generator', 32, 32);
    generatorGraphics.destroy();
  }

  create(): void {
    // 메인 메뉴로 이동
    this.scene.start('MainMenuScene');
  }
}

