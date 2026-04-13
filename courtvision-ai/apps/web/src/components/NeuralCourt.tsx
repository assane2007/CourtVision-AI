'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial, Float } from '@react-three/drei'
import * as THREE from 'three'

function ParticleField() {
    const ref = useRef<THREE.Points>(null!)

    // Generate random points 
    const points = useMemo(() => {
        const p = new Float32Array(3000 * 3)
        for (let i = 0; i < 3000; i++) {
            p[i * 3] = (Math.random() - 0.5) * 50
            p[i * 3 + 1] = (Math.random() - 0.5) * 30
            p[i * 3 + 2] = (Math.random() - 0.5) * 40
        }
        return p
    }, [])

    useFrame((state) => {
        const time = state.clock.getElapsedTime()
        if (ref.current) {
            ref.current.rotation.y = time * 0.04
            ref.current.rotation.x = Math.sin(time * 0.1) * 0.1
        }
    })

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[points, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                transparent
                color="#FF4D00"
                size={0.08}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.6}
            />
        </points>
    )
}

function CourtGrid() {
    return (
        <group position={[0, -10, 0]}>
            <gridHelper args={[100, 50, '#FF4D00', '#111']} rotation={[0, 0, 0]} />
        </group>
    )
}

export default function NeuralCourt() {
    return (
        <div className="absolute inset-0 pointer-events-none opacity-50 bg-[#040404]">
            <Canvas camera={{ position: [0, 10, 30], fov: 50 }} dpr={[1, 2]}>
                <color attach="background" args={['#040404']} />
                <ambientLight intensity={0.5} />
                <pointLight position={[20, 20, 20]} intensity={2} color="#FF4D00" />
                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                    <ParticleField />
                </Float>
                <CourtGrid />
            </Canvas>
        </div>
    )
}
