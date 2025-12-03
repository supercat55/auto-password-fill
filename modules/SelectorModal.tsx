import { Button, Input, message, Modal, Space, Tag, Typography } from "antd"
import { forwardRef, useImperativeHandle, useState } from "react"

export interface Selector {
  tagName: string
  type?: string
  id?: string
  name?: string
  placeholder?: string
  cssSelector: string
  xpath: string
}

export interface SelectorModalRef {
  open: (selectors: Selector[]) => void
  close: () => void
}

export interface SelectorModalProps {
  onUseSelector?: (selector: string, type: "username" | "password") => void
}

export const SelectorModal = forwardRef<SelectorModalRef, SelectorModalProps>(
  ({ onUseSelector }, ref) => {
    const [open, setOpen] = useState(false)
    const [selectors, setSelectors] = useState<Selector[]>([])

    useImperativeHandle(ref, () => ({
      open: (selectorList) => {
        setSelectors(selectorList)
        setOpen(true)
      },
      close: () => {
        setOpen(false)
        setSelectors([])
      }
    }))

    const handleCopyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        message.success("已复制到剪贴板")
      } catch (error) {
        console.error("复制失败:", error)
        message.error("复制失败")
      }
    }

    const handleUseSelector = (
      selector: string,
      type: "username" | "password"
    ) => {
      onUseSelector?.(selector, type)
      setOpen(false)
    }

    return (
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title={`页面输入框选择器 (${selectors.length} 个)`}
        footer={[
          <Button key="close" onClick={() => setOpen(false)}>
            关闭
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}>
        <div className="max-h-[60vh] overflow-y-auto">
          {selectors.length === 0 ? (
            <div className="text-center py-8 text-gray-400">未找到输入框</div>
          ) : (
            <div className="space-y-3">
              {selectors.map((selector, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Typography.Text strong className="text-sm">
                          #{index + 1} {selector.tagName}
                        </Typography.Text>
                        {selector.type && (
                          <Tag color="blue">{selector.type}</Tag>
                        )}
                      </div>
                      <Space direction="vertical" size={4} className="text-xs">
                        {selector.id && (
                          <Typography.Text type="secondary">
                            ID: {selector.id}
                          </Typography.Text>
                        )}
                        {selector.name && (
                          <Typography.Text type="secondary">
                            Name: {selector.name}
                          </Typography.Text>
                        )}
                        {selector.placeholder && (
                          <Typography.Text type="secondary">
                            Placeholder: {selector.placeholder}
                          </Typography.Text>
                        )}
                      </Space>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Typography.Text className="text-xs text-gray-600 mb-1 block">
                        XPath:
                      </Typography.Text>
                      <Space.Compact className="w-full">
                        <Input.TextArea
                          readOnly
                          value={selector.xpath}
                          className="text-xs"
                          rows={3}
                        />
                        <Button
                          onClick={() => handleCopyToClipboard(selector.xpath)}
                          size="small"
                          type="primary">
                          复制
                        </Button>
                        {onUseSelector && (
                          <Button
                            type="primary"
                            onClick={() => {
                              if (selector.type === "password") {
                                handleUseSelector(selector.xpath, "password")
                              } else {
                                handleUseSelector(selector.xpath, "username")
                              }
                            }}
                            size="small">
                            使用
                          </Button>
                        )}
                      </Space.Compact>
                    </div>
                    <div>
                      <Typography.Text className="text-xs text-gray-600 mb-1 block">
                        CSS 选择器:
                      </Typography.Text>
                      <Space.Compact className="w-full">
                        <Input
                          readOnly
                          value={selector.cssSelector}
                          className="text-xs"
                        />
                        <Button
                          onClick={() =>
                            handleCopyToClipboard(selector.cssSelector)
                          }
                          type="primary"
                          size="small">
                          复制
                        </Button>
                        {onUseSelector && (
                          <Button
                            type="primary"
                            onClick={() => {
                              if (selector.type === "password") {
                                handleUseSelector(
                                  selector.cssSelector,
                                  "password"
                                )
                              } else {
                                handleUseSelector(
                                  selector.cssSelector,
                                  "username"
                                )
                              }
                            }}
                            size="small">
                            使用
                          </Button>
                        )}
                      </Space.Compact>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    )
  }
)
