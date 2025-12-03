import type { PlasmoCSConfig } from "plasmo"
import {
  findDomainConfigByDomain,
  getDefaultAccount,
  getAccountsByDomainConfigId
} from "~utils/storage"
import { findInputElement, fillInput } from "~utils/dom"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 自动填充函数
async function autoFill(accountId?: string) {
  const domain = window.location.hostname

  try {
    const domainConfig = await findDomainConfigByDomain(domain)

    if (!domainConfig) {
      return { success: false, message: "未找到域名配置" }
    }

    // 获取要填充的账户
    let account
    if (accountId) {
      const accounts = await getAccountsByDomainConfigId(domainConfig.id)
      account = accounts.find((a) => a.id === accountId)
    } else {
      account = await getDefaultAccount(domainConfig.id)
    }

    if (!account || !account.autoFill) {
      return { success: false, message: "未找到账户或账户未启用自动填充" }
    }

    // 检查是否有选择器配置
    if (!domainConfig.selectors || domainConfig.selectors.length === 0) {
      return { success: false, message: "域名配置中没有选择器" }
    }

    if (!account.selectorValues || Object.keys(account.selectorValues).length === 0) {
      return { success: false, message: "账户中没有配置选择器值" }
    }

    let filledCount = 0
    const totalSelectors = domainConfig.selectors.length

    // 遍历所有选择器并填充
    for (const selector of domainConfig.selectors) {
      const value = account.selectorValues[selector.id]

      if (!value) {
        console.warn(
          `[Password Auto Fill] 选择器 "${selector.alias || selector.id}" 没有对应的值`
        )
        continue
      }

      const input = findInputElement(selector.selector, selector.selectorType)
      if (input) {
        fillInput(input, value)
        filledCount++
        console.log(
          `[Password Auto Fill] 已填充选择器 "${selector.alias || selector.id}": ${value.substring(0, Math.min(3, value.length))}***`
        )
      } else {
        console.warn(
          `[Password Auto Fill] 未找到选择器 "${selector.alias || selector.id}" 对应的元素 (${selector.selectorType}: ${selector.selector})`
        )
      }
    }

    if (filledCount > 0) {
      console.log(
        `[Password Auto Fill] 已自动填充 ${filledCount}/${totalSelectors} 个字段 (${account.label || "账户"})`
      )
      return { success: true, filledCount, totalSelectors }
    } else {
      return { success: false, message: "未找到任何可填充的输入框" }
    }
  } catch (error) {
    console.error("[Password Auto Fill] 自动填充失败:", error)
    return { success: false, message: error instanceof Error ? error.message : "填充失败" }
  }
}

// 自动填充状态跟踪
let hasFilled = false
let lastFillTime = 0
const FILL_INTERVAL = 3000 // 3秒内不重复填充

// 自动填充函数（带重试）
async function autoFillWithRetry(
  accountId?: string,
  retries: number = 3,
  delay: number = 500
): Promise<{ success: boolean; message?: string; filledCount?: number; totalSelectors?: number }> {
  for (let i = 0; i < retries; i++) {
    const result = await autoFill(accountId)

    if (result.success && result.filledCount && result.filledCount > 0) {
      return result
    }

    // 如果不是最后一次重试，等待后重试
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // 所有重试都失败，返回最后一次的结果
  return await autoFill(accountId)
}

// 页面加载完成后尝试自动填充
async function initAutoFill() {
  // 等待页面完全加载
  if (document.readyState === "loading") {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true })
    })
  }

  // 额外等待一段时间，确保动态内容加载完成
  await new Promise((resolve) => setTimeout(resolve, 800))

  // 尝试自动填充（带重试）
  const result = await autoFillWithRetry()

  if (result.success && result.filledCount && result.filledCount > 0) {
    console.log(
      `[Password Auto Fill] 页面自动填充成功: ${result.filledCount}/${result.totalSelectors} 个字段`
    )
    hasFilled = true
  } else {
    // 静默失败，不显示错误（自动填充失败是正常的，可能是页面没有配置或账户未启用自动填充）
    console.log(`[Password Auto Fill] 自动填充未执行: ${result.message || "无可用配置"}`)
  }
}

// 初始化自动填充
initAutoFill()

// 监听 DOM 变化，如果页面是动态加载的，尝试再次填充
const observer = new MutationObserver(() => {
  // 如果已经成功填充过，就不再尝试
  if (hasFilled) {
    return
  }

  const now = Date.now()
  if (now - lastFillTime > FILL_INTERVAL) {
    lastFillTime = now
    // 延迟执行，避免频繁触发
    setTimeout(async () => {
      const result = await autoFill()
      if (result.success && result.filledCount && result.filledCount > 0) {
        hasFilled = true
        console.log(
          `[Password Auto Fill] 检测到页面变化，自动填充成功: ${result.filledCount}/${result.totalSelectors} 个字段`
        )
      }
    }, 1000)
  }
})

// 等待 body 元素出现后再开始观察
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
} else {
  // 如果 body 还没出现，等待它出现
  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
      bodyObserver.disconnect()
    }
  })
  bodyObserver.observe(document.documentElement, {
    childList: true
  })
}

// 监听来自 popup 的填充请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fill") {
    autoFill(message.accountId).then((result) => {
      sendResponse(result)
    })
    return true // 保持消息通道开放
  }

  if (message.action === "getSelectors") {
    // 返回当前页面的输入框信息，用于辅助配置
    const inputs = Array.from(document.querySelectorAll("input[type='text'], input[type='email'], input[type='password'], textarea"))
    const selectors = inputs.map((input, index) => {
      const element = input as HTMLElement
      return {
        index,
        tagName: element.tagName,
        type: element.getAttribute("type") || "text",
        id: element.id || "",
        name: element.getAttribute("name") || "",
        className: element.className || "",
        placeholder: element.getAttribute("placeholder") || "",
        xpath: getXPath(element),
        cssSelector: getCSSSelector(element)
      }
    })
    sendResponse({ selectors })
    return true
  }
})

// 获取元素的完整绝对 XPath 路径
function getXPath(element: HTMLElement): string {
  // 如果是 html 元素
  if (element === document.documentElement) {
    return "/html"
  }

  // 如果是 body 元素
  if (element === document.body) {
    return "/html/body"
  }

  // 如果没有父节点，返回空
  if (!element.parentNode) {
    return ""
  }

  const parent = element.parentNode as HTMLElement

  // 如果父节点是 html
  if (parent === document.documentElement) {
    return `/html/${element.tagName.toLowerCase()}`
  }

  // 计算在同级元素中的索引（只计算相同标签名的元素）
  const siblings = Array.from(parent.childNodes).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE
  ) as HTMLElement[]

  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i]
    if (sibling === element) {
      // 计算前面有多少个相同标签名的元素
      let sameTagCount = 0
      for (let j = 0; j < i; j++) {
        if (siblings[j].tagName === element.tagName) {
          sameTagCount++
        }
      }
      const position = sameTagCount + 1

      // 递归获取父元素的路径
      const parentPath = getXPath(parent)
      if (parentPath) {
        return `${parentPath}/${element.tagName.toLowerCase()}[${position}]`
      } else {
        return `/${element.tagName.toLowerCase()}[${position}]`
      }
    }
  }

  return ""
}

// 获取元素的 CSS 选择器
function getCSSSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`
  }

  if (element.className) {
    const classes = element.className
      .split(" ")
      .filter((c) => c.trim())
      .map((c) => `.${c}`)
      .join("")
    if (classes) {
      return `${element.tagName.toLowerCase()}${classes}`
    }
  }

  if (element.getAttribute("name")) {
    return `${element.tagName.toLowerCase()}[name="${element.getAttribute("name")}"]`
  }

  return element.tagName.toLowerCase()
}

