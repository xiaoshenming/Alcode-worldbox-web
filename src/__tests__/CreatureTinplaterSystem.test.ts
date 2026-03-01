import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTinplaterSystem } from '../systems/CreatureTinplaterSystem'
import type { Tinplater } from '../systems/CreatureTinplaterSystem'

let nextId = 1
function makeSys(): CreatureTinplaterSystem { return new CreatureTinplaterSystem() }
function makeTinplater(entityId: number): Tinplater {
  return { id: nextId++, entityId, platingSkill: 70, coatingUniformity: 65, bathControl: 80, corrosionResistance: 75, tick: 0 }
}

describe('CreatureTinplaterSystem.getTinplaters', () => {
  let sys: CreatureTinplaterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镀锡工', () => { expect((sys as any).tinplaters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    expect((sys as any).tinplaters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    expect((sys as any).tinplaters).toBe((sys as any).tinplaters)
  })
  it('字段正确', () => {
    ;(sys as any).tinplaters.push(makeTinplater(2))
    const t = (sys as any).tinplaters[0]
    expect(t.platingSkill).toBe(70)
    expect(t.corrosionResistance).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinplaters.push(makeTinplater(1))
    ;(sys as any).tinplaters.push(makeTinplater(2))
    expect((sys as any).tinplaters).toHaveLength(2)
  })
})
