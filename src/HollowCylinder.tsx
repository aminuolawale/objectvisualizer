import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import type { CylinderParams } from './App'

const OUTER_RADIUS = 1
const RADIAL_SEGMENTS = 96

const MATERIAL_COLOR  = '#cec8aa'
const MATERIAL_PROPS  = { metalness: 0.02, roughness: 0.42, envMapIntensity: 0.18 } as const

interface Props {
  params: CylinderParams
}

export default function HollowCylinder({ params }: Props) {
  const { wallThickness, height, topOpen, bottomOpen, holeDiameter, holeFace } = params

  const innerRadius = Math.max(0.005, OUTER_RADIUS - wallThickness)

  // Open face → annular ring bridging inner/outer wall gap
  // Closed face → full disk (inner radius = hole radius, 0 when no hole)
  const topCapInnerR    = topOpen    ? innerRadius : (holeFace === 'top'    ? holeDiameter / 2 : 0)
  const bottomCapInnerR = bottomOpen ? innerRadius : (holeFace === 'bottom' ? holeDiameter / 2 : 0)

  const showTopCap    = topCapInnerR    < OUTER_RADIUS - 0.001
  const showBottomCap = bottomCapInnerR < OUTER_RADIUS - 0.001

  // MeshPhysicalMaterial: clearcoat layer adds a sharp specular highlight on top
  const material = useMemo(() =>
    new THREE.MeshPhysicalMaterial({
      color: MATERIAL_COLOR,
      ...MATERIAL_PROPS,
      clearcoat: 0.55,
      clearcoatRoughness: 0.10,
      side: THREE.DoubleSide,
    }), [])

  useEffect(() => () => { material.dispose() }, [material])

  return (
    <group>
      {/* Outer cylindrical wall */}
      <mesh material={material} castShadow receiveShadow>
        <cylinderGeometry args={[OUTER_RADIUS, OUTER_RADIUS, height, RADIAL_SEGMENTS, 1, true]} />
      </mesh>

      {/* Inner cylindrical wall */}
      <mesh material={material} castShadow receiveShadow>
        <cylinderGeometry args={[innerRadius, innerRadius, height, RADIAL_SEGMENTS, 1, true]} />
      </mesh>

      {/* Top cap */}
      {showTopCap && (
        <mesh
          material={material}
          castShadow
          receiveShadow
          position={[0, height / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[topCapInnerR, OUTER_RADIUS, RADIAL_SEGMENTS]} />
        </mesh>
      )}

      {/* Bottom cap */}
      {showBottomCap && (
        <mesh
          material={material}
          castShadow
          receiveShadow
          position={[0, -height / 2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[bottomCapInnerR, OUTER_RADIUS, RADIAL_SEGMENTS]} />
        </mesh>
      )}
    </group>
  )
}
