import {
  CaretRightFilled,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  MinusCircleFilled,
  SettingOutlined,
  StarOutlined
} from "@ant-design/icons"
import {
  Button,
  Card,
  Divider,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography
} from "antd"

import type { Account, DomainConfig } from "~types"

interface DomainCardProps {
  config: DomainConfig
  accounts: Account[]
  isCurrentDomain: boolean
  onNavigate: (domain: string) => void
  onEdit: (config: DomainConfig) => void
  onDelete: (configId: string) => void
  onFill: (accountId: string) => void
  onSetDefault: (account: Account) => void
  onEditAccount: (configId: string, account?: Account) => void
  onDeleteAccount: (accountId: string) => void
  onAddAccount: (configId: string) => void
}

export function DomainCard({
  config,
  accounts,
  isCurrentDomain,
  onNavigate,
  onEdit,
  onDelete,
  onFill,
  onSetDefault,
  onEditAccount,
  onDeleteAccount,
  onAddAccount
}: DomainCardProps) {
  // 渲染域名卡片标题
  const renderTitle = () => {
    return (
      <div className="py-1">
        <div className="flex items-center gap-2">
          {isCurrentDomain && (
            <Tag color="green" className="text-xs">
              当前
            </Tag>
          )}
          <Tooltip title={config.alias || config.domain}>
            <Typography.Text
              strong
              className="text-base"
              ellipsis
              style={{ maxWidth: "200px", display: "block" }}>
              {config.alias || config.domain}
            </Typography.Text>
          </Tooltip>
        </div>
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

  // 渲染操作按钮
  const renderExtra = () => {
    return (
      <Space size="small">
        <Tooltip title="前往该网站">
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => onNavigate(config.domain)}
          />
        </Tooltip>
        <Tooltip title="编辑域名配置">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => onEdit(config)}
          />
        </Tooltip>
        <Popconfirm
          title="确定要删除这个域名配置吗？"
          description="删除后，该域名下的所有账户也会被删除"
          onConfirm={() => onDelete(config.id)}
          okText="确定"
          cancelText="取消">
          <Tooltip title="删除域名配置">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    )
  }

  // 渲染账户列表
  const renderContent = () => {
    // 排序账户：默认账户放在第一位
    const sortedAccounts = [...accounts].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return 0
    })

    return (
      <div className="space-y-2">
        {sortedAccounts.length > 0 ? (
          sortedAccounts.map((account) => (
            <div
              key={account.id}
              className="relative p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
              {/* 删除按钮 - 右上角 */}
              <div className="absolute -top-2 -right-2">
                <Popconfirm
                  title="确定要删除这个账户吗？"
                  onConfirm={() => onDeleteAccount(account.id)}
                  okText="确定"
                  cancelText="取消">
                  <Tooltip title="删除账户">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<MinusCircleFilled />}
                      className="opacity-60 hover:opacity-100"
                    />
                  </Tooltip>
                </Popconfirm>
              </div>

              <div className="flex items-center justify-between pr-2">
                {/* 左侧：账户信息 */}
                <div className="flex-1 min-w-0">
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
                      {account.isDefault && <Tag color="blue">默认</Tag>}
                      {account.autoFill && <Tag color="green">自动</Tag>}
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

                  {/* 编辑和设为默认按钮 */}
                  <Space size="small" className="mt-3 pt-2">
                    {!account.isDefault && (
                      <Tooltip title="设为默认">
                        <Button
                          onClick={() => onSetDefault(account)}
                          size="small"
                          type="text"
                          icon={<StarOutlined />}>
                          设为默认
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip title="编辑账户">
                      <Button
                        onClick={() => onEditAccount(config.id, account)}
                        size="small"
                        type="text"
                        icon={<EditOutlined />}>
                        编辑
                      </Button>
                    </Tooltip>
                  </Space>
                </div>

                {/* 右侧：填充按钮 - 大图标 */}
                <div className="flex-shrink-0">
                  <Tooltip title="填充此账户">
                    <Button
                      onClick={() => onFill(account.id)}
                      type="primary"
                      icon={<CaretRightFilled />}
                      className="shadow-md hover:shadow-lg transition-all hover:scale-110">
                      填充
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">暂无账户</div>
        )}
        <Divider className="my-3" />
        <Button
          type="dashed"
          block
          onClick={() => onAddAccount(config.id)}
          className="text-xs">
          + 添加账户
        </Button>
      </div>
    )
  }

  return (
    <Card
      title={renderTitle()}
      size="small"
      extra={renderExtra()}
      variant="borderless"
      className="shadow-sm">
      {renderContent()}
    </Card>
  )
}
