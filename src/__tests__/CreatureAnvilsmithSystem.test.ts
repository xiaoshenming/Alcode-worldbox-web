import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAnvilsmithSystem } from '../systems/CreatureAnvilsmithSystem'
import type { Anvilsmith } from '../systems/CreatureAnvilsmithSystem'

let nextId = 1
function makeSys(): CreatureAnvilsmithSystem { return new CreatureAnvilsmithSystem() }
function makeAnvilsmith(entityId: number): Anvilsmith {
  return { id: nextId++, entityId, heavyForging: 30, surfaceGrinding: 25, hornShaping: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureAnvilsmithSystem.getAnvilsmiths', () => {
  let sys: CreatureAnvilsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁砧匠', () => { expect(sys.getAnvilsmiths()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
    expect(sys.getAnvilsmiths()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
    expect(sys.getAnvilsmiths()).toBe((sys as any).anvilsmiths)
  })

  it('多个全部返回', () => {
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(2))
    expect(sys.getAnvilsmiths()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const a = makeAnvilsmith(10)
    a.heavyForging = 80; a.surfaceGrinding = 75; a.hornShaping = 70; a.outputQuality = 65
    ;(sys as any).anvilsmiths.push(a)
    const r = sys.getAnvilsmiths()[0]
    expect(r.heavyForging).toBe(80)
    expect(r.surfaceGrinding).toBe(75)
    expect(r.hornShaping).toBe(70)
    expect(r.outputQuality).toBe(65)
  })
})
