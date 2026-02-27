import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellFoundersSystem } from '../systems/CreatureBellFoundersSystem'
import type { BellFounder, BellSize } from '../systems/CreatureBellFoundersSystem'

let nextId = 1
function makeSys(): CreatureBellFoundersSystem { return new CreatureBellFoundersSystem() }
function makeFounder(entityId: number, bellSize: BellSize = 'handbell'): BellFounder {
  return { id: nextId++, entityId, skill: 30, bellsCast: 5, bellSize, toneQuality: 40, reputation: 35, tick: 0 }
}

describe('CreatureBellFoundersSystem.getFounders', () => {
  let sys: CreatureBellFoundersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸钟师', () => { expect(sys.getFounders()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).founders.push(makeFounder(1, 'cathedral'))
    expect(sys.getFounders()[0].bellSize).toBe('cathedral')
  })

  it('返回内部引用', () => {
    ;(sys as any).founders.push(makeFounder(1))
    expect(sys.getFounders()).toBe((sys as any).founders)
  })

  it('支持所有 4 种铃铛尺寸', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    sizes.forEach((s, i) => { ;(sys as any).founders.push(makeFounder(i + 1, s)) })
    const all = sys.getFounders()
    sizes.forEach((s, i) => { expect(all[i].bellSize).toBe(s) })
  })

  it('数据字段完整', () => {
    const f = makeFounder(10, 'church')
    f.skill = 80; f.bellsCast = 20; f.toneQuality = 90; f.reputation = 85
    ;(sys as any).founders.push(f)
    const result = sys.getFounders()[0]
    expect(result.skill).toBe(80)
    expect(result.bellsCast).toBe(20)
    expect(result.toneQuality).toBe(90)
    expect(result.reputation).toBe(85)
  })
})
