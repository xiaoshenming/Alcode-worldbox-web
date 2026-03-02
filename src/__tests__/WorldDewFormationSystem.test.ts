import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDewFormationSystem } from '../systems/WorldDewFormationSystem'
import type { DewZone } from '../systems/WorldDewFormationSystem'

const CHECK_INTERVAL = 3500
const MAX_DEW_ZONES = 12

// world mock：GRASS=3, FOREST=4, SAND=2（阻断spawn），setTile为no-op
const worldGrass  = { width: 200, height: 200, getTile: () => 3, setTile: () => {} } as any  // GRASS
const worldForest = { width: 200, height: 200, getTile: () => 4, setTile: () => {} } as any  // FOREST
const worldSand   = { width: 200, height: 200, getTile: () => 2, setTile: () => {} } as any  // 阻断spawn
const worldSnow   = { width: 200, height: 200, getTile: () => 6, setTile: () => {} } as any  // 阻断spawn
const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

function makeSys(): WorldDewFormationSystem { return new WorldDewFormationSystem() }

let nextId = 1
function makeDewZone(overrides: Partial<DewZone> = {}): DewZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    moisture: 50,
    temperature: 10,
    duration: 0,
    evaporated: false,
    tick: 0,
    ...overrides,
  }
}

describe('WorldDewFormationSystem — 基础数据结构', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无露水区', () => {
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('直接注入后可查询', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    expect((sys as any).dewZones).toHaveLength(1)
  })

  it('多个露水区全部保留', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    ;(sys as any).dewZones.push(makeDewZone())
    expect((sys as any).dewZones).toHaveLength(2)
  })

  it('露水区字段结构完整', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    const d = (sys as any).dewZones[0]
    expect(d).toHaveProperty('id')
    expect(d).toHaveProperty('x')
    expect(d).toHaveProperty('y')
    expect(d).toHaveProperty('moisture')
    expect(d).toHaveProperty('temperature')
    expect(d).toHaveProperty('duration')
    expect(d).toHaveProperty('evaporated')
    expect(d).toHaveProperty('tick')
  })

  it('字段值与注入时一致', () => {
    ;(sys as any).dewZones.push(makeDewZone({ moisture: 60, temperature: 5, evaporated: false }))
    const d = (sys as any).dewZones[0]
    expect(d.moisture).toBe(60)
    expect(d.temperature).toBe(5)
    expect(d.evaporated).toBe(false)
  })
})

describe('WorldDewFormationSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL - 1)
    expect((sys as any).dewZones).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > SPAWN_CHANCE=0.004 → 不spawn
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用间隔不足则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    sys.update(0, worldGrass, em, CHECK_INTERVAL + 1) // 不满足间隔
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL) // lastCheck 未变
  })

  it('两次间隔足够时均更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, worldGrass, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('WorldDewFormationSystem — formDew（spawn）逻辑', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('GRASS tile + random < SPAWN_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < SPAWN_CHANCE=0.004
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(1)
  })

  it('FOREST tile + random < SPAWN_CHANCE → spawn 成功', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldForest, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(1)
  })

  it('SAND tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('SNOW tile（非目标tile）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('random > SPAWN_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('达到 MAX_DEW_ZONES 后不再 spawn', () => {
    for (let i = 0; i < MAX_DEW_ZONES; i++) {
      ;(sys as any).dewZones.push(makeDewZone({ x: i * 20, y: i * 20 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(MAX_DEW_ZONES)
  })

  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的露水区 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的露水区 evaporated 初始为 false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].evaporated).toBe(false)
  })

  it('spawn 的露水区 duration 初始为 0（spawn时设0，evolveDew立即自增为1）', () => {
    // formDew设duration=0，但同一次update中evolveDew会自增duration++，所以最终为1
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].duration).toBe(1)
  })

  it('已存在露水区间距过近时不再重复 spawn（tooClose 检测）', () => {
    // 在 (10,10) 附近已有露水区，新spawn位置会落在其5格内
    // 通过mock random固定坐标：Math.floor(random*(200-4))+2, 取random=0则x=2,y=2
    // 预埋一个非常接近坐标 2,2 的露水区
    ;(sys as any).dewZones.push(makeDewZone({ x: 2, y: 2 }))
    // mock: 第1次 random(< SPAWN_CHANCE: 0.001)，后续random=0 → floor(0*196)+2=2 → tooClose
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.001 // 通过 SPAWN_CHANCE 检查
      return 0 // x=2,y=2 → tooClose → 15次全失败
    })
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    // 只有预埋的1个，新的因为tooClose无法spawn
    expect((sys as any).dewZones).toHaveLength(1)
  })
})

describe('WorldDewFormationSystem — evolveDew（演化）逻辑', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('duration 每次 update 自增 1', () => {
    ;(sys as any).dewZones.push(makeDewZone({ duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].duration).toBe(6)
  })

  it('moisture 随温度上升而增加（公式: +=3.5*(1-temp/100)，上限100）', () => {
    ;(sys as any).dewZones.push(makeDewZone({ moisture: 50, temperature: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const d = (sys as any).dewZones[0]
    // 3.5 * (1 - 10/100) = 3.5 * 0.9 = 3.15，加上50 = 53.15
    expect(d.moisture).toBeCloseTo(53.15, 1)
  })

  it('moisture 上限为 100，不超过', () => {
    ;(sys as any).dewZones.push(makeDewZone({ moisture: 99, temperature: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].moisture).toBe(100)
  })

  it('temperature 每次 update 增加 0.8 + rand*0.5', () => {
    ;(sys as any).dewZones.push(makeDewZone({ temperature: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.8+0.9*0.5=1.25
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    const d = (sys as any).dewZones[0]
    // temperature = 10 + 0.8 + 0.9*0.5 = 10 + 1.25 = 11.25
    expect(d.temperature).toBeCloseTo(11.25, 1)
  })

  it('temperature 达到 80 时 evaporated 变为 true', () => {
    ;(sys as any).dewZones.push(makeDewZone({ temperature: 79.5, moisture: 50, duration: 0, evaporated: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.8+0.45=1.25，79.5+1.25=80.75 >=80
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    // evaporated=true → cleanup 会删除
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('temperature 未达到 80 时 evaporated 保持 false', () => {
    ;(sys as any).dewZones.push(makeDewZone({ temperature: 5, evaporated: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones[0].evaporated).toBe(false)
  })
})

describe('WorldDewFormationSystem — cleanup（按 evaporated 删除）', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('evaporated=true 的露水区被删除', () => {
    ;(sys as any).dewZones.push(makeDewZone({ evaporated: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 阻断spawn
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('evaporated=false 的露水区不被删除', () => {
    ;(sys as any).dewZones.push(makeDewZone({ evaporated: false, temperature: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(1)
  })

  it('混合 evaporated 状态：只删 true 的', () => {
    ;(sys as any).dewZones.push(makeDewZone({ id: 1, evaporated: true }))
    ;(sys as any).dewZones.push(makeDewZone({ id: 2, evaporated: false, temperature: 5 }))
    ;(sys as any).dewZones.push(makeDewZone({ id: 3, evaporated: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(1)
    expect((sys as any).dewZones[0].id).toBe(2)
  })

  it('temperature >= 80 导致 evaporated=true 进而被 cleanup 删除（一次 update 完成）', () => {
    ;(sys as any).dewZones.push(makeDewZone({ temperature: 79.5, evaporated: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 79.5+0.8+0.45=80.75>=80
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })

  it('全部 evaporated=true 则清空数组', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).dewZones.push(makeDewZone({ evaporated: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dewZones).toHaveLength(0)
  })
})
