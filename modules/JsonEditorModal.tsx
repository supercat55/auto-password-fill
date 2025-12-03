import { Button, Input, message, Modal } from "antd"
import { useEffect, useState } from "react"

import type { StorageData } from "~types"

const { TextArea } = Input

interface JsonEditorModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: StorageData) => void
  initialData: StorageData
}

export function JsonEditorModal({
  open,
  onClose,
  onSave,
  initialData
}: JsonEditorModalProps) {
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (open) {
      try {
        const formatted = JSON.stringify(initialData, null, 2)
        setJsonText(formatted)
        setError("")
      } catch (e) {
        setError("数据格式错误")
        setJsonText("")
      }
    }
  }, [open, initialData])

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText) as StorageData

      // 验证数据结构
      if (!parsed.domainConfigs || !Array.isArray(parsed.domainConfigs)) {
        throw new Error("domainConfigs 必须是数组")
      }
      if (!parsed.accounts || !Array.isArray(parsed.accounts)) {
        throw new Error("accounts 必须是数组")
      }

      onSave(parsed)
      message.success("保存成功")
      onClose()
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "JSON 格式错误，请检查语法"
      setError(errorMessage)
      message.error(errorMessage)
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setError("")
      message.success("格式化成功")
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "JSON 格式错误，无法格式化"
      setError(errorMessage)
      message.error(errorMessage)
    }
  }

  return (
    <Modal
      title="编辑 JSON 配置"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="format" onClick={handleFormat}>
          格式化
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存
        </Button>
      ]}>
      <div className="space-y-2">
        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <TextArea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            setError("")
          }}
          rows={20}
          style={{ fontFamily: "monospace" }}
          placeholder='请输入有效的 JSON 配置，例如：\n{\n  "domainConfigs": [],\n  "accounts": []\n}'
        />
        <div className="text-xs text-gray-500">
          提示：修改 JSON 后点击"格式化"可以检查语法，确认无误后点击"保存"
        </div>
      </div>
    </Modal>
  )
}
