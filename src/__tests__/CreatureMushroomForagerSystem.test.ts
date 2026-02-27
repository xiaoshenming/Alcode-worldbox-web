import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMushroomForagerSystem } from '../systems/CreatureMushroomForagerSystem'
import type { MushroomForager } from '../systems/CreatureMushroomForagerSystem'

let nextId = 1
function makeSys(): CreatureMushroomForagerSystem { return new CreatureMushroomForagerSystem() }
function makeForager(entityId: number): MushroomForager {
  return { id: nextId++, entityId, knowledge: 70, mushroomsFound: 30, poisoned: false, antidotes: 2, tick: 0 }
}

describe('CreatureMushroomForagerSystem.getForagers', () => {
  let sys: CreatureMushroomForagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蘑菇采集者', () => { expect(sys.getForagers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).foragers.push(makeForager(1))
    expect(sys.getForagers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).foragers.push(makeForager(1))
    expect(sys.getForagers()).toBe((sys as any).foragers)
  })
  it('poisoned 字段可为 true', () => {
    const f = makeForager(1)
    f.poisoned = true
    ;(sys as any).foragers.push(f)
    expect(sys.getForagers()[0].poisoned).toBe(true)
  })
  it('多个全部返回', () => {
    ;(sys as any).foragers.push(makeForager(1))
    ;(sys as any).foragers.push(makeForager(2))
    expect(sys.getForagers()).toHaveLength(2)
  })
})
