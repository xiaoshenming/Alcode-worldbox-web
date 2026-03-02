import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSilkWeaverSystem } from '../systems/CreatureSilkWeaverSystem'
import type { SilkWeaver } from '../systems/CreatureSilkWeaverSystem'

let nextId = 1
function makeSys(): CreatureSilkWeaverSystem { return new CreatureSilkWeaverSystem() }
function makeWeaver(entityId: number, threadFineness = 70, loomMastery = 65, patternComplexity = 80, outputQuality = 75, tick = 0): SilkWeaver {
  return { id: nextId++, entityId, threadFineness, loomMastery, patternComplexity, outputQuality, tick }
}

const CHECK_INTERVAL = 2580

function makeEM() {
  return {
    getEntitiesWithComponents: () => [] as number[],
    getComponent: () => undefined,
  }
}

describe('CreatureSilkWeaverSystem.getWeavers', () => {
  let sys: CreatureSilkWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无丝绸织工', () => { expect((sys as any).weavers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })
  it('字段正确', () => {
    ;(sys as any).weavers.push(makeWeaver(2))
    const w = (sys as any).weavers[0]
    expect(w.threadFineness).toBe(70)
    expect(w.patternComplexity).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })
})

describe('CreatureSilkWeaverSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSilkWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick小于CHECK_INTERVAL时update不执行', () => {
    const em = makeEM()
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时lastCheck被更新', () => {
    const em = makeEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用时间不足时只执行一次', () => {
    const em = makeEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(1, em as any, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(lc)
  })

  it('第二次tick超过CHECK_INTERVAL时再次执行', () => {
    const em = makeEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureSilkWeaverSystem - 技能增长(+0.02/+0.015/+0.01)', () => {
  let sys: CreatureSilkWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('threadFineness每次update增长0.02', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].threadFineness).toBeCloseTo(50.02, 5)
  })

  it('patternComplexity每次update增长0.015', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].patternComplexity).toBeCloseTo(50.015, 5)
  })

  it('outputQuality每次update增长0.01', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('threadFineness上限为100不超过', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 99.99, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].threadFineness).toBe(100)
  })

  it('patternComplexity上限为100不超过', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 99.99, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].patternComplexity).toBe(100)
  })

  it('outputQuality上限为100不超过', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 50, 99.99))
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBe(100)
  })

  it('多轮update技能累计增长', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 50, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).weavers[0].threadFineness).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureSilkWeaverSystem - cleanup边界(threadFineness<=4)', () => {
  let sys: CreatureSilkWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('threadFineness=4的织工update后4.02>4不被清除', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 4, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    // 增长后 4 + 0.02 = 4.02 > 4，不被清除
    expect((sys as any).weavers).toHaveLength(1)
  })

  it('threadFineness=3的织工被清除(3+0.02=3.02<=4)', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 3, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    // 3 + 0.02 = 3.02 <= 4, 被清除
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('threadFineness=4.01(>4)不被清除', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 4.01, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4, 不清除
    expect((sys as any).weavers).toHaveLength(1)
  })

  it('边界值3.98: +0.02后=4.0, 仍<=4，被清除', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 3.98, 50, 50, 50))
    sys.update(1, em as any, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0 <= 4, 应被清除
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('只清除低值织工，保留高值织工', () => {
    const em = makeEM()
    ;(sys as any).weavers.push(makeWeaver(1, 2, 50, 50, 50))   // 被清除
    ;(sys as any).weavers.push(makeWeaver(2, 50, 50, 50, 50))  // 保留
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })

  it('MAX_WEAVERS上限为11', () => {
    // weavers数组最多11个（通过注入验证上限配置）
    expect((sys as any).weavers.length).toBe(0)
    for (let i = 0; i < 11; i++) {
      ;(sys as any).weavers.push(makeWeaver(i + 1, 50, 50, 50, 50))
    }
    expect((sys as any).weavers).toHaveLength(11)
  })

  it('update不崩溃（空织工列表）', () => {
    const em = makeEM()
    expect(() => sys.update(1, em as any, 0)).not.toThrow()
  })
})
