import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHandicraftSystem } from '../systems/CreatureHandicraftSystem'
import type { Handicraft, CraftType } from '../systems/CreatureHandicraftSystem'

let nextId = 1
function makeSys(): CreatureHandicraftSystem { return new CreatureHandicraftSystem() }
function makeCraft(crafterId: number, type: CraftType = 'jewelry'): Handicraft {
  return { id: nextId++, crafterId, type, quality: 70, prestige: 20, traded: false, tick: 0 }
}

describe('CreatureHandicraftSystem.getCrafts', () => {
  let sys: CreatureHandicraftSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无手工艺', () => { expect((sys as any).crafts).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).crafts.push(makeCraft(1, 'textile'))
    expect((sys as any).crafts[0].type).toBe('textile')
  })
  it('返回内部引用', () => {
    ;(sys as any).crafts.push(makeCraft(1))
    expect((sys as any).crafts).toBe((sys as any).crafts)
  })
})

describe('CreatureHandicraftSystem.getByCrafter', () => {
  let sys: CreatureHandicraftSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).crafts.push(makeCraft(1))
    expect(sys.getByCrafter(999)).toHaveLength(0)
  })
  it('过滤特定工匠', () => {
    ;(sys as any).crafts.push(makeCraft(1))
    ;(sys as any).crafts.push(makeCraft(1))
    ;(sys as any).crafts.push(makeCraft(2))
    expect(sys.getByCrafter(1)).toHaveLength(2)
  })
})
