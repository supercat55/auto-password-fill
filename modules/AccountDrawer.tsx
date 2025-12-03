import {
  Button,
  Drawer,
  Form,
  Input,
  message,
  Space,
  Switch,
  Tag,
  Tooltip
} from "antd"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"

import type { Account, DomainConfig, SelectorItem } from "~types"
import {
  generateId,
  getAllAccounts,
  getAllDomainConfigs,
  saveAccount
} from "~utils/storage"

export interface AccountDrawerRef {
  open: (options?: { domainConfigId?: string; editAccount?: Account }) => void
  close: () => void
}

export interface AccountDrawerProps {
  onSuccess?: () => void
}

export const AccountDrawer = forwardRef<AccountDrawerRef, AccountDrawerProps>(
  ({ onSuccess }, ref) => {
    const [form] = Form.useForm()
    const [open, setOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [selectedDomainConfigId, setSelectedDomainConfigId] = useState<
      string | null
    >(null)
    const [domainConfig, setDomainConfig] = useState<DomainConfig | null>(null)
    const [selectors, setSelectors] = useState<SelectorItem[]>([])

    useImperativeHandle(ref, () => ({
      open: async (options) => {
        const { domainConfigId, editAccount } = options || {}

        setSelectedDomainConfigId(domainConfigId || null)

        // 加载域名配置和选择器
        let loadedSelectors: SelectorItem[] = []
        if (domainConfigId) {
          loadedSelectors = await loadDomainConfig(domainConfigId)
        }

        if (editAccount) {
          // 编辑模式
          setEditingAccount(editAccount)
          const formValues: Record<string, any> = {
            label: editAccount.label,
            autoFill: editAccount.autoFill,
            isDefault: editAccount.isDefault
          }

          // 使用选择器值
          if (editAccount.selectorValues && loadedSelectors.length > 0) {
            loadedSelectors.forEach((selector) => {
              formValues[`selector_${selector.id}`] =
                editAccount.selectorValues?.[selector.id] || ""
            })
          }

          form.setFieldsValue(formValues)
        } else {
          // 新建模式
          setEditingAccount(null)
          form.setFieldsValue({
            autoFill: true,
            isDefault: false
          })
        }
        setOpen(true)
      },
      close: () => {
        setOpen(false)
        form.resetFields()
        setEditingAccount(null)
        setDomainConfig(null)
        setSelectors([])
      }
    }))

    // 加载域名配置
    const loadDomainConfig = async (
      domainConfigId: string
    ): Promise<SelectorItem[]> => {
      const allConfigs = await getAllDomainConfigs()
      const config = allConfigs.find((c) => c.id === domainConfigId)

      if (config) {
        setDomainConfig(config)
        // 获取选择器列表
        const selectorList = config.selectors || []
        setSelectors(selectorList)
        return selectorList
      } else {
        setDomainConfig(null)
        setSelectors([])
        message.warning("未找到域名配置")
        return []
      }
    }

    const handleSave = async () => {
      try {
        const values = await form.validateFields()

        // 构建选择器值映射
        const selectorValues: Record<string, string> = {}
        selectors.forEach((selector) => {
          const value = values[`selector_${selector.id}`]
          if (value) {
            selectorValues[selector.id] = value
          }
        })

        if (Object.keys(selectorValues).length === 0) {
          message.warning("请至少填写一个选择器的值")
          return
        }

        const account: Account = {
          id: editingAccount?.id || `${selectedDomainConfigId}-${generateId()}`,
          username: "", // 已废弃字段
          password: "", // 已废弃字段
          label: values.label || "",
          autoFill: values.autoFill ?? true,
          isDefault: values.isDefault ?? false,
          selectorValues: selectorValues,
          createdAt: editingAccount?.createdAt || Date.now(),
          updatedAt: Date.now()
        }

        await saveAccount(account)

        setOpen(false)
        form.resetFields()
        setEditingAccount(null)
        setDomainConfig(null)
        setSelectors([])
        onSuccess?.()
      } catch (error) {
        console.error("保存失败:", error)
      }
    }

    const handleCancel = () => {
      setOpen(false)
      form.resetFields()
      setEditingAccount(null)
      setDomainConfig(null)
      setSelectors([])
    }

    return (
      <Drawer
        open={open}
        onClose={handleCancel}
        title={editingAccount ? "编辑账户" : "添加账户"}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </div>
        }>
        {selectors.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {selectedDomainConfigId
              ? "该域名还没有配置选择器，请先配置选择器"
              : "请先选择域名"}
          </div>
        ) : (
          <Form
            layout="vertical"
            form={form}
            initialValues={{
              autoFill: true,
              isDefault: false
            }}>
            <Form.Item label="账户标签" name="label">
              <Input placeholder="例如: 工作账号、个人账号（留空则使用第一个字段的值）" />
            </Form.Item>

            {/* 根据选择器动态生成表单字段 */}
            {selectors.map((selector) => (
              <Form.Item
                key={selector.id}
                label={
                  <Space>
                    <span>
                      {selector.alias || `选择器 ${selector.id.slice(0, 8)}`}
                    </span>
                    <Tooltip title={selector.selector}>
                      <Tag
                        color={
                          selector.selectorType === "css" ? "blue" : "purple"
                        }>
                        {selector.selectorType === "css" ? "CSS" : "XPath"}
                      </Tag>
                    </Tooltip>
                  </Space>
                }
                name={`selector_${selector.id}`}>
                <Input
                  placeholder={`请输入${selector.alias || "选择器"}的值`}
                  autoComplete="off"
                />
              </Form.Item>
            ))}

            <Form.Item label="自动填充" name="autoFill" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              label="是否为默认账户"
              name="isDefault"
              valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    )
  }
)
