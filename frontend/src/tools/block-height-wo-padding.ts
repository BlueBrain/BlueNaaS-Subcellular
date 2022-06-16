function blockHeightWoPadding(blockEl: Element) {
  const computedStyle = getComputedStyle(blockEl)
  const paddingTop = parseInt(computedStyle.getPropertyValue('padding-top'), 10)
  const paddingBottom = parseInt(computedStyle.getPropertyValue('padding-bottom'), 10)
  const blockHeight = parseInt(computedStyle.getPropertyValue('height'), 10)
  return blockHeight - (paddingTop + paddingBottom)
}

export default blockHeightWoPadding
