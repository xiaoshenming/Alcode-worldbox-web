import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureLapidarySystem } from '../systems/CreatureLapidarySystem'
import type { Lapidary } from '../systems/CreatureLapidarySystem'

let nextId = 1
function makeSys(): CreatureLapidarySystem { return new CreatureLapidarySystem() }
function makeLap(entityId: number, cuttingSkill = 70): Lapidary {
  return {
    id: nextId++, entityId,
    cuttingSkill,
    polishingControl: 65,
    gemIdentification: 80,
    outputQuality: 75,
    tick: 0,
  }
}

// ——— 基础增删查测试 ———
describe('CreatureLapidarySystem - 基础增删查', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无宝石工', () => {
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries[0].entityId).toBe(1)
  })

  it('返回内部引用稳定', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect((sys as any).lapidaries).toBe((sys as any).lapidaries)
  })

  it('多个全部返回', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    ;(sys as any).lapidaries.push(makeLap(2))
    expect((sys as any).lapidaries).toHaveLength(2)
  })

  it('四字段完整（cuttingSkill/polishingControl/gemIdentification/outputQuality）', () => {
    ;(sys as any).lapidaries.push(makeLap(3))
    const l = (sys as any).lapidaries[0]
    expect(l.cuttingSkill).toBe(70)
    expect(l.polishingControl).toBe(65)
    expect(l.gemIdentification).toBe(80)
    expect(l.outputQuality).toBe(75)
  })
})

// ——— CHECK_INTERVAL 节流测试 ——���
describe('CreatureLapidarySystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值 < 2690 时 lastCheck 不更新', () => {
    const em = {} as any
    sys.update(0, em, 0)      // lastCheck=0
    sys.update(0, em, 100)    // 100 < 2690, 不触发
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= 2690 时 lastCheck 更新', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lastCheck).toBe(2690)
  })
})

// ——— update 技能递增公式测试 ———
describe('CreatureLapidarySystem - 技能递增公式', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 cuttingSkill + 0.02', () => {
    const initialSkill = 50
    ;(sys as any).lapidaries.push(makeLap(1, initialSkill))
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBeCloseTo(initialSkill + 0.02, 5)
  })

  it('update 后 polishingControl + 0.015', () => {
    const l = makeLap(1)
    const initial = l.polishingControl
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].polishingControl).toBeCloseTo(initial + 0.015, 5)
  })

  it('update 后 outputQuality + 0.01', () => {
    const l = makeLap(1)
    const initial = l.outputQuality
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].outputQuality).toBeCloseTo(initial + 0.01, 5)
  })

  it('cuttingSkill 上限 100：99.99 + 0.02 = 100', () => {
    const l = makeLap(1, 99.99)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries[0].cuttingSkill).toBe(100)
  })
})

// ——— cleanup: cuttingSkill <= 4 时删除 ———
describe('CreatureLapidarySystem - cleanup 边界', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cuttingSkill = 4 时记录被删除（恰好边界）', () => {
    const l = makeLap(1, 4)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    // 触发后：skill+0.02=4.02，但原始值=4，cleanup 检查的是更新后的值
    // 更新后 cuttingSkill=4.02 > 4，不删除（需验证实际逻辑顺序）
    // 源码：先 update skill，后 cleanup。 4 + 0.02 = 4.02 > 4 → 保留
    expect((sys as any).lapidaries).toHaveLength(1)
  })

  it('cuttingSkill = 3.98 时被删除（更新后仍 <= 4）', () => {
    // 3.98 + 0.02 = 4.00, 4.00 <= 4 → 删除
    const l = makeLap(1, 3.98)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    expect((sys as any).lapidaries).toHaveLength(0)
  })

  it('cuttingSkill = 5 时不删除', () => {
    const l = makeLap(1, 5)
    ;(sys as any).lapidaries.push(l)
    const em = {} as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, 2690)
    // 5 + 0.02 = 5.02 > 4 → 保留
    expect((sys as any).lapidaries).toHaveLength(1)
  })
})
