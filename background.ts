import { findDomainConfigByDomain, getAccountsByDomainConfigId } from "~utils/storage"

// 导入图标资源（使用 data-base64: 前缀）
import icon from "data-base64:~/assets/icon.png"
import activeIcon from "data-base64:~/assets/active-icon.png"

// 从 base64 数据 URI 加载图片并转换为 ImageData
async function loadImageAsImageData(
  base64DataUri: string,
  size: number
): Promise<ImageData> {
  const response = await fetch(base64DataUri)
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)

  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext("2d")
  if (!context) {
    imageBitmap.close()
    throw new Error("无法获取 canvas 上下文")
  }

  context.clearRect(0, 0, size, size)
  context.drawImage(imageBitmap, 0, 0, size, size)
  const imageData = context.getImageData(0, 0, size, size)

  imageBitmap.close()
  return imageData
}

// 为图标生成不同尺寸的 ImageData
async function generateIconImageData(
  base64DataUri: string
): Promise<Record<number, ImageData>> {
  const sizes = [16, 32, 48, 128]
  const result: Record<number, ImageData> = {}

  for (const size of sizes) {
    try {
      result[size] = await loadImageAsImageData(base64DataUri, size)
    } catch (error) {
      console.error(`[Password Auto Fill] 生成 ${size}x${size} 图标失败:`, error)
    }
  }

  if (Object.keys(result).length === 0) {
    throw new Error("所有尺寸的图标生成都失败了")
  }

  if (!result[16] && Object.keys(result).length > 0) {
    const firstSize = Number(Object.keys(result)[0])
    result[16] = result[firstSize]
  }

  return result
}

// 缓存图标 ImageData，避免重复转换
let iconImageDataCache: Record<number, ImageData> | null = null
let activeIconImageDataCache: Record<number, ImageData> | null = null

// 初始化图标 ImageData
async function initIconImageData() {
  try {
    if (!iconImageDataCache) {
      iconImageDataCache = await generateIconImageData(icon)
    }
    if (!activeIconImageDataCache) {
      activeIconImageDataCache = await generateIconImageData(activeIcon)
    }
  } catch (error) {
    console.error("[Password Auto Fill] 初始化图标失败:", error)
  }
}

// 初始化图标
initIconImageData()

// 从 URL 中提取域名
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return null
  }
}

// 更新标签页的图标和角标
async function updateTabIconAndBadge(tabId: number, url: string) {
  await initIconImageData()

  if (!url) {
    if (iconImageDataCache) {
      chrome.action.setIcon({ tabId, imageData: iconImageDataCache })
    }
    chrome.action.setBadgeText({ tabId, text: "" })
    return
  }

  const domain = extractDomain(url)
  if (!domain) {
    if (iconImageDataCache) {
      chrome.action.setIcon({ tabId, imageData: iconImageDataCache })
    }
    chrome.action.setBadgeText({ tabId, text: "" })
    return
  }

  try {
    const domainConfig = await findDomainConfigByDomain(domain)

    if (domainConfig) {
      const accounts = await getAccountsByDomainConfigId(domainConfig.id)
      const accountCount = accounts.length

      if (accountCount > 0) {
        if (activeIconImageDataCache) {
          chrome.action.setIcon({ tabId, imageData: activeIconImageDataCache })
        }
        chrome.action.setBadgeText({
          tabId,
          text: accountCount > 99 ? "99+" : accountCount.toString()
        })
        chrome.action.setBadgeBackgroundColor({ tabId, color: "#1890ff" })
      } else {
        if (iconImageDataCache) {
          chrome.action.setIcon({ tabId, imageData: iconImageDataCache })
        }
        chrome.action.setBadgeText({ tabId, text: "" })
      }
    } else {
      if (iconImageDataCache) {
        chrome.action.setIcon({ tabId, imageData: iconImageDataCache })
      }
      chrome.action.setBadgeText({ tabId, text: "" })
    }
  } catch (error) {
    console.error("[Password Auto Fill] 更新图标和角标失败:", error)
    if (iconImageDataCache) {
      chrome.action.setIcon({ tabId, imageData: iconImageDataCache })
    }
    chrome.action.setBadgeText({ tabId, text: "" })
  }
}

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateTabIconAndBadge(tabId, tab.url)
  }
})

// 监听标签页激活事件（切换标签页时）
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      updateTabIconAndBadge(activeInfo.tabId, tab.url)
    }
  } catch (error) {
    console.error("[Password Auto Fill] 获取标签页信息失败:", error)
  }
})

// 监听存储变化，当配置更新时刷新当前标签页
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local") {
    // 配置发生变化，更新所有标签页
    try {
      const tabs = await chrome.tabs.query({})
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          updateTabIconAndBadge(tab.id, tab.url)
        }
      }
    } catch (error) {
      console.error("[Password Auto Fill] 更新标签页失败:", error)
    }
  }
})

// 扩展安装或启动时，更新所有标签页
chrome.runtime.onStartup.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateTabIconAndBadge(tab.id, tab.url)
      }
    }
  } catch (error) {
    console.error("[Password Auto Fill] 启动时更新标签页失败:", error)
  }
})

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateTabIconAndBadge(tab.id, tab.url)
      }
    }
  } catch (error) {
    console.error("[Password Auto Fill] 安装时更新标签页失败:", error)
  }
})
