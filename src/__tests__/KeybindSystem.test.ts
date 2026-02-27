import { describe, it, expect, beforeEach } from 'vitest'
import { KeybindSystem } from '../systems/KeybindSystem'
function makeSys() { return new KeybindSystem() }
describe('KeybindSystem', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  it('getKey返回字符串', () => { expect(typeof sys.getKey('pause')).toBe('string') })
  it('getAction未知键返回null', () => { expect(sys.getAction('UnknownKey999')).toBeNull() })
})
