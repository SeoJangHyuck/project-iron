/**
 * 메카 조합 검증 및 스탯 계산 시스템
 */

import type { LegPart, BodyPart, ArmPart } from '../data/parts';
import {
  WeaponType,
  SPEED_VALUES,
  ATTACK_SPEED_VALUES,
  RANGE_VALUES,
  MovementType,
  getLegs,
  getBody,
  getArms,
} from '../data/parts';

// 메카 조합 설정
export type MechConfig = {
  legsId: string;
  bodyId: string;
  armsId: string;
};

// 조합 검증 결과
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

// 계산된 메카 스탯
export type MechStats = {
  hp: number;
  attack: number;
  speed: number; // 실제 이동 속도 (그리드/초)
  attackCooldown: number; // 공격 쿨다운 (ms)
  range: number; // 실제 사거리 (픽셀)
  defenseBonus: number; // 방어력 보너스 (0~1)
  cost: number; // 총 비용
  productionTime: number; // 생산 시간 (ms)
  movementType: MovementType;
  hasShield: boolean;
  isPiercing: boolean;
  isAoe: boolean;
  isHealer: boolean;
};

// 조합된 메카 전체 정보
export type MechBuild = {
  config: MechConfig;
  legs: LegPart;
  body: BodyPart;
  arms: ArmPart;
  stats: MechStats;
};

const BASE_PRODUCTION_TIME = 3000; // 기본 생산 시간 (ms)

/**
 * 하중 검증: 다리 하중 >= 몸통 무게 + 팔 무게
 */
const validateCapacity = (legs: LegPart, body: BodyPart, arms: ArmPart): string | null => {
  const totalWeight = body.weight + arms.weight;
  if (legs.capacity < totalWeight) {
    return `하중 초과: ${legs.nameKo}(하중 ${legs.capacity}) < ${body.nameKo}(${body.weight}) + ${arms.nameKo}(${arms.weight}) = ${totalWeight}`;
  }
  return null;
};

/**
 * 무기 타입 호환성 검증: 몸통이 허용하는 무기 타입만 장착 가능
 */
const validateWeaponCompatibility = (body: BodyPart, arms: ArmPart): string | null => {
  // 몸통이 ALL 타입이면 모든 무기 허용
  if (body.weaponType === WeaponType.ALL) {
    return null;
  }

  // 특수 무기(수리암)는 경무장 몸통에 장착 가능
  if (arms.weaponType === WeaponType.SPECIAL && body.weaponType === WeaponType.LIGHT) {
    return null;
  }

  // 무기 타입이 일치하는지 확인
  if (body.weaponType !== arms.weaponType) {
    return `무기 호환 불가: ${body.nameKo}(${body.weaponType})에 ${arms.nameKo}(${arms.weaponType}) 장착 불가`;
  }

  return null;
};

/**
 * 메카 조합 검증
 */
export const validateMechConfig = (config: MechConfig): ValidationResult => {
  const legs = getLegs(config.legsId);
  const body = getBody(config.bodyId);
  const arms = getArms(config.armsId);

  const errors: string[] = [];

  // 파츠 존재 확인
  if (!legs) {
    errors.push(`다리 파츠를 찾을 수 없음: ${config.legsId}`);
  }
  if (!body) {
    errors.push(`몸통 파츠를 찾을 수 없음: ${config.bodyId}`);
  }
  if (!arms) {
    errors.push(`팔 파츠를 찾을 수 없음: ${config.armsId}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 하중 검증
  const capacityError = validateCapacity(legs!, body!, arms!);
  if (capacityError) {
    errors.push(capacityError);
  }

  // 무기 호환성 검증
  const weaponError = validateWeaponCompatibility(body!, arms!);
  if (weaponError) {
    errors.push(weaponError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 메카 스탯 계산
 */
export const calculateMechStats = (legs: LegPart, body: BodyPart, arms: ArmPart): MechStats => {
  const totalCost = legs.cost + body.cost + arms.cost;
  const productionTime = Math.floor(BASE_PRODUCTION_TIME * (totalCost / 100));

  return {
    hp: body.hp,
    attack: arms.attack,
    speed: SPEED_VALUES[legs.speed],
    attackCooldown: ATTACK_SPEED_VALUES[arms.attackSpeed],
    range: RANGE_VALUES[arms.range],
    defenseBonus: legs.defenseBonus,
    cost: totalCost,
    productionTime,
    movementType: legs.movementType,
    hasShield: body.hasShield,
    isPiercing: arms.isPiercing,
    isAoe: arms.isAoe,
    isHealer: arms.isHealer,
  };
};

/**
 * 메카 빌드 생성 (검증 + 스탯 계산)
 */
export const buildMech = (config: MechConfig): MechBuild | null => {
  const validation = validateMechConfig(config);
  if (!validation.isValid) {
    console.error('메카 조합 실패:', validation.errors);
    return null;
  }

  const legs = getLegs(config.legsId)!;
  const body = getBody(config.bodyId)!;
  const arms = getArms(config.armsId)!;
  const stats = calculateMechStats(legs, body, arms);

  return {
    config,
    legs,
    body,
    arms,
    stats,
  };
};

/**
 * 기본 메카 조합 (워커 + 표준프레임 + 머신건)
 */
export const DEFAULT_MECH_CONFIG: MechConfig = {
  legsId: 'walker',
  bodyId: 'standardFrame',
  armsId: 'machinegun',
};

/**
 * 모든 유효한 조합 목록 생성 (디버그/UI용)
 */
export const getAllValidCombinations = (): MechConfig[] => {
  const validCombos: MechConfig[] = [];

  const legIds = ['scout', 'walker', 'fortress', 'swift', 'hawk', 'valkyrie'];
  const bodyIds = ['lightFrame', 'standardFrame', 'heavyArmor', 'shieldFrame'];
  const armIds = ['machinegun', 'cannon', 'laser', 'missile', 'shotgun', 'repairArm'];

  for (const legsId of legIds) {
    for (const bodyId of bodyIds) {
      for (const armsId of armIds) {
        const config: MechConfig = { legsId, bodyId, armsId };
        const validation = validateMechConfig(config);
        if (validation.isValid) {
          validCombos.push(config);
        }
      }
    }
  }

  return validCombos;
};

