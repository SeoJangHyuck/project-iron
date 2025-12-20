import Phaser from 'phaser';
import { UNIT_CONFIG } from '../config/gameConfig';
import { IsometricGrid } from '../systems/IsometricGrid';

/**
 * 아군 유닛 클래스
 */
export class Unit extends Phaser.GameObjects.Sprite {
  // 스탯
  private hp: number;
  private maxHp: number;
  private attack: number;
  private speed: number; // 그리드 유닛/초

  // 그리드 위치
  private gridX: number = 0;
  private gridY: number = 0;

  // 이동 방향 (1: 아래로, -1: 위로)
  private direction: number = 1;

  // HP 바
  private hpBar: Phaser.GameObjects.Graphics;

  // 전투 쿨다운
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS: number = 500;

  // 전투 상태
  private inCombat: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // 스탯 초기화 (설정에서 가져옴)
    this.maxHp = UNIT_CONFIG.BASE_HP;
    this.hp = this.maxHp;
    this.attack = UNIT_CONFIG.BASE_ATTACK;
    this.speed = UNIT_CONFIG.BASE_SPEED; // 그리드 유닛/초

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
   * 이동 방향 설정
   */
  setDirection(dir: number): void {
    this.direction = dir;
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
   * 프레임 업데이트 (쿨다운 감소 등)
   */
  updateCooldown(delta: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  /**
   * 앞으로 이동 (전투 중이 아닐 때만 호출)
   */
  moveForward(delta: number, grid: IsometricGrid, offsetX: number, offsetY: number): void {
    const deltaSeconds = delta / 1000;
    // speed는 그리드 유닛/초
    const moveAmount = this.speed * deltaSeconds;

    this.gridY += this.direction * moveAmount;

    // 화면 위치 업데이트
    const isoPos = grid.cartesianToIsometric(this.gridX, this.gridY);
    this.x = offsetX + isoPos.x;
    this.y = offsetY + isoPos.y - 16;

    // 깊이 업데이트
    this.setDepth(50 + this.gridY);

    // HP 바 위치 업데이트
    this.updateHpBar();
  }

  /**
   * 공격 가능 여부
   */
  canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  /**
   * 공격 수행 후 쿨다운 시작
   */
  performAttack(): void {
    this.attackCooldown = this.ATTACK_COOLDOWN_MS;
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
    const hpColor = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffff00 : 0xff0000;
    this.hpBar.fillStyle(hpColor);
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
