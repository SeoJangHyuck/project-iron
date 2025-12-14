import Phaser from 'phaser';
import { GAME_CONFIG, COLORS, RESOURCE_CONFIG, ENEMY_CONFIG, BASE_CONFIG } from '../config/gameConfig';
import { IsometricGrid } from '../systems/IsometricGrid';
import { ResourceSystem } from '../systems/ResourceSystem';
import { Unit } from '../entities/Unit';
import { Enemy } from '../entities/Enemy';

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

  // 기지 HP
  private baseHp: number = BASE_CONFIG.MAX_HP;
  private maxBaseHp: number = BASE_CONFIG.MAX_HP;

  // 킬 카운트
  private killCount: number = 0;

  // 기지 위치 (그리드 좌표)
  private allyBasePos = { x: 7, y: 9 };
  private enemySpawnPos = { x: 7, y: 0 };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.isGameOver = false;
    this.waveNumber = 0;
    this.baseHp = BASE_CONFIG.MAX_HP;
    this.killCount = 0;

    // 시스템 초기화
    this.initializeSystems();

    // 그리드 생성
    this.createGrid();

    // 유닛 그룹 생성
    this.allyUnits = this.add.group();
    this.enemyUnits = this.add.group();

    // 기지 표시
    this.createBases();

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
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // UI 씬에서 유닛 생산 요청
    this.events.on('produceUnit', this.onProduceUnit, this);
    this.events.on('produceWorker', this.onProduceWorker, this);
  }

  /**
   * 유닛 생산 처리
   */
  private onProduceUnit(): void {
    const cost = 150; // 기본 유닛 비용

    if (this.resourceSystem.spendMinerals(cost)) {
      this.spawnAllyUnit();
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
    }
  }

  /**
   * 아군 유닛 스폰
   */
  private spawnAllyUnit(): void {
    const offsetX = GAME_CONFIG.WIDTH / 2;
    const offsetY = 80;

    const startPos = this.grid.cartesianToIsometric(this.allyBasePos.x, this.allyBasePos.y - 1);
    const unit = new Unit(
      this,
      offsetX + startPos.x,
      offsetY + startPos.y - 16,
      'unit_ally'
    );
    unit.setGridPosition(this.allyBasePos.x, this.allyBasePos.y - 1);
    unit.setDirection(-1); // 위로 이동

    this.allyUnits.add(unit);
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
    if (this.isGameOver) return;

    this.waveNumber++;
    this.events.emit('waveStart', this.waveNumber);

    // 적 스폰
    let spawnedCount = 0;
    const enemiesToSpawn = ENEMY_CONFIG.ENEMIES_PER_WAVE + Math.floor(this.waveNumber / 2);

    this.time.addEvent({
      delay: ENEMY_CONFIG.SPAWN_INTERVAL,
      repeat: enemiesToSpawn - 1,
      callback: () => {
        this.spawnEnemy();
        spawnedCount++;
      },
    });

    // 다음 웨이브 타이머
    this.waveTimer = this.time.delayedCall(ENEMY_CONFIG.WAVE_INTERVAL, () => {
      this.startNextWave();
    });
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

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // 자원 업데이트
    this.resourceSystem.update(delta);
    this.events.emit('resourceUpdate', this.resourceSystem.getResources());

    // 유닛 업데이트
    this.updateUnits(delta);

    // 전투 체크
    this.checkCombat();

    // 게임 오버 체크
    this.checkGameOver();
  }

  /**
   * 유닛 업데이트
   */
  private updateUnits(delta: number): void {
    const offsetY = 80;
    const gridHeight = GAME_CONFIG.GRID_HEIGHT;

    // 아군 유닛 이동
    this.allyUnits.getChildren().forEach((obj) => {
      const unit = obj as Unit;
      if (unit.active) {
        unit.moveForward(delta, this.grid, GAME_CONFIG.WIDTH / 2, offsetY);

        // 화면 밖으로 나가면 제거
        if (unit.getGridY() < 0) {
          unit.destroy();
        }
      }
    });

    // 적 유닛 이동
    this.enemyUnits.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      if (enemy.active) {
        enemy.moveForward(delta, this.grid, GAME_CONFIG.WIDTH / 2, offsetY);

        // 기지에 도달하면 데미지
        if (enemy.getGridY() >= gridHeight - 1) {
          this.damageBase(BASE_CONFIG.DAMAGE_PER_ENEMY);
          enemy.destroy();
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
   * 전투 체크
   */
  private checkCombat(): void {
    this.allyUnits.getChildren().forEach((allyObj) => {
      const ally = allyObj as Unit;
      if (!ally.active || !ally.canAttack()) return;

      let closestEnemy: Enemy | null = null;
      let closestDistance = Infinity;

      // 가장 가까운 적 찾기
      this.enemyUnits.getChildren().forEach((enemyObj) => {
        const enemy = enemyObj as Enemy;
        if (!enemy.active) return;

        const distance = Phaser.Math.Distance.Between(ally.x, ally.y, enemy.x, enemy.y);
        if (distance < closestDistance && distance < 60) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      });

      // 전투 수행
      if (closestEnemy) {
        ally.performAttack();
        closestEnemy.takeDamage(ally.getAttack());
        ally.takeDamage(closestEnemy.getAttack() * 0.3);

        if (closestEnemy.isDead()) {
          closestEnemy.destroy();
          this.killCount++;
          this.events.emit('killUpdate', this.killCount);
        }

        if (ally.isDead()) {
          ally.destroy();
        }
      }
    });
  }

  /**
   * 게임 오버 체크
   */
  private checkGameOver(): void {
    if (this.baseHp <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.showGameOver();
    }
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
  }
}

