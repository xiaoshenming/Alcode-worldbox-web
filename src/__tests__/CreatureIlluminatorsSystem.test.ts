import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureIlluminatorsSystem } from '../systems/CreatureIlluminatorsSystem'
import type { Illuminator, IlluminationStyle } from '../systems/CreatureIlluminatorsSystem'

let nextId = 1
function makeSys(): CreatureIlluminatorsSystem { return new CreatureIlluminatorsSystem() }
function makeMaker(entityId: number, style: IlluminationStyle = 'decorated'): Illuminator {
  return { id: nextId++, entityId, skill: 60, pagesIlluminated: 20, style, goldLeafUse: 10, reputation: 50, tick: 0 }
}

describe('CreatureIlluminatorsSystem.getMakers', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彩饰师', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'historiated'))
    expect(sys.getMakers()[0].style).toBe('historiated')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有 4 种风格', () => {
    const styles: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = sys.getMakers()
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
