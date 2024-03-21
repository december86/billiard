import React, { useRef, useEffect, useState } from 'react'

interface Color {
  name: string
  code: string
}

interface BallProps {
  x: number
  y: number
  radius: number
  color: string
  dx?: number
  dy?: number
  ctx: CanvasRenderingContext2D
}

interface ColorPickerProps {
  colors: Color[]
  onSelect: (color: string) => void
  onClose: () => void
}

interface BallInterface {
  x: number
  y: number
  radius: number
  color: string
  dx: number
  dy: number
  ctx: CanvasRenderingContext2D
  draw: () => void
  update: (balls: Ball[], canvas: HTMLCanvasElement) => void
  setColor: (newColor: string) => void
}

interface Velocity {
  x: number
  y: number
}

const COLORS = [
  { name: 'Красный', code: '#FF0000' },
  { name: 'Зеленый', code: '#00FF00' },
  { name: 'Синий', code: '#0000FF' },
  { name: 'Желтый', code: '#FFFF00' },
  { name: 'Фиолетовый', code: '#800080' },
  { name: 'Голубой', code: '#00FFFF' },
  { name: 'Оранжевый', code: '#FFA500' },
]

const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  onSelect,
  onClose,
}) => {
  return (
    <div style={{ position: 'absolute', left: '0', top: '0' }}>
      {colors.map((color) => (
        <div
          key={color.code}
          onClick={() => onSelect(color.code)}
          style={{
            cursor: 'pointer',
            padding: '10px',
            backgroundColor: color.code,
          }}
        >
          {color.name}
        </div>
      ))}
      <button onClick={onClose}>Закрыть</button>
    </div>
  )
}

const BilliardGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedBall, setSelectedBall] = useState<Ball>()
  const [showColorPicker, setShowColorPicker] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 800
    canvas.height = 600

    let isDragging = false
    let selectedBall: Ball | null = null
    let dragStartX = 0
    let dragStartY = 0
    let balls: Ball[] = createBalls(canvas, ctx)

    function handleMouseDown(e: MouseEvent): void {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      balls.forEach((ball) => {
        const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2)
        if (distance < ball.radius) {
          isDragging = true
          selectedBall = ball
          dragStartX = x
          dragStartY = y
        }
      })
    }

    function handleMouseUp(e: MouseEvent): void {
      if (!canvas) return
      if (!selectedBall) return
      if (isDragging) {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const dx = x - dragStartX
        const dy = y - dragStartY
        selectedBall.dx = dx * 0.1
        selectedBall.dy = dy * 0.1
        isDragging = false
        selectedBall = null
      }
    }

    function handleClick(e: MouseEvent) {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      balls.forEach((ball) => {
        const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2)
        if (distance < ball.radius) {
          setSelectedBall(ball)
          setShowColorPicker(true)
        }
      })
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('click', handleClick)

    function animate() {
      if (!canvas) return
      if (!ctx) return
      requestAnimationFrame(animate)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      balls.forEach((ball) => {
        ball.update(balls, canvas)
      })
    }

    animate()

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef}></canvas>
      {showColorPicker && selectedBall && (
        <ColorPicker
          colors={COLORS}
          onSelect={(color) => {
            selectedBall.setColor(color)
            setShowColorPicker(false)
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </>
  )
}

function rotate(velocity: Velocity, angle: number): Velocity {
  const rotatedVelocities = {
    x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
    y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle),
  }

  return rotatedVelocities
}

function resolveCollision(ball: Ball, otherBall: Ball): void {
  const xVelocityDiff = ball.dx - otherBall.dx
  const yVelocityDiff = ball.dy - otherBall.dy

  const xDist = otherBall.x - ball.x
  const yDist = otherBall.y - ball.y

  if (xVelocityDiff * xDist + yVelocityDiff * yDist >= 0) {
    const angle = -Math.atan2(otherBall.y - ball.y, otherBall.x - ball.x)

    const m1 = 1
    const m2 = 1

    const u1 = rotate({ x: ball.dx, y: ball.dy }, angle)
    const u2 = rotate({ x: otherBall.dx, y: otherBall.dy }, angle)

    const v1 = {
      x: (u1.x * (m1 - m2)) / (m1 + m2) + (u2.x * 2 * m2) / (m1 + m2),
      y: u1.y,
    }
    const v2 = {
      x: (u2.x * (m1 - m2)) / (m1 + m2) + (u1.x * 2 * m1) / (m1 + m2),
      y: u2.y,
    }

    const vFinal1 = rotate(v1, -angle)
    const vFinal2 = rotate(v2, -angle)

    ball.dx = vFinal1.x
    ball.dy = vFinal1.y

    otherBall.dx = vFinal2.x
    otherBall.dy = vFinal2.y
  }
}

class Ball implements BallInterface {
  x: number
  y: number
  radius: number
  color: string
  dx: number
  dy: number
  ctx: CanvasRenderingContext2D

  constructor({ x, y, radius, color, ctx }: BallProps) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.dx = 0
    this.dy = 0
    this.ctx = ctx
  }

  draw() {
    this.ctx.beginPath()
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = this.color
    this.ctx.fill()
    this.ctx.closePath()
  }

  update(balls: Ball[] = [], canvas: HTMLCanvasElement) {
    const friction = 0.99 // Коэффициент трения

    this.dx *= friction
    this.dy *= friction

    this.x += this.dx
    this.y += this.dy

    // Отскок от стен
    if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
      this.dx = -this.dx
    }
    if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
      this.dy = -this.dy
    }

    // Проверка столкновений с другими шарами
    balls.forEach((otherBall) => {
      if (this !== otherBall) {
        const distance = Math.sqrt(
          (this.x - otherBall.x) ** 2 + (this.y - otherBall.y) ** 2
        )
        if (distance < this.radius + otherBall.radius) {
          resolveCollision(this, otherBall)
        }
      }
    })

    this.draw()
  }

  setColor(newColor: string): void {
    this.color = newColor
  }
}

function isIntersecting(x: number, y: number, radius: number, balls: Ball[]) {
  for (let i = 0; i < balls.length; i++) {
    const existingBall = balls[i]
    const distance = Math.sqrt(
      (x - existingBall.x) ** 2 + (y - existingBall.y) ** 2
    )
    if (distance < radius + existingBall.radius) {
      return true // Найдено пересечение
    }
  }
  return false // Пересечений нет
}

function createBalls(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Ball[] {
  let balls: Ball[] = []
  while (balls.length < 5) {
    let minRadius = 15
    let maxRadius = 30
    let radius = Math.random() * (maxRadius - minRadius) + minRadius
    let x = Math.random() * (canvas.width - radius * 2) + radius
    let y = Math.random() * (canvas.height - radius * 2) + radius

    if (!isIntersecting(x, y, radius, balls)) {
      let color = COLORS[Math.floor(Math.random() * COLORS.length)].code
      balls.push(new Ball({ x, y, radius, color, ctx }))
    }
  }
  return balls
}

export default BilliardGame
