import { Button, Form, Input, message, Modal, Select, Space } from "antd"
import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import type { SelectorItem } from "~types"
import { generateId } from "~utils/storage"

import { SelectorModal, type SelectorModalRef } from "./SelectorModal"

export interface SelectorItemModalRef {
  open: (options?: {
    defaultValues?: Partial<SelectorItem>
    editSelector?: SelectorItem
  }) => void
  close: () => void
}

export interface SelectorItemModalProps {
  onSuccess?: (selector: SelectorItem) => void
}

export const SelectorItemModal = forwardRef<
  SelectorItemModalRef,
  SelectorItemModalProps
>(({ onSuccess }, ref) => {
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editingSelector, setEditingSelector] = useState<SelectorItem | null>(
    null
  )
  const selectorModalRef = useRef<SelectorModalRef>(null)
  const selectorType = Form.useWatch("selectorType", form)

  useImperativeHandle(ref, () => ({
    open: (options) => {
      const { defaultValues, editSelector } = options || {}

      if (editSelector) {
        // 编辑模式
        setEditingSelector(editSelector)
        form.setFieldsValue({
          alias: editSelector.alias || "",
          selector: editSelector.selector,
          selectorType: editSelector.selectorType
        })
      } else {
        // 新建模式
        setEditingSelector(null)
        form.setFieldsValue({
          selectorType: defaultValues?.selectorType || "xpath",
          alias: defaultValues?.alias || "",
          selector: defaultValues?.selector || ""
        })
      }
      setOpen(true)
    },
    close: () => {
      setOpen(false)
      form.resetFields()
      setEditingSelector(null)
    }
  }))

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const selector: SelectorItem = {
        id: editingSelector?.id || generateId(),
        alias: values.alias?.trim() || undefined,
        selector: values.selector,
        selectorType: values.selectorType,
        createdAt: editingSelector?.createdAt || Date.now(),
        updatedAt: Date.now()
      }

      onSuccess?.(selector)
      setOpen(false)
      form.resetFields()
      setEditingSelector(null)
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    form.resetFields()
    setEditingSelector(null)
  }

  // 获取当前页面的选择器
  const handleGetSelectors = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "getSelectors" },
          (response) => {
            if (chrome.runtime.lastError) {
              message.error(chrome.runtime.lastError.message)
              return
            }
            if (response?.selectors) {
              selectorModalRef.current?.open(response.selectors)
            }
          }
        )
      }
    })
  }

  // 处理从 SelectorModal 选择的选择器
  const handleUseSelector = (
    selector: string,
    type: "username" | "password"
  ) => {
    // 自动填入选择器值
    form.setFieldsValue({
      selector: selector,
      // 如果还没有设置别名，根据类型自动设置
      alias:
        form.getFieldValue("alias") || (type === "username" ? "用户名" : "密码")
    })
    message.success("已填入选择器")
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title={editingSelector ? "编辑选择器" : "添加选择器"}
      footer={[
        <Button key="getSelectors" type="default" onClick={handleGetSelectors}>
          获取页面选择器
        </Button>,
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>
      ]}
      width={600}>
      <Form layout="vertical" form={form}>
        <Form.Item
          label="选择器别名（可选）"
          name="alias"
          tooltip="例如: 用户名、密码、验证码等，用于标识此选择器的用途">
          <Input placeholder="例如: 用户名、密码、验证码等" />
        </Form.Item>
        <Form.Item
          label="选择器类型"
          name="selectorType"
          rules={[{ required: true, message: "请选择选择器类型" }]}>
          <Select
            options={[
              { label: "CSS", value: "css" },
              { label: "XPath", value: "xpath" }
            ]}
          />
        </Form.Item>
        <Form.Item
          label="选择器"
          name="selector"
          rules={[{ required: true, message: "请输入选择器" }]}
          tooltip="可通过F12、右键页面&gt;检查或Ctrl+Shift+I打开浏览器开发者工具，然后选择元素并依次右键元素&gt;复制&gt;复制完整XPath，或点击底部「获取页面选择器」按钮自动获取">
          <Input.TextArea
            rows={3}
            placeholder={
              selectorType === "css"
                ? "请输入CSS选择器，例如: #username 或 input[name='username']"
                : "请输入XPath，例如: //input[@id='username']"
            }
          />
        </Form.Item>
      </Form>
      <SelectorModal ref={selectorModalRef} onUseSelector={handleUseSelector} />
    </Modal>
  )
})
