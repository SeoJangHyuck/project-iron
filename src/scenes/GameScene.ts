import Phaser from 'phaser';
import { GAME_CONFIG, COLORS, RESOURCE_CONFIG, ENEMY_CONFIG, BASE_CONFIG } from '../config/gameConfig';
import { IsometricGrid } from '../systems/IsometricGrid';
import { ResourceSystem } from '../systems/ResourceSystem';
import { Enemy } from '../entities/Enemy';
import { MechUnit } from '../entities/MechUnit';
import { buildMech, DEFAULT_MECH_CONFIG } from '../systems/MechBuilder';
import type { MechBuild } from '../systems/MechBuilder';

/**
 * 게임 씬 - 메인 게임플레이
 */
export class GameScene extends Phaser.Scene {
  // 시스템
  private grid!: IsometricGrid;
  private resourceSystem!: ResourceSystem;

  // 유닛 그룹
  private allyUnits!: Phaser.GameObjects.Group;
  private enemyUnits!: Phaser.GameObjects.Group;

  // 웨이브 관리
  private waveNumber: number = 0;
  private waveTimer!: Phaser.Time.TimerEvent;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private isFinalWave: boolean = false; // 마지막 웨이브인지
  private currentWaveEnemiesSpawned: number = 0; // 현재 웨이브에서 스폰한 적 수
  private currentWaveEnemiesToSpawn: number = 0; // 현재 웨이브에서 스폰할 적 수

  // 기지 HP
  private baseHp: number = BASE_CONFIG.MAX_HP;
  private maxBaseHp: number = BASE_CONFIG.MAX_HP;

  // 킬 카운트
  private killCount: number = 0;

  // 적 기지 HP
  private enemyBaseHp: number = BASE_CONFIG.ENEMY_MAX_HP;
  private maxEnemyBaseHp: number = BASE_CONFIG.ENEMY_MAX_HP;

  // 적 기지 UI 요소
  private enemyBaseHpBar!: Phaser.GameObjects.Graphics;
  private enemyBaseHpText!: Phaser.GameObjects.Text;

  // 기지 위치 (그리드 좌표) - GRID_HEIGHT에 맞게 동적으로 계산
  private get allyBasePos() { return { x: 7, y: GAME_CONFIG.GRID_HEIGHT - 1 }; }
  private enemySpawnPos = { x: 7, y: 0 };

  // 일꾼 시각화
  private mineBuilding!: Phaser.GameObjects.Image;
  private generatorBuilding!: Phaser.GameObjects.Image;
  private mineralWorkerSprites: Phaser.GameObjects.Image[] = [];
  private energyWorkerSprites: Phaser.GameObjects.Image[] = [];
  private mineralWorkerText!: Phaser.GameObjects.Text;
  private energyWorkerText!: Phaser.GameObjects.Text;

  // 자동생산
  private autoProduceEnabled: boolean = false;
  private autoProduceCooldown: number = 0;
  private readonly AUTO_PRODUCE_INTERVAL: number = 500; // 0.5초마다 체크

  // 유닛 빌드 목록 (편성 화면에서 전달받음)
  private unitBuilds: { build: MechBuild; name: string }[] = [];
  private currentSlotIndex = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.isGameOver = false;
    this.isVictory = false;
    this.isFinalWave = false;
    this.waveNumber = 0;
    this.baseHp = BASE_CONFIG.MAX_HP;
    this.killCount = 0;
    this.enemyBaseHp = BASE_CONFIG.ENEMY_MAX_HP;
    this.currentWaveEnemiesSpawned = 0;
    this.currentWaveEnemiesToSpawn = 0;

    // 시스템 초기화
    this.initializeSystems();

    // 편성 화면에서 유닛 빌드 받아오기
    const registryBuilds = this.registry.get('unitBuilds') as { build: MechBuild; name: string }[] | undefined;
    if (registryBuilds && registryBuilds.length > 0) {
      this.unitBuilds = registryBuilds;
    } else {
      // 기본 빌드 사용
      const defaultBuild = buildMech(DEFAULT_MECH_CONFIG);
      if (defaultBuild) {
        this.unitBuilds = [{ build: defaultBuild, name: '기본 유닛' }];
      }
    }
    this.currentSlotIndex = 0;

    // 그리드 생성
    this.createGrid();

    // 유닛 그룹 생성
    this.allyUnits = this.add.group();
    this.enemyUnits = this.add.group();

    // 기지 표시
    this.createBases();

    // 일꾼 시각화 생성
    this.createWorkerVisuals();

    // 웨이브 시작
    this.startWaveSystem();

    // 이벤트 리스너 등록
    this.setupEventListeners();

    // 초기 UI 업데이트
    this.events.emit('baseHpUpdate', this.baseHp, this.maxBaseHp);
  }

  /**
   * 시스템 초기화
   */
  private initializeSystems(): void {
    this.grid = new IsometricGrid(
      GAME_CONFIG.GRID_WIDTH,
      GAME_CONFIG.GRID_HEIGHT,
      GAME_CONFIG.TILE_WIDTH,
      GAME_CONFIG.TILE_HEIGHT
    );

    this.resourceSystem = new ResourceSystem(
      RESOURCE_CONFIG.INITIAL_MINERALS,
      RESOURCE_CONFIG.INITIAL_ENERGY
    );
  }

  /**
   * 아이소메트릭 그리드 생성
   */
  private createGrid(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
      for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
        const isoPos = this.grid.cartesianToIsometric(x, y);
        const screenX = offsetX + isoPos.x;
        const screenY = offsetY + isoPos.y;

        // 타일 생성
        const tile = this.add.image(screenX, screenY, 'tile');
        tile.setDepth(y);

        // 스폰 지역 하이라이트
        if (y === 0) {
          tile.setTint(COLORS.TILE_SPAWN);
        }
        // 기지 지역 하이라이트
        if (y === GAME_CONFIG.GRID_HEIGHT - 1) {
          tile.setTint(COLORS.TILE_BASE);
        }
      }
    }
  }

  /**
   * 기지 생성
   */
  private createBases(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    // 아군 기지
    const allyIso = this.grid.cartesianToIsometric(this.allyBasePos.x, this.allyBasePos.y);
    const allyBase = this.add.rectangle(
      offsetX + allyIso.x,
      offsetY + allyIso.y - 16,
      48,
      48,
      COLORS.ALLY_PRIMARY
    );
    allyBase.setStrokeStyle(3, COLORS.ALLY_SECONDARY);
    allyBase.setDepth(100);

    const allyText = this.add.text(
      offsetX + allyIso.x,
      offsetY + allyIso.y - 16,
      '기지',
      { fontSize: '12px', color: '#ffffff' }
    );
    allyText.setOrigin(0.5);
    allyText.setDepth(101);

    // 적 기지
    const enemyIso = this.grid.cartesianToIsometric(this.enemySpawnPos.x, this.enemySpawnPos.y);
    const enemyBase = this.add.rectangle(
      offsetX + enemyIso.x,
      offsetY + enemyIso.y - 16,
      48,
      48,
      COLORS.ENEMY_PRIMARY
    );
    enemyBase.setStrokeStyle(3, COLORS.ENEMY_SECONDARY);
    enemyBase.setDepth(100);

    const enemyText = this.add.text(
      offsetX + enemyIso.x,
      offsetY + enemyIso.y - 16,
      '적 기지',
      { fontSize: '10px', color: '#ffffff' }
    );
    enemyText.setOrigin(0.5);
    enemyText.setDepth(101);

    // 적 기지 HP 바
    this.enemyBaseHpBar = this.add.graphics();
    this.enemyBaseHpBar.setDepth(102);
    
    this.enemyBaseHpText = this.add.text(
      offsetX + enemyIso.x,
      offsetY + enemyIso.y - 45,
      `${this.enemyBaseHp} / ${this.maxEnemyBaseHp}`,
      { fontSize: '10px', color: '#ffffff' }
    );
    this.enemyBaseHpText.setOrigin(0.5);
    this.enemyBaseHpText.setDepth(103);

    this.updateEnemyBaseHpBar();
  }

  /**
   * 적 기지 HP 바 업데이트
   */
  private updateEnemyBaseHpBar(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;
    const enemyIso = this.grid.cartesianToIsometric(this.enemySpawnPos.x, this.enemySpawnPos.y);

    const barWidth = 60;
    const barHeight = 8;
    const barX = offsetX + enemyIso.x - barWidth / 2;
    const barY = offsetY + enemyIso.y - 55;

    this.enemyBaseHpBar.clear();

    // 배경
    this.enemyBaseHpBar.fillStyle(0x333333);
    this.enemyBaseHpBar.fillRect(barX, barY, barWidth, barHeight);

    // HP
    const hpPercent = Math.max(0, this.enemyBaseHp / this.maxEnemyBaseHp);
    this.enemyBaseHpBar.fillStyle(0xff4444);
    this.enemyBaseHpBar.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // 테두리
    this.enemyBaseHpBar.lineStyle(1, 0x666666);
    this.enemyBaseHpBar.strokeRect(barX, barY, barWidth, barHeight);

    // 텍스트 업데이트
    this.enemyBaseHpText.setText(`${Math.max(0, Math.floor(this.enemyBaseHp))} / ${this.maxEnemyBaseHp}`);
    this.enemyBaseHpText.setPosition(offsetX + enemyIso.x, barY - 8);
  }

  /**
   * 적 기지에 데미지
   */
  private damageEnemyBase(damage: number): void {
    this.enemyBaseHp -= damage;
    this.updateEnemyBaseHpBar();

    // 적 기지 피격 효과
    this.cameras.main.shake(80, 0.008);
  }

  /**
   * 일꾼 시각화 생성
   */
  private createWorkerVisuals(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    // 광산 위치 (기지 왼쪽)
    const mineGridPos = { x: 3, y: GAME_CONFIG.GRID_HEIGHT - 2 };
    const mineIso = this.grid.cartesianToIsometric(mineGridPos.x, mineGridPos.y);
    
    this.mineBuilding = this.add.image(
      offsetX + mineIso.x,
      offsetY + mineIso.y - 16,
      'building_mine'
    );
    this.mineBuilding.setDepth(90);

    // 광산 라벨
    const mineLabel = this.add.text(
      offsetX + mineIso.x,
      offsetY + mineIso.y - 40,
      '광산',
      { fontSize: '10px', color: '#ffd700' }
    );
    mineLabel.setOrigin(0.5);
    mineLabel.setDepth(91);

    // 광산 일꾼 수 텍스트
    this.mineralWorkerText = this.add.text(
      offsetX + mineIso.x,
      offsetY + mineIso.y + 5,
      '일꾼: 0',
      { fontSize: '9px', color: '#ffffff' }
    );
    this.mineralWorkerText.setOrigin(0.5);
    this.mineralWorkerText.setDepth(91);

    // 발전기 위치 (기지 오른쪽)
    const genGridPos = { x: 11, y: GAME_CONFIG.GRID_HEIGHT - 2 };
    const genIso = this.grid.cartesianToIsometric(genGridPos.x, genGridPos.y);
    
    this.generatorBuilding = this.add.image(
      offsetX + genIso.x,
      offsetY + genIso.y - 16,
      'building_generator'
    );
    this.generatorBuilding.setDepth(90);

    // 발전기 라벨
    const genLabel = this.add.text(
      offsetX + genIso.x,
      offsetY + genIso.y - 40,
      '발전기',
      { fontSize: '10px', color: '#00ffff' }
    );
    genLabel.setOrigin(0.5);
    genLabel.setDepth(91);

    // 발전기 일꾼 수 텍스트
    this.energyWorkerText = this.add.text(
      offsetX + genIso.x,
      offsetY + genIso.y + 5,
      '일꾼: 0',
      { fontSize: '9px', color: '#ffffff' }
    );
    this.energyWorkerText.setOrigin(0.5);
    this.energyWorkerText.setDepth(91);
  }

  /**
   * 일꾼 시각화 업데이트
   */
  private updateWorkerVisuals(): void {
    const workerCounts = this.resourceSystem.getWorkerCounts();
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    // 광산 일꾼 업데이트
    const mineGridPos = { x: 3, y: GAME_CONFIG.GRID_HEIGHT - 2 };
    const mineIso = this.grid.cartesianToIsometric(mineGridPos.x, mineGridPos.y);
    
    // 기존 스프라이트 제거
    this.mineralWorkerSprites.forEach(s => s.destroy());
    this.mineralWorkerSprites = [];

    // 새 스프라이트 생성 (최대 5개 표시)
    const displayMineWorkers = Math.min(workerCounts.mineralWorkers, 5);
    for (let i = 0; i < displayMineWorkers; i++) {
      const angle = (i / displayMineWorkers) * Math.PI * 2;
      const radius = 20;
      const sprite = this.add.image(
        offsetX + mineIso.x + Math.cos(angle) * radius,
        offsetY + mineIso.y - 10 + Math.sin(angle) * radius * 0.5,
        'worker'
      );
      sprite.setDepth(92);
      sprite.setScale(0.8);
      this.mineralWorkerSprites.push(sprite);
    }
    this.mineralWorkerText.setText(`일꾼: ${workerCounts.mineralWorkers}`);

    // 발전기 일꾼 업데이트
    const genGridPos = { x: 11, y: GAME_CONFIG.GRID_HEIGHT - 2 };
    const genIso = this.grid.cartesianToIsometric(genGridPos.x, genGridPos.y);

    // 기존 스프라이트 제거
    this.energyWorkerSprites.forEach(s => s.destroy());
    this.energyWorkerSprites = [];

    // 새 스프라이트 생성
    const displayEnergyWorkers = Math.min(workerCounts.energyWorkers, 5);
    for (let i = 0; i < displayEnergyWorkers; i++) {
      const angle = (i / displayEnergyWorkers) * Math.PI * 2;
      const radius = 20;
      const sprite = this.add.image(
        offsetX + genIso.x + Math.cos(angle) * radius,
        offsetY + genIso.y - 10 + Math.sin(angle) * radius * 0.5,
        'worker'
      );
      sprite.setDepth(92);
      sprite.setScale(0.8);
      this.energyWorkerSprites.push(sprite);
    }
    this.energyWorkerText.setText(`일꾼: ${workerCounts.energyWorkers}`);
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // UI 씬에서 유닛 생산 요청
    this.events.on('produceUnit', this.onProduceUnit, this);
    this.events.on('produceWorker', this.onProduceWorker, this);
    this.events.on('autoProduceToggle', this.onAutoProduceToggle, this);
    this.events.on('selectUnitSlot', this.onSelectUnitSlot, this);
  }

  /**
   * 유닛 슬롯 선택 처리
   */
  private onSelectUnitSlot(index: number): void {
    this.currentSlotIndex = index;
  }

  /**
   * 자동생산 토글 처리
   */
  private onAutoProduceToggle(enabled: boolean): void {
    this.autoProduceEnabled = enabled;
  }

  /**
   * 유닛 생산 처리 (슬롯 인덱스 지정 가능)
   */
  private onProduceUnit(slotIndex?: number): void {
    const index = slotIndex ?? this.currentSlotIndex;
    const unitData = this.unitBuilds[index];
    if (!unitData) return;

    const cost = unitData.build.stats.cost;

    if (this.resourceSystem.spendMinerals(cost)) {
      this.spawnAllyUnit(index);
      this.events.emit('resourceUpdate', this.resourceSystem.getResources());
    }
  }

  /**
   * 일꾼 생산 처리
   */
  private onProduceWorker(type: 'mineral' | 'energy'): void {
    if (this.resourceSystem.spendMinerals(RESOURCE_CONFIG.WORKER_COST)) {
      if (type === 'mineral') {
        this.resourceSystem.addMineralWorker();
      } else {
        this.resourceSystem.addEnergyWorker();
      }
      this.events.emit('resourceUpdate', this.resourceSystem.getResources());
      this.events.emit('workerUpdate', this.resourceSystem.getWorkerCounts());
      
      // 일꾼 시각화 업데이트
      this.updateWorkerVisuals();
    }
  }

  /**
   * 아군 유닛 스폰
   */
  private spawnAllyUnit(slotIndex?: number): void {
    const index = slotIndex ?? this.currentSlotIndex;
    const unitData = this.unitBuilds[index];

    if (!unitData) {
      console.error('유닛 빌드를 찾을 수 없음:', index);
      return;
    }

    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    const startPos = this.grid.cartesianToIsometric(this.allyBasePos.x, this.allyBasePos.y - 1);
    const unit = new MechUnit(
      this,
      offsetX + startPos.x,
      offsetY + startPos.y - 16,
      'unit_ally',
      unitData.build
    );
    unit.setGridPosition(this.allyBasePos.x, this.allyBasePos.y - 1);
    unit.setDirection(-1); // 위로 이동 (적 기지 방향)

    this.allyUnits.add(unit);
  }

  /**
   * 유닛 빌드 목록 반환 (UI용)
   */
  getUnitBuilds(): { build: MechBuild; name: string }[] {
    return this.unitBuilds;
  }

  /**
   * 웨이브 시스템 시작
   */
  private startWaveSystem(): void {
    // 첫 웨이브 시작
    this.time.delayedCall(3000, () => {
      this.startNextWave();
    });
  }

  /**
   * 다음 웨이브 시작
   */
  private startNextWave(): void {
    if (this.isGameOver || this.isVictory) return;

    this.waveNumber++;
    this.events.emit('waveStart', this.waveNumber);

    // 마지막 웨이브인지 체크
    this.isFinalWave = this.waveNumber >= BASE_CONFIG.VICTORY_WAVE;

    // 적 스폰 수 계산
    this.currentWaveEnemiesToSpawn = ENEMY_CONFIG.ENEMIES_PER_WAVE + Math.floor(this.waveNumber / 2);
    this.currentWaveEnemiesSpawned = 0;

    this.time.addEvent({
      delay: ENEMY_CONFIG.SPAWN_INTERVAL,
      repeat: this.currentWaveEnemiesToSpawn - 1,
      callback: () => {
        this.spawnEnemy();
        this.currentWaveEnemiesSpawned++;
      },
    });

    // 마지막 웨이브가 아니면 다음 웨이브 타이머 설정
    if (!this.isFinalWave) {
      this.waveTimer = this.time.delayedCall(ENEMY_CONFIG.WAVE_INTERVAL, () => {
        this.startNextWave();
      });
    }
  }

  /**
   * 적 스폰
   */
  private spawnEnemy(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    // 랜덤 x 위치
    const spawnX = Phaser.Math.Between(5, 9);
    const startPos = this.grid.cartesianToIsometric(spawnX, this.enemySpawnPos.y);

    const enemy = new Enemy(
      this,
      offsetX + startPos.x,
      offsetY + startPos.y,
      'unit_enemy'
    );
    enemy.setGridPosition(spawnX, this.enemySpawnPos.y);

    this.enemyUnits.add(enemy);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isVictory) return;

    // 자원 업데이트
    this.resourceSystem.update(delta);
    this.events.emit('resourceUpdate', this.resourceSystem.getResources());

    // 자동생산 처리
    this.updateAutoProduce(delta);

    // 전투 상태 체크 및 설정 (이동 전에 먼저 수행)
    this.updateCombatState();

    // 유닛 업데이트 (전투 중이 아닌 유닛만 이동)
    this.updateUnits(delta);

    // 전투 수행
    this.performCombat();

    // 게임 오버 체크
    this.checkGameOver();
  }

  /**
   * 자동생산 업데이트
   */
  private updateAutoProduce(delta: number): void {
    if (!this.autoProduceEnabled || this.unitBuilds.length === 0) return;

    this.autoProduceCooldown -= delta;

    if (this.autoProduceCooldown <= 0) {
      this.autoProduceCooldown = this.AUTO_PRODUCE_INTERVAL;

      // 현재 슬롯의 유닛 생산
      const unitData = this.unitBuilds[this.currentSlotIndex];
      if (!unitData) return;

      const unitCost = unitData.build.stats.cost;
      if (this.resourceSystem.canAffordMinerals(unitCost)) {
        this.resourceSystem.spendMinerals(unitCost);
        this.spawnAllyUnit(this.currentSlotIndex);
        this.events.emit('resourceUpdate', this.resourceSystem.getResources());
      }
    }
  }

  /**
   * 전투 상태 업데이트 - 사거리 내 적/아군이 있으면 전투 상태로 설정
   */
  private updateCombatState(): void {
    // 모든 유닛의 전투 상태를 먼저 초기화
    this.allyUnits.getChildren().forEach((obj) => {
      (obj as MechUnit).setInCombat(false);
    });
    this.enemyUnits.getChildren().forEach((obj) => {
      (obj as Enemy).setInCombat(false);
    });

    // 아군 유닛과 적 유닛 간 거리 체크
    this.allyUnits.getChildren().forEach((allyObj) => {
      const ally = allyObj as MechUnit;
      if (!ally.active) return;

      // 각 유닛의 사거리 사용
      const allyRange = ally.getRange();

      this.enemyUnits.getChildren().forEach((enemyObj) => {
        const enemy = enemyObj as Enemy;
        if (!enemy.active) return;

        const distance = Phaser.Math.Distance.Between(ally.x, ally.y, enemy.x, enemy.y);
        if (distance < allyRange) {
          ally.setInCombat(true);
          enemy.setInCombat(true);
        }
      });
    });
  }

  /**
   * 유닛 업데이트 - 전투 중이 아닌 유닛만 이동
   */
  private updateUnits(delta: number): void {
    const offsetY = 80;
    const gridHeight = GAME_CONFIG.GRID_HEIGHT;

    // 아군 유닛 업데이트
    this.allyUnits.getChildren().forEach((obj) => {
      const unit = obj as MechUnit;
      if (unit.active) {
        // 쿨다운 감소는 항상 수행
        unit.updateCooldown(delta);

        // 전투 중이 아닐 때만 이동
        if (!unit.isInCombat()) {
          unit.moveForward(delta, this.grid, GAME_CONFIG.WIDTH / 2, offsetY);

          // 적 기지에 도달하면 데미지
          if (unit.getGridY() <= 0) {
            this.damageEnemyBase(BASE_CONFIG.DAMAGE_PER_ALLY);
            unit.destroy();
          }
        }
      }
    });

    // 적 유닛 업데이트
    this.enemyUnits.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      if (enemy.active) {
        // 전투 중이 아닐 때만 이동
        if (!enemy.isInCombat()) {
          enemy.moveForward(delta, this.grid, GAME_CONFIG.WIDTH / 2, offsetY);

          // 기지에 도달하면 데미지
          if (enemy.getGridY() >= gridHeight - 1) {
            this.damageBase(BASE_CONFIG.DAMAGE_PER_ENEMY);
            enemy.destroy();
          }
        }
      }
    });
  }

  /**
   * 기지에 데미지
   */
  private damageBase(damage: number): void {
    this.baseHp -= damage;
    this.events.emit('baseHpUpdate', this.baseHp, this.maxBaseHp);

    // 기지 피격 효과
    this.cameras.main.shake(100, 0.01);
  }

  /**
   * 전투 수행 - 전투 중인 유닛들이 서로 공격
   */
  private performCombat(): void {
    const allies = this.allyUnits.getChildren() as MechUnit[];
    const enemies = this.enemyUnits.getChildren() as Enemy[];

    for (const ally of allies) {
      if (!ally.active || !ally.isInCombat() || !ally.canAttack()) continue;

      // 수리 유닛은 전투하지 않음 (추후 힐 로직 추가 가능)
      if (ally.canHeal()) continue;

      const allyRange = ally.getRange();
      let closestEnemy: Enemy | null = null;
      let closestDistance = Infinity;

      // 가장 가까운 적 찾기
      for (const enemy of enemies) {
        if (!enemy.active) continue;

        const distance = Phaser.Math.Distance.Between(ally.x, ally.y, enemy.x, enemy.y);
        if (distance < closestDistance && distance < allyRange) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }

      // 전투 수행
      if (closestEnemy) {
        ally.performAttack();
        
        // 범위 공격인 경우 주변 적에게도 데미지
        if (ally.hasAoe()) {
          const aoeRange = 40;
          for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dist = Phaser.Math.Distance.Between(closestEnemy.x, closestEnemy.y, enemy.x, enemy.y);
            if (dist < aoeRange) {
              enemy.takeDamage(ally.getAttack() * 0.5); // 범위 데미지는 50%
            }
          }
        }

        closestEnemy.takeDamage(ally.getAttack());
        
        // 적의 반격 (비행 유닛은 지상 적에게 덜 맞음)
        const counterDamage = ally.canFly() ? closestEnemy.getAttack() * 0.15 : closestEnemy.getAttack() * 0.3;
        ally.takeDamage(counterDamage);

        if (closestEnemy.isDead()) {
          closestEnemy.destroy();
          this.killCount++;
          this.events.emit('killUpdate', this.killCount);
        }

        if (ally.isDead()) {
          ally.destroy();
        }
      }
    }
  }

  /**
   * 게임 오버 체크
   */
  /**
   * 게임 종료 조건 체크 (패배 / 승리)
   */
  private checkGameOver(): void {
    // 패배 조건: 아군 기지 HP 0
    if (this.baseHp <= 0 && !this.isGameOver && !this.isVictory) {
      this.isGameOver = true;
      this.showGameOver();
      return;
    }

    // 승리 조건 1: 적 기지 파괴
    if (this.enemyBaseHp <= 0 && !this.isVictory && !this.isGameOver) {
      this.isVictory = true;
      this.showVictory('적 기지 파괴!');
      return;
    }

    // 승리 조건 2: 웨이브 10 클리어 (마지막 웨이브의 모든 적 처치)
    if (this.isFinalWave && !this.isVictory && !this.isGameOver) {
      // 모든 적이 스폰되었고, 남은 적이 없으면 승리
      const activeEnemies = this.enemyUnits.getChildren().filter(e => (e as Enemy).active).length;
      if (this.currentWaveEnemiesSpawned >= this.currentWaveEnemiesToSpawn && activeEnemies === 0) {
        this.isVictory = true;
        this.showVictory('웨이브 10 클리어!');
      }
    }
  }

  /**
   * 승리 화면 표시
   */
  private showVictory(reason: string): void {
    // 웨이브 타이머 정지
    if (this.waveTimer) {
      this.waveTimer.destroy();
    }

    // 승리 오버레이
    const overlay = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0.7
    );
    overlay.setDepth(500);

    // 승리 텍스트
    const victoryText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 - 70,
      '🎉 승리! 🎉',
      { fontSize: '40px', color: '#44ff44', fontStyle: 'bold' }
    );
    victoryText.setOrigin(0.5);
    victoryText.setDepth(501);

    // 승리 이유
    const reasonText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 - 20,
      reason,
      { fontSize: '24px', color: '#ffffff' }
    );
    reasonText.setOrigin(0.5);
    reasonText.setDepth(501);

    // 통계
    const statsText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 30,
      `웨이브: ${this.waveNumber} | 처치: ${this.killCount}`,
      { fontSize: '20px', color: '#ffffff' }
    );
    statsText.setOrigin(0.5);
    statsText.setDepth(501);

    // 재시작 버튼
    const restartBtn = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 90,
      150,
      45,
      0x44aa44
    );
    restartBtn.setDepth(501);
    restartBtn.setInteractive({ useHandCursor: true });

    const restartText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 90,
      '다시 시작',
      { fontSize: '18px', color: '#ffffff' }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(502);

    restartBtn.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.restart();
      this.scene.start('UIScene');
    });
  }

  /**
   * 게임 오버 화면 표시
   */
  private showGameOver(): void {
    // 웨이브 타이머 정지
    if (this.waveTimer) {
      this.waveTimer.destroy();
    }

    // 모든 적 정지
    this.enemyUnits.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      enemy.setActive(false);
    });

    // 게임 오버 오버레이
    const overlay = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0.7
    );
    overlay.setDepth(500);

    // 게임 오버 텍스트
    const gameOverText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 - 50,
      '기지가 파괴되었습니다!',
      { fontSize: '32px', color: '#ff4444', fontStyle: 'bold' }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(501);

    // 통계
    const statsText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 10,
      `웨이브: ${this.waveNumber} | 처치: ${this.killCount}`,
      { fontSize: '20px', color: '#ffffff' }
    );
    statsText.setOrigin(0.5);
    statsText.setDepth(501);

    // 재시작 버튼
    const restartBtn = this.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 70,
      150,
      45,
      COLORS.UI_ACCENT
    );
    restartBtn.setDepth(501);
    restartBtn.setInteractive({ useHandCursor: true });

    const restartText = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 70,
      '다시 시작',
      { fontSize: '18px', color: '#ffffff' }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(502);

    restartBtn.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.restart();
      this.scene.start('UIScene');
    });
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown(): void {
    this.events.off('produceUnit', this.onProduceUnit, this);
    this.events.off('produceWorker', this.onProduceWorker, this);
    this.events.off('autoProduceToggle', this.onAutoProduceToggle, this);
  }
}

