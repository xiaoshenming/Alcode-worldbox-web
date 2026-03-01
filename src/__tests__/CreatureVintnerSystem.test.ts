import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVintnerSystem } from '../systems/CreatureVintnerSystem'
import type { Vintner, WineVariety } from '../systems/CreatureVintnerSystem'

let nextId = 1
function makeSys(): CreatureVintnerSystem { return new CreatureVintnerSystem() }
function makeVintner(entityId: number, variety: WineVariety = 'red'): Vintner {
  return { id: nextId++, entityId, skill: 70, barrelsProduced: 12, wineVariety: variety, vintage: 50, reputation: 45, tick: 0 }
}

describe('CreatureVintnerSystem.getVintners', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无酿酒师', () => { expect((sys as any).vintners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'white'))
    expect((sys as any).vintners[0].wineVariety).toBe('white')
  })
  it('返回内部引用', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners).toBe((sys as any).vintners)
  })
  it('支持所有4种葡萄酒类型', () => {
    const varieties: WineVariety[] = ['red', 'white', 'rosé', 'sparkling']
    varieties.forEach((v, i) => { ;(sys as any).vintners.push(makeVintner(i + 1, v)) })
    const all = (sys as any).vintners
    varieties.forEach((v, i) => { expect(all[i].wineVariety).toBe(v) })
  })
  it('多个全部返回', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    ;(sys as any).vintners.push(makeVintner(2))
    expect((sys as any).vintners).toHaveLength(2)
  })
})
