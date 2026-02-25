export interface MenuItem {
  icon: string
  label: string
  action: () => void
}

export interface MenuSection {
  header?: string
  items: MenuItem[]
}

export class ContextMenu {
  private el: HTMLElement
  private visible: boolean = false

  constructor(elementId: string) {
    this.el = document.getElementById(elementId)!
    document.addEventListener('mousedown', (e) => {
      if (this.visible && !this.el.contains(e.target as Node)) {
        this.hide()
      }
    })
  }

  show(x: number, y: number, sections: MenuSection[]): void {
    this.el.innerHTML = ''

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      if (i > 0) {
        const divider = document.createElement('div')
        divider.className = 'ctx-divider'
        this.el.appendChild(divider)
      }
      if (section.header) {
        const header = document.createElement('div')
        header.className = 'ctx-header'
        header.textContent = section.header
        this.el.appendChild(header)
      }
      for (const item of section.items) {
        const el = document.createElement('div')
        el.className = 'ctx-item'
        const iconSpan = document.createElement('span')
        iconSpan.textContent = item.icon
        const labelSpan = document.createElement('span')
        labelSpan.textContent = item.label
        el.appendChild(iconSpan)
        el.appendChild(labelSpan)
        el.addEventListener('click', () => {
          item.action()
          this.hide()
        })
        this.el.appendChild(el)
      }
    }

    this.el.style.display = 'block'
    const rect = this.el.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 5
    const maxY = window.innerHeight - rect.height - 5
    this.el.style.left = Math.min(x, maxX) + 'px'
    this.el.style.top = Math.min(y, maxY) + 'px'
    this.visible = true
  }

  hide(): void {
    this.el.style.display = 'none'
    this.visible = false
  }

  isVisible(): boolean {
    return this.visible
  }
}
