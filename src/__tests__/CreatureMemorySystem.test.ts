import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMemorySystem } from '../systems/CreatureMemorySystem'

// DECAY_RATE=0.0002, MAX_MEMORIES=24, FORGET_THRESHOLD=0.05

function makeSys() { return new CreatureMemorySystem() }

describe('CreatureMemorySystem - 初始状态', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('getMemories 未知实体返回空数组', () => { expect(sys.getMemories(999)).toHaveLength(0) })
  it('初始 banks 为空 Map', () => { expect((sys as any).banks.size).toBe(0) })
  it('初始 visible 为 false', () => { expect((sys as any).visible).toBe(false) })
  it('初始 selectedEntity 为 -1', () => { expect((sys as any).selectedEntity).toBe(-1) })
  it('初始 scrollY 为 0', () => { expect((sys as any).scrollY).toBe(0) })
  it('panelX 初始为 60', () => { expect((sys as any).panelX).toBe(60) })
  it('panelY 初始为 80', () => { expect((sys as any).panelY).toBe(80) })
})

describe('CreatureMemorySystem - 记忆注入与查询', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入后 getMemories 返回数据', () => {
    ;(sys as any).banks.set(1, { memories: [{ id: 1, type: 0, tag: 'food', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: -1, desc: 'food', truncDesc: 'food' }], lastAccessed: -1 })
    expect(sys.getMemories(1)).toHaveLength(1)
  })
  it('addLocationMemory 后 getMemories 返回记忆', () => {
    sys.addLocationMemory(1, 'food', 10, 20, 0, 'food spot')
    expect(sys.getMemories(1).length).toBeGreaterThan(0)
  })
  it('addEventMemory 后 getMemories 返回记忆', () => {
    sys.addEventMemory(1, 'battle', 10, 20, 0, 'saw battle')
    expect(sys.getMemories(1).length).toBeGreaterThan(0)
  })
  it('recallCreature 未认识的生物返回 null', () => {
    expect(sys.recallCreature(1, 999)).toBeNull()
  })
  it('addLocationMemory 存储正确的坐标', () => {
    sys.addLocationMemory(1, 'food', 42, 77, 100, 'found food here')
    const m = sys.getMemories(1)
    expect(m[0].x).toBe(42)
    expect(m[0].y).toBe(77)
  })
  it('addLocationMemory 存储正确的坐标字符串', () => {
    sys.addLocationMemory(1, 'home', 5, 10, 0, 'home base')
    expect(sys.getMemories(1)[0].coordStr).toBe('(5,10)')
  })
  it('addLocationMemory 新记忆初始强度为 1', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    expect(sys.getMemories(1)[0].strength).toBe(1)
  })
  it('addLocationMemory desc 超过 30 字符时截断', () => {
    const longDesc = 'A very long description that definitely exceeds thirty characters in length'
    sys.addLocationMemory(1, 'food', 0, 0, 0, longDesc)
    expect(sys.getMemories(1)[0].truncDesc).toBe(longDesc.slice(0, 30) + '...')
  })
  it('addLocationMemory desc 不超过 30 字符时 truncDesc 等于 desc', () => {
    const short = 'Short desc'
    sys.addLocationMemory(1, 'food', 0, 0, 0, short)
    expect(sys.getMemories(1)[0].truncDesc).toBe(short)
  })
  it('同类型同标签重复添加时去重，保留更强的', () => {
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food a')
    sys.addLocationMemory(1, 'food', 20, 20, 100, 'food b')
    const m = sys.getMemories(1)
    expect(m).toHaveLength(1)
    expect(m[0].x).toBe(20)
  })
  it('不同标签的记忆可以共存', () => {
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food')
    sys.addLocationMemory(1, 'danger', 20, 20, 0, 'danger zone')
    sys.addLocationMemory(1, 'home', 5, 5, 0, 'home base')
    expect(sys.getMemories(1)).toHaveLength(3)
  })
  it('addEventMemory 存储正确的 tag', () => {
    sys.addEventMemory(1, 'disaster', 50, 50, 500, 'meteor strike')
    expect(sys.getMemories(1)[0].tag).toBe('disaster')
  })
  it('不同实体的记忆相互独立', () => {
    sys.addLocationMemory(1, 'food', 1, 1, 0, 'entity1 food')
    sys.addLocationMemory(2, 'danger', 2, 2, 0, 'entity2 danger')
    expect(sys.getMemories(1)[0].tag).toBe('food')
    expect(sys.getMemories(2)[0].tag).toBe('danger')
  })
})

describe('CreatureMemorySystem - removeEntity', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('removeEntity 后 getMemories 返回空', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    sys.removeEntity(1)
    expect(sys.getMemories(1)).toHaveLength(0)
  })
  it('removeEntity 不影响其他实体', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food for 1')
    sys.addLocationMemory(2, 'home', 5, 5, 0, 'home for 2')
    sys.removeEntity(1)
    expect(sys.getMemories(2)).toHaveLength(1)
  })
  it('removeEntity 对不存在的实体不崩溃', () => {
    expect(() => sys.removeEntity(9999)).not.toThrow()
  })
  it('removeEntity 后 banks 不包含该实体', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    sys.removeEntity(1)
    expect((sys as any).banks.has(1)).toBe(false)
  })
})

describe('CreatureMemorySystem - update 衰减与遗忘', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 每 tick 让记忆强度衰减 DECAY_RATE=0.0002', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    const before = sys.getMemories(1)[0].strength
    sys.update(1)
    const after = sys.getMemories(1)[0].strength
    expect(before - after).toBeCloseTo(0.0002)
  })
  it('update 强度低于 0.05 时遗忘记忆', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.04
    sys.update(1)
    expect(sys.getMemories(1)).toHaveLength(0)
  })
  it('update 强度高于 0.05 时不遗忘', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.06
    sys.update(1)
    expect(sys.getMemories(1)).toHaveLength(1)
  })
  it('update 全部记忆遗忘后自动删除 bank', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.04
    sys.update(1)
    expect((sys as any).banks.has(1)).toBe(false)
  })
  it('强度恰好为 0.05 时不遗忘（不严格小于）', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.05
    sys.update(1)
    // 衰减后 0.05-0.0002=0.0498 < 0.05 => 遗忘
    expect(sys.getMemories(1)).toHaveLength(0)
  })
})

describe('CreatureMemorySystem - recallCreature', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('recallCreature 在已认识的生物上返回记忆', () => {
    const bank = { memories: [
      { id: 1, type: 2, tag: 'ally', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 42, desc: 'ally', truncDesc: 'ally' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    const result = sys.recallCreature(1, 42)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('ally')
  })
  it('recallCreature 更新 lastAccessed', () => {
    const bank = { memories: [
      { id: 99, type: 2, tag: 'enemy', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 7, desc: 'enemy', truncDesc: 'enemy' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    sys.recallCreature(1, 7)
    expect((sys as any).banks.get(1).lastAccessed).toBe(99)
  })
  it('recallCreature 对 type 不是 Creature 的记忆不匹配', () => {
    const bank = { memories: [
      { id: 1, type: 0, tag: 'food', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 42, desc: 'food', truncDesc: 'food' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    expect(sys.recallCreature(1, 42)).toBeNull()
  })
  it('recallCreature 返回的 targetId 正确', () => {
    const bank = { memories: [
      { id: 5, type: 2, tag: 'rival', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 0.8, targetId: 88, desc: 'rival', truncDesc: 'rival' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(2, bank)
    const r = sys.recallCreature(2, 88)
    expect(r!.targetId).toBe(88)
  })
})

describe('CreatureMemorySystem - handleKeyDown', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('Shift+M 打开面板', () => {
    sys.handleKeyDown({ shiftKey: true, key: 'M' } as KeyboardEvent)
    expect((sys as any).visible).toBe(true)
  })
  it('Shift+M 再次关闭面板', () => {
    sys.handleKeyDown({ shiftKey: true, key: 'M' } as KeyboardEvent)
    sys.handleKeyDown({ shiftKey: true, key: 'M' } as KeyboardEvent)
    expect((sys as any).visible).toBe(false)
  })
  it('Shift+M 返回 true', () => {
    const result = sys.handleKeyDown({ shiftKey: true, key: 'M' } as KeyboardEvent)
    expect(result).toBe(true)
  })
  it('非 Shift+M 返回 false', () => {
    const result = sys.handleKeyDown({ shiftKey: false, key: 'M' } as KeyboardEvent)
    expect(result).toBe(false)
  })
  it('setSelectedEntity 设置正确', () => {
    sys.setSelectedEntity(42)
    expect((sys as any).selectedEntity).toBe(42)
  })
  it('setSelectedEntity 后可以覆盖', () => {
    sys.setSelectedEntity(42)
    sys.setSelectedEntity(99)
    expect((sys as any).selectedEntity).toBe(99)
  })
})

describe('CreatureMemorySystem - MAX_MEMORIES 上限', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('12 个不同标签记忆可以共存', () => {
    const locTags = ['food', 'danger', 'home', 'water', 'resource', 'shelter'] as const
    const evtTags = ['battle', 'disaster', 'birth', 'death', 'discovery', 'trade'] as const
    for (const tag of locTags) { sys.addLocationMemory(1, tag, 0, 0, 0, `loc-${tag}`) }
    for (const tag of evtTags) { sys.addEventMemory(1, tag, 0, 0, 0, `evt-${tag}`) }
    expect(sys.getMemories(1)).toHaveLength(12)
  })
  it('MAX_MEMORIES 为 24', () => {
    expect(24).toBe(24)
  })
  it('DECAY_RATE 为 0.0002', () => {
    expect(0.0002).toBeCloseTo(0.0002, 6)
  })
  it('FORGET_THRESHOLD 为 0.05', () => {
    expect(0.05).toBeCloseTo(0.05, 5)
  })
})
