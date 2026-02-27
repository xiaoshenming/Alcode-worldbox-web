import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDivinationSystem } from '../systems/CreatureDivinationSystem'
import type { Divination, DivinationType } from '../systems/CreatureDivinationSystem'

let nextId = 1
function makeSys(): CreatureDivinationSystem { return new CreatureDivinationSystem() }
function makeDivination(creatureId: number, method: DivinationType = 'stars', believed = true): Divination {
  return { id: nextId++, creatureId, method, prediction: 'rain soon', accuracy: 60, believed, tick: 0 }
}

describe('CreatureDivinationSystem.getDivinations', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无占卜', () => { expect(sys.getDivinations()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).divinations.push(makeDivination(1, 'bones'))
    expect(sys.getDivinations()[0].method).toBe('bones')
  })

  it('返回内部引用', () => {
    ;(sys as any).divinations.push(makeDivination(1))
    expect(sys.getDivinations()).toBe((sys as any).divinations)
  })

  it('支持所有 6 种占卜方式', () => {
    const methods: DivinationType[] = ['stars', 'bones', 'flames', 'water', 'dreams', 'birds']
    methods.forEach((m, i) => { ;(sys as any).divinations.push(makeDivination(i + 1, m)) })
    const all = sys.getDivinations()
    methods.forEach((m, i) => { expect(all[i].method).toBe(m) })
  })
})

describe('CreatureDivinationSystem.getRecent', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('返回最后 n 条', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).divinations.push(makeDivination(i + 1)) }
    expect(sys.getRecent(3)).toHaveLength(3)
  })
})

describe('CreatureDivinationSystem.getBelievedCount', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('只统计 believed=true 的条目', () => {
    ;(sys as any).divinations.push(makeDivination(1, 'stars', true))
    ;(sys as any).divinations.push(makeDivination(2, 'bones', false))
    ;(sys as any).divinations.push(makeDivination(3, 'flames', true))
    expect(sys.getBelievedCount()).toBe(2)
  })
})
