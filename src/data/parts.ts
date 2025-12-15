/**
 * 파츠 시스템 타입 및 데이터 정의
 */

// 무기 타입
export enum WeaponType {
  LIGHT = 'LIGHT',
  HEAVY = 'HEAVY',
  SPECIAL = 'SPECIAL',
  ALL = 'ALL',
}

// 속도 등급
export enum SpeedGrade {
  FAST = 'FAST',
  NORMAL = 'NORMAL',
  SLOW = 'SLOW',
}

// 사거리 등급
export enum RangeGrade {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}

// 이동 타입
export enum MovementType {
  GROUND = 'GROUND',
  FLIGHT = 'FLIGHT',
}

// 다리 파츠 타입
export type LegPart = {
  id: string;
  name: string;
  nameKo: string;
  capacity: number; // 하중
  speed: SpeedGrade;
  movementType: MovementType;
  defenseBonus: number; // 방어력 보너스 (0.1 = 10%)
  cost: number;
};

// 몸통 파츠 타입
export type BodyPart = {
  id: string;
  name: string;
  nameKo: string;
  hp: number;
  weaponType: WeaponType; // 장착 가능한 무기 타입
  weight: number;
  hasShield: boolean;
  cost: number;
};

// 팔/무기 파츠 타입
export type ArmPart = {
  id: string;
  name: string;
  nameKo: string;
  weaponType: WeaponType;
  attack: number;
  range: RangeGrade;
  attackSpeed: SpeedGrade;
  weight: number;
  cost: number;
  isPiercing: boolean; // 관통
  isAoe: boolean; // 범위 공격
  isHealer: boolean; // 수리 유닛
};

// 속도 등급 → 실제 속도 (그리드/초) 변환
export const SPEED_VALUES: Record<SpeedGrade, number> = {
  [SpeedGrade.FAST]: 1.5,
  [SpeedGrade.NORMAL]: 1.2,
  [SpeedGrade.SLOW]: 0.9,
};

// 공격 속도 등급 → 쿨다운 (ms) 변환
export const ATTACK_SPEED_VALUES: Record<SpeedGrade, number> = {
  [SpeedGrade.FAST]: 300,
  [SpeedGrade.NORMAL]: 500,
  [SpeedGrade.SLOW]: 800,
};

// 사거리 등급 → 실제 거리 (픽셀) 변환
export const RANGE_VALUES: Record<RangeGrade, number> = {
  [RangeGrade.SHORT]: 60,
  [RangeGrade.MEDIUM]: 100,
  [RangeGrade.LONG]: 150,
};

// ============================================
// 다리 파츠 데이터
// ============================================

export const LEG_PARTS: Record<string, LegPart> = {
  // 지상형
  scout: {
    id: 'scout',
    name: 'Scout',
    nameKo: '스카우트',
    capacity: 20,
    speed: SpeedGrade.FAST,
    movementType: MovementType.GROUND,
    defenseBonus: 0,
    cost: 50,
  },
  walker: {
    id: 'walker',
    name: 'Walker',
    nameKo: '워커',
    capacity: 40,
    speed: SpeedGrade.NORMAL,
    movementType: MovementType.GROUND,
    defenseBonus: 0,
    cost: 80,
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    nameKo: '포트리스',
    capacity: 70,
    speed: SpeedGrade.SLOW,
    movementType: MovementType.GROUND,
    defenseBonus: 0.1, // 방어력 +10%
    cost: 120,
  },

  // 비행형
  swift: {
    id: 'swift',
    name: 'Swift',
    nameKo: '스위프트',
    capacity: 15,
    speed: SpeedGrade.FAST,
    movementType: MovementType.FLIGHT,
    defenseBonus: 0,
    cost: 80,
  },
  hawk: {
    id: 'hawk',
    name: 'Hawk',
    nameKo: '호크',
    capacity: 30,
    speed: SpeedGrade.NORMAL,
    movementType: MovementType.FLIGHT,
    defenseBonus: 0,
    cost: 120,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie',
    nameKo: '발키리',
    capacity: 60,
    speed: SpeedGrade.SLOW,
    movementType: MovementType.FLIGHT,
    defenseBonus: 0.05, // 방어력 +5%
    cost: 180,
  },
};

// ============================================
// 몸통 파츠 데이터
// ============================================

export const BODY_PARTS: Record<string, BodyPart> = {
  lightFrame: {
    id: 'lightFrame',
    name: 'Light Frame',
    nameKo: '경량 프레임',
    hp: 50,
    weaponType: WeaponType.LIGHT,
    weight: 10,
    hasShield: false,
    cost: 30,
  },
  standardFrame: {
    id: 'standardFrame',
    name: 'Standard Frame',
    nameKo: '표준 프레임',
    hp: 100,
    weaponType: WeaponType.ALL,
    weight: 20,
    hasShield: false,
    cost: 60,
  },
  heavyArmor: {
    id: 'heavyArmor',
    name: 'Heavy Armor',
    nameKo: '중장갑',
    hp: 200,
    weaponType: WeaponType.HEAVY,
    weight: 30,
    hasShield: false,
    cost: 90,
  },
  shieldFrame: {
    id: 'shieldFrame',
    name: 'Shield Frame',
    nameKo: '쉴드 프레임',
    hp: 80,
    weaponType: WeaponType.LIGHT,
    weight: 15,
    hasShield: true,
    cost: 50,
  },
};

// ============================================
// 팔/무기 파츠 데이터
// ============================================

export const ARM_PARTS: Record<string, ArmPart> = {
  machinegun: {
    id: 'machinegun',
    name: 'Machinegun',
    nameKo: '머신건',
    weaponType: WeaponType.LIGHT,
    attack: 5,
    range: RangeGrade.MEDIUM,
    attackSpeed: SpeedGrade.FAST,
    weight: 5,
    cost: 30,
    isPiercing: false,
    isAoe: false,
    isHealer: false,
  },
  cannon: {
    id: 'cannon',
    name: 'Cannon',
    nameKo: '캐논',
    weaponType: WeaponType.HEAVY,
    attack: 20,
    range: RangeGrade.LONG,
    attackSpeed: SpeedGrade.SLOW,
    weight: 15,
    cost: 60,
    isPiercing: false,
    isAoe: false,
    isHealer: false,
  },
  laser: {
    id: 'laser',
    name: 'Laser',
    nameKo: '레이저',
    weaponType: WeaponType.LIGHT,
    attack: 12,
    range: RangeGrade.MEDIUM,
    attackSpeed: SpeedGrade.NORMAL,
    weight: 10,
    cost: 40,
    isPiercing: true, // 관통
    isAoe: false,
    isHealer: false,
  },
  missile: {
    id: 'missile',
    name: 'Missile',
    nameKo: '미사일',
    weaponType: WeaponType.HEAVY,
    attack: 40,
    range: RangeGrade.LONG,
    attackSpeed: SpeedGrade.SLOW,
    weight: 30,
    cost: 100,
    isPiercing: false,
    isAoe: true, // 범위 공격
    isHealer: false,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    nameKo: '샷건',
    weaponType: WeaponType.LIGHT,
    attack: 20,
    range: RangeGrade.SHORT,
    attackSpeed: SpeedGrade.NORMAL,
    weight: 10,
    cost: 80,
    isPiercing: false,
    isAoe: false,
    isHealer: false,
  },
  repairArm: {
    id: 'repairArm',
    name: 'Repair Arm',
    nameKo: '수리암',
    weaponType: WeaponType.SPECIAL,
    attack: 0,
    range: RangeGrade.SHORT,
    attackSpeed: SpeedGrade.NORMAL,
    weight: 5,
    cost: 40,
    isPiercing: false,
    isAoe: false,
    isHealer: true, // 수리 유닛
  },
};

// 파츠 ID로 조회 헬퍼 함수
export const getLegs = (id: string): LegPart | undefined => LEG_PARTS[id];
export const getBody = (id: string): BodyPart | undefined => BODY_PARTS[id];
export const getArms = (id: string): ArmPart | undefined => ARM_PARTS[id];

