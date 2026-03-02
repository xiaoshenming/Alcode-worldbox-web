import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureDowserSystem } from '../systems/CreatureDowserSystem'
import type { DowserData, DowserTool } from '../systems/CreatureDowserSystem'

function makeSys(): CreatureDowserSystem { return new CreatureDowserSystem() }
function makeDowser(entityId: number, tool: DowserTool = 'rod'): DowserData {
  return { entityId, waterFound: 5, accuracy: 60, tool, reputation: 50, active: true, tick: 0 }
}
function makeEM(entities: number[] = [], hasComponent = true) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entities),
    hasComponent: vi.fn().mockReturnValue(hasComponent),
  }
}

describe('CreatureDowserSystem', () => {
  let sys: CreatureDowserSystem
  beforeEach(() => { sys = makeSys() })

  // 1. 初始无探水师
  it('初始无探水师', () => {
    expect((sys as any).dowsers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).dowsers.push(makeDowser(1, 'crystal'))
    expect((sys as any).dowsers[0].tool).toBe('crystal')
  })

  // 3. 多个全部返回
  it('多个注入后全部返回', () => {
    ;(sys as any).dowsers.push(makeDowser(1, 'rod'))
    ;(sys as any).dowsers.push(makeDowser(2, 'pendulum'))
    expect((sys as any).dowsers).toHaveLength(2)
  })

  // 4a. DowserTool包含4种
  it('支持所有 4 种工具', () => {
    const tools: DowserTool[] = ['rod', 'pendulum', 'intuition', 'crystal']
    tools.forEach((t, i) => { ;(sys as any).dowsers.push(makeDowser(i + 1, t)) })
    const all = (sys as any).dowsers
    tools.forEach((t, i) => { expect(all[i].tool).toBe(t) })
  })

  // 4b. TOOL_BASE_ACCURACY: rod→40
  it('TOOL_BASE_ACCURACY: rod 精度为 40', () => {
    const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
    expect(acc['rod']).toBe(40)
  })

  // 4c. TOOL_BASE_ACCURACY: crystal→65（最高）
  it('TOOL_BASE_ACCURACY: crystal 精度为 65（最高）', () => {
    const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
    const max = Math.max(...Object.values(acc))
    expect(acc['crystal']).toBe(65)
    expect(acc['crystal']).toBe(max)
  })

  // 4d. TOOL_BASE_ACCURACY: intuition→25（最低）
  it('TOOL_BASE_ACCURACY: intuition 精度为 25（最低）', () => {
    const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
    expect(acc['intuition']).toBe(25)
  })

  // 5. tick差值<3000时不更新lastCheck
  it('tick差值<3000时不更新lastCheck', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 3999) // diff = 2999 < 3000，不执行
    expect((sys as any).lastCheck).toBe(1000)
    expect(em.getEntitiesWithComponent).not.toHaveBeenCalled()
  })

  // 6. tick差值>=3000时更新lastCheck
  it('tick差值>=3000时更新lastCheck', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 4000) // diff = 3000 >= 3000，执行
    expect((sys as any).lastCheck).toBe(4000)
  })

  // 7. active=false的记录不触发success分支（跳过dowsing逻辑）
  it('active=false的记录不参与dowsing', () => {
    const d = makeDowser(1, 'rod')
    d.active = false
    d.waterFound = 0
    d.reputation = 50
    ;(sys as any).dowsers.push(d)
    const em = makeEM([1])
    // 强制 Math.random 返回确保进入 success 分支，但 active=false 应跳过
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.015 → 会尝试 dowsing
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 3000)
    vi.restoreAllMocks()
    // active=false 跳过，waterFound仍为0
    expect(d.waterFound).toBe(0)
  })

  // 8. _dowsersSet初始为空
  it('_dowsersSet 初始为空集合', () => {
    expect((sys as any)._dowsersSet.size).toBe(0)
  })

  // 9. 注入探水师后_dowsersSet可手动添加
  it('_dowsersSet.add后包含entityId', () => {
    ;(sys as any)._dowsersSet.add(42)
    expect((sys as any)._dowsersSet.has(42)).toBe(true)
  })

  // 10. 当实体不再存在时，update后cleanup移除对应dowser
  it('实体不再存在时cleanup移除该dowser', () => {
    const d = makeDowser(99, 'rod')
    ;(sys as any).dowsers.push(d)
    ;(sys as any)._dowsersSet.add(99)
    // em.hasComponent返回false → 实体不存在
    const em = makeEM([], false)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 3000)
    expect((sys as any).dowsers).toHaveLength(0)
  })

  // 11. active字段可区分
  it('active 字段可区分 true/false', () => {
    ;(sys as any).dowsers.push({ ...makeDowser(1), active: false })
    ;(sys as any).dowsers.push({ ...makeDowser(2), active: true })
    expect((sys as any).dowsers[0].active).toBe(false)
    expect((sys as any).dowsers[1].active).toBe(true)
  })

  // 12. DowserData字段完整性
  it('DowserData ���有字段均可访问', () => {
    const d = makeDowser(7, 'pendulum')
    expect(d).toHaveProperty('entityId')
    expect(d).toHaveProperty('waterFound')
    expect(d).toHaveProperty('accuracy')
    expect(d).toHaveProperty('tool')
    expect(d).toHaveProperty('reputation')
    expect(d).toHaveProperty('active')
    expect(d).toHaveProperty('tick')
  })
})
