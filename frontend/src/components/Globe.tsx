import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load Earth texture - using a high-quality Earth texture
  const earthTexture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
  
  // Normal map for terrain detail
  const normalMap = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 128, 128]} scale={2.5}>
      <meshStandardMaterial
        map={earthTexture}
        normalMap={normalMap}
        roughness={0.8}
        metalness={0.2}
      />
    </Sphere>
  );
}

export default function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      style={{ width: '100%', height: '600px', background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      <AnimatedSphere />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={true}
        autoRotateSpeed={0.3}
        minDistance={6}
        maxDistance={12}
      />
    </Canvas>
  );
}

