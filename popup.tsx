import {
  CaretRightOutlined,
  DownloadOutlined,
  EditOutlined,
  ImportOutlined
} from "@ant-design/icons"
import {
  Button,
  Collapse,
  ConfigProvider,
  Empty,
  message,
  Tag,
  Tooltip
} from "antd"
import { useEffect, useRef, useState } from "react"

import { AccountDrawer, type AccountDrawerRef } from "~modules/AccountDrawer"
import { DomainCard } from "~modules/DomainCard"
import { DomainModal, type DomainModalRef } from "~modules/DomainModal"
import { JsonEditorModal } from "~modules/JsonEditorModal"
import { SelectorModal, type SelectorModalRef } from "~modules/SelectorModal"
import type {
  Account,
  DomainConfig,
  DomainWithAccounts,
  StorageData
} from "~types"
import {
  deleteAccount,
  deleteDomainConfig,
  exportStorageData,
  findDomainConfigByDomain,
  getDomainsWithAccounts,
  importStorageData,
  saveAccount
} from "~utils/storage"

import "~style.css"

function IndexPopup() {
  const [domainsWithAccounts, setDomainsWithAccounts] = useState<
    DomainWithAccounts[]
  >([])

  const domainModalRef = useRef<DomainModalRef>(null)
  const [currentDomain, setCurrentDomain] = useState("")
  const [faviconUrl, setFaviconUrl] = useState<string>("")
  const accountDrawerRef = useRef<AccountDrawerRef>(null)
  const selectorModalRef = useRef<SelectorModalRef>(null)
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false)
  const [storageData, setStorageData] = useState<StorageData>({
    domainConfigs: [],
    accounts: []
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 检查域名是否匹配当前域名（使用与 findDomainConfigByDomain 相同的逻辑）
  const isCurrentDomain = (domain: string) => {
    if (!currentDomain) return false
    if (domain === currentDomain) return true
    // 支持通配符匹配，如 *.example.com
    const pattern = domain.replace(/\./g, "\\.").replace(/\*/g, ".*")
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(currentDomain)
  }

  const loadData = async () => {
    const data = await getDomainsWithAccounts()
    console.log("🚀 ~ loadData ~ data:", data)
    setDomainsWithAccounts(data)

    // 同时加载完整的存储数据
    const fullData = await exportStorageData()
    setStorageData(fullData)

    // 设置默认展开的 key（其他域名配置的折叠面板）
    const hasOtherDomains = data.some(
      ({ config }) => !isCurrentDomain(config.domain)
    )
    if (hasOtherDomains) {
      setActiveKeys(["other-domains"])
    } else {
      setActiveKeys([])
    }
  }

  // 更新扩展图标角标
  const updateBadge = (data: DomainWithAccounts[], domain: string) => {
    if (!domain) {
      chrome.action.setBadgeText({ text: "" })
      return
    }

    // 检查域名是否匹配的函数
    const checkDomainMatch = (configDomain: string) => {
      if (configDomain === domain) return true
      // 支持通配符匹配，如 *.example.com
      const pattern = configDomain.replace(/\./g, "\\.").replace(/\*/g, ".*")
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(domain)
    }

    // 查找匹配的域名配置
    const matched = data.find(({ config }) => checkDomainMatch(config.domain))

    if (matched && matched.accounts.length > 0) {
      // 显示账户数量
      const count = matched.accounts.length
      chrome.action.setBadgeText({
        text: count > 99 ? "99+" : count.toString()
      })
      chrome.action.setBadgeBackgroundColor({ color: "#1677ff" })
    } else {
      // 清除角标
      chrome.action.setBadgeText({ text: "" })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 当 currentDomain 变化时，更新展开的 key 和角标
  useEffect(() => {
    const hasOtherDomains = domainsWithAccounts.some(
      ({ config }) => !isCurrentDomain(config.domain)
    )
    if (hasOtherDomains) {
      setActiveKeys(["other-domains"])
    } else {
      setActiveKeys([])
    }
  }, [currentDomain, domainsWithAccounts])

  // 获取当前标签页的域名和 favicon
  useEffect(() => {
    const updateTabInfo = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url)
            setCurrentDomain(url.hostname)

            // 获取 favicon
            if (tabs[0].favIconUrl) {
              setFaviconUrl(tabs[0].favIconUrl)
            } else {
              // 如果没有 favicon，尝试从域名构建 favicon URL
              const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`
              setFaviconUrl(faviconUrl)
            }
          } catch (e) {
            console.error("无法解析URL:", e)
          }
        }
      })
    }

    updateTabInfo()

    // 监听标签页切换
    const handleTabActivated = () => {
      updateTabInfo()
    }

    // 监听标签页更新（URL变化）
    const handleTabUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (changeInfo.url) {
        updateTabInfo()
      }
    }

    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [])

  const handleAddDomain = () => {
    domainModalRef.current?.open({
      defaultValues: {
        domain: currentDomain
      }
    })
  }

  const handleOpenAccountDrawer = (id: string, account?: Account) => {
    accountDrawerRef.current?.open({
      domainConfigId: id,
      editAccount: account
    })
  }

  // 手动触发填充
  const handleFill = async (accountId?: string) => {
    if (!currentDomain) {
      message.error("无法获取当前页面域名，请确保在有效的网页上使用此功能")
      return
    }

    const domainConfig = await findDomainConfigByDomain(currentDomain)
    if (!domainConfig) {
      message.warning("当前页面没有配置的规则，请先为该域名添加配置")
      return
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "fill", accountId },
          (response) => {
            if (chrome.runtime.lastError) {
              message.error(chrome.runtime.lastError.message)
              return
            }
            if (response?.success) {
              const filledCount = response.filledCount || 0
              const totalSelectors = response.totalSelectors || 0
              if (filledCount === totalSelectors) {
                message.success(`已成功填充 ${filledCount} 个字段`)
              } else {
                message.warning(
                  `已填充 ${filledCount}/${totalSelectors} 个字段，部分字段可能未找到`
                )
              }
            } else {
              message.error(
                response?.message || "填充失败，请检查选择器是否正确"
              )
            }
          }
        )
      }
    })
  }

  const handleSetDefaultAccount = async (account: Account) => {
    try {
      const updatedAccount = { ...account, isDefault: true }
      await saveAccount(updatedAccount)
      message.success("已设置为默认账户")
      loadData()
    } catch (error) {
      console.error("设置默认账户失败:", error)
      message.error("设置失败")
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteAccount(accountId)
      message.success("删除成功")
      loadData()
    } catch (error) {
      console.error("删除账户失败:", error)
      message.error("删除失败")
    }
  }

  const handleEditDomain = (config: DomainConfig) => {
    domainModalRef.current?.open({
      editConfig: config
    })
  }

  const handleDeleteDomain = async (configId: string) => {
    try {
      await deleteDomainConfig(configId)
      message.success("删除成功")
      loadData()
    } catch (error) {
      console.error("删除域名失败:", error)
      message.error("删除失败")
    }
  }

  // 跳转到域名对应的网址
  const handleNavigateToDomain = (domain: string) => {
    try {
      // 处理通配符域名，如 *.example.com -> example.com
      let targetDomain = domain
      if (domain.startsWith("*.")) {
        targetDomain = domain.substring(2)
      } else if (domain.includes("*")) {
        // 处理其他通配符情况，提取主域名
        const parts = domain.split(".")
        const mainDomain = parts.filter((p) => p !== "*").join(".")
        targetDomain = mainDomain || domain
      }

      // 构建完整的 URL
      let url = targetDomain
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`
      }

      // 使用 chrome.tabs.create 在新标签页打开
      chrome.tabs.create({ url })
    } catch (error) {
      console.error("打开网址失败:", error)
      message.error("无法打开网址，请检查域名格式")
    }
  }

  // 导出 JSON
  const handleExportJson = async () => {
    try {
      const data = await exportStorageData()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `password-auto-fill-config-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      message.success("导出成功")
    } catch (error) {
      console.error("导出失败:", error)
      message.error("导出失败")
    }
  }

  // 导入 JSON
  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as StorageData

      // 验证数据结构
      if (!data.domainConfigs || !Array.isArray(data.domainConfigs)) {
        throw new Error("无效的配置文件：缺少 domainConfigs")
      }
      if (!data.accounts || !Array.isArray(data.accounts)) {
        throw new Error("无效的配置文件：缺少 accounts")
      }

      await importStorageData(data)
      message.success("导入成功")
      loadData()
    } catch (error) {
      console.error("导入失败:", error)
      message.error(
        error instanceof Error ? error.message : "导入失败，请检查文件格式"
      )
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImportJson(file)
      // 清空 input，以便可以重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 打开 JSON 编辑器
  const handleOpenJsonEditor = async () => {
    const data = await exportStorageData()
    setStorageData(data)
    setJsonEditorOpen(true)
  }

  // 保存 JSON 编辑
  const handleSaveJson = async (data: StorageData) => {
    try {
      await importStorageData(data)
      message.success("保存成功")
      loadData()
      setJsonEditorOpen(false)
    } catch (error) {
      console.error("保存失败:", error)
      message.error("保存失败")
    }
  }

  // 分离匹配的域名配置和其他域名配置
  const matchedDomain = domainsWithAccounts.find(({ config }) =>
    isCurrentDomain(config.domain)
  )
  const otherDomains = domainsWithAccounts.filter(
    ({ config }) => !isCurrentDomain(config.domain)
  )

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff"
        }
      }}>
      <div className="w-96 h-[600px] bg-gray-50 flex flex-col">
        <div className="bg-purple-500 p-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {matchedDomain ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {faviconUrl && (
                  <img
                    src={faviconUrl}
                    alt="favicon"
                    className="w-6 h-6 rounded flex-shrink-0"
                    onError={(e) => {
                      // 如果图片加载失败，隐藏图片
                      e.currentTarget.style.display = "none"
                    }}
                  />
                )}
                <h1 className="text-xl font-bold flex-1 truncate">
                  {matchedDomain.config.alias ||
                    matchedDomain.config.domain ||
                    "未检测到域名"}
                </h1>
              </div>
            ) : (
              <Button
                type="primary"
                size="large"
                block
                onClick={handleAddDomain}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: "white",
                  fontWeight: "bold"
                }}>
                + 添加域名
              </Button>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip title="导出 JSON">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleExportJson}
                  style={{ color: "white" }}
                />
              </Tooltip>
              <Tooltip title="导入 JSON">
                <Button
                  type="text"
                  size="small"
                  icon={<ImportOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ color: "white" }}
                />
              </Tooltip>
              <Tooltip title="编辑 JSON">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={handleOpenJsonEditor}
                  style={{ color: "white" }}
                />
              </Tooltip>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {domainsWithAccounts.length > 0 ? (
            <>
              {/* 匹配的域名配置：单独显示，不折叠 */}
              {matchedDomain ? (
                <DomainCard
                  key={matchedDomain.config.id}
                  config={matchedDomain.config}
                  accounts={matchedDomain.accounts}
                  isCurrentDomain={true}
                  onNavigate={handleNavigateToDomain}
                  onEdit={handleEditDomain}
                  onDelete={handleDeleteDomain}
                  onFill={handleFill}
                  onSetDefault={handleSetDefaultAccount}
                  onEditAccount={handleOpenAccountDrawer}
                  onDeleteAccount={handleDeleteAccount}
                  onAddAccount={(configId) => handleOpenAccountDrawer(configId)}
                />
              ) : (
                <Empty
                  description="当前域名还没有配置"
                  className="py-8"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button type="primary" onClick={handleAddDomain}>
                    添加域名
                  </Button>
                </Empty>
              )}

              {/* 其他域名配置：放在折叠面板中 */}
              {otherDomains.length > 0 && (
                <Collapse
                  activeKey={activeKeys}
                  onChange={setActiveKeys}
                  bordered={false}
                  size="small"
                  expandIcon={({ isActive }) => (
                    <CaretRightOutlined rotate={isActive ? 90 : 0} />
                  )}
                  style={{ padding: "2px" }}
                  items={[
                    {
                      key: "other-domains",
                      label: (
                        <span>
                          其他域名配置{" "}
                          <Tag color="default" className="ml-2">
                            {otherDomains.length}
                          </Tag>
                        </span>
                      ),
                      children: (
                        <div className="space-y-3">
                          {otherDomains.map(({ config, accounts }) => (
                            <DomainCard
                              key={config.id}
                              config={config}
                              accounts={accounts}
                              isCurrentDomain={false}
                              onNavigate={handleNavigateToDomain}
                              onEdit={handleEditDomain}
                              onDelete={handleDeleteDomain}
                              onFill={handleFill}
                              onSetDefault={handleSetDefaultAccount}
                              onEditAccount={handleOpenAccountDrawer}
                              onDeleteAccount={handleDeleteAccount}
                              onAddAccount={(configId) =>
                                handleOpenAccountDrawer(configId)
                              }
                            />
                          ))}
                        </div>
                      )
                    }
                  ]}
                />
              )}
            </>
          ) : (
            <Empty
              description="还没有配置任何域名"
              className="py-8"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
        <div className="bg-white border-t border-gray-200 flex-shrink-0 shadow-lg p-2">
          {matchedDomain ? (
            <Button type="primary" block onClick={() => handleFill("")}>
              一键填充
            </Button>
          ) : (
            <Button type="primary" block onClick={handleAddDomain}>
              + 添加域名
            </Button>
          )}
        </div>
      </div>
      <DomainModal
        ref={domainModalRef}
        currentDomain={currentDomain}
        onSuccess={() => {
          message.success("保存成功")
          loadData()
        }}
      />
      <AccountDrawer
        ref={accountDrawerRef}
        onSuccess={() => {
          message.success("保存成功")
          loadData()
        }}
      />
      <SelectorModal ref={selectorModalRef} />
      <JsonEditorModal
        open={jsonEditorOpen}
        onClose={() => setJsonEditorOpen(false)}
        onSave={handleSaveJson}
        initialData={storageData}
      />
    </ConfigProvider>
  )
}

export default IndexPopup
