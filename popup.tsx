import {
  Button,
  Card,
  ConfigProvider,
  Divider,
  Empty,
  Flex,
  message,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography
} from "antd"
import { useEffect, useRef, useState } from "react"

import { AccountDrawer, type AccountDrawerRef } from "~modules/AccountDrawer"
import { DomainModal, type DomainModalRef } from "~modules/DomainModal"
import { SelectorModal, type SelectorModalRef } from "~modules/SelectorModal"
import type { Account, DomainConfig, DomainWithAccounts } from "~types"
import {
  deleteAccount,
  deleteDomainConfig,
  findDomainConfigByDomain,
  getDomainsWithAccounts,
  saveAccount
} from "~utils/storage"

import "~style.css"

function IndexPopup() {
  const [domainsWithAccounts, setDomainsWithAccounts] = useState<
    DomainWithAccounts[]
  >([])

  const domainModalRef = useRef<DomainModalRef>(null)
  const [currentDomain, setCurrentDomain] = useState("")
  const accountDrawerRef = useRef<AccountDrawerRef>(null)
  const selectorModalRef = useRef<SelectorModalRef>(null)

  const loadData = async () => {
    const data = await getDomainsWithAccounts()
    console.log("🚀 ~ loadData ~ data:", data)
    setDomainsWithAccounts(data)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 获取当前标签页的域名
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          const url = new URL(tabs[0].url)
          setCurrentDomain(url.hostname)
        } catch (e) {
          console.error("无法解析URL:", e)
        }
      }
    })
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

  const renderDomainCardTitle = (config: DomainConfig) => {
    return (
      <div className="py-1">
        <Tooltip title={config.alias || config.domain}>
          <Typography.Text
            strong
            className="text-base"
            ellipsis
            style={{ maxWidth: "200px", display: "block" }}>
            {config.alias || config.domain}
          </Typography.Text>
        </Tooltip>
        {config.alias && (
          <Tooltip title={config.domain}>
            <Typography.Text
              type="secondary"
              className="text-xs block mt-0.5"
              ellipsis
              style={{ maxWidth: "200px" }}>
              {config.domain}
            </Typography.Text>
          </Tooltip>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Tag color="default">{config.selectors?.length || 0} 个选择器</Tag>
          {config.selectors && config.selectors.length > 0 && (
            <Space size={4} wrap>
              {config.selectors.map((selector, idx) => (
                <Tag
                  key={selector.id || idx}
                  color={selector.selectorType === "css" ? "blue" : "purple"}
                  className="text-xs">
                  {selector.alias || `选择器${idx + 1}`}
                </Tag>
              ))}
            </Space>
          )}
        </div>
      </div>
    )
  }

  //TODO:折叠功能 优先展示匹配的域名
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff"
        }
      }}>
      <div className="w-96 h-[600px] bg-gray-50 flex flex-col">
        <div className="bg-purple-500 p-4 text-white flex-shrink-0">
          <h1 className="text-2xl font-bold">
            {currentDomain || "未检测到域名"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {domainsWithAccounts.length > 0 ? (
            domainsWithAccounts.map(({ config, accounts }) => (
              <Card
                key={config.id}
                title={renderDomainCardTitle(config)}
                size="small"
                extra={
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleEditDomain(config)}>
                      ⚙️
                    </Button>
                    <Popconfirm
                      title="确定要删除这个域名配置吗？"
                      description="删除后，该域名下的所有账户也会被删除"
                      onConfirm={() => handleDeleteDomain(config.id)}
                      okText="确定"
                      cancelText="取消">
                      <Button type="text" size="small">
                        🗑️
                      </Button>
                    </Popconfirm>
                  </Space>
                }
                className="shadow-sm">
                <div className="space-y-2">
                  {accounts.length > 0 ? (
                    accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Tooltip
                              title={
                                account.label ||
                                (account.selectorValues &&
                                  Object.values(account.selectorValues)[0]) ||
                                "未命名账户"
                              }>
                              <Typography.Text
                                strong
                                className="text-sm"
                                ellipsis
                                style={{ maxWidth: "150px" }}>
                                {account.label ||
                                  (account.selectorValues &&
                                    Object.values(account.selectorValues)[0]) ||
                                  "未命名账户"}
                              </Typography.Text>
                            </Tooltip>
                            <Space size={4}>
                              {account.isDefault && (
                                <Tag color="blue">默认</Tag>
                              )}
                              {account.autoFill && (
                                <Tag color="green">自动</Tag>
                              )}
                            </Space>
                          </div>
                          {account.selectorValues &&
                            Object.keys(account.selectorValues).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(account.selectorValues)
                                  .slice(0, 2)
                                  .map(([selectorId, value]) => (
                                    <Tooltip key={selectorId} title={value}>
                                      <Typography.Text
                                        type="secondary"
                                        className="text-xs"
                                        ellipsis
                                        style={{
                                          display: "block",
                                          maxWidth: "100px"
                                        }}>
                                        {value.substring(0, 8)}...
                                      </Typography.Text>
                                    </Tooltip>
                                  ))}
                              </div>
                            )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Tooltip title="填充此账户">
                            <Button
                              onClick={() => handleFill(account.id)}
                              size="small"
                              type="primary">
                              填充
                            </Button>
                          </Tooltip>
                          {!account.isDefault && (
                            <Tooltip title="设为默认">
                              <Button
                                onClick={() => handleSetDefaultAccount(account)}
                                size="small">
                                默认
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="编辑账户">
                            <Button
                              onClick={() =>
                                handleOpenAccountDrawer(config.id, account)
                              }
                              size="small">
                              编辑
                            </Button>
                          </Tooltip>
                          <Popconfirm
                            title="确定要删除这个账户吗？"
                            onConfirm={() => handleDeleteAccount(account.id)}
                            okText="确定"
                            cancelText="取消">
                            <Tooltip title="删除账户">
                              <Button size="small" danger>
                                删除
                              </Button>
                            </Tooltip>
                          </Popconfirm>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      暂无账户
                    </div>
                  )}
                </div>
                <Divider className="my-3" />
                <Button
                  type="dashed"
                  block
                  onClick={() => handleOpenAccountDrawer(config.id)}
                  className="text-xs">
                  + 添加账户
                </Button>
              </Card>
            ))
          ) : (
            <Empty
              description="还没有配置任何域名"
              className="py-8"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
        <div className="bg-white border-t border-gray-200 flex-shrink-0 shadow-lg p-2">
          <Flex className="w-full gap-2">
            <Button type="primary" block onClick={handleAddDomain}>
              + 添加域名
            </Button>
            <Button type="default" block onClick={() => handleFill("")}>
              立即填充
            </Button>
          </Flex>
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
    </ConfigProvider>
  )
}

export default IndexPopup
