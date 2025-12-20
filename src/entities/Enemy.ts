import Phaser from 'phaser';
import { IsometricGrid } from '../systems/IsometricGrid';
import { ENEMY_CONFIG } from '../config/gameConfig';

/**
 * 적 유닛 클래스
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  // 스탯
  private hp: number;
  private maxHp: number;
  private attack: number;
  private speed: number; // 그리드 유닛/초

  // 그리드 위치
  private gridX: number = 0;
  private gridY: number = 0;

  // HP 바
  private hpBar: Phaser.GameObjects.Graphics;

  // 전투 상태
  private inCombat: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // 스탯 초기화 (설정에서 가져옴)
    this.maxHp = ENEMY_CONFIG.BASE_HP;
    this.hp = this.maxHp;
    this.attack = ENEMY_CONFIG.BASE_ATTACK;
    this.speed = ENEMY_CONFIG.BASE_SPEED;

    // 씬에 추가
    scene.add.existing(this);

    // HP 바 생성
    this.hpBar = scene.add.graphics();
    this.updateHpBar();

    // 깊이 설정
    this.setDepth(50);
  }

  /**
   * 그리드 위치 설정
   */
  setGridPosition(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
  }

  /**
   * 그리드 Y 좌표 반환
   */
  getGridY(): number {
    return this.gridY;
  }

  /**
   * 공격력 반환
   */
  getAttack(): number {
    return this.attack;
  }

  /**
   * 전투 상태 설정
   */
  setInCombat(value: boolean): void {
    this.inCombat = value;
  }

  /**
   * 전투 중인지 확인
   */
  isInCombat(): boolean {
    return this.inCombat;
  }

  /**
   * 앞으로 이동 (아래 방향)
   */
  moveForward(delta: number, grid: IsometricGrid, offsetX: number, offsetY: number): void {
    const deltaSeconds = delta / 1000;
    // speed는 그리드 유닛/초
    const moveAmount = this.speed * deltaSeconds;

    this.gridY += moveAmount;

    // 화면 위치 업데이트
    const isoPos = grid.cartesianToIsometric(this.gridX, this.gridY);
    this.x = offsetX + isoPos.x;
    this.y = offsetY + isoPos.y;

    // 깊이 업데이트
    this.setDepth(50 + this.gridY);

    // HP 바 위치 업데이트
    this.updateHpBar();
  }

  /**
   * 데미지 받기
   */
  takeDamage(damage: number): void {
    this.hp -= damage;

    // 피격 효과
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
    });

    this.updateHpBar();
  }

  /**
   * 죽었는지 확인
   */
  isDead(): boolean {
    return this.hp <= 0;
  }

  /**
   * HP 바 업데이트
   */
  private updateHpBar(): void {
    this.hpBar.clear();

    const barWidth = 30;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - 20;

    // 배경
    this.hpBar.fillStyle(0x333333);
    this.hpBar.fillRect(barX, barY, barWidth, barHeight);

    // HP
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    this.hpBar.fillStyle(0xff4444);
    this.hpBar.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    this.hpBar.setDepth(this.depth + 1);
  }

  /**
   * 제거
   */
  destroy(fromScene?: boolean): void {
    this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
