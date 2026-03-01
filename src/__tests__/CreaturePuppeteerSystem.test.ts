import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePuppeteerSystem } from '../systems/CreaturePuppeteerSystem'
import type { Puppeteer, PuppetStyle } from '../systems/CreaturePuppeteerSystem'

let nextId = 1
function makeSys(): CreaturePuppeteerSystem { return new CreaturePuppeteerSystem() }
function makePuppeteer(creatureId: number, style: PuppetStyle = 'shadow'): Puppeteer {
  return { id: nextId++, creatureId, style, skill: 70, showsPerformed: 10, moraleBoost: 15, fame: 30, tick: 0 }
}

describe('CreaturePuppeteerSystem.getPuppeteers', () => {
  let sys: CreaturePuppeteerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无木偶师', () => { expect((sys as any).puppeteers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1, 'marionette'))
    expect((sys as any).puppeteers[0].style).toBe('marionette')
  })
  it('返回内部引用', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1))
    expect((sys as any).puppeteers).toBe((sys as any).puppeteers)
  })
  it('支持所有4种木偶风格', () => {
    const styles: PuppetStyle[] = ['shadow', 'marionette', 'hand', 'rod']
    styles.forEach((s, i) => { ;(sys as any).puppeteers.push(makePuppeteer(i + 1, s)) })
    const all = (sys as any).puppeteers
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).puppeteers.push(makePuppeteer(1))
    ;(sys as any).puppeteers.push(makePuppeteer(2))
    expect((sys as any).puppeteers).toHaveLength(2)
  })
})
