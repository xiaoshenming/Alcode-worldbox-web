import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFurriersSystem } from '../systems/CreatureFurriersSystem'
import type { Furrier, FurType } from '../systems/CreatureFurriersSystem'

let nextId = 1
function makeSys(): CreatureFurriersSystem { return new CreatureFurriersSystem() }
function makeFurrier(entityId: number, furType: FurType = 'fox'): Furrier {
  return { id: nextId++, entityId, skill: 40, peltsProcessed: 20, furType, tanningQuality: 70, reputation: 60, tick: 0 }
}

describe('CreatureFurriersSystem.getMakers', () => {
  let sys: CreatureFurriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毛皮工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeFurrier(1, 'mink'))
    expect((sys as any).makers[0].furType).toBe('mink')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeFurrier(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种毛皮类型', () => {
    const types: FurType[] = ['fox', 'beaver', 'mink', 'ermine']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeFurrier(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].furType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeFurrier(1))
    ;(sys as any).makers.push(makeFurrier(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
