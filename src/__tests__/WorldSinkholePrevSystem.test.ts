import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSinkholePrevSystem } from '../systems/WorldSinkholePrevSystem'
import type { SinkholeRisk } from '../systems/WorldSinkholePrevSystem'

function makeSys(): WorldSinkholePrevSystem { return new WorldSinkholePrevSystem() }
let nextId = 1
function makeRisk(): SinkholeRisk {
  return { id: nextId++, x: 20, y: 30, riskLevel: 60, groundStability: 40, monitoringSince: 1000, mitigated: false, active: true, tick: 0 }
}

describe('WorldSinkholePrevSystem.getRisks', () => {
  let sys: WorldSinkholePrevSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天坑风险', () => { expect(sys.getRisks()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).risks.push(makeRisk())
    expect(sys.getRisks()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRisks()).toBe((sys as any).risks)
  })
  it('天坑风险字段正确', () => {
    ;(sys as any).risks.push(makeRisk())
    const r = sys.getRisks()[0]
    expect(r.riskLevel).toBe(60)
    expect(r.groundStability).toBe(40)
    expect(r.mitigated).toBe(false)
  })
})
