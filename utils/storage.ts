import type {
  Account,
  DomainConfig,
  DomainWithAccounts,
  StorageData
} from "~types"

const STORAGE_KEY = "password_fill_data"

// 获取所有域名配置
export async function getAllDomainConfigs(): Promise<DomainConfig[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data: StorageData = result[STORAGE_KEY] || { domainConfigs: [], accounts: [] }
  return data.domainConfigs || []
}

// 获取所有账户
export async function getAllAccounts(): Promise<Account[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data: StorageData = result[STORAGE_KEY] || { domainConfigs: [], accounts: [] }
  return data.accounts || []
}

// 根据域名配置ID获取账户列表
export async function getAccountsByDomainConfigId(
  domainConfigId: string
): Promise<Account[]> {
  const accounts = await getAllAccounts()
  return accounts.filter((account) => {
    // 账户ID格式：domainConfigId-accountId
    return account.id.startsWith(domainConfigId + "-")
  })
}

// 保存域名配置
export async function saveDomainConfig(config: DomainConfig): Promise<void> {
  const configs = await getAllDomainConfigs()
  const existingIndex = configs.findIndex((c) => c.id === config.id)

  if (existingIndex >= 0) {
    configs[existingIndex] = { ...config, updatedAt: Date.now() }
  } else {
    configs.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() })
  }

  const data = await getStorageData()
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...data, domainConfigs: configs } as StorageData
  })
}

// 保存账户
export async function saveAccount(account: Account): Promise<void> {
  const accounts = await getAllAccounts()
  const existingIndex = accounts.findIndex((a) => a.id === account.id)

  if (existingIndex >= 0) {
    accounts[existingIndex] = { ...account, updatedAt: Date.now() }
  } else {
    accounts.push({ ...account, createdAt: Date.now(), updatedAt: Date.now() })
  }

  // 如果设置为默认账户，取消其他账户的默认状态
  if (account.isDefault) {
    const domainConfigId = account.id.split("-")[0]
    accounts.forEach((a) => {
      if (a.id.startsWith(domainConfigId + "-") && a.id !== account.id) {
        a.isDefault = false
      }
    })
  }

  const data = await getStorageData()
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...data, accounts } as StorageData
  })
}

// 删除域名配置及其所有账户
export async function deleteDomainConfig(id: string): Promise<void> {
  const configs = await getAllDomainConfigs()
  const filtered = configs.filter((c) => c.id !== id)

  // 删除该域名下的所有账户
  const accounts = await getAllAccounts()
  const filteredAccounts = accounts.filter((a) => !a.id.startsWith(id + "-"))

  const data = await getStorageData()
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...data,
      domainConfigs: filtered,
      accounts: filteredAccounts
    } as StorageData
  })
}

// 删除账户
export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAllAccounts()
  const filtered = accounts.filter((a) => a.id !== id)

  const data = await getStorageData()
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...data, accounts: filtered } as StorageData
  })
}

// 根据域名查找匹配的域名配置
export async function findDomainConfigByDomain(
  domain: string
): Promise<DomainConfig | null> {
  const configs = await getAllDomainConfigs()

  const matched = configs.find((config) => {
    if (config.domain === domain) return true

    // 支持通配符匹配，如 *.example.com
    const pattern = config.domain.replace(/\./g, "\\.").replace(/\*/g, ".*")
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(domain)
  })

  return matched || null
}

// 获取默认账户（用于自动填充）
export async function getDefaultAccount(
  domainConfigId: string
): Promise<Account | null> {
  const accounts = await getAccountsByDomainConfigId(domainConfigId)
  return accounts.find((a) => a.isDefault) || accounts[0] || null
}

// 获取存储数据
async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] || { domainConfigs: [], accounts: [] }
}

// 导出存储数据（用于导出 JSON）
export async function exportStorageData(): Promise<StorageData> {
  return await getStorageData()
}

// 导入存储数据（用于导入 JSON）
export async function importStorageData(data: StorageData): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: data
  })
}

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 按域名分组获取配置和账户
export async function getDomainsWithAccounts(): Promise<DomainWithAccounts[]> {
  const configs = await getAllDomainConfigs()
  const accounts = await getAllAccounts()

  return configs.map((config) => ({
    config,
    accounts: accounts.filter((a) => a.id.startsWith(config.id + "-"))
  }))
}
