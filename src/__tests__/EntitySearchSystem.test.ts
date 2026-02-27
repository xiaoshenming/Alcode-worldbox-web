import { describe, it, expect, beforeEach } from 'vitest'
import { EntitySearchSystem } from '../systems/EntitySearchSystem'
function makeSys() { return new EntitySearchSystem() }
describe('EntitySearchSystem', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  it('getQuery初始为空字符串', () => { expect(sys.getQuery()).toBe('') })
  it('getResults初始为空', () => { expect(sys.getResults()).toHaveLength(0) })
  it('getSelectedResult初始为null', () => { expect(sys.getSelectedResult()).toBeNull() })
})
