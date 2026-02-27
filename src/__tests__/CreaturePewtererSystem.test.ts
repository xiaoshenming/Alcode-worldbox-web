import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePewtererSystem } from '../systems/CreaturePewtererSystem'
import type { Pewterer } from '../systems/CreaturePewtererSystem'

let nextId = 1
function makeSys(): CreaturePewtererSystem { return new CreaturePewtererSystem() }
function makePewterer(entityId: number): Pewterer {
  return { id: nextId++, entityId, alloyCasting: 70, moldWork: 65, polishing: 75, outputQuality: 80, tick: 0 }
}

describe('CreaturePewtererSystem.getPewterers', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锡工', () => { expect(sys.getPewterers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect(sys.getPewterers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect(sys.getPewterers()).toBe((sys as any).pewterers)
  })
  it('字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(2))
    const p = sys.getPewterers()[0]
    expect(p.alloyCasting).toBe(70)
    expect(p.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    ;(sys as any).pewterers.push(makePewterer(2))
    expect(sys.getPewterers()).toHaveLength(2)
  })
})
