import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticSummitSystem } from '../systems/DiplomaticSummitSystem'

vi.mock('../systems/EventLog', () => ({ EventLog: { log: vi.fn() } }))

function makeCivManager(civs: { id: number; name: string; population: number; relations?: Map<number, number> }[] = []) {
  return { civilizations: new Map(civs.map(c => [c.id, { ...c, relations: c.relations ?? new Map() }])) } as any
}

function makeSys() { return new DiplomaticSummitSystem() }

describe('DiplomaticSummitSystem', () => {
  let sys: DiplomaticSummitSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始activeSummit为null', () => { expect((sys as any).activeSummit).toBeNull() })
  it('初始summits历史为空', () => { expect((sys as any).summits).toHaveLength(0) })
  it('初始nextSummitTick为SUMMIT_INTERVAL(3000)', () => { expect((sys as any).nextSummitTick).toBe(3000) })
  it('初始displayAlpha为0', () => { expect((sys as any).displayAlpha).toBe(0) })
  it('summits是数组', () => { expect(Array.isArray((sys as any).summits)).toBe(true) })

  // civs不足时不spawn
  it('civs为空时不spawn summit', () => {
    const cm = makeCivManager([])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })
  it('只有1个civ时不spawn summit', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })
  it('population=0的civ不算alive', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 0 },
      { id: 2, name: 'B', population: 0 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })

  // tick未到nextSummitTick时不spawn
  it('tick<nextSummitTick时不spawn', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 2999)
    expect((sys as any).activeSummit).toBeNull()
  })

  // tick>=nextSummitTick且civs>=2时spawn
  it('tick>=nextSummitTick且civs>=2时spawn activeSummit', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).not.toBeNull()
  })
  it('spawn后activeSummit包含必要字段', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    const s = (sys as any).activeSummit
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('participants')
    expect(s).toHaveProperty('topic')
    expect(s).toHaveProperty('startTick', 3000)
    expect(s).toHaveProperty('duration', 120)
    expect(s).toHaveProperty('resolved', false)
  })
  it('spawn后nextSummitTick更新为tick+3000', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).nextSummitTick).toBe(6000)
  })

  // activeSummit存在时不spawn新的
  it('activeSummit存在时不spawn新summit', () => {
    ;(sys as any).activeSummit = { id: 99, participants: [1, 2], topic: 'peace', startTick: 3000, duration: 120, resolved: false, outcome: '' }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit.id).toBe(99)
  })

  // activeSummit解决后归档
  it('tick-startTick>=duration时activeSummit解决并归档到summits', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 1000, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 1120) // 1120-1000=120 >= 120
    expect((sys as any).activeSummit).toBeNull()
    expect((sys as any).summits).toHaveLength(1)
  })
  it('解决后summit.resolved=true', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 120)
    expect((sys as any).summits[0].resolved).toBe(true)
  })
  it('tick-startTick<duration时activeSummit不解决', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'alliance',
      startTick: 1000, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 1050) // 50 < 120
    expect((sys as any).activeSummit).not.toBeNull()
    expect((sys as any).summits).toHaveLength(0)
  })

  // MAX_HISTORY=30
  it('summits超过MAX_HISTORY(30)时从头删除', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).summits.push({ id: i + 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: true, outcome: 'ok' })
    }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 99, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 120)
    expect((sys as any).summits).toHaveLength(30)
  })

  // topic选择
  it('participants关系<-20时topic为peace', () => {
    const rel1 = new Map([[2, -30]])
    const rel2 = new Map([[1, -30]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('peace')
  })
  it('participants关系>=40时topic为alliance', () => {
    const rel1 = new Map([[2, 50]])
    const rel2 = new Map([[1, 50]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('alliance')
  })
})
