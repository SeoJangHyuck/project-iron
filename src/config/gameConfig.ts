/**
 * 게임 설정 상수
 */
export const GAME_CONFIG = {
  // 화면 크기
  WIDTH: 1280,
  HEIGHT: 720,

  // 아이소메트릭 타일 크기
  TILE_WIDTH: 32,
  TILE_HEIGHT: 16,

  // 그리드 크기
  GRID_WIDTH: 15,
  GRID_HEIGHT: 18, // 전투 공간 확대 (10 → 18)

  // 유닛 크기
  UNIT_SIZE: 32,

  // 레인 설정
  LANE_COUNT: 1, // Phase 1에서는 1개 레인
};

/**
 * 자원 설정
 */
export const RESOURCE_CONFIG = {
  // 초기 자원
  INITIAL_MINERALS: 300,
  INITIAL_ENERGY: 50,

  // 일꾼 설정
  WORKER_COST: 100,
  WORKER_MINERAL_RATE: 8, // 초당 광물 수집량
  WORKER_ENERGY_RATE: 5, // 초당 에너지 수집량
};

/**
 * 유닛 설정
 */
export const UNIT_CONFIG = {
  // 기본 유닛 스탯
  BASE_HP: 100,
  BASE_ATTACK: 15,
  BASE_SPEED: 1.2, // 그리드 유닛/초
  BASE_RANGE: 100,

  // 생산 시간 (ms)
  BASE_PRODUCTION_TIME: 3000,
};

/**
 * 기지 설정
 */
export const BASE_CONFIG = {
  // 아군 기지
  MAX_HP: 100,
  DAMAGE_PER_ENEMY: 10,
  
  // 적 기지
  ENEMY_MAX_HP: 200,
  DAMAGE_PER_ALLY: 15, // 아군 유닛 1마리당 적 기지에 주는 데미지
  
  // 승리 조건
  VICTORY_WAVE: 10, // 이 웨이브 클리어 시 승리
};

/**
 * 적 설정
 */
export const ENEMY_CONFIG = {
  // 웨이브 설정
  WAVE_INTERVAL: 15000, // 웨이브 간격 (ms)
  ENEMIES_PER_WAVE: 3, // 웨이브당 적 수
  SPAWN_INTERVAL: 800, // 적 스폰 간격 (ms)
  
  // 적 스탯
  BASE_HP: 60,
  BASE_ATTACK: 8,
  BASE_SPEED: 1.5, // 그리드 유닛/초
};

/**
 * 색상 팔레트
 */
export const COLORS = {
  // 아군
  ALLY_PRIMARY: 0x4a90d9,
  ALLY_SECONDARY: 0x2d5a87,

  // 적군
  ENEMY_PRIMARY: 0xd94a4a,
  ENEMY_SECONDARY: 0x872d2d,

  // 일꾼
  WORKER: 0x7ed957,

  // 타일
  TILE_NORMAL: 0x3d3d5c,
  TILE_HIGHLIGHT: 0x5c5c7a,
  TILE_SPAWN: 0x5c3d3d,
  TILE_BASE: 0x3d5c3d,

  // UI
  UI_BACKGROUND: 0x16213e,
  UI_TEXT: 0xffffff,
  UI_ACCENT: 0xe94560,
};

/**
 * 유닛 무기 타입별 색상
 */
export const UNIT_COLORS = {
  // 무기 타입별 색상
  MACHINEGUN: 0x4a90d9,   // 파랑 - 머신건 (빠른 연사)
  SHOTGUN: 0x6a9fd9,      // 연파랑 - 샷건
  CANNON: 0xff8844,       // 주황 - 캐논 (강력)
  MISSILE: 0xff6622,      // 진주황 - 미사일 (범위)
  LASER: 0x44ff88,        // 초록 - 레이저 (관통)
  REPAIR: 0xffff44,       // 노랑 - 수리암 (힐러)
  
  // 이동 타입별 추가 효과
  FLIGHT_BRIGHTNESS: 0.3, // 비행 유닛 밝기 증가량
};

