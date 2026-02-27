import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNicknameSystem } from '../systems/CreatureNicknameSystem'
import type { Nickname, NicknameTitle } from '../systems/CreatureNicknameSystem'

let nextId = 1
function makeSys(): CreatureNicknameSystem { return new CreatureNicknameSystem() }
function makeNickname(entityId: number, name: NicknameTitle = 'the Brave', fame = 50): Nickname {
  return { id: nextId++, entityId, name, reason: 'Did something notable', fame, tick: 0 }
}

describe('CreatureNicknameSystem.getNicknames', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绰号', () => { expect(sys.getNicknames()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Wise'))
    expect(sys.getNicknames()[0].name).toBe('the Wise')
  })
  it('返回内部引用', () => {
    ;(sys as any).nicknames.push(makeNickname(1))
    expect(sys.getNicknames()).toBe((sys as any).nicknames)
  })
})

describe('CreatureNicknameSystem.getNickname / getFamous', () => {
  let sys: CreatureNicknameSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getNickname 无匹配返回 undefined', () => { expect(sys.getNickname(999)).toBeUndefined() })
  it('getNickname 找到匹配', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Lucky'))
    expect(sys.getNickname(1)!.name).toBe('the Lucky')
  })
  it('getFamous 按名声降序返回', () => {
    ;(sys as any).nicknames.push(makeNickname(1, 'the Brave', 30))
    ;(sys as any).nicknames.push(makeNickname(2, 'the Wise', 90))
    ;(sys as any).nicknames.push(makeNickname(3, 'the Cruel', 60))
    const famous = sys.getFamous(2)
    expect(famous).toHaveLength(2)
    expect(famous[0].fame).toBe(90)
  })
})
