import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAqueductSystem } from '../systems/WorldAqueductSystem'
import type { Aqueduct, AqueductMaterial } from '../systems/WorldAqueductSystem'

const CHECK_INTERVAL = 3500
const FLOW_RATE: Record<AqueductMaterial, number> = {
  stone: 5, brick: 10, marble: 18, reinforced: 30,
}

let nextId = 1
function makeSys() { return new WorldAqueductSystem() }
function makeAqueduct(overrides: Partial<Aqueduct> = {}): Aqueduct {
  return {
    id: nextId++,
    srcX: 10, srcY: 10, dstX: 50, dstY: 50,
    material: 'stone',
    flowRate: 5,
    integrity: 90,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
// tile=0 (DEEP_WATER) for src, tile=3 (GRASS) for dst would allow spawn
const makeWorldWater = () => ({ width: 200, height: 200, getTile: () => 0 }) as any
const em = {} as any

describe('WorldAqueductSystem', () => {
  let sys: WorldAqueductSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ─── 初始状态 ───
  it('初始aqueducts为空', () => {
    expect((sys as any).aqueducts).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('aqueducts是数组', () => {
    expect(Array.isArray((sys as any).aqueducts)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).aqueducts.push(makeAqueduct())
    expect((s2 as any).aqueducts).toHaveLength(0)
  })

  // ─── 节流逻辑 ───
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn阻止 ───
  it('getTile返回5(非水非草)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(0)
  })
  it('random > BUILD_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(0)
  })
  it('MAX_AQUEDUCTS(12)上限不超出', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).aqueducts.push(makeAqueduct({ tick: 99999, integrity: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWater(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts.length).toBeLessThanOrEqual(12)
  })

  // ─── 字段更新 ───
  it('age在update后更新为tick-tick0', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 90, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].age).toBe(CHECK_INTERVAL)
  })
  it('age<=60000时integrity不降低', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 90, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // age=CHECK_INTERVAL=3500 < 60000, no integrity decrease
    expect((sys as any).aqueducts[0].integrity).toBe(90)
  })
  it('age>60000时integrity降低0.08', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 90, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 70000)
    // age=70000 > 60000, integrity = max(5, 90-0.08) = 89.92
    expect((sys as any).aqueducts[0].integrity).toBeCloseTo(89.92, 4)
  })
  it('integrity不低于5', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 5.1, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, 70000)
    // age=70000 > 60000, integrity = max(5, 5.1-0.08) = 5.02 >= 5
    expect((sys as any).aqueducts[0].integrity).toBeGreaterThanOrEqual(5)
  })
  it('flowRate根据integrity和material更新', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 50, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // flowRate = FLOW_RATE['stone'] * (50/100) = 5 * 0.5 = 2.5
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(2.5, 5)
  })
  it('integrity=100时flowRate等于材料最大值', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 100, material: 'marble' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(18, 5)
  })

  // ─── cleanup（integrity<=5时删除）───
  it('integrity<=5时aqueduct被删除', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 5, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // age=3500 < 60000, integrity stays 5, splice when <=5
    expect((sys as any).aqueducts).toHaveLength(0)
  })
  it('integrity>5时不被删除', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 6, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(1)
  })
  it('混合integrity：只删除<=5的', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 5, material: 'stone' }))
    ;(sys as any).aqueducts.push(makeAqueduct({ tick: 0, integrity: 50, material: 'marble' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts).toHaveLength(1)
    expect((sys as any).aqueducts[0].integrity).toBe(50)
  })

  // ─── 材质覆盖 ───
  it('stone材质flowRate=5*integrity/100', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 100, material: 'stone' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(5, 5)
  })
  it('reinforced材质flowRate=30*integrity/100', () => {
    ;(sys as any).aqueducts.push(makeAqueduct({ integrity: 100, material: 'reinforced' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).aqueducts[0].flowRate).toBeCloseTo(30, 5)
  })

  // ─── 手动注入 ───
  it('手动注入aqueduct后长度正确', () => {
    ;(sys as any).aqueducts.push(makeAqueduct())
    expect((sys as any).aqueducts).toHaveLength(1)
  })
  it('手动注入多条aqueduct', () => {
    for (let i = 0; i < 5; i++) (sys as any).aqueducts.push(makeAqueduct())
    expect((sys as any).aqueducts).toHaveLength(5)
  })

  // ─── 边界条件 ───
  it('tick=0不触发', () => {
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 9999999)).not.toThrow()
  })
  it('aqueducts为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, CHECK_INTERVAL)).not.toThrow()
  })
  it('aqueduct字段包含id', () => {
    const a = makeAqueduct({ id: 99 })
    expect(a.id).toBe(99)
  })
  it('aqueduct字段包含material', () => {
    const a = makeAqueduct({ material: 'brick' })
    expect(a.material).toBe('brick')
  })
})
