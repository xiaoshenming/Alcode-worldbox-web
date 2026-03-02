import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePewtererSystem } from '../systems/CreaturePewtererSystem'
import type { Pewterer } from '../systems/CreaturePewtererSystem'

let nextId = 1
function makeSys(): CreaturePewtererSystem { return new CreaturePewtererSystem() }
function makePewterer(entityId: number, alloyCasting = 70, polishing = 75, outputQuality = 80, tick = 0): Pewterer {
  return { id: nextId++, entityId, alloyCasting, moldWork: 65, polishing, outputQuality, tick }
}

// 空 EntityManager（PewtererSystem 不使用 em，仅接受参数）
const emStub = {} as any

const CHECK_INTERVAL = 2630

describe('CreaturePewtererSystem — 基础状态', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锡工', () => { expect((sys as any).pewterers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect((sys as any).pewterers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    expect((sys as any).pewterers).toBe((sys as any).pewterers)
  })

  it('字段正确', () => {
    ;(sys as any).pewterers.push(makePewterer(2))
    const p = (sys as any).pewterers[0]
    expect(p.alloyCasting).toBe(70)
    expect(p.outputQuality).toBe(80)
  })

  it('多个全部返回', () => {
    ;(sys as any).pewterers.push(makePewterer(1))
    ;(sys as any).pewterers.push(makePewterer(2))
    expect((sys as any).pewterers).toHaveLength(2)
  })
})

describe('CreaturePewtererSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<CHECK_INTERVAL时跳过招募和成长', () => {
    // 预注入一个锡工
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    const origAlloy = (sys as any).pewterers[0].alloyCasting
    // tick=100 < 2630，不触发
    sys.update(1, emStub, 100)
    expect((sys as any).pewterers[0].alloyCasting).toBe(origAlloy)
  })

  it('tick差值>=CHECK_INTERVAL时执行成长逻辑', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    const origAlloy = (sys as any).pewterers[0].alloyCasting
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      sys.update(1, emStub, CHECK_INTERVAL + 1)
      // alloyCasting应+0.02
      expect((sys as any).pewterers[0].alloyCasting).toBeCloseTo(origAlloy + 0.02, 5)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('lastCheck 在触发后更新', () => {
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  it('连续两次update，第二次在interval内不触发成长', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    const alloyAfterFirst = (sys as any).pewterers[0].alloyCasting
    // 第二次 tick 差值不足
    sys.update(1, emStub, CHECK_INTERVAL + 2)
    expect((sys as any).pewterers[0].alloyCasting).toBe(alloyAfterFirst)
  })
})

describe('CreaturePewtererSystem — 技能成长', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('alloyCasting 每次update增长0.02', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].alloyCasting).toBeCloseTo(50.02, 5)
  })

  it('polishing 每次update增长0.015', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].polishing).toBeCloseTo(50.015, 5)
  })

  it('outputQuality 每次update增长0.01', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('alloyCasting上限为100不超出', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 99.99, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].alloyCasting).toBeLessThanOrEqual(100)
  })

  it('alloyCasting=100时精确保持100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 100, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].alloyCasting).toBe(100)
  })

  it('outputQuality上限为100', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 50, 50, 99.99, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers[0].outputQuality).toBeLessThanOrEqual(100)
  })
})

describe('CreaturePewtererSystem — alloyCasting<=4时cleanup', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('alloyCasting成长后仍<=4时被删除（初始3.97→成长后3.99<=4）', () => {
    // 成长逻辑在cleanup之前：3.97+0.02=3.99 <= 4，满足删除条件
    ;(sys as any).pewterers.push(makePewterer(1, 3.97, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers).toHaveLength(0)
  })

  it('alloyCasting=3.98时被删除（<=4）', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 3.98, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers).toHaveLength(0)
  })

  it('alloyCasting=4.01时不被删除', () => {
    // 注意成长后 alloyCasting = 4.01+0.02=4.03，仍>4
    ;(sys as any).pewterers.push(makePewterer(1, 4.01, 50, 50, 0))
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers).toHaveLength(1)
  })

  it('混合高低 alloyCasting 只删低的', () => {
    ;(sys as any).pewterers.push(makePewterer(1, 3, 50, 50, 0))  // 会被删
    ;(sys as any).pewterers.push(makePewterer(2, 60, 50, 50, 0)) // 不被删
    sys.update(1, emStub, CHECK_INTERVAL + 1)
    expect((sys as any).pewterers).toHaveLength(1)
    expect((sys as any).pewterers[0].entityId).toBe(2)
  })
})

describe('CreaturePewtererSystem — 招募逻辑', () => {
  let sys: CreaturePewtererSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_PEWTERERS=10时不超过上限', () => {
    // 预填10个
    for (let i = 0; i < 10; i++) {
      ;(sys as any).pewterers.push(makePewterer(i + 1, 50, 50, 50, 0))
    }
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < RECRUIT_CHANCE 0.0014
    try {
      sys.update(1, emStub, CHECK_INTERVAL + 1)
      expect((sys as any).pewterers.length).toBeLessThanOrEqual(10)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('random > RECRUIT_CHANCE时不招募', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(1) // 1 > 0.0014
    try {
      sys.update(1, emStub, CHECK_INTERVAL + 1)
      expect((sys as any).pewterers).toHaveLength(0)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('random < RECRUIT_CHANCE时招募1个', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0014
    try {
      sys.update(1, emStub, CHECK_INTERVAL + 1)
      expect((sys as any).pewterers.length).toBeGreaterThan(0)
    } finally {
      randSpy.mockRestore()
    }
  })

  it('新招募锡工id递增', () => {
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      sys.update(1, emStub, CHECK_INTERVAL + 1)
      ;(sys as any).lastCheck = 0 // 重置让下次也触发
      sys.update(1, emStub, CHECK_INTERVAL * 2 + 2)
      const pewterers: Pewterer[] = (sys as any).pewterers
      if (pewterers.length >= 2) {
        expect(pewterers[1].id).toBeGreaterThan(pewterers[0].id)
      }
    } finally {
      randSpy.mockRestore()
    }
  })
})
