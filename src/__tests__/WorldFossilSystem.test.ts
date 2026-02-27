import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFossilSystem } from '../systems/WorldFossilSystem'
import type { Fossil, FossilType, FossilAge, FossilRarity } from '../systems/WorldFossilSystem'

function makeSys(): WorldFossilSystem { return new WorldFossilSystem() }
let nextId = 1
function makeFossil(type: FossilType = 'bone', rarity: FossilRarity = 'common', discovered = false): Fossil {
  return { id: nextId++, x: 20, y: 30, type, age: 'ancient', rarity, discovered, discoveredTick: 0 }
}

describe('WorldFossilSystem.getFossils', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无化石', () => { expect(sys.getFossils()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fossils.push(makeFossil())
    expect(sys.getFossils()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFossils()).toBe((sys as any).fossils)
  })
  it('支持6种化石类型', () => {
    const types: FossilType[] = ['bone', 'shell', 'plant', 'amber', 'footprint', 'artifact']
    expect(types).toHaveLength(6)
  })
  it('支持3种稀有度', () => {
    const rarities: FossilRarity[] = ['common', 'uncommon', 'rare', 'legendary']
    expect(rarities).toHaveLength(4)
  })
  it('化石字段正确', () => {
    ;(sys as any).fossils.push(makeFossil('amber', 'legendary'))
    const f = sys.getFossils()[0]
    expect(f.type).toBe('amber')
    expect(f.rarity).toBe('legendary')
    expect(f.discovered).toBe(false)
  })
})
