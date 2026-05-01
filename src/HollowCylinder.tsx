import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import { CM_TO_SCENE_UNIT, type CylinderParams } from './App'

const RADIAL_SEGMENTS = 96
const CHAMFER_CM = 0.18

const MATERIAL_COLOR  = '#cec8aa'
const MATERIAL_PROPS  = { metalness: 0.02, roughness: 0.42, envMapIntensity: 0.18 } as const
const DIMENSION_COLOR = '#f2f3ae'

interface Props {
  params: CylinderParams
  showDimensions: boolean
}

interface ChamferProps {
  material: THREE.Material
  radius: number
  y: number
  direction: 'top' | 'bottom'
  side: 'outer' | 'inner'
  size: number
}

function ChamferRing({ material, radius, y, direction, side, size }: ChamferProps) {
  const innerSide = side === 'inner'
  const topEdge = direction === 'top'
  const topRadius = innerSide
    ? radius + (topEdge ? size : 0)
    : radius - (topEdge ? size : 0)
  const bottomRadius = innerSide
    ? radius + (topEdge ? 0 : size)
    : radius - (topEdge ? 0 : size)
  const centerY = topEdge ? y - size / 2 : y + size / 2

  return (
    <mesh material={material} castShadow receiveShadow position={[0, centerY, 0]}>
      <cylinderGeometry args={[topRadius, bottomRadius, size, RADIAL_SEGMENTS, 1, true]} />
    </mesh>
  )
}

function formatCm(value: number) {
  return `${value.toFixed(1)} cm`
}

interface DimensionLabelsProps {
  params: CylinderParams
  outerRadius: number
  innerRadius: number
  sceneHeight: number
  hasVisibleHole: boolean
}

function Label({ children, position }: { children: string; position: [number, number, number] }) {
  return (
    <Html position={position} center className="dimension-label" transform sprite>
      {children}
    </Html>
  )
}

function DimensionLine({ points }: { points: [number, number, number][] }) {
  return <Line points={points} color={DIMENSION_COLOR} lineWidth={1} transparent opacity={0.72} />
}

function DimensionLabels({ params, outerRadius, innerRadius, sceneHeight, hasVisibleHole }: DimensionLabelsProps) {
  const yTop = sceneHeight / 2
  const yBottom = -sceneHeight / 2
  const sideX = outerRadius + 0.36
  const frontZ = outerRadius + 0.28
  const topY = yTop + 0.18
  const wallY = yTop + 0.08
  const witness = 0.10
  const wallMidRadius = (outerRadius + innerRadius) / 2
  const holeY = params.holeFace === 'top' ? yTop + 0.08 : yBottom - 0.08
  const holeLabelY = params.holeFace === 'top' ? yTop + 0.22 : yBottom - 0.22
  const holeRadius = params.holeDiameter * CM_TO_SCENE_UNIT / 2

  return (
    <group>
      <DimensionLine points={[[sideX, yBottom, 0], [sideX, yTop, 0]]} />
      <DimensionLine points={[[outerRadius, yTop, 0], [sideX + witness, yTop, 0]]} />
      <DimensionLine points={[[outerRadius, yBottom, 0], [sideX + witness, yBottom, 0]]} />
      <Label position={[sideX + 0.18, 0, 0]}>{`Height ${formatCm(params.height)}`}</Label>

      <DimensionLine points={[[-outerRadius, topY, frontZ], [outerRadius, topY, frontZ]]} />
      <DimensionLine points={[[-outerRadius, yTop, 0], [-outerRadius, topY + witness, frontZ]]} />
      <DimensionLine points={[[outerRadius, yTop, 0], [outerRadius, topY + witness, frontZ]]} />
      <Label position={[0, topY + 0.11, frontZ]}>{`Diameter ${formatCm(params.diameter)}`}</Label>

      <DimensionLine points={[[innerRadius, wallY, 0], [outerRadius, wallY, 0]]} />
      <DimensionLine points={[[innerRadius, yTop, 0], [innerRadius, wallY + witness, 0]]} />
      <DimensionLine points={[[outerRadius, yTop, 0], [outerRadius, wallY + witness, 0]]} />
      <Label position={[wallMidRadius, yTop + 0.18, 0]}>{`Wall ${formatCm(params.wallThickness)}`}</Label>

      {hasVisibleHole && (
        <>
          <DimensionLine points={[[-holeRadius, holeY, -frontZ], [holeRadius, holeY, -frontZ]]} />
          <DimensionLine points={[[-holeRadius, holeY, 0], [-holeRadius, holeY, -frontZ - witness]]} />
          <DimensionLine points={[[holeRadius, holeY, 0], [holeRadius, holeY, -frontZ - witness]]} />
          <Label position={[0, holeLabelY, -frontZ]}>{`Hole ${formatCm(params.holeDiameter)}`}</Label>
        </>
      )}
    </group>
  )
}

export default function HollowCylinder({ params, showDimensions }: Props) {
  const { diameter, wallThickness, height, topOpen, bottomOpen, holeDiameter, holeFace } = params

  const outerRadius = Math.max(0.05, (diameter / 2) * CM_TO_SCENE_UNIT)
  const sceneHeight = Math.max(0.05, height * CM_TO_SCENE_UNIT)
  const sceneWallThickness = Math.min(wallThickness * CM_TO_SCENE_UNIT, outerRadius - 0.02)
  const innerRadius = Math.max(0.02, outerRadius - sceneWallThickness)
  const requestedHoleRadius = Math.max(0, (holeDiameter / 2) * CM_TO_SCENE_UNIT)
  const hasRequestedHole = requestedHoleRadius > 0.0001
  const chamferSize = Math.min(
    CHAMFER_CM * CM_TO_SCENE_UNIT,
    sceneHeight * 0.08,
    sceneWallThickness * 0.35,
    outerRadius * 0.08
  )

  // Open face: annular ring across the wall thickness.
  // Closed face: disk, optionally with a centered hole.
  const topCapInnerR = topOpen ? innerRadius : (holeFace === 'top' && hasRequestedHole ? requestedHoleRadius : 0)
  const bottomCapInnerR = bottomOpen ? innerRadius : (holeFace === 'bottom' && hasRequestedHole ? requestedHoleRadius : 0)

  const clampedTopCapInnerR = Math.min(topCapInnerR, outerRadius - 0.001)
  const clampedBottomCapInnerR = Math.min(bottomCapInnerR, outerRadius - 0.001)
  const hasTopInnerEdge = topOpen || (holeFace === 'top' && hasRequestedHole)
  const hasBottomInnerEdge = bottomOpen || (holeFace === 'bottom' && hasRequestedHole)
  const hasVisibleHole = hasRequestedHole && !((holeFace === 'top' && topOpen) || (holeFace === 'bottom' && bottomOpen))
  const showTopCap = clampedTopCapInnerR < outerRadius - 0.001
  const showBottomCap = clampedBottomCapInnerR < outerRadius - 0.001
  const wallHeight = Math.max(0.01, sceneHeight - chamferSize * 2)
  const capOuterRadius = Math.max(0.001, outerRadius - chamferSize)
  const topCapInnerRadius = hasTopInnerEdge ? Math.min(clampedTopCapInnerR + chamferSize, capOuterRadius - 0.001) : 0
  const bottomCapInnerRadius = hasBottomInnerEdge ? Math.min(clampedBottomCapInnerR + chamferSize, capOuterRadius - 0.001) : 0
  const topEdgeRadius = hasTopInnerEdge ? clampedTopCapInnerR : 0
  const bottomEdgeRadius = hasBottomInnerEdge ? clampedBottomCapInnerR : 0
  const showTopInnerChamfer = topEdgeRadius > 0.001 && topEdgeRadius < outerRadius - chamferSize
  const showBottomInnerChamfer = bottomEdgeRadius > 0.001 && bottomEdgeRadius < outerRadius - chamferSize

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
        <cylinderGeometry args={[outerRadius, outerRadius, wallHeight, RADIAL_SEGMENTS, 1, true]} />
      </mesh>

      {/* Inner cylindrical wall */}
      <mesh material={material} castShadow receiveShadow>
        <cylinderGeometry args={[innerRadius, innerRadius, wallHeight, RADIAL_SEGMENTS, 1, true]} />
      </mesh>

      <ChamferRing material={material} radius={outerRadius} y={sceneHeight / 2} direction="top" side="outer" size={chamferSize} />
      <ChamferRing material={material} radius={outerRadius} y={-sceneHeight / 2} direction="bottom" side="outer" size={chamferSize} />

      {/* Top cap */}
      {showTopCap && (
        <mesh
          material={material}
          castShadow
          receiveShadow
          position={[0, sceneHeight / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {topCapInnerRadius > 0 ? (
            <ringGeometry args={[topCapInnerRadius, capOuterRadius, RADIAL_SEGMENTS]} />
          ) : (
            <circleGeometry args={[capOuterRadius, RADIAL_SEGMENTS]} />
          )}
        </mesh>
      )}
      {showTopInnerChamfer && (
        <ChamferRing material={material} radius={topEdgeRadius} y={sceneHeight / 2} direction="top" side="inner" size={chamferSize} />
      )}

      {/* Bottom cap */}
      {showBottomCap && (
        <mesh
          material={material}
          castShadow
          receiveShadow
          position={[0, -sceneHeight / 2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          {bottomCapInnerRadius > 0 ? (
            <ringGeometry args={[bottomCapInnerRadius, capOuterRadius, RADIAL_SEGMENTS]} />
          ) : (
            <circleGeometry args={[capOuterRadius, RADIAL_SEGMENTS]} />
          )}
        </mesh>
      )}
      {showBottomInnerChamfer && (
        <ChamferRing material={material} radius={bottomEdgeRadius} y={-sceneHeight / 2} direction="bottom" side="inner" size={chamferSize} />
      )}

      {showDimensions && (
        <DimensionLabels
          params={params}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          sceneHeight={sceneHeight}
          hasVisibleHole={hasVisibleHole}
        />
      )}
    </group>
  )
}
