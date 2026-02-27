import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBookbinderSystem } from '../systems/CreatureBookbinderSystem'
import type { Bookbinder, BindingStyle } from '../systems/CreatureBookbinderSystem'

let nextId = 1
function makeSys(): CreatureBookbinderSystem { return new CreatureBookbinderSystem() }
function makeBookbinder(entityId: number, style: BindingStyle = 'coptic'): Bookbinder {
  return { id: nextId++, entityId, skill: 30, booksBound: 5, style, pageCount: 100, durability: 60, tick: 0 }
}

describe('CreatureBookbinderSystem.getBookbinders', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无装订师', () => { expect(sys.getBookbinders()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1, 'leather_bound'))
    expect(sys.getBookbinders()[0].style).toBe('leather_bound')
  })

  it('返回只读引用', () => {
    ;(sys as any).bookbinders.push(makeBookbinder(1))
    expect(sys.getBookbinders()).toBe((sys as any).bookbinders)
  })

  it('支持所有 4 种装订风格', () => {
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle_stitch', 'leather_bound']
    styles.forEach((s, i) => { ;(sys as any).bookbinders.push(makeBookbinder(i + 1, s)) })
    const all = sys.getBookbinders()
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
})

describe('CreatureBookbinderSystem.getSkill', () => {
  let sys: CreatureBookbinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => {
    expect(sys.getSkill(999)).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect(sys.getSkill(42)).toBe(85)
  })

  it('多个实体各自独立', () => {
    ;(sys as any).skillMap.set(1, 40)
    ;(sys as any).skillMap.set(2, 90)
    expect(sys.getSkill(1)).toBe(40)
    expect(sys.getSkill(2)).toBe(90)
  })
})
