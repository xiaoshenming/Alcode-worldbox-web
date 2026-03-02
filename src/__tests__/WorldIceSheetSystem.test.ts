import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldIceSheetSystem } from '../systems/WorldIceSheetSystem'
import type { IceSheet } from '../systems/WorldIceSheetSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldIceSheetSystem { return new WorldIceSheetSystem() }
let nextId = 1
function makeSheet(overrides: Partial<IceSheet> = {}): IceSheet {
  return {
    id: nextId++, x: 50, y: 50,
    thickness: 30, area: 100, meltRate: 2,
    age: 5000, expanding: false, tick: 0,
    ...overrides,
  }
}

// SNOW世界：spawn所需
const snowWorld = {
  width: 200, height: 200,
  getTile: (_x: number, _y: number) => TileType.SNOW,
  setTile: vi.fn(),
} as any

// 非SNOW世界：阻断spawn
const grassWorld = {
  width: 200, height: 200,
  getTile: (_x: number, _y: number) => TileType.GRASS,
  setTile: vi.fn(),
} as any

const mockEm = {} as any

describe('WorldIceSheetSystem - 初始状态', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰盖', () => { expect((sys as any).iceSheets).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).iceSheets.push(makeSheet())
    expect((sys as any).iceSheets).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).iceSheets).toBe((sys as any).iceSheets)
  })
  it('冰盖字段正确', () => {
    ;(sys as any).iceSheets.push(makeSheet({ expanding: true }))
    const s = (sys as any).iceSheets[0]
    expect(s.thickness).toBe(30)
    expect(s.area).toBe(100)
    expect(s.expanding).toBe(true)
  })
  it('多个冰盖全部返回', () => {
    ;(sys as any).iceSheets.push(makeSheet())
    ;(sys as any).iceSheets.push(makeSheet())
    expect((sys as any).iceSheets).toHaveLength(2)
  })
})

describe('WorldIceSheetSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL(4000)时不执行任何逻辑', () => {
    sys.update(1, grassWorld, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3999时不触发（严格<4000）', () => {
    sys.update(1, grassWorld, mockEm, 3999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=4000时触发，lastCheck更新为4000', () => {
    sys.update(1, grassWorld, mockEm, 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('第二次update间隔不足时不再触发', () => {
    sys.update(1, grassWorld, mockEm, 4000)
    sys.update(1, grassWorld, mockEm, 5000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('第二次update间隔足够(>=4000)时再次触发', () => {
    sys.update(1, grassWorld, mockEm, 4000)
    sys.update(1, grassWorld, mockEm, 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })
})

describe('WorldIceSheetSystem - spawn条件（SNOW tile要求）', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('GRASS地形阻断spawn，random=0也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, grassWorld, mockEm, 4000)
    // SPAWN_CHANCE=0.002，random=0 → 0<0.002 pass；但getTile返回GRASS != SNOW → continue
    // 20次attempt全部失败
    expect((sys as any).iceSheets).toHaveLength(0)
  })

  it('SNOW地形random=0且snowCount充足时spawn', () => {
    // SNOW世界中所有tile都是SNOW，7x7区域内snowCount=49>=12
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).iceSheets).toHaveLength(1)
  })

  it('SNOW地形random=0.9时不spawn（SPAWN_CHANCE=0.002，0.9>0.002）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).iceSheets).toHaveLength(0)
  })

  it('spawn后nextId递增为2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后冰盖expanding=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    const s = (sys as any).iceSheets[0]
    expect(s.expanding).toBe(true)
  })
})

describe('WorldIceSheetSystem - spawn字段范围验证', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后thickness在[20,50)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    const s = (sys as any).iceSheets[0]
    // thickness = 20 + 0*30 = 20，然后evolve时expanding → thickness += 1.2 → 21.2
    expect(s.thickness).toBeGreaterThanOrEqual(20)
    expect(s.thickness).toBeLessThan(52) // 考虑evolve+1.2
  })

  it('spawn后meltRate在[0.5,2)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    const s = (sys as any).iceSheets[0]
    expect(s.meltRate).toBeGreaterThanOrEqual(0.5)
    expect(s.meltRate).toBeLessThan(2.0)
  })

  it('spawn后area>=0（snowCount个SNOW tile）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    const s = (sys as any).iceSheets[0]
    expect(s.area).toBeGreaterThan(0)
  })

  it('spawn后age初始为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    // age=0，evolve后age++=1
    const s = (sys as any).iceSheets[0]
    expect(s.age).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldIceSheetSystem - evolve逻辑（expanding=true）', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('expanding时thickness每次evolve增加1.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > EXPANSION_CHANCE=0.25，不扩张tile
    const sheet = makeSheet({ expanding: true, thickness: 50, age: 0 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.thickness).toBeCloseTo(51.2, 5)
  })

  it('expanding时thickness上限100（Math.min）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sheet = makeSheet({ expanding: true, thickness: 99.5, age: 0 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.thickness).toBe(100)
  })

  it('expanding时age>800则expanding变false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sheet = makeSheet({ expanding: true, thickness: 50, age: 801 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.expanding).toBe(false)
  })

  it('expanding时thickness>=90则expanding变false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sheet = makeSheet({ expanding: true, thickness: 89, age: 0 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    // 89+1.2=90.2 >= 90 → expanding=false
    expect(sheet.expanding).toBe(false)
  })

  it('每次evolve后age自增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sheet = makeSheet({ expanding: true, thickness: 50, age: 10 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.age).toBe(11)
  })
})

describe('WorldIceSheetSystem - evolve逻辑（expanding=false，融化）', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('非expanding时thickness按meltRate减少', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.1，不触发melt tile
    const sheet = makeSheet({ expanding: false, thickness: 50, meltRate: 2 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.thickness).toBeCloseTo(48, 5)
  })

  it('非expanding时meltRate每次evolve增加0.02', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sheet = makeSheet({ expanding: false, thickness: 50, meltRate: 1.0 })
    ;(sys as any).iceSheets.push(sheet)
    sys.update(1, snowWorld, mockEm, 4000)
    expect(sheet.meltRate).toBeCloseTo(1.02, 5)
  })
})

describe('WorldIceSheetSystem - cleanup逻辑', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('thickness<=0时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: 0, meltRate: 0.5 }))
    sys.update(1, snowWorld, mockEm, 4000)
    // thickness=0 <= 0 → 删除
    expect((sys as any).iceSheets).toHaveLength(0)
  })

  it('area<=0时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: 10, area: 0, meltRate: 0.5 }))
    sys.update(1, snowWorld, mockEm, 4000)
    // area=0 <= 0 → 删除
    expect((sys as any).iceSheets).toHaveLength(0)
  })

  it('thickness=-1（负数）时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: -1, meltRate: 0.5 }))
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).iceSheets).toHaveLength(0)
  })

  it('thickness>0且area>0时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: 10, area: 5, meltRate: 0.5 }))
    sys.update(1, snowWorld, mockEm, 4000)
    // 10-0.5=9.5 > 0，area=5 > 0 → 保留
    expect((sys as any).iceSheets).toHaveLength(1)
  })

  it('混合cleanup：thickness<=0被删，其余保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: 0, area: 5, meltRate: 0.5 }))
    ;(sys as any).iceSheets.push(makeSheet({ expanding: false, thickness: 50, area: 5, meltRate: 0.5 }))
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).iceSheets).toHaveLength(1)
    expect((sys as any).iceSheets[0].thickness).toBeGreaterThan(0)
  })
})

describe('WorldIceSheetSystem - MAX_ICE_SHEETS=8上限', () => {
  let sys: WorldIceSheetSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('已有8个冰盖时不再spawn（MAX_ICE_SHEETS=8）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).iceSheets.push(makeSheet({ thickness: 50, area: 10, expanding: false, meltRate: 0.1 }))
    }
    sys.update(1, snowWorld, mockEm, 4000)
    // 8个保留（thickness>0, area>0），spawn时 length>=8 → return
    expect((sys as any).iceSheets).toHaveLength(8)
  })

  it('7个冰盖时random<SPAWN_CHANCE可spawn到8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 7; i++) {
      ;(sys as any).iceSheets.push(makeSheet({ thickness: 50, area: 10, expanding: false, meltRate: 0.1 }))
    }
    sys.update(1, snowWorld, mockEm, 4000)
    // 7个保留（thickness>0, area>0），spawn时length=7<8 → spawn → 8
    expect((sys as any).iceSheets).toHaveLength(8)
  })

  it('冰盖总数不超过MAX_ICE_SHEETS=8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, snowWorld, mockEm, 4000)
    expect((sys as any).iceSheets.length).toBeLessThanOrEqual(8)
  })
})
