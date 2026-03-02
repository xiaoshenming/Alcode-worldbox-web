import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticSuccessionSystem } from '../systems/DiplomaticSuccessionSystem'

const em = {} as any

function makeSys() { return new DiplomaticSuccessionSystem() }

describe('DiplomaticSuccessionSystem', () => {
  let sys: DiplomaticSuccessionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始events为空', () => { expect((sys as any).events).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('events是数组', () => { expect(Array.isArray((sys as any).events)).toBe(true) })

  // 节流测试 CHECK_INTERVAL=1500
  it('tick不足1500时不处理（lastCheck保持0）', () => {
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1500时触发更新', () => {
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('tick=1499时不触发', () => {
    sys.update(1, em, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('连续两次update：第二次被节流', () => {
    sys.update(1, em, 1500)
    sys.update(1, em, 1600)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('两次都超过间隔时各自更新lastCheck', () => {
    sys.update(1, em, 1500)
    sys.update(1, em, 3001)
    expect((sys as any).lastCheck).toBe(3001)
  })

  // pruneOld清理：MAX_EVENTS=40
  it('注入41个events后update剩余40个', () => {
    for (let i = 0; i < 41; i++) {
      ;(sys as any).events.push({
        id: i + 1, civilization: 'human', type: 'hereditary',
        status: 'stable', claimants: 2, stability: 50,
        tick: 0, resolveTick: 999999,
      })
    }
    // random=1跳过generateCrises，且所有status=stable跳过resolveCrises
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1500)
    expect((sys as any).events).toHaveLength(40)
  })
  it('注入42个events后update剩余40个', () => {
    for (let i = 0; i < 42; i++) {
      ;(sys as any).events.push({
        id: i + 1, civilization: 'elf', type: 'election',
        status: 'stable', claimants: 3, stability: 60,
        tick: 0, resolveTick: 999999,
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1500)
    expect((sys as any).events).toHaveLength(40)
  })
  it('注入40个events时不被清理', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).events.push({
        id: i + 1, civilization: 'dwarf', type: 'council',
        status: 'stable', claimants: 2, stability: 70,
        tick: 0, resolveTick: 999999,
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1500)
    expect((sys as any).events).toHaveLength(40)
  })
  it('pruneOld保留最新的40个（从头删）', () => {
    for (let i = 0; i < 45; i++) {
      ;(sys as any).events.push({
        id: i + 1, civilization: 'orc', type: 'conquest',
        status: 'stable', claimants: 2, stability: 50,
        tick: 0, resolveTick: 999999,
      })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1500)
    // 保留最后40个，id从6到45
    expect((sys as any).events[0].id).toBe(6)
    expect((sys as any).events[39].id).toBe(45)
  })

  // resolveCrises：status转换
  it('contested且tick>=resolveTick时status变化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // >0.3 → resolved
    ;(sys as any).events.push({
      id: 1, civilization: 'human', type: 'hereditary',
      status: 'contested', claimants: 3, stability: 50,
      tick: 0, resolveTick: 100,
    })
    sys.update(1, em, 1500) // tick=1500 >= resolveTick=100
    const ev = (sys as any).events[0]
    expect(['civil_war', 'resolved']).toContain(ev.status)
  })
  it('contested且random>0.3时变为resolved', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // >0.3 → resolved
    ;(sys as any).events.push({
      id: 1, civilization: 'elf', type: 'election',
      status: 'contested', claimants: 2, stability: 60,
      tick: 0, resolveTick: 100,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('resolved')
  })
  it('contested且random<0.3时变为civil_war', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // <0.3 → civil_war
    ;(sys as any).events.push({
      id: 1, civilization: 'dwarf', type: 'council',
      status: 'contested', claimants: 3, stability: 40,
      tick: 0, resolveTick: 100,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('civil_war')
  })
  it('civil_war且tick>=resolveTick时变为resolved', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).events.push({
      id: 1, civilization: 'orc', type: 'conquest',
      status: 'civil_war', claimants: 4, stability: 30,
      tick: 0, resolveTick: 100,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('resolved')
  })
  it('contested且tick<resolveTick时status不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).events.push({
      id: 1, civilization: 'human', type: 'divine_right',
      status: 'contested', claimants: 2, stability: 50,
      tick: 0, resolveTick: 999999,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('contested')
  })
  it('stable状态不被resolveCrises处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).events.push({
      id: 1, civilization: 'human', type: 'hereditary',
      status: 'stable', claimants: 2, stability: 80,
      tick: 0, resolveTick: 0,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('stable')
  })
  it('resolved状态不被resolveCrises处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).events.push({
      id: 1, civilization: 'elf', type: 'election',
      status: 'resolved', claimants: 2, stability: 70,
      tick: 0, resolveTick: 0,
    })
    sys.update(1, em, 1500)
    expect((sys as any).events[0].status).toBe('resolved')
  })

  // generateCrises：CRISIS_CHANCE=0.01（random<=0.01触发）
  it('random=1时不生成crisis', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1500)
    expect((sys as any).events).toHaveLength(0)
  })
  it('random=0时生成crisis', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1500)
    expect((sys as any).events.length).toBeGreaterThan(0)
  })
  it('生成的event包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1500)
    if ((sys as any).events.length > 0) {
      const ev = (sys as any).events[0]
      expect(ev).toHaveProperty('id')
      expect(ev).toHaveProperty('civilization')
      expect(ev).toHaveProperty('type')
      expect(ev).toHaveProperty('status')
      expect(ev).toHaveProperty('claimants')
      expect(ev).toHaveProperty('stability')
      expect(ev).toHaveProperty('tick')
      expect(ev).toHaveProperty('resolveTick')
    }
  })
})
