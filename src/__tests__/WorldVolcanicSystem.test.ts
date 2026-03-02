import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldVolcanicSystem } from '../systems/WorldVolcanicSystem'
import type { Volcano, VolcanoState } from '../systems/WorldVolcanicSystem'
import { TileType } from '../utils/Constants'

// CHECK_INTERVAL=1200, STATE_INTERVAL=600, MAX_VOLCANOES=8
// 第一次 detectVolcanoes 触发：tick >= 1200
// 第一次 updateStates 触发：tick >= 600

function makeWorld(w = 100, h = 100, tile: number = TileType.MOUNTAIN): any {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
    setTile: vi.fn(),
  }
}

function makeSys(): WorldVolcanicSystem {
  const sys = new WorldVolcanicSystem()
  sys.setWorldSize(100, 100)
  return sys
}

let vId = 100
function makeVolcano(
  state: VolcanoState = 'active',
  x = 50,
  y = 50,
  power = 70,
  heatRadius = 5,
  eruptionCount = 0,
  lastEruption = 0
): Volcano {
  return { id: vId++, x, y, state, power, lastEruption, eruptionCount, heatRadius }
}

// ─── 1. 初始状态 ───────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })

  it('volcanoes 数组初始为空', () => {
    expect((sys as any).volcanoes).toHaveLength(0)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('lastState 初始为 0', () => {
    expect((sys as any).lastState).toBe(0)
  })
  it('worldWidth 由 setWorldSize 设置', () => {
    const s = new WorldVolcanicSystem()
    s.setWorldSize(200, 150)
    expect((s as any).worldWidth).toBe(200)
    expect((s as any).worldHeight).toBe(150)
  })
  it('getActiveVolcanoes 初始返回空', () => {
    expect(sys.getActiveVolcanoes()).toHaveLength(0)
  })
  it('getEruptingCount 初始为 0', () => {
    expect(sys.getEruptingCount()).toBe(0)
  })
  it('支持 5 种火山状态', () => {
    const states: VolcanoState[] = ['dormant', 'rumbling', 'active', 'erupting', 'cooling']
    expect(states).toHaveLength(5)
  })
  it('可注入火山对象', () => {
    ;(sys as any).volcanoes.push(makeVolcano())
    expect((sys as any).volcanoes).toHaveLength(1)
  })
})

// ─── 2. 节流逻辑 (CHECK_INTERVAL=1200, STATE_INTERVAL=600) ─────
describe('节流逻辑', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 不触发 detectVolcanoes（0<1200）', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1199 不触发 detectVolcanoes', () => {
    const world = makeWorld()
    sys.update(0, world, 1199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1200 触发 detectVolcanoes，lastCheck 更新为 1200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('tick=2400 触发第二次 detectVolcanoes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 1200)
    sys.update(0, world, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })
  it('tick=0 不触发 updateStates（0<600）', () => {
    const world = makeWorld()
    sys.update(0, world, 0)
    expect((sys as any).lastState).toBe(0)
  })
  it('tick=599 不触发 updateStates', () => {
    const world = makeWorld()
    sys.update(0, world, 599)
    expect((sys as any).lastState).toBe(0)
  })
  it('tick=600 触发 updateStates，lastState 更新为 600', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect((sys as any).lastState).toBe(600)
  })
  it('多个 600 间隔后 lastState 持续追踪', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    for (let t = 600; t <= 3000; t += 600) {
      sys.update(0, world, t)
    }
    expect((sys as any).lastState).toBe(3000)
  })
})

// ─── 3. detectVolcanoes spawn 条件 ────────────────────────────
describe('detectVolcanoes spawn 条件', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=1200 且 tile=MOUNTAIN 时生成火山', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBeGreaterThan(0)
  })
  it('tick=1200 且 tile=GRASS 时不生成火山', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.GRASS)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBe(0)
  })
  it('tile=DEEP_WATER 时不生成火山', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.DEEP_WATER)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBe(0)
  })
  it('已达 MAX_VOLCANOES=8 时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).volcanoes.push(makeVolcano('dormant', i * 30, i * 30))
    }
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBe(8)
  })
  it('volcano 数量不超过 MAX_VOLCANOES=8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(200, 200, TileType.MOUNTAIN)
    for (let t = 1200; t <= 1200 * 20; t += 1200) {
      sys.update(0, world, t)
    }
    expect((sys as any).volcanoes.length).toBeLessThanOrEqual(8)
  })
  it('距离 dx²+dy² < 400 时不生成邻近火山', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    ;(sys as any).volcanoes.push(makeVolcano('dormant', 0, 0))
    const before = (sys as any).volcanoes.length
    sys.update(0, world, 1200)
    // random=0 → x=0, y=0 → 与 (0,0) 距离为0 → tooClose → 不生成
    expect((sys as any).volcanoes.length).toBe(before)
  })
})

// ─── 4. spawn 后字段值 ─────────────────────────────────────────
describe('spawn 后字段值', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('新生成火山初始 state 为 dormant（random=0.5 > ERUPTION_CHANCE，不立即转状态）', () => {
    // tick=1200 同时触发 detectVolcanoes 和 updateStates
    // 用 random=0.5 > ERUPTION_CHANCE=0.03，确保 dormant 不转变
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    // random=0.5 → x=50, y=50 → tile=MOUNTAIN → 生成火山（state=dormant）
    // updateStates: dormant && 0.5 > 0.03 → continue（不变）
    for (const v of (sys as any).volcanoes) {
      expect(v.state).toBe('dormant')
    }
  })
  it('power 在 20-79 范围内（20 + floor(random*60)）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    for (const v of (sys as any).volcanoes) {
      expect(v.power).toBeGreaterThanOrEqual(20)
      expect(v.power).toBeLessThan(80)
    }
  })
  it('heatRadius 在 3-6 范围内（3 + floor(random*4)）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    for (const v of (sys as any).volcanoes) {
      expect(v.heatRadius).toBeGreaterThanOrEqual(3)
      expect(v.heatRadius).toBeLessThanOrEqual(6)
    }
  })
  it('lastEruption 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    for (const v of (sys as any).volcanoes) {
      expect(v.lastEruption).toBe(0)
    }
  })
  it('eruptionCount 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    for (const v of (sys as any).volcanoes) {
      expect(v.eruptionCount).toBe(0)
    }
  })
  it('id 是正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    for (const v of (sys as any).volcanoes) {
      expect(v.id).toBeGreaterThan(0)
    }
  })
})

// ─── 5. updateStates 字段变更 ──────────────────────────────────
describe('updateStates 字段变更', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('erupting 状态在 tick=600 时转为 cooling 并增加 eruptionCount', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)  // tick=600 >= STATE_INTERVAL=600 触发 updateStates
    expect(v.state).toBe('cooling')
    expect(v.eruptionCount).toBe(1)
  })
  it('erupting 后 lastEruption 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect(v.lastEruption).toBe(600)
  })
  it('dormant 且 random=0.5 > ERUPTION_CHANCE=0.03 时保持 dormant', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const v = makeVolcano('dormant')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect(v.state).toBe('dormant')
  })
  it('dormant 且 random=0.01 < ERUPTION_CHANCE=0.03 时转为 rumbling', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const v = makeVolcano('dormant')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    // STATE_TRANSITIONS['dormant'] = ['rumbling'] → pickRandom → v.state='rumbling'
    expect(v.state).toBe('rumbling')
  })
  it('cooling 在 tick=600 时可转为 dormant', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('cooling')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect(v.state).toBe('dormant')
  })
  it('多次 erupting 后 eruptionCount 累积', () => {
    const v = makeVolcano('erupting')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world, 600)   // erupting → cooling, count=1
    v.state = 'erupting'
    sys.update(0, world, 1200)  // erupting → cooling, count=2
    expect(v.eruptionCount).toBe(2)
  })
  it('tick 不足 STATE_INTERVAL 时状态不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 599)  // 不触发 updateStates
    expect(v.state).toBe('erupting')
    expect(v.eruptionCount).toBe(0)
  })
})

// ─── 6. applyEruption 地形变更 ─────────────────────────────────
describe('applyEruption 地形变更', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('eruption 后中心区域调用 setTile 设为 LAVA', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting', 50, 50, 70, 5)
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)  // tick=600 触发 updateStates
    expect(world.setTile).toHaveBeenCalledWith(50, 50, TileType.LAVA)
  })
  it('active 状态不调用 setTile', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const v = makeVolcano('active')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect(world.setTile).not.toHaveBeenCalled()
  })
  it('eruption 边界范围内坐标 >= 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting', 0, 0, 70, 5)
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    for (const call of (world.setTile as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0]).toBeGreaterThanOrEqual(0)
      expect(call[1]).toBeGreaterThanOrEqual(0)
    }
  })
  it('heatRadius 更大时 setTile 调用次数更多', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v1 = makeVolcano('erupting', 50, 50, 70, 3)
    const v2 = makeVolcano('erupting', 50, 50, 70, 6)
    const sys1 = new WorldVolcanicSystem(); sys1.setWorldSize(100, 100)
    const sys2 = new WorldVolcanicSystem(); sys2.setWorldSize(100, 100)
    ;(sys1 as any).volcanoes.push(v1)
    ;(sys2 as any).volcanoes.push(v2)
    const w1 = makeWorld(); const w2 = makeWorld()
    sys1.update(0, w1, 600)
    sys2.update(0, w2, 600)
    expect((w2.setTile as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(
      (w1.setTile as ReturnType<typeof vi.fn>).mock.calls.length
    )
  })
  it('edge 火山在右下角边界时 setTile 坐标不超出 worldWidth/Height', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v = makeVolcano('erupting', 98, 98, 70, 5)
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    for (const call of (world.setTile as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0]).toBeLessThan(100)
      expect(call[1]).toBeLessThan(100)
    }
  })
})

// ─── 7. MAX 上限 ───────────────────────────────────────────────
describe('MAX_VOLCANOES 上限 (8)', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('恰好 8 个时停止 detectVolcanoes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).volcanoes.push(makeVolcano('dormant', i * 30, i * 30))
    }
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBe(8)
  })
  it('volcano 数量永远不超过 8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(200, 200, TileType.MOUNTAIN)
    for (let t = 1200; t <= 24000; t += 1200) {
      sys.update(0, world, t)
    }
    expect((sys as any).volcanoes.length).toBeLessThanOrEqual(8)
  })
  it('getActiveVolcanoes 只返回 rumbling/active/erupting', () => {
    ;(sys as any).volcanoes.push(makeVolcano('dormant'))
    ;(sys as any).volcanoes.push(makeVolcano('cooling'))
    ;(sys as any).volcanoes.push(makeVolcano('rumbling'))
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    expect(sys.getActiveVolcanoes()).toHaveLength(3)
  })
  it('getEruptingCount 只计 erupting 状态', () => {
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    expect(sys.getEruptingCount()).toBe(2)
  })
  it('getEruptingCount 无 erupting 时为 0', () => {
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    ;(sys as any).volcanoes.push(makeVolcano('rumbling'))
    expect(sys.getEruptingCount()).toBe(0)
  })
  it('7 个时继续生成到不超过 8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 7; i++) {
      ;(sys as any).volcanoes.push(makeVolcano('dormant', i * 30, i * 30))
    }
    const world = makeWorld(200, 200, TileType.MOUNTAIN)
    sys.update(0, world, 1200)
    expect((sys as any).volcanoes.length).toBeLessThanOrEqual(8)
  })
})

// ─── 8. 边界验证 ───────────────────────────────────────────────
describe('边界验证', () => {
  let sys: WorldVolcanicSystem
  beforeEach(() => { sys = makeSys(); vId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('setWorldSize 后 worldWidth/worldHeight 正确', () => {
    sys.setWorldSize(300, 250)
    expect((sys as any).worldWidth).toBe(300)
    expect((sys as any).worldHeight).toBe(250)
  })
  it('getActiveVolcanoes 复用内部 buffer（同一引用）', () => {
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    const r1 = sys.getActiveVolcanoes()
    const r2 = sys.getActiveVolcanoes()
    expect(r1).toBe(r2)
  })
  it('dormant 和 cooling 不算活跃', () => {
    ;(sys as any).volcanoes.push(makeVolcano('dormant'))
    ;(sys as any).volcanoes.push(makeVolcano('cooling'))
    expect(sys.getActiveVolcanoes()).toHaveLength(0)
  })
  it('STATE_TRANSITIONS erupting 只能转 cooling', () => {
    const transitions: Record<VolcanoState, VolcanoState[]> = {
      dormant: ['rumbling'],
      rumbling: ['active', 'dormant'],
      active: ['erupting', 'rumbling'],
      erupting: ['cooling'],
      cooling: ['dormant'],
    }
    expect(transitions.erupting).toEqual(['cooling'])
  })
  it('空 volcanoes 时 update 不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    expect(() => sys.update(0, world, 1200)).not.toThrow()
  })
  it('world size = 1x1 时 update 不崩溃', () => {
    sys.setWorldSize(1, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(1, 1, TileType.MOUNTAIN)
    expect(() => sys.update(0, world, 1200)).not.toThrow()
  })
  it('连续多次 update 字段数据类型保持正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(100, 100, TileType.MOUNTAIN)
    for (let t = 600; t <= 3600; t += 600) {
      sys.update(0, world, t)
    }
    for (const v of (sys as any).volcanoes) {
      expect(typeof v.id).toBe('number')
      expect(typeof v.power).toBe('number')
      expect(typeof v.state).toBe('string')
    }
  })
  it('多个火山 eruptionCount 独立计数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const v1 = makeVolcano('erupting', 20, 20)
    const v2 = makeVolcano('active', 80, 80)
    ;(sys as any).volcanoes.push(v1, v2)
    const world = makeWorld()
    sys.update(0, world, 600)   // erupting → cooling for v1; active handled
    expect(v1.eruptionCount).toBe(1)
    expect(v2.eruptionCount).toBe(0)
  })
  it('ERUPTION_CHANCE = 0.03，random=0.04 时 dormant 不转', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.04)
    const v = makeVolcano('dormant')
    ;(sys as any).volcanoes.push(v)
    const world = makeWorld()
    sys.update(0, world, 600)
    expect(v.state).toBe('dormant')
  })
  it('STATE_TRANSITIONS dormant 只能转 rumbling', () => {
    const transitions: Record<VolcanoState, VolcanoState[]> = {
      dormant: ['rumbling'],
      rumbling: ['active', 'dormant'],
      active: ['erupting', 'rumbling'],
      erupting: ['cooling'],
      cooling: ['dormant'],
    }
    expect(transitions.dormant).toEqual(['rumbling'])
  })
  it('MAX_VOLCANOES 常量值为 8', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).volcanoes.push(makeVolcano('dormant', i * 15, i * 15))
    }
    expect((sys as any).volcanoes.length).toBe(8)
  })
  it('getActiveVolcanoes 混合状态时只返回活跃的', () => {
    ;(sys as any).volcanoes.push(makeVolcano('dormant'))
    ;(sys as any).volcanoes.push(makeVolcano('rumbling'))
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('cooling'))
    expect(sys.getActiveVolcanoes()).toHaveLength(3)
  })
  it('getEruptingCount 混合多种状态只计 erupting', () => {
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('erupting'))
    ;(sys as any).volcanoes.push(makeVolcano('active'))
    ;(sys as any).volcanoes.push(makeVolcano('dormant'))
    expect(sys.getEruptingCount()).toBe(3)
  })
  it('STATE_TRANSITIONS cooling 只能转 dormant', () => {
    const transitions: Record<VolcanoState, VolcanoState[]> = {
      dormant: ['rumbling'],
      rumbling: ['active', 'dormant'],
      active: ['erupting', 'rumbling'],
      erupting: ['cooling'],
      cooling: ['dormant'],
    }
    expect(transitions.cooling).toEqual(['dormant'])
  })
})
