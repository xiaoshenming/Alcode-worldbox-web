import { describe, it, expect, beforeEach } from 'vitest'
import { SeasonFestivalSystem } from '../systems/SeasonFestivalSystem'
import type { Festival, FestivalType } from '../systems/SeasonFestivalSystem'

function makeSys(): SeasonFestivalSystem { return new SeasonFestivalSystem() }
let nextId = 1
function makeFestival(active: boolean = true, type: FestivalType = 'harvest'): Festival {
  return { id: nextId++, civId: 1, type, startTick: 0, duration: 200, active, moraleBoost: 10 }
}

describe('SeasonFestivalSystem.getActiveFestivals', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无节庆', () => { expect(sys.getActiveFestivals()).toHaveLength(0) })
  it('active=true的节庆被返回', () => {
    ;(sys as any).festivals.push(makeFestival(true))
    expect(sys.getActiveFestivals()).toHaveLength(1)
  })
  it('active=false的节庆被过滤', () => {
    ;(sys as any).festivals.push(makeFestival(false))
    expect(sys.getActiveFestivals()).toHaveLength(0)
  })
  it('支持4种节庆类型', () => {
    const types: FestivalType[] = ['harvest', 'solstice', 'spring_bloom', 'winter_feast']
    expect(types).toHaveLength(4)
  })
  it('节庆字段正确', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'solstice'))
    const f = sys.getActiveFestivals()[0]
    expect(f.type).toBe('solstice')
    expect(f.moraleBoost).toBe(10)
  })
  it('混合时只返回活跃的', () => {
    ;(sys as any).festivals.push(makeFestival(true))
    ;(sys as any).festivals.push(makeFestival(false))
    ;(sys as any).festivals.push(makeFestival(true))
    expect(sys.getActiveFestivals()).toHaveLength(2)
  })
})
