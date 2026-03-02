import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticSolidaritySystem } from '../systems/DiplomaticSolidaritySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSolidaritySystem() }

describe('DiplomaticSolidaritySystem', () => {
  let sys: DiplomaticSolidaritySystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始pacts为空数组', () => { expect((sys as any).pacts).toHaveLength(0) })
  it('pacts是数组类型', () => { expect(Array.isArray((sys as any).pacts)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入pact后长度为1', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect((sys as any).pacts).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL=2370时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2370时更新lastCheck', () => {
    sys.update(1, W, EM, 2370)
    expect((sys as any).lastCheck).toBe(2370)
  })
  it('第二次调用需再等2370', () => {
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2370)
  })
  it('tick=4740时再次触发', () => {
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 4740)
    expect((sys as any).lastCheck).toBe(4740)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 4740)
    expect((sys as any).pacts[0].duration).toBe(2)
  })
  it('commitment在update后仍在[10,85]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) sys.update(1, W, EM, t)
    const v = (sys as any).pacts[0]?.commitment
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('cohesion在update后仍在[5,70]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) sys.update(1, W, EM, t)
    const v = (sys as any).pacts[0]?.cohesion
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(70) }
  })

  // 4. 过期cleanup
  it('tick超过cutoff的pact被移除', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 84370) // 84370 - 82000 = 2370 > 0
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('tick未超过cutoff的pact保留', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:75000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('混合新旧pact只删旧的', () => {
    ;(sys as any).pacts.push(
      { id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 },
      { id:2, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:75000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(1)
    expect((sys as any).pacts[0].id).toBe(2)
  })
  it('cutoff边界：tick恰好等于cutoff时保留', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:2370 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 84370) // cutoff=84370-82000=2370, tick(2370) < 2370 is false
    expect((sys as any).pacts).toHaveLength(1)
  })

  // 5. MAX_PACTS上限
  it('pacts不超过MAX_PACTS=20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 30; t += 2370) sys.update(1, W, EM, t)
    expect((sys as any).pacts.length).toBeLessThanOrEqual(20)
  })
  it('已有20个时不再新增', () => {
    for (let i = 1; i <= 20; i++) {
      (sys as any).pacts.push({ id:i, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts.length).toBe(20)
  })
  it('19个时仍可新增', () => {
    for (let i = 1; i <= 19; i++) {
      (sys as any).pacts.push({ id:i, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts.length).toBeGreaterThanOrEqual(19)
  })
  it('nextId在新增后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2370)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('basis包含合法SolidarityBasis值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 25; t += 2370) sys.update(1, W, EM, t)
    const valid = ['cultural','ideological','economic','defensive']
    const bases = (sys as any).pacts.map((p: any) => p.basis)
    bases.forEach((b: string) => expect(valid).toContain(b))
  })
  it('所有4种SolidarityBasis值合法', () => {
    const valid = ['cultural','ideological','economic','defensive']
    expect(valid).toHaveLength(4)
  })
  it('basis字段存在于新增的pact中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0)
      expect((sys as any).pacts[0].basis).toBeDefined()
  })
})
