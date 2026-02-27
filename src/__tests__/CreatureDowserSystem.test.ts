import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDowserSystem } from '../systems/CreatureDowserSystem'
import type { DowserData, DowserTool } from '../systems/CreatureDowserSystem'

function makeSys(): CreatureDowserSystem { return new CreatureDowserSystem() }
function makeDowser(entityId: number, tool: DowserTool = 'rod'): DowserData {
  return { entityId, waterFound: 5, accuracy: 60, tool, reputation: 50, active: true, tick: 0 }
}

describe('CreatureDowserSystem.getDowsers', () => {
  let sys: CreatureDowserSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无探水师', () => { expect(sys.getDowsers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).dowsers.push(makeDowser(1, 'crystal'))
    expect(sys.getDowsers()[0].tool).toBe('crystal')
  })

  it('返回只读引用', () => {
    ;(sys as any).dowsers.push(makeDowser(1))
    expect(sys.getDowsers()).toBe((sys as any).dowsers)
  })

  it('支持所有 4 种工具', () => {
    const tools: DowserTool[] = ['rod', 'pendulum', 'intuition', 'crystal']
    tools.forEach((t, i) => { ;(sys as any).dowsers.push(makeDowser(i + 1, t)) })
    const all = sys.getDowsers()
    tools.forEach((t, i) => { expect(all[i].tool).toBe(t) })
  })

  it('active 字段可区分', () => {
    ;(sys as any).dowsers.push({ ...makeDowser(1), active: false })
    expect(sys.getDowsers()[0].active).toBe(false)
  })
})
