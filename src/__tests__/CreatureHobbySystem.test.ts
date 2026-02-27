import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHobbySystem } from '../systems/CreatureHobbySystem'
import type { CreatureHobby, HobbyType } from '../systems/CreatureHobbySystem'

function makeSys(): CreatureHobbySystem { return new CreatureHobbySystem() }
function makeHobby(id: number, hobby: HobbyType = 'fishing'): CreatureHobby {
  return { entityId: id, hobby, skill: 50, enjoyment: 30, lastPracticed: 0, socialPartner: null }
}

describe('CreatureHobbySystem.getHobby', () => {
  let sys: CreatureHobbySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入返回 undefined', () => { expect(sys.getHobby(999)).toBeUndefined() })
  it('注入后可查询', () => {
    ;(sys as any).hobbies.set(1, makeHobby(1, 'painting'))
    const h = sys.getHobby(1)
    expect(h).toBeDefined()
    expect(h!.hobby).toBe('painting')
  })
})

describe('CreatureHobbySystem.getHobbies', () => {
  let sys: CreatureHobbySystem
  beforeEach(() => { sys = makeSys() })

  it('初始为空 Map', () => { expect(sys.getHobbies().size).toBe(0) })
  it('返回内部 Map 引用', () => {
    expect(sys.getHobbies()).toBe((sys as any).hobbies)
  })
  it('支持所有 6 种爱好类型', () => {
    const types: HobbyType[] = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
    types.forEach((t, i) => { ;(sys as any).hobbies.set(i + 1, makeHobby(i + 1, t)) })
    types.forEach((t, i) => { expect(sys.getHobby(i + 1)!.hobby).toBe(t) })
  })
})

describe('CreatureHobbySystem.getHobbyCount', () => {
  let sys: CreatureHobbySystem
  beforeEach(() => { sys = makeSys() })

  it('初始为 0', () => { expect(sys.getHobbyCount()).toBe(0) })
  it('注入后计数正确', () => {
    ;(sys as any).hobbies.set(1, makeHobby(1))
    ;(sys as any).hobbies.set(2, makeHobby(2))
    expect(sys.getHobbyCount()).toBe(2)
  })
})
