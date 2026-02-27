import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureIntuitionSystem } from '../systems/CreatureIntuitionSystem'
import type { Intuition, IntuitionSense } from '../systems/CreatureIntuitionSystem'

let nextId = 1
function makeSys(): CreatureIntuitionSystem { return new CreatureIntuitionSystem() }
function makeIntuition(entityId: number, sense: IntuitionSense = 'danger', triggered = false): Intuition {
  return { id: nextId++, entityId, sense, accuracy: 70, triggered, tick: 0 }
}

describe('CreatureIntuitionSystem.getIntuitions', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无预感', () => { expect(sys.getIntuitions()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).intuitions.push(makeIntuition(1, 'treasure'))
    expect(sys.getIntuitions()[0].sense).toBe('treasure')
  })
  it('返回内部引用', () => {
    ;(sys as any).intuitions.push(makeIntuition(1))
    expect(sys.getIntuitions()).toBe((sys as any).intuitions)
  })
  it('支持所有 6 种预感类型', () => {
    const senses: IntuitionSense[] = ['danger', 'opportunity', 'weather', 'betrayal', 'treasure', 'death']
    senses.forEach((s, i) => { ;(sys as any).intuitions.push(makeIntuition(i + 1, s)) })
    const all = sys.getIntuitions()
    senses.forEach((s, i) => { expect(all[i].sense).toBe(s) })
  })
})

describe('CreatureIntuitionSystem.getActiveIntuitions', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已触发的不算活跃', () => {
    ;(sys as any).intuitions.push(makeIntuition(1, 'danger', true))
    expect(sys.getActiveIntuitions()).toHaveLength(0)
  })
  it('未触发的算活跃', () => {
    ;(sys as any).intuitions.push(makeIntuition(1, 'danger', false))
    ;(sys as any).intuitions.push(makeIntuition(2, 'treasure', true))
    expect(sys.getActiveIntuitions()).toHaveLength(1)
    expect(sys.getActiveIntuitions()[0].sense).toBe('danger')
  })
})

describe('CreatureIntuitionSystem.getIntuitionsBySense', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).intuitions.push(makeIntuition(1, 'danger'))
    expect(sys.getIntuitionsBySense('treasure')).toHaveLength(0)
  })
  it('按类型过滤', () => {
    ;(sys as any).intuitions.push(makeIntuition(1, 'danger'))
    ;(sys as any).intuitions.push(makeIntuition(2, 'danger'))
    ;(sys as any).intuitions.push(makeIntuition(3, 'treasure'))
    expect(sys.getIntuitionsBySense('danger')).toHaveLength(2)
  })
})
