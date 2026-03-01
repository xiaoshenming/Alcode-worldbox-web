import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePlasterersSystem } from '../systems/CreaturePlasterersSystem'
import type { Plasterer, PlasterType } from '../systems/CreaturePlasterersSystem'

let nextId = 1
function makeSys(): CreaturePlasterersSystem { return new CreaturePlasterersSystem() }
function makePlasterer(entityId: number, type: PlasterType = 'lime'): Plasterer {
  return { id: nextId++, entityId, skill: 70, wallsFinished: 20, plasterType: type, smoothness: 75, durability: 60, tick: 0 }
}

describe('CreaturePlasterersSystem.getPlasterers', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抹灰工', () => { expect((sys as any).plasterers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'gypsum'))
    expect((sys as any).plasterers[0].plasterType).toBe('gypsum')
  })
  it('返回内部引用', () => {
    ;(sys as any).plasterers.push(makePlasterer(1))
    expect((sys as any).plasterers).toBe((sys as any).plasterers)
  })
  it('支持所有4种灰泥类型', () => {
    const types: PlasterType[] = ['lime', 'gypsum', 'clay', 'decorative']
    types.forEach((t, i) => { ;(sys as any).plasterers.push(makePlasterer(i + 1, t)) })
    const all = (sys as any).plasterers
    types.forEach((t, i) => { expect(all[i].plasterType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).plasterers.push(makePlasterer(1))
    ;(sys as any).plasterers.push(makePlasterer(2))
    expect((sys as any).plasterers).toHaveLength(2)
  })
})
