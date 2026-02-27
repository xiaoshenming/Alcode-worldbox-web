import { describe, it, expect, beforeEach } from 'vitest'
import { PowerFavoriteSystem } from '../systems/PowerFavoriteSystem'
function makeSys() { return new PowerFavoriteSystem() }
describe('PowerFavoriteSystem', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  it('getSelectedPower初始为null', () => { expect(sys.getSelectedPower()).toBeNull() })
})
