import { RESOURCE_CONFIG } from '../config/gameConfig';

/**
 * 자원 데이터
 */
export interface Resources {
  minerals: number;
  energy: number;
}

/**
 * 일꾼 수
 */
export interface WorkerCounts {
  mineralWorkers: number;
  energyWorkers: number;
}

/**
 * 자원 관리 시스템
 */
export class ResourceSystem {
  private minerals: number;
  private energy: number;
  private mineralWorkers: number = 0;
  private energyWorkers: number = 0;

  // 자원 축적 버퍼 (소수점 처리용)
  private mineralBuffer: number = 0;
  private energyBuffer: number = 0;

  constructor(initialMinerals: number, initialEnergy: number) {
    this.minerals = initialMinerals;
    this.energy = initialEnergy;
  }

  /**
   * 매 프레임 자원 업데이트
   * @param delta 델타 타임 (ms)
   */
  update(delta: number): void {
    const deltaSeconds = delta / 1000;

    // 광물 수집
    if (this.mineralWorkers > 0) {
      this.mineralBuffer +=
        this.mineralWorkers * RESOURCE_CONFIG.WORKER_MINERAL_RATE * deltaSeconds;

      if (this.mineralBuffer >= 1) {
        const toAdd = Math.floor(this.mineralBuffer);
        this.minerals += toAdd;
        this.mineralBuffer -= toAdd;
      }
    }

    // 에너지 수집
    if (this.energyWorkers > 0) {
      this.energyBuffer += this.energyWorkers * RESOURCE_CONFIG.WORKER_ENERGY_RATE * deltaSeconds;

      if (this.energyBuffer >= 1) {
        const toAdd = Math.floor(this.energyBuffer);
        this.energy += toAdd;
        this.energyBuffer -= toAdd;
      }
    }
  }

  /**
   * 현재 자원 반환
   */
  getResources(): Resources {
    return {
      minerals: this.minerals,
      energy: this.energy,
    };
  }

  /**
   * 일꾼 수 반환
   */
  getWorkerCounts(): WorkerCounts {
    return {
      mineralWorkers: this.mineralWorkers,
      energyWorkers: this.energyWorkers,
    };
  }

  /**
   * 광물 소비
   */
  spendMinerals(amount: number): boolean {
    if (this.minerals >= amount) {
      this.minerals -= amount;
      return true;
    }
    return false;
  }

  /**
   * 에너지 소비
   */
  spendEnergy(amount: number): boolean {
    if (this.energy >= amount) {
      this.energy -= amount;
      return true;
    }
    return false;
  }

  /**
   * 광물 추가
   */
  addMinerals(amount: number): void {
    this.minerals += amount;
  }

  /**
   * 에너지 추가
   */
  addEnergy(amount: number): void {
    this.energy += amount;
  }

  /**
   * 광산 일꾼 추가
   */
  addMineralWorker(): void {
    this.mineralWorkers++;
  }

  /**
   * 발전기 일꾼 추가
   */
  addEnergyWorker(): void {
    this.energyWorkers++;
  }

  /**
   * 광물 잔액 확인
   */
  canAffordMinerals(amount: number): boolean {
    return this.minerals >= amount;
  }

  /**
   * 에너지 잔액 확인
   */
  canAffordEnergy(amount: number): boolean {
    return this.energy >= amount;
  }
}
