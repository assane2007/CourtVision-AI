'use client'

interface PoseCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function PoseCanvas({ canvasRef }: PoseCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="absolute inset-0 w-full h-full"
      style={{ transform: 'scaleX(-1)' }}
      role="img"
      aria-label="Superposition du squelette de pose"
    />
  )
}