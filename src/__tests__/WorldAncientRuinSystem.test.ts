import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAncientRuinSystem } from '../systems/WorldAncientRuinSystem'
import type { AncientRuin, RuinType, RuinReward } from '../systems/WorldAncientRuinSystem'

function makeSys(): WorldAncientRuinSystem { return new WorldAncientRuinSystem() }
let nextId = 1
function makeRuin(type: RuinType = 'temple', explored = false): AncientRuin {
  return { id: nextId++, type, name: 'Test Ruin', x: 20, y: 30, explored, exploredBy: null, dangerLevel: 3, reward: 'treasure', rewardValue: 100, discoveredTick: 0, exploredTick: 0, dangerLabel: `Danger: 3`, panelStr: explored ? 'Test Ruin explored' : 'Test Ruin danger:3' }
}

describe('WorldAncientRuinSystem.getRuins', () => {
  let sys: WorldAncientRuinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无古迹', () => { expect(sys.getRuins()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ruins.push(makeRuin())
    expect(sys.getRuins()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRuins()).toBe((sys as any).ruins)
  })
  it('支持5种古迹类型', () => {
    const types: RuinType[] = ['temple', 'library', 'vault', 'tomb', 'fortress']
    expect(types).toHaveLength(5)
  })
  it('古迹字段正确', () => {
    ;(sys as any).ruins.push(makeRuin('tomb'))
    const r = sys.getRuins()[0]
    expect(r.type).toBe('tomb')
    expect(r.dangerLevel).toBe(3)
    expect(r.explored).toBe(false)
  })
})

describe('WorldAncientRuinSystem.getUnexplored', () => {
  let sys: WorldAncientRuinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('过滤未探索古迹', () => {
    ;(sys as any).ruins.push(makeRuin('temple', false))
    ;(sys as any).ruins.push(makeRuin('vault', true))
    ;(sys as any).ruins.push(makeRuin('tomb', false))
    expect(sys.getUnexplored()).toHaveLength(2)
  })
})
