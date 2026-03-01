import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAqueductSystem } from '../systems/WorldAqueductSystem'
import type { Aqueduct, AqueductMaterial } from '../systems/WorldAqueductSystem'

function makeSys(): WorldAqueductSystem { return new WorldAqueductSystem() }
let nextId = 1
function makeAqueduct(material: AqueductMaterial = 'stone'): Aqueduct {
  return { id: nextId++, srcX: 10, srcY: 10, dstX: 50, dstY: 50, material, flowRate: 5, integrity: 90, age: 300, tick: 0 }
}

describe('WorldAqueductSystem.getAqueducts', () => {
  let sys: WorldAqueductSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无引水渠', () => { expect((sys as any).aqueducts).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).aqueducts.push(makeAqueduct())
    expect((sys as any).aqueducts).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).aqueducts).toBe((sys as any).aqueducts)
  })
  it('支持4种材料', () => {
    const materials: AqueductMaterial[] = ['stone', 'brick', 'marble', 'reinforced']
    expect(materials).toHaveLength(4)
  })
  it('引水渠字段正确', () => {
    ;(sys as any).aqueducts.push(makeAqueduct('marble'))
    const a = (sys as any).aqueducts[0]
    expect(a.material).toBe('marble')
    expect(a.flowRate).toBe(5)
    expect(a.integrity).toBe(90)
  })
})
