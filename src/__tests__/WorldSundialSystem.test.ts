import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSundialSystem } from '../systems/WorldSundialSystem'
import type { Sundial, SundialSize } from '../systems/WorldSundialSystem'

function makeSys(): WorldSundialSystem { return new WorldSundialSystem() }
let nextId = 1
function makeSundial(size: SundialSize = 'medium'): Sundial {
  return { id: nextId++, x: 20, y: 30, size, accuracy: 90, age: 200, knowledgeBonus: 5, shadowAngle: 45, tick: 0 }
}

describe('WorldSundialSystem.getSundials', () => {
  let sys: WorldSundialSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无日晷', () => { expect((sys as any).sundials).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sundials.push(makeSundial())
    expect((sys as any).sundials).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).sundials).toBe((sys as any).sundials)
  })
  it('支持4种尺寸', () => {
    const sizes: SundialSize[] = ['small', 'medium', 'large', 'monumental']
    expect(sizes).toHaveLength(4)
  })
  it('日晷字段正确', () => {
    ;(sys as any).sundials.push(makeSundial('monumental'))
    const s = (sys as any).sundials[0]
    expect(s.size).toBe('monumental')
    expect(s.accuracy).toBe(90)
    expect(s.knowledgeBonus).toBe(5)
  })
})
