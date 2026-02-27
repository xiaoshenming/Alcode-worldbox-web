import { describe, it, expect, beforeEach } from 'vitest'
import { KeybindSystem } from '../systems/KeybindSystem'
function makeSys() { return new KeybindSystem() }
describe('KeybindSystem', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  it('getKey返回字符串', () => { expect(typeof sys.getKey('pause')).toBe('string') })
  it('getAction未知键返回null', () => { expect(sys.getAction('UnknownKey999')).toBeNull() })
  it('getKey pause 默认绑定Space', () => { expect(sys.getKey('pause')).toBe('Space') })
  it('getAction Space 返回pause', () => { expect(sys.getAction('Space')).toBe('pause') })
  it('isPanelOpen 初始为false', () => { expect(sys.isPanelOpen()).toBe(false) })
  it('rebind 修改后 getKey 返回新键', () => {
    sys.rebind('pause', 'P')
    expect(sys.getKey('pause')).toBe('P')
  })
})
