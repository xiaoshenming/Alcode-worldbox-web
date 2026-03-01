import { describe, it, expect, beforeEach } from 'vitest'
import { EntitySearchSystem } from '../systems/EntitySearchSystem'
function makeSys() { return new EntitySearchSystem() }
describe('EntitySearchSystem', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  it('getQuery初始为空字符串', () => { expect((sys as any).query).toBe('') })
  it('getResults初始为空', () => { expect((sys as any).results).toHaveLength(0) })
  it('getSelectedResult初始为null或undefined', () => { expect((sys as any).selectedResult == null).toBe(true) })
  it('panelOpen初始为false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('selectedIdx初始为-1', () => { expect((sys as any).selectedIdx).toBe(-1) })
})
