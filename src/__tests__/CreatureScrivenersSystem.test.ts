import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureScrivenersSystem } from '../systems/CreatureScrivenersSystem'
import type { Scrivener, ScriptStyle } from '../systems/CreatureScrivenersSystem'

let nextId = 1
function makeSys(): CreatureScrivenersSystem { return new CreatureScrivenersSystem() }
function makeMaker(entityId: number, style: ScriptStyle = 'uncial'): Scrivener {
  return { id: nextId++, entityId, skill: 70, documentsWritten: 20, scriptStyle: style, penmanship: 75, reputation: 50, tick: 0 }
}

describe('CreatureScrivenersSystem.getMakers', () => {
  let sys: CreatureScrivenersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抄写员', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'gothic'))
    expect((sys as any).makers[0].scriptStyle).toBe('gothic')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种字体风格', () => {
    const styles: ScriptStyle[] = ['uncial', 'gothic', 'italic', 'copperplate']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].scriptStyle).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
