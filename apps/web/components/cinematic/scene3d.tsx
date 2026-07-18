'use client';

/**
 * صحنه سه‌بعدی هیرو — Three.js (react-three-fiber)
 * مش هندسی درخشان + میدان ذرات + نورهای نئونی + پارالاکس موس
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function CoreShape() {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((state, delta) => {
    mesh.current.rotation.x += delta * 0.18;
    mesh.current.rotation.y += delta * 0.24;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={mesh} scale={1.65}>
        <torusKnotGeometry args={[1, 0.32, 220, 40]} />
        <MeshDistortMaterial
          color="#10b981"
          emissive="#047857"
          emissiveIntensity={0.55}
          metalness={0.85}
          roughness={0.18}
          distort={0.28}
          speed={2.2}
        />
      </mesh>
    </Float>
  );
}

function OrbitRing({ radius, color, tilt, speed }: { radius: number; color: string; tilt: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    ref.current.rotation.z += delta * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0.4, 0]}>
      <torusGeometry args={[radius, 0.012, 16, 120]} />
      <meshBasicMaterial color={color} transparent opacity={0.65} />
    </mesh>
  );
}

function ParticleField({ count = 260 }: { count?: number }) {
  const points = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    points.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#67e8f9" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function MouseRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const { x, y } = state.pointer;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, x * 0.35, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -y * 0.25, 0.05);
  });
  return <group ref={group}>{children}</group>;
}

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 4, 6]} intensity={60} color="#4ade80" />
      <pointLight position={[-6, -3, -4]} intensity={40} color="#22d3ee" />
      <spotLight position={[0, 8, 4]} angle={0.5} intensity={60} color="#8b5cf6" penumbra={1} />
      <MouseRig>
        <CoreShape />
        <OrbitRing radius={2.6} color="#10b981" tilt={1.15} speed={0.35} />
        <OrbitRing radius={3.3} color="#22d3ee" tilt={1.35} speed={-0.22} />
        <ParticleField />
        <Sparkles count={90} scale={[10, 7, 4]} size={2.2} speed={0.35} color="#a7f3d0" opacity={0.7} />
      </MouseRig>
    </Canvas>
  );
}
