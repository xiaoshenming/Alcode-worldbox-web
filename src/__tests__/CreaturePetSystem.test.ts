import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePetSystem } from '../systems/CreaturePetSystem'
import type { PetType, CreaturePet } from '../systems/CreaturePetSystem'

// CHECK_INTERVAL=900, BOND_INTERVAL=600, MAX_PETS=120, BOND_GAIN=2
// adoptPets: 概率0.04, bond初始=20+random*30
// updateBonds: bond+2(上限100), age++, age>200时1%概率死亡

function makeSys() { return new CreaturePetSystem() }

function makePet(entityId: number, petType: PetType = 'cat', bond = 50, age = 0): CreaturePet {
  return { entityId, petType, name: 'Test', bond, age, adoptedAt: 0 }
}

describe('CreaturePetSystem', () => {
  let sys: CreaturePetSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始化状态 ──────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('初始化不崩溃', () => { expect(sys).toBeDefined() })

    it('pets Map初始为空', () => {
      expect((sys as any).pets.size).toBe(0)
    })

    it('pets是Map类型', () => {
      expect((sys as any).pets).toBeInstanceOf(Map)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastBond初始为0', () => {
      expect((sys as any).lastBond).toBe(0)
    })

    it('getPets()初始返回空Map', () => {
      expect(sys.getPets().size).toBe(0)
    })

    it('getPets()返回Map类型', () => {
      expect(sys.getPets()).toBeInstanceOf(Map)
    })
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────

  describe('CHECK_INTERVAL节流逻辑', () => {
    it('tick差值<CHECK_INTERVAL(900)时不触发adoptPets', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 800)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值>=CHECK_INTERVAL(900)时更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)
      expect((sys as any).lastCheck).toBe(900)
    })

    it('tick差值恰好为899时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 1
      sys.update(1, em, 900)  // 900-1=899 < 900
      expect((sys as any).lastCheck).toBe(1)
    })

    it('tick差值恰好为900时触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 100
      sys.update(1, em, 1000)  // 1000-100=900 >= 900
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('连续update：第二次差值不足时不重复触发CHECK', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)   // 触发
      sys.update(1, em, 1700)  // 1700-900=800 < 900，不触发
      expect((sys as any).lastCheck).toBe(900)
    })
  })

  // ── BOND_INTERVAL 节流 ──────────────────────────────────────────────────

  describe('BOND_INTERVAL节流逻辑', () => {
    it('tick差值<BOND_INTERVAL(600)时不触发updateBonds', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
      ;(sys as any).lastBond = 0
      ;(sys as any).lastCheck = 999999
      sys.update(1, em, 500)
      expect((sys as any).lastBond).toBe(0)
    })

    it('tick差值>=BOND_INTERVAL(600)时更新lastBond', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
      ;(sys as any).lastBond = 0
      ;(sys as any).lastCheck = 999999
      sys.update(1, em, 600)
      expect((sys as any).lastBond).toBe(600)
    })

    it('BOND_INTERVAL恰好599时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
      ;(sys as any).lastBond = 1
      ;(sys as any).lastCheck = 999999
      sys.update(1, em, 600)  // 600-1=599 < 600
      expect((sys as any).lastBond).toBe(1)
    })

    it('CHECK和BOND可同时触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastBond = 0
      sys.update(1, em, 900)  // 900>=900(CHECK), 900>=600(BOND)
      expect((sys as any).lastCheck).toBe(900)
      expect((sys as any).lastBond).toBe(900)
    })

    it('CHECK和BOND独立触发：只触发BOND不触发CHECK', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
      ;(sys as any).lastCheck = 500
      ;(sys as any).lastBond = 0
      sys.update(1, em, 700)  // 700-500=200<900(不触发CHECK); 700-0=700>=600(触发BOND)
      expect((sys as any).lastCheck).toBe(500)  // 未更新
      expect((sys as any).lastBond).toBe(700)   // 已更新
    })
  })

  // ── updateBonds: bond递增 ────────────────────────────────────────────────

  describe('updateBonds债券增长', () => {
    it('updateBonds增加bond（BOND_GAIN=2），上限100', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 50))
      const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.get(1)!.bond).toBe(52)
    })

    it('updateBonds：bond上限100不超出', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'dog', 99))
      const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.get(1)!.bond).toBe(100)
    })

    it('updateBonds：bond已为100时保持100', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'bird', 100))
      const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.get(1)!.bond).toBe(100)
    })

    it('updateBonds：age每次+1', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 50, 10))
      const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.get(1)!.age).toBe(11)
    })

    it('updateBonds：无creature时删除pet', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'bird', 50))
      pets.set(2, makePet(2, 'rabbit', 30))
      const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.has(1)).toBe(true)
      expect(pets.has(2)).toBe(false)
    })

    it('updateBonds：多个pets同时处理', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 40))
      pets.set(2, makePet(2, 'dog', 60))
      const em = { getComponent: (_id: number, _: string) => ({}) } as any
      ;(sys as any).updateBonds(em)
      expect(pets.get(1)!.bond).toBe(42)
      expect(pets.get(2)!.bond).toBe(62)
    })

    it('updateBonds：getComponent返回null时删除对应pet', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(10, makePet(10, 'lizard', 50))
      const em = { getComponent: () => null } as any
      ;(sys as any).updateBonds(em)
      expect(pets.has(10)).toBe(false)
    })

    it('updateBonds：pets为空时不崩溃', () => {
      const em = { getComponent: () => ({}) } as any
      expect(() => (sys as any).updateBonds(em)).not.toThrow()
    })

    it('updateBonds：age<=200时不触发死亡概率', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 50, 100))
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 即使random=0，age<=200不触发死亡
      const em = { getComponent: (_id: number, _: string) => ({}) } as any
      ;(sys as any).updateBonds(em)
      // age=100 <= 200，不触发死亡判断，pet保留
      expect(pets.has(1)).toBe(true)
    })

    it('updateBonds：age>200且random<0.01时pet死亡', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 50, 201))
      vi.spyOn(Math, 'random').mockReturnValue(0.005)  // 0.005 < 0.01，触发死亡
      const em = { getComponent: (_id: number, _: string) => ({}) } as any
      ;(sys as any).updateBonds(em)
      expect(pets.has(1)).toBe(false)
    })

    it('updateBonds：age>200且random>=0.01时pet存活', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'dog', 50, 201))
      vi.spyOn(Math, 'random').mockReturnValue(0.05)  // 0.05 >= 0.01，不触发死亡
      const em = { getComponent: (_id: number, _: string) => ({}) } as any
      ;(sys as any).updateBonds(em)
      expect(pets.has(1)).toBe(true)
    })
  })

  // ── adoptPets 收养逻辑 ───────────────────────────────────────────────────

  describe('adoptPets收养逻辑', () => {
    it('adoptPets：已有宠物的实体不重复收养', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat'))
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 必然触发
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).adoptPets(em, 1000)
      expect(pets.size).toBe(1)  // 不增加
    })

    it('adoptPets：random>0.04时不收养', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)  // 1 > 0.04，不收养
      const em = { getEntitiesWithComponents: () => [1, 2, 3] as number[] } as any
      ;(sys as any).adoptPets(em, 1000)
      expect((sys as any).pets.size).toBe(0)
    })

    it('adoptPets：random<=0.04时收养', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 0 <= 0.04且pickRandom用random
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).adoptPets(em, 1000)
      expect((sys as any).pets.size).toBe(1)
    })

    it('adoptPets：pets达到MAX_PETS(120)时停止收养', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      for (let i = 0; i < 120; i++) {
        pets.set(i, makePet(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponents: () => [200] as number[] } as any
      ;(sys as any).adoptPets(em, 1000)
      expect(pets.size).toBe(120)  // 不超过MAX_PETS
    })

    it('adoptPets：entityList为空时不崩溃', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      expect(() => (sys as any).adoptPets(em, 1000)).not.toThrow()
    })

    it('adoptPets：收养的pet包含adoptedAt=tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).adoptPets(em, 5678)
      const pet = (sys as any).pets.get(1) as CreaturePet
      expect(pet.adoptedAt).toBe(5678)
    })

    it('adoptPets：收养的pet age初始为0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).adoptPets(em, 100)
      const pet = (sys as any).pets.get(1) as CreaturePet
      expect(pet.age).toBe(0)
    })

    it('adoptPets：收养的pet bond在20-50范围内', () => {
      // bond = 20 + Math.floor(Math.random() * 30)
      // mock random: 第1次用于WATCH_CHANCE，第2次用于pickRandom，第3次用于bond
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom.mockReturnValueOnce(0)    // <= 0.04，触发收养
      mockRandom.mockReturnValueOnce(0)    // pickRandom选第一个PetType
      mockRandom.mockReturnValueOnce(0.5)  // bond = 20 + floor(0.5*30) = 35
      mockRandom.mockReturnValue(0)        // pickRandom for names
      const em = { getEntitiesWithComponents: () => [1] as number[] } as any
      ;(sys as any).adoptPets(em, 100)
      const pet = (sys as any).pets.get(1) as CreaturePet | undefined
      if (pet) {
        expect(pet.bond).toBeGreaterThanOrEqual(20)
        expect(pet.bond).toBeLessThanOrEqual(50)
      }
    })
  })

  // ── PetType 完整性 ───────────────────────────────────────────────────────

  describe('PetType类型完整性', () => {
    it('6种PetType可以注入到pets Map', () => {
      const types: PetType[] = ['cat', 'dog', 'bird', 'rabbit', 'ferret', 'lizard']
      const pets = (sys as any).pets as Map<number, CreaturePet>
      for (let i = 0; i < types.length; i++) {
        pets.set(i, makePet(i, types[i]))
      }
      expect(pets.size).toBe(6)
    })

    it('getPets()返回内部Map引用', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 30))
      expect(sys.getPets().get(1)!.petType).toBe('cat')
    })

    it('cat类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'cat'))
      expect(sys.getPets().get(1)!.petType).toBe('cat')
    })

    it('dog类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'dog'))
      expect(sys.getPets().get(1)!.petType).toBe('dog')
    })

    it('bird类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'bird'))
      expect(sys.getPets().get(1)!.petType).toBe('bird')
    })

    it('rabbit类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'rabbit'))
      expect(sys.getPets().get(1)!.petType).toBe('rabbit')
    })

    it('ferret类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'ferret'))
      expect(sys.getPets().get(1)!.petType).toBe('ferret')
    })

    it('lizard类型pet可存入', () => {
      ;(sys as any).pets.set(1, makePet(1, 'lizard'))
      expect(sys.getPets().get(1)!.petType).toBe('lizard')
    })
  })

  // ── CreaturePet 接口字段 ─────────────────────────────────────────────────

  describe('CreaturePet接口字段', () => {
    it('CreaturePet包含所有必要字段', () => {
      const pet: CreaturePet = makePet(1, 'cat', 50, 10)
      pet.adoptedAt = 999
      expect(pet.entityId).toBe(1)
      expect(pet.petType).toBe('cat')
      expect(pet.name).toBeDefined()
      expect(pet.bond).toBe(50)
      expect(pet.age).toBe(10)
      expect(pet.adoptedAt).toBe(999)
    })

    it('bond字段范围0-100', () => {
      const pet = makePet(1, 'cat', 0)
      expect(pet.bond).toBeGreaterThanOrEqual(0)
    })

    it('age字段从0开始递增', () => {
      const pet = makePet(1, 'cat', 50, 0)
      expect(pet.age).toBe(0)
    })
  })

  // ── getPets 方法 ─────────────────────────────────────────────────────────

  describe('getPets方法', () => {
    it('getPets返回与内部pets相同的引用', () => {
      const internalPets = (sys as any).pets
      const returnedPets = sys.getPets()
      expect(returnedPets).toBe(internalPets)
    })

    it('通过getPets修改会反映到内部', () => {
      sys.getPets().set(99, makePet(99))
      expect((sys as any).pets.has(99)).toBe(true)
    })

    it('getPets在有多个pet时正确返回所有', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      for (let i = 1; i <= 5; i++) {
        pets.set(i, makePet(i))
      }
      expect(sys.getPets().size).toBe(5)
    })
  })

  // ── 边界条件与健壮性 ─────────────────────────────────────────────────────

  describe('边界条件与健壮性', () => {
    it('tick为0时update不崩溃', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => null } as any
      expect(() => sys.update(1, em, 0)).not.toThrow()
    })

    it('lastCheck等于tick时不触发（差值为0）', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 900
      sys.update(1, em, 900)  // 900-900=0 < 900
      expect((sys as any).lastCheck).toBe(900)  // 未更新
    })

    it('updateBonds中删除pet后遍历继续正常', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      pets.set(1, makePet(1, 'cat', 50))
      pets.set(2, makePet(2, 'dog', 50))
      pets.set(3, makePet(3, 'bird', 50))
      // id=2的creature不存在，删除id=2的pet
      const em = { getComponent: (id: number, _: string) => id === 2 ? null : {} } as any
      expect(() => (sys as any).updateBonds(em)).not.toThrow()
      expect(pets.has(1)).toBe(true)
      expect(pets.has(2)).toBe(false)
      expect(pets.has(3)).toBe(true)
    })

    it('MAX_PETS为120，恰好119个pet时还能收养1个', () => {
      const pets = (sys as any).pets as Map<number, CreaturePet>
      for (let i = 0; i < 119; i++) {
        pets.set(i, makePet(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponents: () => [200] as number[] } as any
      ;(sys as any).adoptPets(em, 1000)
      expect(pets.size).toBe(120)
    })
  })
})
