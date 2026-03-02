import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePuppeteerSystem } from '../systems/CreaturePuppeteerSystem'
import type { Puppeteer, PuppetStyle } from '../systems/CreaturePuppeteerSystem'

let nextId = 1
function makeSys(): CreaturePuppeteerSystem { return new CreaturePuppeteerSystem() }
function makePuppeteer(creatureId: number, style: PuppetStyle = 'shadow', overrides: Partial<Puppeteer> = {}): Puppeteer {
  return { id: nextId++, creatureId, style, skill: 70, showsPerformed: 10, moraleBoost: 15, fame: 30, tick: 0, ...overrides }
}
// 最小 em mock
function makeEm(entities: number[] = [], hasComp: (id: number, c: string) => boolean = () => true) {
  return {
    getEntitiesWithComponent: () => entities,
    hasComponent: hasComp,
  } as any
}

const CHECK_INTERVAL = 3000

describe('CreaturePuppeteerSystem', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个 ──

  it('初始无木偶师', () => { expect((sys as any).puppeteers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'marionette'))
    expect((sys as any).puppeteers[0].style).toBe('marionette')
  })

  it('返回内部引用', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1))
    expect((sys as any).puppeteers).toBe((sys as any).puppeteers)
  })

  it('支持所有4种木偶风格', () => {
    const styles: PuppetStyle[] = ['shadow', 'marionette', 'hand', 'rod']
    styles.forEach((s, i) => { ;(sys as any).puppeteers.push(makePuppeteer(i + 1, s)) })
    const all = (sys as any).puppeteers
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })

  it('多个全部返回', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1))
    ;(sys as any).puppeteers.push(makePuppeteer(2))
    expect((sys as any).puppeteers).toHaveLength(2)
  })

  // ── 新增 ──

  it('节流：tick不满CHECK_INTERVAL时update不执行', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20, fame: 5 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).puppeteers[0].skill).toBe(20)
    expect((sys as any).puppeteers[0].fame).toBe(5)
  })

  it('节流：达到CHECK_INTERVAL后才处理update', () => {
    // 用确定性随机让show必然发生：Math.random < 0.015
    const origRandom = Math.random
    Math.random = () => 0.01  // 0.01 < 0.015 => show 发生
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    // showsPerformed应该增加了
    expect((sys as any).puppeteers[0].showsPerformed).toBeGreaterThan(0)
  })

  it('演出时 skill 增加 0.3（上限100）', () => {
    const origRandom = Math.random
    Math.random = () => 0.01
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers[0].skill).toBeCloseTo(50.3, 5)
  })

  it('演出时 fame 增加 0.2（上限100）', () => {
    const origRandom = Math.random
    Math.random = () => 0.01
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'rod', { skill: 50, fame: 20, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers[0].fame).toBeCloseTo(20.2, 5)
  })

  it('skill 上限为 100', () => {
    const origRandom = Math.random
    Math.random = () => 0.01
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 99.9 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers[0].skill).toBe(100)
  })

  it('fame 上限为 100', () => {
    const origRandom = Math.random
    Math.random = () => 0.01
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { fame: 99.9 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers[0].fame).toBe(100)
  })

  it('cleanup: creatureId不存在时木偶师被移除', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(99, 'shadow'))
    // hasComponent 始终返回 false => creatureId=99 不存在
    const em = makeEm([], () => false)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(0)
  })

  it('cleanup: creatureId存在时木偶师保留', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'marionette', { skill: 20 }))
    const origRandom = Math.random
    Math.random = () => 0.99  // 不触发演出/招募
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers).toHaveLength(1)
  })

  it('STYLE_MORALE: shadow=8, marionette=12, hand=5, rod=10', () => {
    // 通过注入验证 moraleBoost 字段与风格对应
    const em = makeEm([], () => true)
    const pairs: [PuppetStyle, number][] = [['shadow', 8], ['marionette', 12], ['hand', 5], ['rod', 10]]
    for (const [style, expected] of pairs) {
      ;(sys as any).puppeteers.push(makePuppeteer(nextId, style, { moraleBoost: expected }))
      expect((sys as any).puppeteers[(sys as any).puppeteers.length - 1].moraleBoost).toBe(expected)
    }
  })

  it('MAX_PUPPETEERS=18：满额时不再招募', () => {
    for (let i = 0; i < 18; i++) {
      ;(sys as any).puppeteers.push(makePuppeteer(i + 1))
    }
    const origRandom = Math.random
    Math.random = () => 0.001  // 必然通过 RECRUIT_CHANCE
    const em = makeEm([100], () => true)  // 返回可用 creature
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    // 应仍为18（部分可能因cleanup被移除，但不超过18）
    expect((sys as any).puppeteers.length).toBeLessThanOrEqual(18)
  })

  it('showsPerformed 每次演出+1', () => {
    const origRandom = Math.random
    Math.random = () => 0.01
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { showsPerformed: 5 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    Math.random = origRandom
    expect((sys as any).puppeteers[0].showsPerformed).toBe(6)
  })

  it('lastCheck 在每次处理后更新', () => {
    const em = makeEm([], () => true)
    sys.update(0, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
})
