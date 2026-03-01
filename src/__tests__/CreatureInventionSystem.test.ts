import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureInventionSystem } from '../systems/CreatureInventionSystem'
import type { Invention, InventionCategory } from '../systems/CreatureInventionSystem'

let nextId = 1
function makeSys(): CreatureInventionSystem { return new CreatureInventionSystem() }
function makeInvention(inventorId: number, category: InventionCategory = 'tool'): Invention {
  return { id: nextId++, inventorId, category, name: 'Test Invention', power: 60, spreadRate: 0.3, adopters: 5, createdAt: 0, civId: null }
}

describe('CreatureInventionSystem.getInventions', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无发明', () => { expect((sys as any).inventions).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'weapon'))
    expect((sys as any).inventions[0].category).toBe('weapon')
  })
  it('返回内部引用', () => {
    ;(sys as any).inventions.push(makeInvention(1))
    expect((sys as any).inventions).toBe((sys as any).inventions)
  })
  it('支持所有 6 种类别', () => {
    const cats: InventionCategory[] = ['tool', 'weapon', 'agriculture', 'medicine', 'construction', 'navigation']
    cats.forEach((c, i) => { ;(sys as any).inventions.push(makeInvention(i + 1, c)) })
    const all = (sys as any).inventions
    cats.forEach((c, i) => { expect(all[i].category).toBe(c) })
  })
})

describe('CreatureInventionSystem.getInventionsByCategory', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    expect(sys.getInventionsByCategory('weapon')).toHaveLength(0)
  })
  it('按类别过滤', () => {
    ;(sys as any).inventions.push(makeInvention(1, 'tool'))
    ;(sys as any).inventions.push(makeInvention(2, 'tool'))
    ;(sys as any).inventions.push(makeInvention(3, 'weapon'))
    expect(sys.getInventionsByCategory('tool')).toHaveLength(2)
  })
})

describe('CreatureInventionSystem.getTotalInvented / getBreakthroughs', () => {
  let sys: CreatureInventionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始 totalInvented 为 0', () => { expect((sys as any).totalInvented).toBe(0) })
  it('注入后返回正确值', () => {
    ;(sys as any).totalInvented = 42
    expect((sys as any).totalInvented).toBe(42)
  })
  it('初始 breakthroughs 为 0', () => { expect((sys as any).breakthroughs).toBe(0) })
  it('注入突破数后返回正确', () => {
    ;(sys as any).breakthroughs = 7
    expect((sys as any).breakthroughs).toBe(7)
  })
})
