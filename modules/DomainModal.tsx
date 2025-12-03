import {
  Button,
  Card,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Tag,
  Typography
} from "antd"
import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import type { DomainConfig, SelectorItem } from "~types"
import { generateId, saveDomainConfig } from "~utils/storage"

import {
  SelectorItemModal,
  type SelectorItemModalRef
} from "./SelectorItemModal"

export interface DomainModalRef {
  open: (options?: {
    defaultValues?: Partial<DomainConfig>
    editConfig?: DomainConfig
  }) => void
  close: () => void
}

export interface DomainModalProps {
  currentDomain?: string
  onSuccess?: () => void
}

export const DomainModal = forwardRef<DomainModalRef, DomainModalProps>(
  ({ currentDomain = "", onSuccess }, ref) => {
    const [form] = Form.useForm()
    const [open, setOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState<DomainConfig | null>(
      null
    )
    const [selectors, setSelectors] = useState<SelectorItem[]>([])
    const selectorItemModalRef = useRef<SelectorItemModalRef>(null)

    useImperativeHandle(ref, () => ({
      open: (options) => {
        const { defaultValues, editConfig } = options || {}

        if (editConfig) {
          // 编辑模式
          setEditingConfig(editConfig)
          setSelectors(editConfig.selectors || [])
          form.setFieldsValue({
            domain: editConfig.domain,
            alias: editConfig.alias || ""
          })
        } else {
          // 新建模式
          setEditingConfig(null)
          setSelectors([])
          form.setFieldsValue({
            domain: defaultValues?.domain || currentDomain,
            alias: defaultValues?.alias || ""
          })
        }
        setOpen(true)
      },
      close: () => {
        setOpen(false)
        form.resetFields()
        setEditingConfig(null)
        setSelectors([])
      }
    }))

    const handleSave = async () => {
      try {
        const values = await form.validateFields()

        if (selectors.length === 0) {
          message.warning("请至少添加一个选择器")
          return
        }

        const config: DomainConfig = {
          id: editingConfig?.id || generateId(),
          domain: values.domain,
          alias: values.alias?.trim() || undefined,
          selectors: selectors,
          defaultAccountId: editingConfig?.defaultAccountId || null,
          createdAt: editingConfig?.createdAt || Date.now(),
          updatedAt: Date.now()
        }

        await saveDomainConfig(config)

        setOpen(false)
        form.resetFields()
        setEditingConfig(null)
        setSelectors([])
        onSuccess?.()
      } catch (error) {
        console.error("保存失败:", error)
      }
    }

    const handleCancel = () => {
      setOpen(false)
      form.resetFields()
      setEditingConfig(null)
      setSelectors([])
    }

    const handleAddSelector = () => {
      selectorItemModalRef.current?.open()
    }

    const handleEditSelector = (selector: SelectorItem) => {
      selectorItemModalRef.current?.open({ editSelector: selector })
    }

    const handleDeleteSelector = (selectorId: string) => {
      setSelectors(selectors.filter((s) => s.id !== selectorId))
      message.success("已删除选择器")
    }

    const handleSelectorSave = (selector: SelectorItem) => {
      const existingIndex = selectors.findIndex((s) => s.id === selector.id)
      if (existingIndex >= 0) {
        // 编辑
        const newSelectors = [...selectors]
        newSelectors[existingIndex] = selector
        setSelectors(newSelectors)
        message.success("已更新选择器")
      } else {
        // 新增
        setSelectors([...selectors, selector])
        message.success("已添加选择器")
      }
    }

    return (
      <>
        <Drawer
          open={open}
          onClose={handleCancel}
          title={editingConfig ? "编辑域名" : "添加域名"}
          footer={
            <Flex gap={10}>
              <Button onClick={handleCancel} block>
                取消
              </Button>
              <Button type="primary" onClick={handleSave} block>
                保存
              </Button>
            </Flex>
          }
          width={600}>
          <Form layout="vertical" form={form}>
            <Form.Item
              label="域名"
              name="domain"
              rules={[{ required: true, message: "请输入域名" }]}>
              <Input placeholder="请输入域名" />
            </Form.Item>
            <Form.Item label="域名别名（可选）" name="alias">
              <Input placeholder="例如: 工作网站、个人博客等（用于显示，不影响匹配）" />
            </Form.Item>
          </Form>

          <Divider>选择器列表</Divider>

          <div className="space-y-2 mb-4">
            {selectors.length > 0 ? (
              selectors.map((selector) => (
                <Card key={selector.id} size="small" className="shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Typography.Text strong>
                          {selector.alias || "未命名选择器"}
                        </Typography.Text>
                        <Tag
                          color={
                            selector.selectorType === "css" ? "blue" : "purple"
                          }>
                          {selector.selectorType === "css" ? "CSS" : "XPath"}
                        </Tag>
                      </div>
                      <Typography.Text
                        type="secondary"
                        className="text-xs block break-all"
                        style={{ maxHeight: "60px", overflow: "auto" }}>
                        {selector.selector}
                      </Typography.Text>
                    </div>
                    <Space size="small" className="ml-2 flex-shrink-0">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleEditSelector(selector)}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="确定要删除这个选择器吗？"
                        onConfirm={() => handleDeleteSelector(selector.id)}
                        okText="确定"
                        cancelText="取消">
                        <Button type="text" size="small" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                暂无选择器，请点击下方按钮添加
              </div>
            )}
          </div>

          <Button type="dashed" block onClick={handleAddSelector}>
            + 添加选择器
          </Button>
        </Drawer>
        <SelectorItemModal
          ref={selectorItemModalRef}
          onSuccess={handleSelectorSave}
        />
      </>
    )
  }
)
