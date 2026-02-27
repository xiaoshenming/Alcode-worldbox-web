import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBookbindersSystem } from '../systems/CreatureBookbindersSystem'
import type { Bookbinder, BindingStyle } from '../systems/CreatureBookbindersSystem'

let nextId = 1
function makeSys(): CreatureBookbindersSystem { return new CreatureBookbindersSystem() }
function makeMaker(entityId: number, style: BindingStyle = 'coptic'): Bookbinder {
  return { id: nextId++, entityId, skill: 70, booksBound: 12, bindingStyle: style, durability: 65, reputation: 45, tick: 0 }
}

describe('CreatureBookbindersSystem.getMakers', () => {
  let sys: CreatureBookbindersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无书籍装订工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'perfect'))
    expect(sys.getMakers()[0].bindingStyle).toBe('perfect')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种装订风格', () => {
    const styles: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = sys.getMakers()
    styles.forEach((s, i) => { expect(all[i].bindingStyle).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
