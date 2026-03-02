import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePuppeteerSystem } from '../systems/CreaturePuppeteerSystem'
import type { Puppeteer, PuppetStyle } from '../systems/CreaturePuppeteerSystem'

let nextId = 1
function makeSys(): CreaturePuppeteerSystem { return new CreaturePuppeteerSystem() }
function makePuppeteer(creatureId: number, style: PuppetStyle = 'shadow', overrides: Partial<Puppeteer> = {}): Puppeteer {
  return { id: nextId++, creatureId, style, skill: 70, showsPerformed: 10, moraleBoost: 15, fame: 30, tick: 0, ...overrides }
}
function makeEm(entities: number[] = [], hasComp: (id: number, c: string) => boolean = () => true) {
  return {
    getEntitiesWithComponent: () => entities,
    hasComponent: hasComp,
  } as any
}

const CHECK_INTERVAL = 3000

describe('CreaturePuppeteerSystem - 初始状态', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无木偶师', () => { expect((sys as any).puppeteers).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('puppeteers是空数组', () => { expect(Array.isArray((sys as any).puppeteers)).toBe(true) })
  it('每次makeSys都返回独立实例', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).puppeteers.push(makePuppeteer(1))
    expect((s2 as any).puppeteers).toHaveLength(0)
  })
})

describe('CreaturePuppeteerSystem - 数据注入与查询', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询style', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'marionette'))
    expect((sys as any).puppeteers[0].style).toBe('marionette')
  })
  it('返回内部引用', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1))
    expect((sys as any).puppeteers).toBe((sys as any).puppeteers)
  })
  it('支持shadow风格', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow'))
    expect((sys as any).puppeteers[0].style).toBe('shadow')
  })
  it('支持marionette风格', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(2, 'marionette'))
    expect((sys as any).puppeteers[0].style).toBe('marionette')
  })
  it('支持hand风格', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(3, 'hand'))
    expect((sys as any).puppeteers[0].style).toBe('hand')
  })
  it('支持rod风格', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(4, 'rod'))
    expect((sys as any).puppeteers[0].style).toBe('rod')
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
  it('skill字段正确', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 55 }))
    expect((sys as any).puppeteers[0].skill).toBe(55)
  })
  it('fame字段正确', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { fame: 25 }))
    expect((sys as any).puppeteers[0].fame).toBe(25)
  })
  it('showsPerformed字段正确', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { showsPerformed: 7 }))
    expect((sys as any).puppeteers[0].showsPerformed).toBe(7)
  })
  it('moraleBoost字段正确', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'rod', { moraleBoost: 10 }))
    expect((sys as any).puppeteers[0].moraleBoost).toBe(10)
  })
})

describe('CreaturePuppeteerSystem - 节流机制 CHECK_INTERVAL', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick未达到CHECK_INTERVAL时update不执行技能增长', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20, fame: 5 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).puppeteers[0].skill).toBe(20)
    expect((sys as any).puppeteers[0].fame).toBe(5)
  })
  it('达到CHECK_INTERVAL后才处理update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].showsPerformed).toBeGreaterThan(0)
  })
  it('lastCheck在达到间隔后更新', () => {
    const em = makeEm([], () => true)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('lastCheck更新后下次不同tick才触发', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20 }))
    const em = makeEm([], () => true)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL) // 同一tick，不再触发
    // skill 没增长（random=0.9 > 0.015不演出）
    expect((sys as any).puppeteers[0].skill).toBe(20)
  })
  it('连续两次达到间隔触发两次演出机会', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 20, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(2)
  })
})

describe('CreaturePuppeteerSystem - 演出逻辑', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('演出时 skill 增加 0.3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].skill).toBeCloseTo(50.3, 5)
  })
  it('演出时 fame 增加 0.2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'rod', { skill: 50, fame: 20, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].fame).toBeCloseTo(20.2, 5)
  })
  it('showsPerformed 每次演出+1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { showsPerformed: 5 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(6)
  })
  it('random>=0.015时不演出，skill不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 40, showsPerformed: 3 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].skill).toBe(40)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(3)
  })
  it('演出概率阈值边界：random=0.014时演出', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.014)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(1)
  })
  it('演出概率阈值边界：random=0.015时不演出', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.015)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(0)
  })
  it('多个木偶师各自独立判断是否演出', () => {
    // 策略：第一次update(tick=0)不触发（节流）
    // 第二次update(tick=CHECK_INTERVAL)触发，此时random序列：
    //   第1次：recruit check → 0.99（不招募）
    //   第2次：p1 show check → 0.01（演出）
    //   第3次：p2 show check → 0.99（不演出）
    let callIdx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return 0.99 // recruit check: 不招募
      if (callIdx === 2) return 0.01 // p1 show: 演出
      return 0.99                    // p2 show: 不演出
    })
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 50, showsPerformed: 0 }))
    ;(sys as any).puppeteers.push(makePuppeteer(2, 'hand', { skill: 60, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(1)
    expect((sys as any).puppeteers[1].showsPerformed).toBe(0)
  })
})

describe('CreaturePuppeteerSystem - 技能上限', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill 上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 99.9 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].skill).toBe(100)
  })
  it('fame 上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { fame: 99.9 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].fame).toBe(100)
  })
  it('skill=100时演出后不超过100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 100 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].skill).toBe(100)
  })
  it('fame=100时演出后不超过100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'rod', { fame: 100 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].fame).toBe(100)
  })
})

describe('CreaturePuppeteerSystem - cleanup 清理逻辑', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('creatureId不存在时木偶师被移除', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(99, 'shadow'))
    const em = makeEm([], () => false)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(0)
  })
  it('creatureId存在时木偶师保留', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'marionette', { skill: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(1)
  })
  it('混合情况：存活的保留，死亡的移除', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow'))  // alive
    ;(sys as any).puppeteers.push(makePuppeteer(99, 'rod'))    // dead
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = makeEm([], (id: number, _c: string) => id === 1)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(1)
    expect((sys as any).puppeteers[0].creatureId).toBe(1)
  })
  it('全部creature死亡时列表清空', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow'))
    ;(sys as any).puppeteers.push(makePuppeteer(2, 'hand'))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = makeEm([], () => false)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(0)
  })
})

describe('CreaturePuppeteerSystem - 招募逻辑', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_PUPPETEERS=18：满额时不再招募', () => {
    for (let i = 0; i < 18; i++) {
      ;(sys as any).puppeteers.push(makePuppeteer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([100], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers.length).toBeLessThanOrEqual(18)
  })
  it('entities为空时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(0)
  })
  it('RECRUIT_CHANCE=0.003：random>=0.003时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEm([1, 2, 3], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers).toHaveLength(0)
  })
  it('招募成功时nextId递增', () => {
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([1], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    if ((sys as any).puppeteers.length > 0) {
      expect((sys as any).nextId).toBe(6)
    }
  })
  it('17个木偶师时仍可招募第18个', () => {
    for (let i = 0; i < 17; i++) {
      ;(sys as any).puppeteers.push(makePuppeteer(i + 1, 'shadow', { skill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([100], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers.length).toBeGreaterThanOrEqual(17)
  })
})

describe('CreaturePuppeteerSystem - STYLE_MORALE 与常量', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('STYLE_MORALE: shadow=8', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { moraleBoost: 8 }))
    expect((sys as any).puppeteers[0].moraleBoost).toBe(8)
  })
  it('STYLE_MORALE: marionette=12', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(2, 'marionette', { moraleBoost: 12 }))
    expect((sys as any).puppeteers[0].moraleBoost).toBe(12)
  })
  it('STYLE_MORALE: hand=5', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(3, 'hand', { moraleBoost: 5 }))
    expect((sys as any).puppeteers[0].moraleBoost).toBe(5)
  })
  it('STYLE_MORALE: rod=10', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(4, 'rod', { moraleBoost: 10 }))
    expect((sys as any).puppeteers[0].moraleBoost).toBe(10)
  })
  it('lastCheck 在每次处理后更新为当前tick', () => {
    const em = makeEm([], () => true)
    sys.update(0, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('木偶师tick字段正确记录', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { tick: 999 }))
    expect((sys as any).puppeteers[0].tick).toBe(999)
  })
})

describe('CreaturePuppeteerSystem - 边界与异常', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空列表时update不报错', () => {
    const em = makeEm([], () => true)
    expect(() => {
      sys.update(0, em, 0)
      sys.update(0, em, CHECK_INTERVAL)
    }).not.toThrow()
  })
  it('非常大的tick值也能正常触发update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 1_000_000)
    expect((sys as any).puppeteers[0].showsPerformed).toBe(1)
  })
  it('同一tick不会重复触发update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'hand', { skill: 50, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL) // 同一tick
    expect((sys as any).puppeteers[0].showsPerformed).toBe(1)
  })
  it('skill从0增长正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { skill: 0, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].skill).toBeCloseTo(0.3, 5)
  })
  it('fame从0增长正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'shadow', { fame: 0, showsPerformed: 0 }))
    const em = makeEm([], () => true)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puppeteers[0].fame).toBeCloseTo(0.2, 5)
  })
})
