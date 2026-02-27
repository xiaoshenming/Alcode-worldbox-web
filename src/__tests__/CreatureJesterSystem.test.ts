import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureJesterSystem } from '../systems/CreatureJesterSystem'
import type { Jester, JesterAct } from '../systems/CreatureJesterSystem'

let nextId = 1
function makeSys(): CreatureJesterSystem { return new CreatureJesterSystem() }
function makeJester(creatureId: number, act: JesterAct = 'comedy'): Jester {
  return { id: nextId++, creatureId, act, humor: 70, performances: 10, moraleBoost: 15, notoriety: 30, tick: 0 }
}

describe('CreatureJesterSystem.getJesters', () => {
  let sys: CreatureJesterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无弄臣', () => { expect(sys.getJesters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).jesters.push(makeJester(1, 'juggling'))
    expect(sys.getJesters()[0].act).toBe('juggling')
  })
  it('返回内部引用', () => {
    ;(sys as any).jesters.push(makeJester(1))
    expect(sys.getJesters()).toBe((sys as any).jesters)
  })
  it('支持所有 4 种表演类型', () => {
    const acts: JesterAct[] = ['juggling', 'comedy', 'acrobatics', 'satire']
    acts.forEach((a, i) => { ;(sys as any).jesters.push(makeJester(i + 1, a)) })
    const all = sys.getJesters()
    acts.forEach((a, i) => { expect(all[i].act).toBe(a) })
  })
  it('多个全部返回', () => {
    ;(sys as any).jesters.push(makeJester(1))
    ;(sys as any).jesters.push(makeJester(2))
    expect(sys.getJesters()).toHaveLength(2)
  })
})
