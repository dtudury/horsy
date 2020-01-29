import { skipWhiteSpace, readTo, readToArr, readValue, assertChar, readIf } from './basicDecoders.js'
import { FRAGMENT } from './fragment.js'

function _decodeTag (arr) {
  skipWhiteSpace(arr)
  const c = arr[arr.i]
  if (c.isValue) {
    arr.i++
    return c.value
  }
  return readTo(arr, /[\s/>]/)
}

function _decodeAttribute (arr) {
  skipWhiteSpace(arr)
  const c = arr[arr.i]
  if (c === '/' || c === '>') {
    return
  }
  let name = readValue(arr)
  if (name && name.isValue) {
    return name.value
  } else {
    name = readTo(arr, /[\s=]/)
  }
  skipWhiteSpace(arr)
  assertChar(arr, /=/)
  skipWhiteSpace(arr)
  let value = readValue(arr)
  if (value && value.isValue) {
    value = value.value
  } else {
    const quote = new RegExp(arr[arr.i])
    assertChar(arr, /["']/)
    value = readToArr(arr, quote)
    assertChar(arr, quote)
  }
  return { [name]: value }
}

function _decodeAttributes (arr) {
  const out = { obj: {} }
  while (true) {
    const attribute = _decodeAttribute(arr)
    if (attribute) {
      if (typeof attribute === 'function') {
        out.callback = attribute
      } else {
        Object.assign(out.obj, attribute)
      }
    } else {
      return out
    }
  }
}

function _decodeElement (arr, xmlns, that) {
  assertChar(arr, /</)
  const isClosing = readIf(arr, '/')
  const tag = _decodeTag(arr) || FRAGMENT
  const attributes = _decodeAttributes(arr)
  xmlns = attributes.obj.xmlns || xmlns
  const isEmpty = readIf(arr, '/')
  assertChar(arr, />/)
  const children = (isClosing || isEmpty) ? [] : decodeDescriptions(arr, tag, xmlns, that)
  return { type: 'node', tag, attributes, children, isClosing, xmlns, that }
}

function _decodeDescription (arr, xmlns, that) {
  const c = arr[arr.i]
  if (c.isValue) {
    arr.i++
    return c.value
  } else if (c === '<') {
    return _decodeElement(arr, xmlns, that)
  } else {
    return { type: 'textnode', value: readTo(arr, /</) }
  }
}

export function decodeDescriptions (arr, closingTag, xmlns = 'http://www.w3.org/1999/xhtml', that) {
  const nodes = []
  while (arr.i < arr.length) {
    const node = _decodeDescription(arr, xmlns, that)
    if (node) {
      if (closingTag && node.isClosing && node.tag === closingTag) {
        return nodes
      }
      delete node.isClosing
      nodes.push(node)
    }
  }
  return [].concat.apply([], nodes)
}
