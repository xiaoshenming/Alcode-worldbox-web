import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChainmakerSystem } from '../systems/CreatureChainmakerSystem'
import type { Chainmaker } from '../systems/CreatureChainmakerSystem'

let nextId = 1
function makeSys(): CreatureChainmakerSystem { return new CreatureChainmakerSystem() }
function makeChainmaker(entityId: number, linkForging = 30, weldingSkill = 25, tensileTest = 20, outputQuality = 35, tick = 0): Chainmaker {
  return { id: nextId++, entityId, linkForging, weldingSkill, tensileTest, outputQuality, tick }
}

const fakeEm = {} as any

describe('CreatureChainmakerSystem', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无链匠', () => {
    expect((sys as any).chainmakers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    expect((sys as any).chainmakers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    ;(sys as any).chainmakers.push(makeChainmaker(2))
    expect((sys as any).chainmakers).toHaveLength(2)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const c = makeChainmaker(10, 80, 75, 70, 65)
    ;(sys as any).chainmakers.push(c)
    const r = (sys as any).chainmakers[0] as Chainmaker
    expect(r.linkForging).toBe(80)
    expect(r.weldingSkill).toBe(75)
    expect(r.tensileTest).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  // 5. tick 差值 < 2640 时不更新 lastCheck
  it('tick差值<2640时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2639)
    expect((sys as any).lastCheck).toBe(5000)
  })

  // 6. tick 差值 >= 2640 时更新 lastCheck
  it('tick差值>=2640时更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2640)
    expect((sys as any).lastCheck).toBe(7640)
  })

  // 7. update 后 linkForging+0.02
  it('update后linkForging增加0.02', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.02)
  })

  // 8. update 后 tensileTest+0.015
  it('update后tensileTest增加0.015', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].tensileTest).toBeCloseTo(20.015)
  })

  // 9. linkForging 上限为 100
  it('linkForging上限100：初始99.99→100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 99.99, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(100)
  })

  // 10. cleanup: linkForging<=4时删除（3.98边界被删；entityId=2保留）
  it('cleanup: linkForging<=4的记录被删除，>4的保留', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 3.98, 25, 20, 35)) // 3.98+0.02=4.00 <=4 → 删除
    ;(sys as any).chainmakers.push(makeChainmaker(2, 4.01, 25, 20, 35)) // 4.01+0.02=4.03 >4 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(1)
    expect((sys as any).chainmakers[0].entityId).toBe(2)
  })
})
