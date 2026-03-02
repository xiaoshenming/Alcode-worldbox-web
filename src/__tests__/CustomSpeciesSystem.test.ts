import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CustomSpeciesSystem } from '../systems/CustomSpeciesSystem'
import type { Diet, CreatureSize } from '../systems/CustomSpeciesSystem'

function makeSys() { return new CustomSpeciesSystem() }

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    name: 'TestBeast',
    color: '#ff0000',
    baseHealth: 100,
    baseSpeed: 1.5,
    baseDamage: 10,
    lifespan: 500,
    reproductionRate: 1.0,
    diet: 'herbivore' as Diet,
    size: 'medium' as CreatureSize,
    aquatic: false,
    ...overrides,
  }
}

describe('CustomSpeciesSystem — 初始状态', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getAllSpecies 初始为空数组', () => {
    expect(sys.getAllSpecies()).toHaveLength(0)
  })
  it('getSpecies 未知 id 返回 null', () => {
    expect(sys.getSpecies('nonexistent')).toBeNull()
  })
  it('isPanelOpen 初始为 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('editName 初始默认值', () => {
    expect((sys as any).editName).toBe('NewSpecies')
  })
  it('editColor 初始默认值', () => {
    expect((sys as any).editColor).toBe('#44aaff')
  })
  it('editAquatic 初始为 false', () => {
    expect((sys as any).editAquatic).toBe(false)
  })
  it('draggingSlider 初始为 null', () => {
    expect((sys as any).draggingSlider).toBeNull()
  })
  it('activeField 初始为 null', () => {
    expect((sys as any).activeField).toBeNull()
  })
  it('listScroll 初始为 0', () => {
    expect((sys as any).listScroll).toBe(0)
  })
})

describe('CustomSpeciesSystem — createSpecies', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('返回字符串 id', () => {
    const id = sys.createSpecies(makeConfig())
    expect(typeof id).toBe('string')
  })
  it('id 长度大于 0', () => {
    const id = sys.createSpecies(makeConfig())
    expect(id.length).toBeGreaterThan(0)
  })
  it('第一个 id 包含 species_1', () => {
    const id = sys.createSpecies(makeConfig())
    expect(id).toBe('species_1')
  })
  it('第二个 id 为 species_2', () => {
    sys.createSpecies(makeConfig())
    const id2 = sys.createSpecies(makeConfig({ name: 'B' }))
    expect(id2).toBe('species_2')
  })
  it('创建后 getAllSpecies 长度为 1', () => {
    sys.createSpecies(makeConfig())
    expect(sys.getAllSpecies()).toHaveLength(1)
  })
  it('创建两个后长度为 2', () => {
    sys.createSpecies(makeConfig())
    sys.createSpecies(makeConfig({ name: 'B' }))
    expect(sys.getAllSpecies()).toHaveLength(2)
  })
  it('创建后 getSpecies 返回正确名称', () => {
    const id = sys.createSpecies(makeConfig({ name: 'Dragon' }))
    expect(sys.getSpecies(id)!.name).toBe('Dragon')
  })
  it('createSpecies 保存正确 color', () => {
    const id = sys.createSpecies(makeConfig({ color: '#aabbcc' }))
    expect(sys.getSpecies(id)!.color).toBe('#aabbcc')
  })
  it('createSpecies 保存正确 baseHealth', () => {
    const id = sys.createSpecies(makeConfig({ baseHealth: 250 }))
    expect(sys.getSpecies(id)!.baseHealth).toBe(250)
  })
  it('createSpecies 保存正确 baseSpeed', () => {
    const id = sys.createSpecies(makeConfig({ baseSpeed: 2.5 }))
    expect(sys.getSpecies(id)!.baseSpeed).toBe(2.5)
  })
  it('createSpecies 生成 baseSpeedStr（toFixed(1)）', () => {
    const id = sys.createSpecies(makeConfig({ baseSpeed: 2.5 }))
    expect(sys.getSpecies(id)!.baseSpeedStr).toBe('2.5')
  })
  it('baseSpeedStr 整数速度也有小数位', () => {
    const id = sys.createSpecies(makeConfig({ baseSpeed: 3 }))
    expect(sys.getSpecies(id)!.baseSpeedStr).toBe('3.0')
  })
  it('createSpecies 生成 panelInfoStr 包含名称', () => {
    const id = sys.createSpecies(makeConfig({ name: 'Wolf', baseHealth: 200, baseSpeed: 1.5 }))
    const cfg = sys.getSpecies(id)!
    expect(cfg.panelInfoStr).toContain('Wolf')
  })
  it('panelInfoStr 包含 HP 值', () => {
    const id = sys.createSpecies(makeConfig({ baseHealth: 300 }))
    expect(sys.getSpecies(id)!.panelInfoStr).toContain('300')
  })
  it('panelInfoStr 包含 SPD 字段', () => {
    const id = sys.createSpecies(makeConfig({ baseSpeed: 2.0 }))
    expect(sys.getSpecies(id)!.panelInfoStr).toContain('SPD:')
  })
  it('createSpecies 保存 diet herbivore', () => {
    const id = sys.createSpecies(makeConfig({ diet: 'herbivore' }))
    expect(sys.getSpecies(id)!.diet).toBe('herbivore')
  })
  it('createSpecies 保存 diet carnivore', () => {
    const id = sys.createSpecies(makeConfig({ diet: 'carnivore' }))
    expect(sys.getSpecies(id)!.diet).toBe('carnivore')
  })
  it('createSpecies 保存 diet omnivore', () => {
    const id = sys.createSpecies(makeConfig({ diet: 'omnivore' }))
    expect(sys.getSpecies(id)!.diet).toBe('omnivore')
  })
  it('createSpecies 保存 size tiny', () => {
    const id = sys.createSpecies(makeConfig({ size: 'tiny' }))
    expect(sys.getSpecies(id)!.size).toBe('tiny')
  })
  it('createSpecies 保存 size huge', () => {
    const id = sys.createSpecies(makeConfig({ size: 'huge' }))
    expect(sys.getSpecies(id)!.size).toBe('huge')
  })
  it('createSpecies 保存 aquatic true', () => {
    const id = sys.createSpecies(makeConfig({ aquatic: true }))
    expect(sys.getSpecies(id)!.aquatic).toBe(true)
  })
  it('createSpecies 保存 aquatic false', () => {
    const id = sys.createSpecies(makeConfig({ aquatic: false }))
    expect(sys.getSpecies(id)!.aquatic).toBe(false)
  })
  it('createSpecies 保存 baseDamage', () => {
    const id = sys.createSpecies(makeConfig({ baseDamage: 42 }))
    expect(sys.getSpecies(id)!.baseDamage).toBe(42)
  })
  it('createSpecies 保存 lifespan', () => {
    const id = sys.createSpecies(makeConfig({ lifespan: 9000 }))
    expect(sys.getSpecies(id)!.lifespan).toBe(9000)
  })
  it('createSpecies 保存 reproductionRate', () => {
    const id = sys.createSpecies(makeConfig({ reproductionRate: 2.5 }))
    expect(sys.getSpecies(id)!.reproductionRate).toBe(2.5)
  })
  it('nextId 每次创建递增', () => {
    sys.createSpecies(makeConfig())
    sys.createSpecies(makeConfig())
    expect((sys as any).nextId).toBe(3)
  })
})

describe('CustomSpeciesSystem — togglePanel', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 isPanelOpen 为 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('一次 toggle 后为 true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
  it('两次 toggle 后回到 false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('三次 toggle 后为 true', () => {
    sys.togglePanel()
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
})

describe('CustomSpeciesSystem — save/load (localStorage mock)', () => {
  let sys: CustomSpeciesSystem
  const store: Record<string, string> = {}
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v }),
      removeItem: vi.fn((k: string) => { delete store[k] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    })
    Object.keys(store).forEach(k => delete store[k])
    sys = makeSys()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('createSpecies 后 save 写入 localStorage', () => {
    sys.createSpecies(makeConfig())
    expect(localStorage.setItem).toHaveBeenCalled()
  })
  it('save 的 key 为 worldbox_species', () => {
    sys.createSpecies(makeConfig())
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    const key = calls[calls.length - 1][0]
    expect(key).toBe('worldbox_species')
  })
  it('save 写入 JSON 包含 nextId', () => {
    sys.createSpecies(makeConfig())
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    const val = JSON.parse(calls[calls.length - 1][1])
    expect(val).toHaveProperty('nextId')
  })
  it('save 写入 JSON 包含 list 数组', () => {
    sys.createSpecies(makeConfig())
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    const val = JSON.parse(calls[calls.length - 1][1])
    expect(Array.isArray(val.list)).toBe(true)
  })
  it('load 时 localStorage 为空不崩溃', () => {
    expect(() => sys.load()).not.toThrow()
  })
  it('load 时 localStorage 损坏数据不崩溃', () => {
    store['worldbox_species'] = 'INVALID_JSON{'
    expect(() => sys.load()).not.toThrow()
  })
  it('load 后恢复 nextId', () => {
    sys.createSpecies(makeConfig())
    sys.createSpecies(makeConfig({ name: 'B' }))
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    store['worldbox_species'] = calls[calls.length - 1][1]
    const sys2 = new CustomSpeciesSystem()
    expect((sys2 as any).nextId).toBe(3)
  })
  it('load 后恢复物种数量', () => {
    sys.createSpecies(makeConfig())
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    store['worldbox_species'] = calls[calls.length - 1][1]
    const sys2 = new CustomSpeciesSystem()
    expect(sys2.getAllSpecies()).toHaveLength(1)
  })
  it('load 后物种 baseSpeedStr 存在', () => {
    sys.createSpecies(makeConfig({ baseSpeed: 1.7 }))
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    store['worldbox_species'] = calls[calls.length - 1][1]
    const sys2 = new CustomSpeciesSystem()
    expect(sys2.getAllSpecies()[0].baseSpeedStr).toBe('1.7')
  })
  it('load 时缺�� baseSpeedStr 自动补全', () => {
    store['worldbox_species'] = JSON.stringify({
      nextId: 2,
      list: [{ id: 'species_1', name: 'X', color: '#fff', baseHealth: 50, baseSpeed: 2.0,
               baseDamage: 5, lifespan: 300, reproductionRate: 1, diet: 'herbivore',
               size: 'small', aquatic: false, baseSpeedStr: '', panelInfoStr: '' }]
    })
    sys.load()
    expect(sys.getAllSpecies()[0].baseSpeedStr).toBe('2.0')
  })
  it('load 时缺失 panelInfoStr 自动补全', () => {
    store['worldbox_species'] = JSON.stringify({
      nextId: 2,
      list: [{ id: 'species_1', name: 'Wolf', color: '#fff', baseHealth: 80, baseSpeed: 1.5,
               baseDamage: 5, lifespan: 300, reproductionRate: 1, diet: 'carnivore',
               size: 'large', aquatic: false, baseSpeedStr: '1.5', panelInfoStr: '' }]
    })
    sys.load()
    expect(sys.getAllSpecies()[0].panelInfoStr).toContain('Wolf')
  })
})

describe('CustomSpeciesSystem — getAllSpecies buffer 复用', () => {
  let sys: CustomSpeciesSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('多次调用 getAllSpecies 返回同一对象引用', () => {
    sys.createSpecies(makeConfig())
    const a = sys.getAllSpecies()
    const b = sys.getAllSpecies()
    expect(a).toBe(b)
  })
  it('getAllSpecies 返回数组长度正确', () => {
    for (let i = 0; i < 5; i++) sys.createSpecies(makeConfig({ name: `S${i}` }))
    expect(sys.getAllSpecies()).toHaveLength(5)
  })
  it('删除内部物种后 getAllSpecies 变短', () => {
    const id = sys.createSpecies(makeConfig())
    sys.createSpecies(makeConfig({ name: 'B' }))
    ;(sys as any).species.delete(id)
    expect(sys.getAllSpecies()).toHaveLength(1)
  })
})
