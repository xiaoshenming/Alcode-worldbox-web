import { PowerType } from '../utils/Constants'
import { Powers } from '../game/Powers'

export class Toolbar {
  private container: HTMLElement
  private powers: Powers
  private activeButton: HTMLElement | null = null
  private activeCategory: PowerType = PowerType.TERRAIN

  constructor(containerId: string, powers: Powers) {
    this.container = document.getElementById(containerId)!
    this.powers = powers
    this.render()
  }

  render(): void {
    this.container.innerHTML = ''

    // Category tabs
    const categories = [
      { type: PowerType.TERRAIN, label: '🏔️ Terrain', powers: this.powers.terrainPowers },
      { type: PowerType.CREATURE, label: '👥 Creatures', powers: this.powers.creaturePowers },
      { type: PowerType.NATURE, label: '🌊 Nature', powers: this.powers.naturePowers },
      { type: PowerType.DISASTER, label: '💀 Disaster', powers: this.powers.disasterPowers },
    ]

    // Category buttons
    const categoryDiv = document.createElement('div')
    categoryDiv.style.display = 'flex'
    categoryDiv.style.gap = '5px'
    categoryDiv.style.marginBottom = '10px'
    categoryDiv.style.flexWrap = 'wrap'

    categories.forEach(cat => {
      const btn = document.createElement('button')
      btn.className = 'btn' + (this.activeCategory === cat.type ? ' active' : '')
      btn.textContent = cat.label
      btn.onclick = () => {
        this.activeCategory = cat.type
        this.activeButton = null
        this.powers.setPower(null as any)
        this.render()
      }
      categoryDiv.appendChild(btn)
    })

    this.container.appendChild(categoryDiv)

    // Power buttons for active category
    const activeCat = categories.find(c => c.type === this.activeCategory)
    if (activeCat) {
      const powersDiv = document.createElement('div')
      powersDiv.style.display = 'flex'
      powersDiv.style.flexWrap = 'wrap'
      powersDiv.style.gap = '5px'

      activeCat.powers.forEach(power => {
        const btn = document.createElement('button')
        btn.className = 'btn'
        btn.textContent = power.icon + ' ' + power.name
        btn.onclick = () => {
          if (this.activeButton === btn) {
            // Deselect
            this.activeButton = null
            this.powers.setPower(null as any)
            btn.classList.remove('active')
          } else {
            // Select
            if (this.activeButton) this.activeButton.classList.remove('active')
            this.activeButton = btn
            this.powers.setPower(power)
            btn.classList.add('active')
          }
        }
        powersDiv.appendChild(btn)
      })

      this.container.appendChild(powersDiv)
    }
  }
}
