import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAnodizerSystem } from '../systems/CreatureAnodizerSystem'
import type { Anodizer } from '../systems/CreatureAnodizerSystem'

let nextId = 1
function makeSys(): CreatureAnodizerSystem { return new CreatureAnodizerSystem() }
function makeAnodizer(entityId: number): Anodizer {
  return { id: nextId++, entityId, anodizingSkill: 30, electrolyteControl: 25, voltageRegulation: 20, coatingUniformity: 35, tick: 0 }
}

describe('CreatureAnodizerSystem.getAnodizers', () => {
  let sys: CreatureAnodizerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无阳极氧化师', () => { expect(sys.getAnodizers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).anodizers.push(makeAnodizer(1))
    expect(sys.getAnodizers()).toHaveLength(1)
    expect(sys.getAnodizers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).anodizers.push(makeAnodizer(1))
    expect(sys.getAnodizers()).toBe((sys as any).anodizers)
  })

  it('多个全部返回', () => {
    ;(sys as any).anodizers.push(makeAnodizer(1))
    ;(sys as any).anodizers.push(makeAnodizer(2))
    expect(sys.getAnodizers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const a = makeAnodizer(10)
    a.anodizingSkill = 80; a.electrolyteControl = 75; a.voltageRegulation = 70; a.coatingUniformity = 65
    ;(sys as any).anodizers.push(a)
    const r = sys.getAnodizers()[0]
    expect(r.anodizingSkill).toBe(80)
    expect(r.electrolyteControl).toBe(75)
    expect(r.voltageRegulation).toBe(70)
    expect(r.coatingUniformity).toBe(65)
  })
})
