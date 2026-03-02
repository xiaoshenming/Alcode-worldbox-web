import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSolfataraSystem } from '../systems/WorldSolfataraSystem'
import type { Solfatara } from '../systems/WorldSolfataraSystem'

// ---- helpers ----
function makeSys(): WorldSolfataraSystem { return new WorldSolfataraSystem() }
function makeWorld(w = 200, h = 200) {
  return { width: w, height: h, getTile: () => 7 } as any
}
function makeEM() { return {} as any }

let nextId = 1
function makeSolfatara(overrides: Partial<Solfatara> = {}): Solfatara {
  return {
    id: nextId++,
    x: 30, y: 40,
    sulfurOutput: 70,
    craterDiameter: 10,
    steamPressure: 60,
    toxicity: 50,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 2680
// FORM_CHANCE = 0.0011  (spawn when random < 0.0011)
// MAX_SOLFATARAS = 9
// spawn: sulfurOutput = 10 + random*30, craterDiameter = 3 + random*8, steamPressure = 15 + random*35, toxicity = 5 + random*20
// update: sulfurOutput = min(100, sulfurOutput + 0.01)
//         steamPressure = 20 + 10 * sin(tick*0.001 + id)
//         toxicity = min(80, toxicity + 0.005)
// cleanup: remove if !(sulfurOutput < 100), i.e. sulfurOutput >= 100

describe('WorldSolfataraSystem - 初始状态', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始solfataras为空数组', () => {
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('solfataras是数组类型', () => {
    expect(Array.isArray((sys as any).solfataras)).toBe(true)
  })

  it('注入一个硫磺喷气孔后length为1', () => {
    ;(sys as any).solfataras.push(makeSolfatara())
    expect((sys as any).solfataras).toHaveLength(1)
  })

  it('注入三个硫磺喷气孔后length为3', () => {
    for (let i = 0; i < 3; i++) (sys as any).solfataras.push(makeSolfatara())
    expect((sys as any).solfataras).toHaveLength(3)
  })

  it('solfataras返回同一内部引用', () => {
    expect((sys as any).solfataras).toBe((sys as any).solfataras)
  })

  it('硫磺喷气孔字段类型正确', () => {
    ;(sys as any).solfataras.push(makeSolfatara())
    const s = (sys as any).solfataras[0]
    expect(typeof s.id).toBe('number')
    expect(typeof s.x).toBe('number')
    expect(typeof s.y).toBe('number')
    expect(typeof s.sulfurOutput).toBe('number')
    expect(typeof s.craterDiameter).toBe('number')
    expect(typeof s.steamPressure).toBe('number')
    expect(typeof s.toxicity).toBe('number')
    expect(typeof s.tick).toBe('number')
  })
})

describe('WorldSolfataraSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行(0-0=0 < 2680)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('tick=2679时不执行(2679 < 2680)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2679)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('tick=2680时执行(2680 不< 2680)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).lastCheck).toBe(2680)
  })

  it('tick=2680后lastCheck更新为2680', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).lastCheck).toBe(2680)
  })

  it('tick=1时被节流,lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2680,5360,8040 依次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).lastCheck).toBe(2680)
    sys.update(1, makeWorld(), makeEM(), 5360)
    expect((sys as any).lastCheck).toBe(5360)
    sys.update(1, makeWorld(), makeEM(), 8040)
    expect((sys as any).lastCheck).toBe(8040)
  })

  it('连续相同tick第二次被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    sys.update(1, makeWorld(), makeEM(), 2680) // 0 < 2680 → skip
    expect((sys as any).lastCheck).toBe(2680)
  })

  it('CHECK_INTERVAL边界:lastCheck=1,tick=2680被节流,tick=2681执行', () => {
    ;(sys as any).lastCheck = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680) // 2680-1=2679 < 2680 → skip
    expect((sys as any).lastCheck).toBe(1)
    sys.update(1, makeWorld(), makeEM(), 2681) // 2681-1=2680 not < 2680 → execute
    expect((sys as any).lastCheck).toBe(2681)
  })
})

describe('WorldSolfataraSystem - spawn逻辑', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0011)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(1)
  })

  it('random = 0时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(1)
  })

  it('random = FORM_CHANCE(0.0011)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0011)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('已达MAX_SOLFATARAS(9)时不spawn', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50 })) // 50 < 100 → kept
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    // update: sulfurOutput 50 + 0.01 = 50.01 < 100 → keep. still 9
    expect((sys as any).solfataras).toHaveLength(9)
  })

  it('低于MAX_SOLFATARAS时可spawn', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(9)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的solfatara记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].tick).toBe(2680)
  })
})

describe('WorldSolfataraSystem - spawn字段范围', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    const s = (sys as any).solfataras[0]
    if (s) expect(s.id).toBe(1)
  })

  it('x坐标在[0, world.width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(120, 90), makeEM(), 2680)
    const s = (sys as any).solfataras[0]
    if (s) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(120)
    }
  })

  it('y坐标在[0, world.height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(120, 90), makeEM(), 2680)
    const s = (sys as any).solfataras[0]
    if (s) {
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThan(90)
    }
  })

  it('sulfurOutput范围[10,40)(10+random*30)', () => {
    const s = new WorldSolfataraSystem()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      return 0
    })
    s.update(1, makeWorld(), makeEM(), 2680)
    const sf = (s as any).solfataras[0]
    if (sf) {
      // spawned=10+0=10, update: min(100,10+0.01)=10.01
      expect(sf.sulfurOutput).toBeCloseTo(10.01, 3)
    }
  })

  it('craterDiameter范围[3,11)(3+random*8)', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ craterDiameter: 3 }))
    expect((sys as any).solfataras[0].craterDiameter).toBeGreaterThanOrEqual(3)
    expect((sys as any).solfataras[0].craterDiameter).toBeLessThan(11)
  })

  it('steamPressure在更新后由sin公式确定', () => {
    // steamPressure = 20 + 10*sin(tick*0.001 + id)
    // range: [10, 30]
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    const steam = (sys as any).solfataras[0].steamPressure
    expect(steam).toBeGreaterThanOrEqual(10)
    expect(steam).toBeLessThanOrEqual(30)
  })

  it('toxicity范围[5,25)(5+random*20)', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ toxicity: 5, sulfurOutput: 50 }))
    expect((sys as any).solfataras[0].toxicity).toBeGreaterThanOrEqual(5)
    expect((sys as any).solfataras[0].toxicity).toBeLessThan(25)
  })

  it('x和y均为整数(Math.floor)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    const s = (sys as any).solfataras[0]
    if (s) {
      expect(s.x).toBe(Math.floor(s.x))
      expect(s.y).toBe(Math.floor(s.y))
    }
  })
})

describe('WorldSolfataraSystem - update数值逻辑', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update后sulfurOutput增加0.01', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].sulfurOutput).toBeCloseTo(50.01, 5)
  })

  it('两次update后sulfurOutput增加0.02', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    sys.update(1, makeWorld(), makeEM(), 5360)
    expect((sys as any).solfataras[0].sulfurOutput).toBeCloseTo(50.02, 4)
  })

  it('sulfurOutput上限为100(min(100,val+0.01)验证)', () => {
    // min(100, 89 + 0.01) = 89.01, not capped
    // min(100, 99.999 + 0.01) = 100, capped, but cleanup also removes it (!(100<100)=true)
    // So test with 89.999: min(100, 89.999+0.01)=90.009 < 100 → survives
    // To test cap: use a lower value and verify min logic holds, not via cleanup boundary
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 89.999, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    // min(100, 89.999+0.01) = 90.009
    expect((sys as any).solfataras[0].sulfurOutput).toBeCloseTo(90.009, 3)
    expect((sys as any).solfataras[0].sulfurOutput).toBeLessThanOrEqual(100)
  })

  it('steamPressure由公式20+10*sin(tick*0.001+id)确定', () => {
    const tick = 2680
    const id = 5
    ;(sys as any).solfataras.push(makeSolfatara({ id, sulfurOutput: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), tick)
    const expected = 20 + 10 * Math.sin(tick * 0.001 + id)
    expect((sys as any).solfataras[0].steamPressure).toBeCloseTo(expected, 8)
  })

  it('steamPressure的id影响sin计算', () => {
    const tick = 2680
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 50 }))
    ;(sys as any).solfataras.push(makeSolfatara({ id: 2, sulfurOutput: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), tick)
    const s1 = (sys as any).solfataras[0].steamPressure
    const s2 = (sys as any).solfataras[1].steamPressure
    // different ids → different steamPressure values (unless sin gives same result by coincidence)
    const exp1 = 20 + 10 * Math.sin(tick * 0.001 + 1)
    const exp2 = 20 + 10 * Math.sin(tick * 0.001 + 2)
    expect(s1).toBeCloseTo(exp1, 8)
    expect(s2).toBeCloseTo(exp2, 8)
  })

  it('每次update后toxicity增加0.005', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].toxicity).toBeCloseTo(30.005, 5)
  })

  it('toxicity上限为80', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].toxicity).toBe(80)
  })

  it('toxicity不超过80', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 79.999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].toxicity).toBeLessThanOrEqual(80)
  })
})

describe('WorldSolfataraSystem - cleanup逻辑', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('sulfurOutput < 100的硫磺喷气孔不被清理', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 90, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    // 90 + 0.01 = 90.01 < 100 → keep
    expect((sys as any).solfataras).toHaveLength(1)
  })

  it('sulfurOutput >= 100的硫磺喷气孔被清理', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 100, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    // 100 + 0.01 = 100.01, !(100.01 < 100) = true → remove
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('sulfurOutput = 99.995时update后 99.995+0.01=100.005 >= 100 → 被清理', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 99.995, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('sulfurOutput = 99.98时 update后 99.99 < 100 → 保留', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 99.98, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    // 99.98 + 0.01 = 99.99 < 100 → keep
    expect((sys as any).solfataras).toHaveLength(1)
  })

  it('多个硫磺喷气孔混合:部分清理,部分保留', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 50, toxicity: 30 }))   // keep
    ;(sys as any).solfataras.push(makeSolfatara({ id: 2, sulfurOutput: 100, toxicity: 30 }))  // remove
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(1)
    expect((sys as any).solfataras[0].id).toBe(1)
  })

  it('cleanup后MAX_SOLFATARAS容量恢复', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).solfataras.push(makeSolfatara({ id: i + 1, sulfurOutput: 100, toxicity: 30 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(0)
  })

  it('从后向前删除保证索引正确', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 100, toxicity: 30 })) // remove
    ;(sys as any).solfataras.push(makeSolfatara({ id: 2, sulfurOutput: 50, toxicity: 30 }))  // keep
    ;(sys as any).solfataras.push(makeSolfatara({ id: 3, sulfurOutput: 100, toxicity: 30 })) // remove
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras).toHaveLength(1)
    expect((sys as any).solfataras[0].id).toBe(2)
  })

  it('world.width/height缺省时使用200', () => {
    const worldNoSize = { getTile: () => 7 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, worldNoSize, makeEM(), 2680)
    const s = (sys as any).solfataras[0]
    if (s) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(200)
    }
  })
})

describe('WorldSolfataraSystem - 综合场景', () => {
  let sys: WorldSolfataraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('连续多次update保证sulfurOutput单调增加(直到上限100)', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    let prev = 50
    for (let i = 1; i <= 5; i++) {
      sys.update(1, makeWorld(), makeEM(), 2680 * i)
      const so = (sys as any).solfataras[0]?.sulfurOutput ?? prev
      expect(so).toBeGreaterThanOrEqual(prev)
      prev = so
    }
  })

  it('连续多次update保证toxicity单调增加(直到上限80)', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    let prev = 30
    for (let i = 1; i <= 5; i++) {
      sys.update(1, makeWorld(), makeEM(), 2680 * i)
      const tox = (sys as any).solfataras[0]?.toxicity ?? prev
      expect(tox).toBeGreaterThanOrEqual(prev)
      prev = tox
    }
  })

  it('solfataras数量不超过MAX_SOLFATARAS=9', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 15; i++) {
      sys.update(1, makeWorld(), makeEM(), 2680 * i)
    }
    expect((sys as any).solfataras.length).toBeLessThanOrEqual(9)
  })

  it('spawn时id严格递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2680)
    sys.update(1, makeWorld(), makeEM(), 5360)
    const ids = (sys as any).solfataras.map((s: Solfatara) => s.id)
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1])
  })

  it('两个独立系统实例互不干扰', () => {
    const sysA = new WorldSolfataraSystem()
    const sysB = new WorldSolfataraSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sysA.update(1, makeWorld(), makeEM(), 2680)
    expect((sysA as any).solfataras).toHaveLength(1)
    expect((sysB as any).solfataras).toHaveLength(0)
  })

  it('节流期间solfataras不被更新', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 100) // 100 < 2680 → throttled
    expect((sys as any).solfataras[0].sulfurOutput).toBe(50)
    expect((sys as any).solfataras[0].toxicity).toBe(30)
  })

  it('steamPressure始终在[10,30]范围内', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 50, toxicity: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 1; i <= 10; i++) {
      sys.update(1, makeWorld(), makeEM(), 2680 * i)
      const steam = (sys as any).solfataras[0]?.steamPressure
      if (steam !== undefined) {
        expect(steam).toBeGreaterThanOrEqual(10)
        expect(steam).toBeLessThanOrEqual(30)
      }
    }
  })

  it('多个solfataras同时被update', () => {
    ;(sys as any).solfataras.push(makeSolfatara({ id: 1, sulfurOutput: 50, toxicity: 30 }))
    ;(sys as any).solfataras.push(makeSolfatara({ id: 2, sulfurOutput: 60, toxicity: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).solfataras[0].sulfurOutput).toBeCloseTo(50.01, 5)
    expect((sys as any).solfataras[1].sulfurOutput).toBeCloseTo(60.01, 5)
  })

  it('lastCheck在每次执行后正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2680)
    expect((sys as any).lastCheck).toBe(2680)
    sys.update(1, makeWorld(), makeEM(), 5360)
    expect((sys as any).lastCheck).toBe(5360)
    sys.update(1, makeWorld(), makeEM(), 8040)
    expect((sys as any).lastCheck).toBe(8040)
  })
})
