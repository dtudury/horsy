// takes a function that evaluates to true or false and static if and else responses. return function that evaluates condition and returns appropriate response
export function showIfElse (condition, a, b = []) {
  return () => condition() ? a : b
}

// takes an object and a mapping-function. returns a function that maps the object through the function and returns previously calculated mappings on future calls
export function mapEntries (object, f) {
  const map = new Map()
  return () => {
    const o = (typeof object === 'function' ? object() : object) || {}
    map.forEach(indexedValues => {
      indexedValues.index = 0
    })
    const mappedEntries = Object.entries(o).map(([name, value]) => {
      if (!map.has(value)) {
        map.set(value, { index: 0, values: [] })
      }
      const indexedValues = map.get(value)
      if (indexedValues.values.length <= indexedValues.index) {
        indexedValues.values.push(f(value, name))
      }
      return indexedValues.values[indexedValues.index++]
    })
    // cleanup any unmapped-to values
    map.forEach((indexedValues, key) => {
      if (indexedValues.index) {
        indexedValues.values.splice(indexedValues.index)
      } else {
        map.delete(key)
      }
    })
    return mappedEntries
  }
}

export function mapSwitch (expression, f) {
  const map = new Map()
  return () => {
    const expr = expression()
    if (!map.has(expr)) {
      map.set(expr, f(expr))
    }
    return map.get(expr)
  }
}

export function objToDeclarations (obj = {}) {
  return Object.entries(obj).map(([name, value]) => `${name}: ${value};`).join('')
}
