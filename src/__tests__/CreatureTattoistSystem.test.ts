import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTattoistSystem } from '../systems/CreatureTattoistSystem'
import type { Tattoo, TattooStyle } from '../systems/CreatureTattoistSystem'

let nextId = 1
function makeSys(): CreatureTattoistSystem { return new CreatureTattoistSystem() }
function makeTattoo(creatureId: number, style: TattooStyle = 'tribal'): Tattoo {
  return { id: nextId++, creatureId, style, bodyPart: 'arm', powerBonus: 10, prestige: 50, age: 0, tick: 0 }
}

describe('CreatureTattoistSystem.getTattoos', () => {
  let sys: CreatureTattoistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纹身', () => { expect((sys as any).tattoos).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tattoos.push(makeTattoo(1, 'runic'))
    expect((sys as any).tattoos[0].style).toBe('runic')
  })
  it('返回只读引用', () => {
    ;(sys as any).tattoos.push(makeTattoo(1))
    expect((sys as any).tattoos).toBe((sys as any).tattoos)
  })
  it('支持所有4种纹身风格', () => {
    const styles: TattooStyle[] = ['tribal', 'runic', 'celestial', 'beast']
    styles.forEach((s, i) => { ;(sys as any).tattoos.push(makeTattoo(i + 1, s)) })
    const all = (sys as any).tattoos
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('字段正确', () => {
    ;(sys as any).tattoos.push(makeTattoo(2, 'beast'))
    const t = (sys as any).tattoos[0]
    expect(t.powerBonus).toBe(10)
    expect(t.bodyPart).toBe('arm')
  })
})
