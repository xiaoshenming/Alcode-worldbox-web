import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAssayersSystem } from '../systems/CreatureAssayersSystem'
import type { Assayer, OreType } from '../systems/CreatureAssayersSystem'

let nextId = 1
function makeSys(): CreatureAssayersSystem { return new CreatureAssayersSystem() }
function makeMaker(entityId: number, ore: OreType = 'gold'): Assayer {
  return { id: nextId++, entityId, skill: 70, samplesAnalyzed: 12, oreType: ore, accuracy: 65, reputation: 45, tick: 0 }
}

describe('CreatureAssayersSystem.getAssayers', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无化验师', () => { expect(sys.getAssayers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).assayers.push(makeMaker(1, 'silver'))
    expect(sys.getAssayers()[0].oreType).toBe('silver')
  })
  it('返回内部引用', () => {
    ;(sys as any).assayers.push(makeMaker(1))
    expect(sys.getAssayers()).toBe((sys as any).assayers)
  })
  it('支持所有4种矿石类型', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    ores.forEach((o, i) => { ;(sys as any).assayers.push(makeMaker(i + 1, o)) })
    const all = sys.getAssayers()
    ores.forEach((o, i) => { expect(all[i].oreType).toBe(o) })
  })
  it('多个全部返回', () => {
    ;(sys as any).assayers.push(makeMaker(1))
    ;(sys as any).assayers.push(makeMaker(2))
    expect(sys.getAssayers()).toHaveLength(2)
  })
})
