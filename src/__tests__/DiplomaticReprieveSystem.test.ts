import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticReprieveSystem, ReprieveForm } from '../systems/DiplomaticReprieveSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticReprieveSystem() }

describe('DiplomaticReprieveSystem', () => {
  let sys: DiplomaticReprieveSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始grants为空', () => { expect((sys as any).grants).toHaveLength(0) })
  it('grants是数组', () => { expect(Array.isArray((sys as any).grants)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入grant后长度为1', () => {
    ;(sys as any).grants.push({ id: 1 })
    expect((sys as any).grants).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL=2380时不更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2380时更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).lastCheck).toBe(2380)
  })
  it('第二次间隔不足时不更新', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    sys.update(1, NULL_WORLD, NULL_EM, 3000)
    expect((sys as any).lastCheck).toBe(2380)
  })
  it('第二次间隔足够时再次更新', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    sys.update(1, NULL_WORLD, NULL_EM, 4760)
    expect((sys as any).lastCheck).toBe(4760)
  })
  it('tick=2379时不触发', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2379)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).grants[0].duration).toBe(1)
  })
  it('timeGained随update递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).grants[0].timeGained).toBeLessThan(50)
  })
  it('reliefLevel不超过85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 84.9, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).grants[0].reliefLevel).toBeLessThanOrEqual(85)
  })
  it('goodwillEffect不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 5, conditionalTerms: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).grants[0].goodwillEffect).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff=84000的grant被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 85000)
    expect((sys as any).grants).toHaveLength(0)
  })
  it('tick未超过cutoff的grant保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 10000 })
    sys.update(1, NULL_WORLD, NULL_EM, 85000)
    expect((sys as any).grants).toHaveLength(1)
  })
  it('cutoff边界：grant.tick恰好等于cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push({ id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
      reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 1000 })
    // update at 85000, cutoff=85000-84000=1000, grant.tick=1000 NOT < cutoff
    sys.update(1, NULL_WORLD, NULL_EM, 85000)
    expect((sys as any).grants).toHaveLength(1)
  })
  it('多条grant中只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).grants.push(
      { id: 1, civIdA: 1, civIdB: 2, form: 'execution_delay', reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 0 },
      { id: 2, civIdA: 2, civIdB: 3, form: 'sanction_pause', reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 50000 }
    )
    sys.update(1, NULL_WORLD, NULL_EM, 85000)
    expect((sys as any).grants).toHaveLength(1)
    expect((sys as any).grants[0].id).toBe(2)
  })

  // 5. MAX上限
  it('grants达到MAX_GRANTS=20时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).grants.push({ id: i + 1, civIdA: 1, civIdB: 2, form: 'execution_delay',
        reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 85000 })
    }
    sys.update(1, NULL_WORLD, NULL_EM, 85000)
    expect((sys as any).grants.length).toBeLessThanOrEqual(20)
  })
  it('grants未满时长度不超过MAX', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, NULL_WORLD, NULL_EM, 2380)
    expect((sys as any).grants.length).toBeLessThanOrEqual(20)
  })
  it('注入19条后长度为19', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).grants.push({ id: i + 1, civIdA: 1, civIdB: i + 2, form: 'execution_delay',
        reliefLevel: 50, timeGained: 50, goodwillEffect: 40, conditionalTerms: 30, duration: 0, tick: 85000 })
    }
    expect((sys as any).grants.length).toBe(19)
  })
  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // 6. 枚举完整性
  it('ReprieveForm包含execution_delay', () => {
    const f: ReprieveForm = 'execution_delay'
    expect(f).toBe('execution_delay')
  })
  it('ReprieveForm包含sanction_pause和tribute_deferral', () => {
    const forms: ReprieveForm[] = ['sanction_pause', 'tribute_deferral']
    expect(forms).toHaveLength(2)
  })
  it('ReprieveForm包含siege_suspension', () => {
    const f: ReprieveForm = 'siege_suspension'
    expect(f).toBe('siege_suspension')
  })
})
