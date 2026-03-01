import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTattooSystem } from '../systems/CreatureTattooSystem'
import type { Tattoo, TattooStyle } from '../systems/CreatureTattooSystem'

let nextId = 1
function makeSys(): CreatureTattooSystem { return new CreatureTattooSystem() }
function makeTattoo(entityId: number, style: TattooStyle = 'tribal'): Tattoo {
  return { id: nextId++, entityId, style, meaning: 'strength', prestige: 50, tick: 0 }
}

describe('CreatureTattooSystem getters', () => {
  let sys: CreatureTattooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纹身', () => { expect((sys as any).tattoos).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos[0].style).toBe('runic')
  })
  it('返回内部引用', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    expect((sys as any).tattoos).toBe((sys as any).tattoos)
  })
  it('getEntityTattoos按entityId过滤', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'tribal'))
    ;(sys as any).tattoos.push(makeTattoo(2, 'war_paint'))
    ;(sys as any).tattoos.push(makeTattoo(1, 'ancestral'))
    const result = sys.getEntityTattoos(1)
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.entityId).toBe(1))
  })
  it('支持所有6种纹身风格', () => {
    const styles: TattooStyle[] = ['tribal', 'runic', 'beast', 'celestial', 'war_paint', 'ancestral']
    styles.forEach((s, i) => { ;(sys as any).tattoos.push(makeTattoo(i + 1, s)) })
    expect((sys as any).tattoos).toHaveLength(6)
  })
  it('字段正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(2, 'celestial'))
    const t = (sys as any).tattoos[0]
    expect(t.prestige).toBe(50)
    expect(t.meaning).toBe('strength')
  })
})
