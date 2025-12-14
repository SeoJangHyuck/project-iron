/**
 * 아이소메트릭 좌표 변환
 */
export interface IsoPoint {
  x: number;
  y: number;
}

/**
 * 아이소메트릭 그리드 시스템
 */
export class IsometricGrid {
  private width: number;
  private height: number;
  private tileWidth: number;
  private tileHeight: number;

  constructor(width: number, height: number, tileWidth: number, tileHeight: number) {
    this.width = width;
    this.height = height;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  /**
   * 카테시안 좌표를 아이소메트릭 좌표로 변환
   */
  cartesianToIsometric(x: number, y: number): IsoPoint {
    return {
      x: (x - y) * (this.tileWidth / 2),
      y: (x + y) * (this.tileHeight / 2),
    };
  }

  /**
   * 아이소메트릭 좌표를 카테시안 좌표로 변환
   */
  isometricToCartesian(isoX: number, isoY: number): IsoPoint {
    const x = (isoX / (this.tileWidth / 2) + isoY / (this.tileHeight / 2)) / 2;
    const y = (isoY / (this.tileHeight / 2) - isoX / (this.tileWidth / 2)) / 2;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  /**
   * 그리드 범위 내인지 확인
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * 그리드 너비
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * 그리드 높이
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * 타일 너비
   */
  getTileWidth(): number {
    return this.tileWidth;
  }

  /**
   * 타일 높이
   */
  getTileHeight(): number {
    return this.tileHeight;
  }
}

