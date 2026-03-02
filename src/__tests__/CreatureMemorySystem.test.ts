import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMemorySystem } from '../systems/CreatureMemorySystem'

function makeSys() { return new CreatureMemorySystem() }

describe('CreatureMemorySystem', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys() })

  // ── 原有5个测试（保留） ──

  it('getMemories未知实体返回空数组', () => { expect(sys.getMemories(999)).toHaveLength(0) })

  it('注入后getMemories返回数据', () => {
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

  it('recallCreature 未认识的生物返回null', () => {
    expect(sys.recallCreature(1, 999)).toBeNull()
  })

  // ── 新增测试 ──

  it('addLocationMemory 存储正确的坐标', () => {
    sys.addLocationMemory(1, 'food', 42, 77, 100, 'found food here')
    const memories = sys.getMemories(1)
    expect(memories[0].x).toBe(42)
    expect(memories[0].y).toBe(77)
  })

  it('addLocationMemory 存储正确的坐标字符串', () => {
    sys.addLocationMemory(1, 'home', 5, 10, 0, 'home base')
    const memories = sys.getMemories(1)
    expect(memories[0].coordStr).toBe('(5,10)')
  })

  it('addLocationMemory 新记忆初始强度为1', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    const memories = sys.getMemories(1)
    expect(memories[0].strength).toBe(1)
  })

  it('addLocationMemory desc超过30字符时生成截断版本', () => {
    const longDesc = 'A very long description that definitely exceeds thirty characters in length'
    sys.addLocationMemory(1, 'food', 0, 0, 0, longDesc)
    const memories = sys.getMemories(1)
    expect(memories[0].truncDesc).toBe(longDesc.slice(0, 30) + '...')
    expect(memories[0].desc).toBe(longDesc)
  })

  it('addLocationMemory desc不超过30字符时truncDesc等于desc', () => {
    const shortDesc = 'Short desc'
    sys.addLocationMemory(1, 'food', 0, 0, 0, shortDesc)
    const memories = sys.getMemories(1)
    expect(memories[0].truncDesc).toBe(shortDesc)
  })

  it('同类型同标签重复添加时去重，保留更强的', () => {
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food a')
    sys.addLocationMemory(1, 'food', 20, 20, 100, 'food b')
    // 第二次添加强度>=第一次(都是1)，会替换
    const memories = sys.getMemories(1)
    expect(memories).toHaveLength(1)
    expect(memories[0].x).toBe(20)
    expect(memories[0].y).toBe(20)
  })

  it('同类型同标签再次添加时增强现有强度（当新的不更强时）', () => {
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food a')
    // 手动降低强度
    ;(sys as any).banks.get(1).memories[0].strength = 0.8
    // 再次添加同类型记忆，新的初始强度1 >= 0.8，会替换
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food a updated')
    const memories = sys.getMemories(1)
    expect(memories).toHaveLength(1)
    expect(memories[0].strength).toBe(1)
  })

  it('不同标签的记忆可以共存', () => {
    sys.addLocationMemory(1, 'food', 10, 10, 0, 'food')
    sys.addLocationMemory(1, 'danger', 20, 20, 0, 'danger zone')
    sys.addLocationMemory(1, 'home', 5, 5, 0, 'home base')
    const memories = sys.getMemories(1)
    expect(memories).toHaveLength(3)
  })

  it('addEventMemory 存储正确的tag', () => {
    sys.addEventMemory(1, 'disaster', 50, 50, 500, 'meteor strike')
    const memories = sys.getMemories(1)
    expect(memories[0].tag).toBe('disaster')
  })

  it('removeEntity 后 getMemories 返回空', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    expect(sys.getMemories(1)).toHaveLength(1)
    sys.removeEntity(1)
    expect(sys.getMemories(1)).toHaveLength(0)
  })

  it('removeEntity 不影响其他实体', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food for 1')
    sys.addLocationMemory(2, 'home', 5, 5, 0, 'home for 2')
    sys.removeEntity(1)
    expect(sys.getMemories(1)).toHaveLength(0)
    expect(sys.getMemories(2)).toHaveLength(1)
  })

  it('update 每tick让记忆强度衰减', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    const before = sys.getMemories(1)[0].strength
    sys.update(1)
    const after = sys.getMemories(1)[0].strength
    expect(after).toBeLessThan(before)
    // 衰减率为0.0002
    expect(before - after).toBeCloseTo(0.0002)
  })

  it('update 强度低于0.05时遗忘记忆', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    // 手动设置强度刚好低于遗忘阈值
    ;(sys as any).banks.get(1).memories[0].strength = 0.04
    sys.update(1)
    expect(sys.getMemories(1)).toHaveLength(0)
  })

  it('update 强度高于0.05时不遗忘记忆', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.06
    sys.update(1)
    // 衰减后0.06-0.0002=0.0598 > 0.05，不遗忘
    expect(sys.getMemories(1)).toHaveLength(1)
  })

  it('记忆数量超过MAX_MEMORIES(24)时淘汰最弱记忆', () => {
    // 添加24个不同标签记忆（使用location和event组合）
    // 先添加23个位置记忆（每个不同tag其实只有6种，改用不同坐标但相同tag会去重）
    // 改用6种location tag各4个event + 6种event各4个 = 超出
    // 实际：用6种location + 6种event = 12种，每种1个
    const locationTags = ['food', 'danger', 'home', 'water', 'resource', 'shelter'] as const
    const eventTags = ['battle', 'disaster', 'birth', 'death', 'discovery', 'trade'] as const
    for (const tag of locationTags) {
      sys.addLocationMemory(1, tag, 0, 0, 0, `loc-${tag}`)
    }
    for (const tag of eventTags) {
      sys.addEventMemory(1, tag, 0, 0, 0, `evt-${tag}`)
    }
    // 共12个，小于24
    expect(sys.getMemories(1)).toHaveLength(12)
  })

  it('recallCreature 在已认识的生物上返回记忆', () => {
    // 通过内部注入一个生物记忆(type=2代表Creature)
    const bank = { memories: [
      { id: 1, type: 2 /* MemoryType.Creature */, tag: 'ally', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 42, desc: 'friendly creature', truncDesc: 'friendly creature' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    const result = sys.recallCreature(1, 42)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('ally')
    expect(result!.targetId).toBe(42)
  })

  it('recallCreature 更新lastAccessed', () => {
    const bank = { memories: [
      { id: 99, type: 2, tag: 'enemy', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 7, desc: 'enemy', truncDesc: 'enemy' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    sys.recallCreature(1, 7)
    expect((sys as any).banks.get(1).lastAccessed).toBe(99)
  })

  it('recallCreature 对type不是Creature的记忆不匹配', () => {
    // type=0 是Location，targetId=42但非Creature类型
    const bank = { memories: [
      { id: 1, type: 0 /* MemoryType.Location */, tag: 'food', x: 0, y: 0, coordStr: '(0,0)', tick: 0, strength: 1, targetId: 42, desc: 'food', truncDesc: 'food' }
    ], lastAccessed: -1 }
    ;(sys as any).banks.set(1, bank)
    expect(sys.recallCreature(1, 42)).toBeNull()
  })

  it('update 全部记忆遗忘后自动删除bank', () => {
    sys.addLocationMemory(1, 'food', 0, 0, 0, 'food')
    ;(sys as any).banks.get(1).memories[0].strength = 0.04
    sys.update(1)
    // bank应被删除
    expect((sys as any).banks.has(1)).toBe(false)
  })

  it('不同实体的记忆相互独立', () => {
    sys.addLocationMemory(1, 'food', 1, 1, 0, 'entity1 food')
    sys.addLocationMemory(2, 'danger', 2, 2, 0, 'entity2 danger')
    const mem1 = sys.getMemories(1)
    const mem2 = sys.getMemories(2)
    expect(mem1).toHaveLength(1)
    expect(mem2).toHaveLength(1)
    expect(mem1[0].tag).toBe('food')
    expect(mem2[0].tag).toBe('danger')
  })
})
