import { Camera } from './Camera'

type InputCallback = (x: number, y: number, button: number) => void

export class Input {
  private canvas: HTMLCanvasElement
  private camera: Camera
  private onMouseDown: InputCallback | null = null
  private onMouseMove: InputCallback | null = null
  private onMouseUp: InputCallback | null = null
  private onRightClick: ((wx: number, wy: number, screenX: number, screenY: number) => void) | null = null
  private rightClickStart: { x: number; y: number } | null = null
  mouseX: number = 0
  mouseY: number = 0
  worldX: number = 0
  worldY: number = 0
  isMouseDown: boolean = false
  mouseButton: number = 0

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas
    this.camera = camera
    this.setupListeners()
  }

  private setupListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true
      this.mouseButton = e.button

      if (e.button === 2) {
        // Right click: record start for click detection, also start drag
        this.rightClickStart = { x: e.clientX, y: e.clientY }
        this.camera.startDrag(e.clientX, e.clientY)
        e.preventDefault()
      } else if (e.button === 1) {
        // Middle click = pan
        this.camera.startDrag(e.clientX, e.clientY)
        e.preventDefault()
      } else if (e.button === 0 && this.onMouseDown) {
        this.updatePosition(e.clientX, e.clientY)
        this.onMouseDown(this.worldX, this.worldY, e.button)
      }
    })

    this.canvas.addEventListener('mousemove', (e) => {
      this.updatePosition(e.clientX, e.clientY)

      if (this.camera.getDragging()) {
        this.camera.drag(e.clientX, e.clientY)
      } else if (this.isMouseDown && this.onMouseMove) {
        this.onMouseMove(this.worldX, this.worldY, this.mouseButton)
      }
    })

    this.canvas.addEventListener('mouseup', (e) => {
      this.isMouseDown = false
      this.camera.endDrag()

      // Right-click detection: if didn't move, trigger right-click callback
      if (e.button === 2 && this.rightClickStart && this.onRightClick) {
        const dx = e.clientX - this.rightClickStart.x
        const dy = e.clientY - this.rightClickStart.y
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          this.updatePosition(e.clientX, e.clientY)
          this.onRightClick(this.worldX, this.worldY, e.clientX, e.clientY)
        }
      }
      this.rightClickStart = null

      if (this.onMouseUp) {
        this.onMouseUp(this.worldX, this.worldY, e.button)
      }
    })

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false
      this.camera.endDrag()
    })

    // Wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      this.camera.zoomTo(this.camera.zoom * delta, e.clientX, e.clientY)
    })

    // Context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    // Touch events for mobile
    let lastTouchDist = 0

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        this.camera.startDrag(touch.clientX, touch.clientY)
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDist = Math.sqrt(dx * dx + dy * dy)
      }
    })

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        this.camera.drag(touch.clientX, touch.clientY)
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (lastTouchDist > 0) {
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
          const scale = dist / lastTouchDist
          this.camera.zoomTo(this.camera.zoom * scale, centerX, centerY)
        }
        lastTouchDist = dist
      }
    })

    this.canvas.addEventListener('touchend', () => {
      this.camera.endDrag()
      lastTouchDist = 0
    })
  }

  private updatePosition(clientX: number, clientY: number): void {
    this.mouseX = clientX
    this.mouseY = clientY
    const world = this.camera.screenToWorld(clientX, clientY)
    this.worldX = world.x
    this.worldY = world.y
  }

  setOnMouseDown(callback: InputCallback): void {
    this.onMouseDown = callback
  }

  setOnMouseMove(callback: InputCallback): void {
    this.onMouseMove = callback
  }

  setOnMouseUp(callback: InputCallback): void {
    this.onMouseUp = callback
  }

  setOnRightClick(callback: (wx: number, wy: number, screenX: number, screenY: number) => void): void {
    this.onRightClick = callback
  }
}
