import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDreamSystem } from '../systems/CreatureDreamSystem'
import type { Dream, DreamType } from '../systems/CreatureDreamSystem'

let nextId = 1
function makeSys(): CreatureDreamSystem { return new CreatureDreamSystem() }
function makeDream(creatureId: number, type: DreamType = 'peaceful'): Dream {
  return { id: nextId++, creatureId, type, intensity: 50, moodEffect: 5, tick: 0 }
}

describe('CreatureDreamSystem.getDreamLog', () => {
  let sys: CreatureDreamSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梦境', () => { expect(sys.getDreamLog()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).dreamLog.push(makeDream(1, 'nightmare'))
    expect(sys.getDreamLog()[0].type).toBe('nightmare')
  })

  it('返回内部引用', () => {
    ;(sys as any).dreamLog.push(makeDream(1))
    expect(sys.getDreamLog()).toBe((sys as any).dreamLog)
  })

  it('支持所有 6 种梦境类型', () => {
    const types: DreamType[] = ['prophetic', 'nightmare', 'nostalgic', 'peaceful', 'adventure', 'warning']
    types.forEach((t, i) => { ;(sys as any).dreamLog.push(makeDream(i + 1, t)) })
    const all = sys.getDreamLog()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureDreamSystem.getRecentDreams', () => {
  let sys: CreatureDreamSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('返回最后 n 条', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).dreamLog.push(makeDream(i + 1)) }
    expect(sys.getRecentDreams(2)).toHaveLength(2)
  })
})

describe('CreatureDreamSystem.getNightmareCount', () => {
  let sys: CreatureDreamSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('只统计噩梦', () => {
    ;(sys as any).dreamLog.push(makeDream(1, 'nightmare'))
    ;(sys as any).dreamLog.push(makeDream(2, 'peaceful'))
    ;(sys as any).dreamLog.push(makeDream(3, 'nightmare'))
    expect(sys.getNightmareCount()).toBe(2)
  })
})
