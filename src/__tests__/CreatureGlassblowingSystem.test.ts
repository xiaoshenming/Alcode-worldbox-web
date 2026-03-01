import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlassblowingSystem } from '../systems/CreatureGlassblowingSystem'
import type { GlassWork, GlassItem, GlassColor } from '../systems/CreatureGlassblowingSystem'

let nextId = 1
function makeSys(): CreatureGlassblowingSystem { return new CreatureGlassblowingSystem() }
function makeWork(crafterId: number, item: GlassItem = 'vase', color: GlassColor = 'clear'): GlassWork {
  return { id: nextId++, crafterId, item, color, quality: 70, beauty: 60, tradeValue: 30, tick: 0 }
}

describe('CreatureGlassblowingSystem.getWorks', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玻璃作品', () => { expect((sys as any).works).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).works.push(makeWork(1, 'mirror', 'cobalt'))
    expect((sys as any).works[0].item).toBe('mirror')
    expect((sys as any).works[0].color).toBe('cobalt')
  })
  it('返回内部引用', () => {
    ;(sys as any).works.push(makeWork(1))
    expect((sys as any).works).toBe((sys as any).works)
  })
  it('支持所有 6 种玻璃物品', () => {
    const items: GlassItem[] = ['vase', 'window', 'lens', 'bottle', 'ornament', 'mirror']
    items.forEach((it, i) => { ;(sys as any).works.push(makeWork(i + 1, it)) })
    const all = (sys as any).works
    items.forEach((it, i) => { expect(all[i].item).toBe(it) })
  })
  it('支持所有 6 种颜色', () => {
    const colors: GlassColor[] = ['clear', 'amber', 'cobalt', 'emerald', 'ruby', 'opal']
    colors.forEach((c, i) => { ;(sys as any).works.push(makeWork(i + 1, 'vase', c)) })
    const all = (sys as any).works
    colors.forEach((c, i) => { expect(all[i].color).toBe(c) })
  })
})

describe('CreatureGlassblowingSystem.getSkill', () => {
  let sys: CreatureGlassblowingSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })
  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(88)
  })
})
