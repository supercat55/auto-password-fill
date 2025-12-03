// 账户信息
export interface Account {
  id: string
  username: string // 已废弃，保留用于类型兼容
  password: string // 已废弃，保留用于类型兼容
  label: string // 账户标签，如"工作账号"、"个人账号"等
  autoFill: boolean // 是否自动填充
  isDefault: boolean // 是否为默认账户
  selectorValues: Record<string, string> // 选择器ID到填充值的映射，key为选择器ID，value为要填充的值
  createdAt: number
  updatedAt: number
}

// 选择器配置
export interface SelectorItem {
  id: string
  alias?: string // 选择器别名，如"用户名"、"密码"、"验证码"等
  selector: string // 选择器（CSS选择器或XPath）
  selectorType: "css" | "xpath" // 选择器类型
  createdAt: number
  updatedAt: number
}

// 域名配置（包含选择器配置）
export interface DomainConfig {
  id: string
  domain: string // 域名匹配规则，支持通配符
  alias?: string // 域名别名（非必填，用于显示）
  selectors: SelectorItem[] // 选择器列表
  defaultAccountId: string | null // 默认账户ID
  createdAt: number
  updatedAt: number
}

// 密码规则配置（向后兼容，内部使用）
export interface PasswordRule {
  id: string
  domain: string
  usernameSelector: string
  passwordSelector: string
  selectorType: "css" | "xpath"
  username: string
  password: string
  autoFill: boolean
  accountLabel: string // 账户标签
  isDefault: boolean // 是否为默认账户
  createdAt: number
  updatedAt: number
}

// 存储的数据结构
export interface StorageData {
  domainConfigs: DomainConfig[]
  accounts: Account[]
  // 向后兼容
  rules?: PasswordRule[]
}

// 域名配置和账户的组合
export interface DomainWithAccounts {
  config: DomainConfig
  accounts: Account[]
}

