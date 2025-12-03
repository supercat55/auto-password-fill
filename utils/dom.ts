// 通过 XPath 查找元素
export function getElementByXPath(xpath: string): HTMLElement | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  )
  return result.singleNodeValue as HTMLElement | null
}

// 通过 CSS 选择器查找元素
export function getElementBySelector(selector: string): HTMLElement | null {
  return document.querySelector(selector) as HTMLElement | null
}

// 根据选择器类型查找元素
export function findInputElement(
  selector: string,
  type: "css" | "xpath"
): HTMLInputElement | HTMLTextAreaElement | null {
  const element =
    type === "xpath" ? getElementByXPath(selector) : getElementBySelector(selector)

  if (!element) return null

  // 确保是输入元素
  if (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.getAttribute("contenteditable") === "true"
  ) {
    return element as HTMLInputElement | HTMLTextAreaElement
  }

  return null
}

// 填充输入框
export function fillInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    // 设置值
    element.value = value

    // 触发事件以确保页面能检测到变化
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))

    // 对于 React 等框架，可能需要设置内部属性
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value)
      element.dispatchEvent(new Event("input", { bubbles: true }))
    }
  } else if (element.getAttribute("contenteditable") === "true") {
    element.textContent = value
    element.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

