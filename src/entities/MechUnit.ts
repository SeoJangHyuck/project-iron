import Phaser from 'phaser';
import { IsometricGrid } from '../systems/IsometricGrid';
import type { MechBuild } from '../systems/MechBuilder';
import { MovementType } from '../data/parts';
import { UNIT_COLORS } from '../config/gameConfig';

/**
 * 파츠 기반 메카 유닛 클래스
 */
export class MechUnit extends Phaser.GameObjects.Sprite {
  // 파츠 빌드 정보
  private readonly build: MechBuild;

  // 스탯 (빌드에서 계산된 값)
  private hp: number;
  private readonly maxHp: number;
  private readonly attack: number;
  private readonly speed: number;
  private readonly attackCooldownMs: number;
  private readonly range: number;
  private readonly defenseBonus: number;

  // 특수 능력
  private readonly isFlying: boolean;
  private readonly hasShield: boolean;
  private readonly isPiercing: boolean;
  private readonly isAoe: boolean;
  private readonly isHealer: boolean;

  // 쉴드 시스템
  private shield: number = 0;
  private readonly maxShield: number;

  // 그리드 위치
  private gridX = 0;
  private gridY = 0;

  // 이동 방향 (1: 아래로/적 기지 방향, -1: 위로)
  private direction = 1;

  // HP 바
  private hpBar: Phaser.GameObjects.Graphics;

  // 전투 쿨다운
  private attackCooldown = 0;

  // 전투 상태
  private inCombat = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, build: MechBuild) {
    super(scene, x, y, texture);

    this.build = build;

    // 빌드 스탯으로 초기화
    const { stats } = build;
    this.maxHp = stats.hp;
    this.hp = this.maxHp;
    this.attack = stats.attack;
    this.speed = stats.speed;
    this.attackCooldownMs = stats.attackCooldown;
    this.range = stats.range;
    this.defenseBonus = stats.defenseBonus;

    // 특수 능력
    this.isFlying = stats.movementType === MovementType.FLIGHT;
    this.hasShield = stats.hasShield;
    this.isPiercing = stats.isPiercing;
    this.isAoe = stats.isAoe;
    this.isHealer = stats.isHealer;

    // 쉴드 프레임인 경우 쉴드 초기화 (HP의 50%)
    this.maxShield = this.hasShield ? Math.floor(this.maxHp * 0.5) : 0;
    this.shield = this.maxShield;

    // 씬에 추가
    scene.add.existing(this);

    // HP 바 생성
    this.hpBar = scene.add.graphics();
    this.updateHpBar();

    // 깊이 설정
    this.setDepth(50);

    // 무기 타입별 색상 적용
    this.applyUnitColor();
  }

  /**
   * 무기 타입에 따른 유닛 색상 적용
   */
  private applyUnitColor(): void {
    const armId = this.build.arms.id;
    let baseColor: number;

    switch (armId) {
      case 'machinegun':
        baseColor = UNIT_COLORS.MACHINEGUN;
        break;
      case 'shotgun':
        baseColor = UNIT_COLORS.SHOTGUN;
        break;
      case 'cannon':
        baseColor = UNIT_COLORS.CANNON;
        break;
      case 'missile':
        baseColor = UNIT_COLORS.MISSILE;
        break;
      case 'laser':
        baseColor = UNIT_COLORS.LASER;
        break;
      case 'repairArm':
        baseColor = UNIT_COLORS.REPAIR;
        break;
      default:
        baseColor = 0xffffff; // 기본 색상
    }

    // 비행 유닛은 색상을 더 밝게 조정
    if (this.isFlying) {
      baseColor = this.brightenColor(baseColor, UNIT_COLORS.FLIGHT_BRIGHTNESS);
    }

    this.setTint(baseColor);
  }

  /**
   * 색상 밝기 조정
   */
  private brightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
    const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
    const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
    return (r << 16) | (g << 8) | b;
  }

  /**
   * 빌드 정보 반환
   */
  getBuild(): MechBuild {
    return this.build;
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
   * 사거리 반환
   */
  getRange(): number {
    return this.range;
  }

  /**
   * 관통 공격인지 확인
   */
  hasPiercing(): boolean {
    return this.isPiercing;
  }

  /**
   * 범위 공격인지 확인
   */
  hasAoe(): boolean {
    return this.isAoe;
  }

  /**
   * 수리 유닛인지 확인
   */
  canHeal(): boolean {
    return this.isHealer;
  }

  /**
   * 비행 유닛인지 확인
   */
  canFly(): boolean {
    return this.isFlying;
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
    const moveAmount = this.speed * deltaSeconds;

    this.gridY += this.direction * moveAmount;

    // 화면 위치 업데이트
    const isoPos = grid.cartesianToIsometric(this.gridX, this.gridY);
    this.x = offsetX + isoPos.x;
    // 비행 유닛은 약간 더 위에 표시
    const flyOffset = this.isFlying ? 8 : 0;
    this.y = offsetY + isoPos.y - 16 - flyOffset;

    // 깊이 업데이트
    this.setDepth(50 + this.gridY);

    // HP 바 위치 업데이트
    this.updateHpBar();
  }

  /**
   * 공격 가능 여부
   */
  canAttack(): boolean {
    return this.attackCooldown <= 0 && !this.isHealer;
  }

  /**
   * 공격 수행 후 쿨다운 시작
   */
  performAttack(): void {
    this.attackCooldown = this.attackCooldownMs;
  }

  /**
   * 데미지 받기 (방어력 보너스 및 쉴드 적용)
   */
  takeDamage(rawDamage: number): void {
    // 방어력 보너스 적용
    const damage = Math.floor(rawDamage * (1 - this.defenseBonus));

    // 쉴드가 있으면 먼저 쉴드에서 차감
    if (this.shield > 0) {
      if (this.shield >= damage) {
        this.shield -= damage;
      } else {
        const remaining = damage - this.shield;
        this.shield = 0;
        this.hp -= remaining;
      }
    } else {
      this.hp -= damage;
    }

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
   * HP 바 업데이트 (쉴드 포함)
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

    // 쉴드 바 (HP 바 위에 추가)
    if (this.maxShield > 0) {
      const shieldPercent = Math.max(0, this.shield / this.maxShield);
      const shieldBarY = barY - 3;
      this.hpBar.fillStyle(0x333333);
      this.hpBar.fillRect(barX, shieldBarY, barWidth, 2);
      this.hpBar.fillStyle(0x00ffff); // 시안 색상
      this.hpBar.fillRect(barX, shieldBarY, barWidth * shieldPercent, 2);
    }

    this.hpBar.setDepth(this.depth + 1);
  }

  /**
   * 제거
   */
  override destroy(fromScene?: boolean): void {
    this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
