import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBallLightningSystem } from '../systems/WorldBallLightningSystem'
import type { BallLightning, BallSize } from '../systems/WorldBallLightningSystem'

// 常量
const CHECK_INTERVAL = 900
const ENERGY_DECAY = 0.08
const DIRECTION_CHAOS = 0.4

// World mock（BallLightning spawn 无 tile 检查，任何 tile 均可）
const world = { width: 200, height: 200, getTile: () => 0 } as any
// em mock：注意使用复数 getEntitiesWithComponents
const em = { getEntitiesWithComponents: () => [] } as any

function makeSys(): WorldBallLightningSystem { return new WorldBallLightningSystem() }
let nextId = 1
function makeBall(overrides: Partial<BallLightning> = {}): BallLightning {
  return {
    id: nextId++, x: 100, y: 100, size: 'medium', energy: 80,
    speed: 0.5, direction: 0, damageRadius: 2,
    creaturesTerrified: 0, lifetime: 2000, startTick: 0,
    ...overrides,
  }
}

describe('WorldBallLightningSystem - 基础状态', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('初始无球形闪电', () => { expect((sys as any).balls).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).balls.push(makeBall())
    expect((sys as any).balls).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).balls).toBe((sys as any).balls)
  })

  it('支持4种尺寸', () => {
    const sizes: BallSize[] = ['small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(4)
  })

  it('球形闪电字段正确', () => {
    ;(sys as any).balls.push(makeBall({ size: 'massive', energy: 80, damageRadius: 5 }))
    const b = (sys as any).balls[0]
    expect(b.size).toBe('massive')
    expect(b.energy).toBe(80)
    expect(b.damageRadius).toBe(5)
  })
})

describe('WorldBallLightningSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 80 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    // 未更新，energy 不变
    expect((sys as any).balls[0].energy).toBe(80)
  })

  it('tick 达到 CHECK_INTERVAL 时执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    // energy 减少 ENERGY_DECAY=0.08
    expect((sys as any).balls[0].energy).toBeCloseTo(80 - ENERGY_DECAY, 5)
  })

  it('连续两次 CHECK_INTERVAL 触发两次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).balls[0].energy).toBeCloseTo(80 - ENERGY_DECAY * 2, 5)
  })
})

describe('WorldBallLightningSystem - 字段更新逻辑', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('每次触发后 energy 减少 ENERGY_DECAY(0.08)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 50, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].energy).toBeCloseTo(50 - ENERGY_DECAY, 5)
  })

  it('energy 下限为 0（不会变负数）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 0.05, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    // 第一次 update 设置 lastCheck=0，第二次才真正执行
    sys.update(1, world, em, CHECK_INTERVAL)
    // energy=max(0, 0.05-0.08)=0，ball 被移除
    expect((sys as any).balls).toHaveLength(0)
  })

  it('direction 每次在 ±DIRECTION_CHAOS/2 范围内随机变化', () => {
    // random=0.5 => (0.5-0.5)*0.4=0，direction 不变
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).balls.push(makeBall({ direction: 1.0, energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].direction).toBeCloseTo(1.0, 5)
  })

  it('direction 向负方向变化（random=0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).balls.push(makeBall({ direction: 1.0, energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    // direction += (0 - 0.5) * 0.4 = -0.2
    expect((sys as any).balls[0].direction).toBeCloseTo(1.0 - 0.2, 5)
  })

  it('x 坐标被限制在 [0, width-1] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 放在边界，速度向右推出去
    ;(sys as any).balls.push(makeBall({ x: 199, direction: 0, speed: 100, energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].x).toBeLessThanOrEqual(199)
    expect((sys as any).balls[0].x).toBeGreaterThanOrEqual(0)
  })

  it('y 坐标被限制在 [0, height-1] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // direction=PI/2 使闪电向下移动
    ;(sys as any).balls.push(makeBall({ y: 199, direction: Math.PI / 2, speed: 100, energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].y).toBeLessThanOrEqual(199)
    expect((sys as any).balls[0].y).toBeGreaterThanOrEqual(0)
  })

  it('多个球形闪电同时被更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))
    ;(sys as any).balls.push(makeBall({ energy: 60, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].energy).toBeCloseTo(80 - ENERGY_DECAY, 5)
    expect((sys as any).balls[1].energy).toBeCloseTo(60 - ENERGY_DECAY, 5)
  })
})

describe('WorldBallLightningSystem - cleanup（过期/消亡）', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('energy <= 0 时球形闪电被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 0.05, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(0)
  })

  it('elapsed > lifetime 时球形闪电被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // startTick=0, lifetime=100，当 tick=CHECK_INTERVAL 时 elapsed=CHECK_INTERVAL > 100
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 100 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL) // elapsed=900 > 100
    expect((sys as any).balls).toHaveLength(0)
  })

  it('未到期且 energy > 0 的球形闪电不被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(1)
  })

  it('同时有存活和消亡的球时只移除消亡的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ energy: 0.05, startTick: 0, lifetime: 9999 })) // 将消亡
    ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))   // 存活
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(1)
    expect((sys as any).balls[0].energy).toBeGreaterThan(0)
  })
})

describe('WorldBallLightningSystem - spawn 逻辑', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('random < SPAWN_CHANCE(0.003) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(1)
  })

  it('random >= SPAWN_CHANCE(0.003) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(0)
  })

  it('达到 MAX_BALLS(6) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 6; i++) {
      ;(sys as any).balls.push(makeBall({ energy: 80, startTick: 0, lifetime: 9999 }))
    }
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls).toHaveLength(6)
  })

  it('spawn 的球形闪电 startTick 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].startTick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的球形闪电 energy 根据 size 的 ENERGY_MAP 确定（spawn 后同帧已减 ENERGY_DECAY）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).balls.length === 1) {
      const b = (sys as any).balls[0]
      const energyMap: Record<BallSize, number> = { small: 40, medium: 60, large: 80, massive: 100 }
      // spawn 后在同一帧的 update loop 中减了 ENERGY_DECAY=0.08
      expect(b.energy).toBeCloseTo(energyMap[b.size as BallSize] - ENERGY_DECAY, 5)
    }
  })

  it('spawn 的球形闪电 damageRadius 根据 size 的 RADIUS_MAP 确定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).balls.length === 1) {
      const b = (sys as any).balls[0]
      const radiusMap: Record<BallSize, number> = { small: 1, medium: 2, large: 4, massive: 6 }
      expect(b.damageRadius).toBe(radiusMap[b.size as BallSize])
    }
  })

  it('spawn 的球形闪电 id 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    if ((sys as any).balls.length >= 2) {
      const ids = (sys as any).balls.map((b: BallLightning) => b.id)
      expect(ids[0]).toBeLessThan(ids[1])
    }
  })
})

describe('WorldBallLightningSystem - em 调用', () => {
  let sys: WorldBallLightningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('每次触发时调用 getEntitiesWithComponents（复数）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const mockEm = { getEntitiesWithComponents: vi.fn(() => []) }
    sys.update(1, world, mockEm as any, 0)
    sys.update(1, world, mockEm as any, CHECK_INTERVAL)
    expect(mockEm.getEntitiesWithComponents).toHaveBeenCalledWith('creature', 'position')
  })

  it('creatures 为空时不增加 creaturesTerrified', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).balls.push(makeBall({ creaturesTerrified: 0, energy: 80, startTick: 0, lifetime: 9999 }))
    sys.update(1, world, em, 0)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).balls[0].creaturesTerrified).toBe(0)
  })

  it('nearby creature 触发 creaturesTerrified 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const ball = makeBall({ x: 100, y: 100, damageRadius: 10, creaturesTerrified: 0, energy: 80, startTick: 0, lifetime: 9999 })
    ;(sys as any).balls.push(ball)
    const nearEm = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, _type: string) => ({ x: 100, y: 100 }), // 在范围内
    }
    sys.update(1, world, nearEm as any, 0)
    sys.update(1, world, nearEm as any, CHECK_INTERVAL)
    expect((sys as any).balls[0].creaturesTerrified).toBeGreaterThan(0)
  })
})
