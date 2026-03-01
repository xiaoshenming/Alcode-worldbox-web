/**
 * RuinsSystem - 废墟与考古系统
 * 当村庄被摧毁或文明灭亡时生成废墟，其他文明可发现废墟获得加成
 */

export interface Ruin {
  id: number
  x: number
  y: number
  originCivName: string
  createdTick: number
  value: number        // 0-100, 随时间衰减
  discovered: boolean
  discoveredBy?: string // 发现者文明名
}

const MAX_RUINS = 50
const DECAY_INTERVAL = 600  // 每 600 tick 价值 -1
const TECH_BONUS_RATE = 0.3
const CULTURE_BONUS_RATE = 0.2

export class RuinsSystem {
  private ruins: Ruin[] = []
  private nextId: number = 0
  private lastDecayTick: number = 0

  /**
   * 在指定位置创建废墟
   */
  createRuin(x: number, y: number, civName: string, tick: number, value: number): void {
    // 超过上限时移除最老的废墟
    while (this.ruins.length >= MAX_RUINS) {
      this.ruins.shift()
    }

    const ruin: Ruin = {
      id: this.nextId++,
      x,
      y,
      originCivName: civName,
      createdTick: tick,
      value: Math.max(0, Math.min(100, value)),
      discovered: false,
    }
    this.ruins.push(ruin)
  }

  /**
   * 每帧更新：根据经过的时间衰减废墟价值
   */
  update(currentTick: number): void {
    if (this.lastDecayTick === 0) {
      this.lastDecayTick = currentTick
      return
    }

    const elapsed = currentTick - this.lastDecayTick
    if (elapsed < DECAY_INTERVAL) return

    const decayAmount = Math.floor(elapsed / DECAY_INTERVAL)
    this.lastDecayTick += decayAmount * DECAY_INTERVAL

    for (const ruin of this.ruins) {
      ruin.value = Math.max(0, ruin.value - decayAmount)
    }

    this.removeDecayedRuins()
  }

  /**
   * 获取所有废墟
   */
  getRuins(): Ruin[] {
    return this.ruins
  }

  /**
   * 获取指定坐标的废墟
   */
  getRuinAt(x: number, y: number): Ruin | undefined {
    return this.ruins.find((r) => r.x === x && r.y === y)
  }

  /**
   * 移除价值为 0 的废墟
   */
  removeDecayedRuins(): void {
    for (let _i = this.ruins.length - 1; _i >= 0; _i--) { if (this.ruins[_i].value <= 0) this.ruins.splice(_i, 1) }
  }
}
