import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectPoolSystem } from '../systems/ObjectPoolSystem'
function makeSys() { return new ObjectPoolSystem() }
describe('ObjectPoolSystem', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  it('getAllStats返回对象', () => { expect(typeof sys.getAllStats()).toBe('object') })
})
