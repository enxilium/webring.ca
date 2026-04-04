import { geoConicConformal, geoPath } from 'd3-geo'
import canadaOutlineGeoJson from './canada-outline.json'
import canadaRegionsGeoJson from './canada-regions.json'

const SVG_WIDTH = 800
const SVG_HEIGHT = 520
const MAP_PADDING = 24

export const CANADA_VIEWBOX = `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`

const projection = geoConicConformal()
  .parallels([49, 77])
  .rotate([96, 0])
  .center([0, 62])
  .fitExtent(
    [
      [MAP_PADDING, MAP_PADDING],
      [SVG_WIDTH - MAP_PADDING, SVG_HEIGHT - MAP_PADDING],
    ],
    canadaOutlineGeoJson as any
  )

const path = geoPath(projection)

export const CANADA_OUTLINE_PATH = path((canadaOutlineGeoJson as any).features[0]) ?? ''

export const CANADA_REGION_PATHS = ((canadaRegionsGeoJson as any).features as Array<any>).map((feature) => ({
  id: String(feature.properties.id),
  name: String(feature.properties.name),
  postal: String(feature.properties.postal),
  d: path(feature) ?? '',
})).filter((feature) => feature.d.length > 0)

export function projectToSvg(lat: number, lng: number): { x: number; y: number } {
  const point = projection([lng, lat])

  if (!point) {
    return { x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2 }
  }

  return { x: point[0], y: point[1] }
}
