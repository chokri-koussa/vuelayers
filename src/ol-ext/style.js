import GeometryType from 'ol/geom/GeometryType'
import { Circle, Fill, Icon, Image as ImageStyle, RegularShape, Stroke, Style, Text } from 'ol/style'
import parseColor from 'parse-color'
import uuid from 'uuid/v4'
import { hasProp, isFunction, isNumeric, lowerFirst, pick, reduce, upperFirst } from '../util/minilo'

export function getStyleId (style) {
  if (hasProp(style, 'id')) {
    return style.id
  }

  throw new Error('Illegal style argument')
}

export function setStyleId (style, styleId) {
  if (hasProp(style, 'id')) {
    style.id = styleId

    return style
  }

  throw new Error('Illegal style argument')
}

export function initializeStyle (style, defaultStyleId) {
  if (getStyleId(style) == null) {
    setStyleId(style, defaultStyleId || uuid())
  }

  return style
}

/**
 * @return {VlStyle[]}
 */
export function defaultStyle () {
  return [
    {
      fillColor: [255, 255, 255, 0.4],
      strokeColor: '#3399cc',
      strokeWidth: 1.25,
      imageRadius: 5,
    },
  ]
}

/**
 * @return {Object<GeometryType, VlStyle[]>}
 */
export function defaultEditStyle () {
  /** @type {Object<GeometryType, VlStyle[]>} */
  const styles = {}
  const white = [255, 255, 255, 1]
  const blue = [0, 153, 255, 1]
  const width = 3

  styles[GeometryType.LINE_STRING] = [
    {
      strokeColor: white,
      strokeWidth: width + 2,
    }, {
      strokeColor: blue,
      strokeWidth: width,
    },
  ]
  styles[GeometryType.MULTI_LINE_STRING] = styles[GeometryType.LINE_STRING]

  styles[GeometryType.POLYGON] = [
    {
      fillColor: [255, 255, 255, 0.5],
    },
  ].concat(styles[GeometryType.LINE_STRING])
  styles[GeometryType.MULTI_POLYGON] = styles[GeometryType.POLYGON]

  styles[GeometryType.CIRCLE] = styles[GeometryType.POLYGON].concat(styles[GeometryType.LINE_STRING])

  styles[GeometryType.POINT] = [
    {
      imageRadius: width * 2,
      fillColor: blue,
      strokeColor: white,
      strokeWidth: width / 2,
      zIndex: Infinity,
    },
  ]
  styles[GeometryType.MULTI_POINT] = styles[GeometryType.POINT]

  styles[GeometryType.GEOMETRY_COLLECTION] = styles[GeometryType.POLYGON].concat(
    styles[GeometryType.LINE_STRING],
    styles[GeometryType.POINT],
  )

  return styles
}

const isEmpty = x => {
  if (x == null) return true
  if (typeof x === 'number') return false

  return ((typeof x === 'string' || Array.isArray(x)) && !x.length) || !Object.keys(x).length
}

/**
 * @param {VlStyle} vlStyle
 * @return {Style|undefined}
 */
export function createStyle (vlStyle) {
  if (isEmpty(vlStyle)) return

  const olStyle = {
    text: createTextStyle(vlStyle),
    fill: createFillStyle(vlStyle),
    stroke: createStrokeStyle(vlStyle),
    image: createImageStyle(vlStyle),
    geometry: createGeomStyle(vlStyle),
    zIndex: vlStyle.zIndex,
    renderer: vlStyle.renderer,
  }

  if (!isEmpty(olStyle)) {
    return new Style(olStyle)
  }
}

const addPrefix = prefix => str => prefix + (prefix ? upperFirst(str) : str)

/**
 * @param {*} color
 * @returns {*}
 */
export function normalizeColor (color) {
  let c = color

  if (typeof color === 'string') {
    c = parseColor(color).rgba
  }

  return c
}

/**
 * @param {VlStyle} vlStyle
 * @param {string} [prefix]
 * @returns {Fill|undefined}
 */
export function createFillStyle (vlStyle, prefix = '') {
  const prefixKey = addPrefix(prefix)
  const keys = ['fillColor'].map(prefixKey)
  const compiledKey = prefixKey('fill')

  // check on already compiled style existence
  if (vlStyle[compiledKey] instanceof Fill) return vlStyle[compiledKey]

  const fillStyle = reduce(vlStyle, (style, value, name) => {
    if (keys.includes(name) === false) {
      return style
    }
    name = lowerFirst(name.replace(new RegExp(prefixKey('fill')), ''))
    if (name === 'color') {
      value = normalizeColor(value)
    }
    style[name] = value
    return style
  }, {})

  if (!isEmpty(fillStyle)) {
    return new Fill(fillStyle)
  }
}

/**
 * @param {VlStyle} vlStyle
 * @param {string} [prefix]
 * @returns {Stroke|undefined}
 */
export function createStrokeStyle (vlStyle, prefix = '') {
  const prefixKey = addPrefix(prefix)
  const keys = [
    'strokeColor',
    'strokeWidth',
    'strokeMiterLimit',
    'strokeCap',
    'strokeJoin',
    'strokeDash',
    'strokeDashOffset',
  ].map(prefixKey)
  const compiledKey = prefixKey('stroke')

  if (vlStyle[compiledKey] instanceof Stroke) return vlStyle[compiledKey]

  const strokeStyle = reduce(vlStyle, (style, value, name) => {
    if (keys.includes(name) === false) {
      return style
    }
    switch (name) {
      case prefixKey('strokeColor'):
      case prefixKey('strokeWidth'):
      case prefixKey('strokeMiterLimit'):
        name = lowerFirst(name.replace(new RegExp(prefixKey('stroke')), ''))
        break
      case prefixKey('strokeCap'):
      case prefixKey('strokeJoin'):
      case prefixKey('strokeDash'):
      case prefixKey('strokeDashOffset'):
        name = 'line' + name.replace(new RegExp(prefixKey('stroke')), '')
        break
    }
    if (name === 'color') {
      value = normalizeColor(value)
    }
    style[name] = value
    return style
  }, {})

  if (!isEmpty(strokeStyle)) {
    return new Stroke(strokeStyle)
  }
}

/**
 * @param {VlStyle} vlStyle
 * @returns {Image|undefined}
 * @todo split to separate circle, regShape, Icon
 */
export function createImageStyle (vlStyle) {
  if (
    isEmpty(vlStyle.imageSrc) &&
    isEmpty(vlStyle.image) &&
    isEmpty(vlStyle.imagePoints) &&
    !isNumeric(vlStyle.imageRadius)
  ) {
    return
  }

  if (vlStyle.image instanceof ImageStyle) return vlStyle.image

  let imageStyle, Ctor

  if (!isEmpty(vlStyle.imageSrc) || !isEmpty(vlStyle.image)) {
    // icon construction
    Ctor = Icon
    // then create Icon options
    imageStyle = {
      ...vlStyle,
      anchor: vlStyle.imageAnchor,
      anchorOrigin: vlStyle.imageAnchorOrigin,
      color: vlStyle.imageColor,
      offset: vlStyle.imageOffset,
      offsetOrigin: vlStyle.imageOffsetOrigin,
      opacity: vlStyle.imageOpacity,
      scale: vlStyle.imageScale,
      rotation: vlStyle.imageRotation,
      size: vlStyle.imageSize,
      img: vlStyle.image,
      imgSize: vlStyle.imageImgSize,
      src: vlStyle.imageSrc,
      crossOrigin: vlStyle.imageCrossOrigin,
    }
  } else if (vlStyle.imagePoints != null) {
    // regular shape construction
    Ctor = RegularShape
    // create RegularShape options
    imageStyle = {
      ...vlStyle,
      points: vlStyle.imagePoints,
      radius: vlStyle.imageRadius,
      radius1: vlStyle.imageRadius1,
      radius2: vlStyle.imageRadius2,
      angle: vlStyle.imageAngle,
      rotation: vlStyle.imageRotation,
    }
  } else {
    // circle construction
    Ctor = Circle
    // create Circle options
    imageStyle = {
      ...vlStyle,
      radius: vlStyle.imageRadius,
    }
  }

  imageStyle = {
    ...imageStyle,
    fill: createFillStyle(vlStyle, 'image') || createFillStyle(vlStyle),
    stroke: createStrokeStyle(vlStyle, 'image') || createStrokeStyle(vlStyle),
    snapToPixel: true,
  }

  if (!isEmpty(imageStyle)) {
    return new Ctor(imageStyle)
  }
}

/**
 * @param {VlStyle} vlStyle
 * @returns {Text|undefined}
 */
export function createTextStyle (vlStyle) {
  // noinspection JSValidateTypes
  if (vlStyle.text == null) return
  if (vlStyle.text instanceof Text) return vlStyle.text

  const textStyle = {
    text: vlStyle.text,
  }

  const fontSize = vlStyle.textFontSize ? vlStyle.textFontSize + 'px' : undefined
  const font = ['normal', fontSize, vlStyle.textFont].filter(x => !!x).join(' ')

  Object.assign(
    textStyle,
    pick(vlStyle, ['textAlign', 'textBaseline']),
    {
      font,
      fill: createFillStyle(vlStyle, 'text') || createFillStyle(vlStyle),
      stroke: createStrokeStyle(vlStyle, 'text') || createStrokeStyle(vlStyle),
      scale: vlStyle.textScale,
      rotation: vlStyle.textRotation,
      offsetX: vlStyle.textOffsetX,
      offsetY: vlStyle.textOffsetY,
      rotateWithView: vlStyle.textRotateWithView,
      padding: vlStyle.textPadding,
      maxAngle: vlStyle.textMaxAngle,
      overflow: vlStyle.textOverflow,
      placement: vlStyle.textPlacement,
      backgroundFill: createFillStyle(vlStyle, 'textBackground'),
      backgroundStroke: createStrokeStyle(vlStyle, 'textBackground'),
    },
  )

  if (!isEmpty(textStyle)) {
    return new Text(textStyle)
  }
}

/**
 * @param {VlStyle} vlStyle
 * @return {Geometry|function|undefined}
 */
export function createGeomStyle (vlStyle) {
  if (isFunction(vlStyle.geom)) {
    return function __styleGeomFunc (feature) {
      return vlStyle.geom(feature)
    }
  }

  return vlStyle.geom
}

/**
 * @typedef {
 *            module:ol/style/Style~Style |
 *            module:ol/style/Image~ImageStyle |
 *            module:ol/style/Fill~Fill |
 *            module:ol/style/Stroke~Stroke |
 *            module:ol/style/Text~Text |
 *            module:ol/style/Style~StyleFunction
 *          } OlAllStyle
 */

/**
 * @typedef {Object} VlStyle
 *
 * Shared
 * @property {string|number[]|undefined} fillColor
 * @property {string|number[]|undefined} strokeColor
 * @property {number|undefined} strokeWidth
 * @property {number|undefined} strokeMiterLimit
 * @property {number[]|undefined} strokeDash
 * @property {number[]|undefined} strokeDashOffset
 * @property {string|undefined} strokeCap
 * @property {string|undefined} strokeJoin
 * @property {number|undefined} zIndex
 * @property {Fill|undefined} fill
 * @property {Stroke|undefined} stroke
 * @property {RenderFunction|undefined} renderer
 *
 * Text only
 * @property {string|Text|undefined} text
 * @property {string|undefined} textFont
 * @property {number|undefined} textFontSize
 * @property {string|number[]|undefined} textFillColor
 * @property {string|number[]|undefined} textStrokeColor
 * @property {number|undefined} textStrokeWidth
 * @property {number[]|undefined} textStrokeDash
 * @property {string|undefined} textStrokeCap
 * @property {string|undefined} textStrokeJoin
 * @property {number|undefined} textScale
 * @property {string|undefined} textAlign
 * @property {number|undefined} textRotation
 * @property {number|undefined} textOffsetX
 * @property {number|undefined} textOffsetY
 * @property {Stroke|undefined} textStroke
 * @property {Fill|undefined} textFill
 * @property {boolean|undefined} textRotateWithView
 * @property {number[]|undefined} textPadding
 * @property {number|undefined} textMaxAngle
 * @property {boolean|undefined} textOverflow
 * @property {string|undefined} textPlacement
 * @property {string|undefined} textBaseline
 * @property {Fill|undefined} textBackgroundFillColor
 * @property {Stroke|undefined} textBackgroundStrokeColor
 * @property {Stroke|undefined} textBackgroundStrokeWidth
 * @property {Stroke|undefined} textBackgroundStrokeDash
 * @property {Stroke|undefined} textBackgroundStrokeCap
 * @property {Stroke|undefined} textBackgroundStrokeJoin
 *
 * Image only
 * @property {Image|undefined} image
 * @property {string|undefined} imageSrc
 * @property {number[]|undefined} imageSize
 * @property {number[]|undefined} imageImgSize
 * @property {number|undefined} imageOffset
 * @property {number[]|undefined} imageAnchor
 * @property {number|undefined} imageScale
 * @property {number|undefined} imageRotation
 * @property {number|undefined} imageRadius
 * @property {number|undefined} imageRadius1
 * @property {number|undefined} imageRadius2
 * @property {number|undefined} imagePoints
 * @property {number|undefined} imageAngle
 * @property {number|undefined} imageOpacity
 * @property {string|number[]|undefined} imageFillColor
 * @property {string|number[]|undefined} imageStrokeColor
 * @property {number|undefined} imageStrokeWidth
 * @property {number[]|undefined} imageStrokeDash
 * @property {string|undefined} imageStrokeCap
 * @property {string|undefined} imageStrokeJoin
 * @property {IconOrigin|undefined} imageAnchorOrigin
 * @property {ColorLike|undefined} imageColor
 * @property {IconOrigin|undefined} imageOffsetOrigin
 * @property {Stroke|undefined} imageStroke
 * @property {Fill|undefined} imageFill
 * @property {string|undefined} imageCrossOrigin
 *
 * @property {Geometry|function|undefined} geom Coordinates should be in map projection
 */
