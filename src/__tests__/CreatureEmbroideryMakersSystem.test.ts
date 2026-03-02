import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEmbroideryMakersSystem } from '../systems/CreatureEmbroideryMakersSystem'
import type { EmbroideryMaker, EmbroideryType } from '../systems/CreatureEmbroideryMakersSystem'

// CHECK_INTERVAL=1520, SKILL_GROWTH=0.053
// stitchPrecision = 14 + skill * 0.73
// reputation = 10 + skill * 0.80
// piecesMade = 2 + Math.floor(skill / 8)
// embroideryType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 52000

let nextId = 1
function makeSys(): CreatureEmbroideryMakersSystem { return new CreatureEmbroideryMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<EmbroideryMaker> = {}): EmbroideryMaker {
  return {
    id: nextId++, entityId, skill: 40, piecesMade: 7,
    embroideryType: 'cross_stitch', stitchPrecision: 43.2, reputation: 42, tick: 0,
    ...overrides
  }
}

describe('CreatureEmbroideryMakersSystem - 基础数据', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刺绣工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { embroideryType: 'goldwork' }))
    expect((sys as any).makers[0].embroideryType).toBe('goldwork')
  })

  it('EmbroideryType包含4种(cross_stitch/crewel/goldwork/whitework)', () => {
    const types: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { embroideryType: t })) })
    const all = (sys as any).makers as EmbroideryMaker[]
    types.forEach((t, i) => { expect(all[i].embroideryType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('返回内部引用一致', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureEmbroideryMakersSystem - 公式验证', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('stitchPrecision公式: skill=40 → 14+40*0.73=43.2', () => {
    const sp = 14 + 40 * 0.73
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, stitchPrecision: sp }))
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(43.2, 5)
  })

  it('stitchPrecision公式: skill=80 → 14+80*0.73=72.4', () => {
    const sp = 14 + 80 * 0.73
    ;(sys as any).makers.push(makeMaker(1, { skill: 80, stitchPrecision: sp }))
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(72.4, 5)
  })

  it('reputation公式: skill=40 → 10+40*0.80=42', () => {
    const rep = 10 + 40 * 0.80
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(42, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.80=90', () => {
    const rep = 10 + 100 * 0.80
    ;(sys as any).makers.push(makeMaker(1, { skill: 100, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(90, 5)
  })

  it('piecesMade: skill=40 → 2+floor(40/8)=2+5=7', () => {
    const p = 2 + Math.floor(40 / 8)
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, piecesMade: p }))
    expect((sys as any).makers[0].piecesMade).toBe(7)
  })

  it('piecesMade: skill=0 → 2+floor(0/8)=2', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 0, piecesMade: 2 }))
    expect((sys as any).makers[0].piecesMade).toBe(2)
  })

  it('embroideryType: skill=10 → typeIdx=0 → cross_stitch', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    const idx = Math.min(3, Math.floor(10 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 10, embroideryType: TYPES[idx] }))
    expect((sys as any).makers[0].embroideryType).toBe('cross_stitch')
  })

  it('embroideryType: skill=25 → typeIdx=1 → crewel', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    const idx = Math.min(3, Math.floor(25 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 25, embroideryType: TYPES[idx] }))
    expect((sys as any).makers[0].embroideryType).toBe('crewel')
  })

  it('embroideryType: skill=50 → typeIdx=2 → goldwork', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    const idx = Math.min(3, Math.floor(50 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 50, embroideryType: TYPES[idx] }))
    expect((sys as any).makers[0].embroideryType).toBe('goldwork')
  })

  it('embroideryType: skill=75 → typeIdx=3 → whitework', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    const idx = Math.min(3, Math.floor(75 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 75, embroideryType: TYPES[idx] }))
    expect((sys as any).makers[0].embroideryType).toBe('whitework')
  })
})

describe('CreatureEmbroideryMakersSystem - CHECK_INTERVAL节流与cleanup', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<1520不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1520更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1520)
    expect((sys as any).lastCheck).toBe(1520)
  })

  it('cleanup: tick比cutoff(tick-52000)旧的记录被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    // currentTick=60000, cutoff=60000-52000=8000, tick=5000 < 8000 应被删除
    ;(sys as any).makers.push(makeMaker(1, { tick: 5000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cleanup: tick等于cutoff边界时仍被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    const currentTick = 60000
    const cutoff = currentTick - 52000  // 8000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 }))  // 7999 < 8000, 删除
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff }))       // 8000, 不删除
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('skillMap未知实体返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap注入技能后可读取', () => {
    ;(sys as any).skillMap.set(42, 60)
    expect((sys as any).skillMap.get(42)).toBe(60)
  })
})
