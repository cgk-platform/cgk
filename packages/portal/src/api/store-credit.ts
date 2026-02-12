/**
 * Store Credit API
 *
 * GraphQL queries for customer store credit data.
 */

import { customerQuery } from './client'
import type { StoreCreditAccount, StoreCreditTransaction, Money } from '../types'

interface StoreCreditResponse {
  customer: {
    storeCreditAccounts: {
      nodes: Array<{
        id: string
        balance: { amount: string; currencyCode: string }
      }>
    }
  }
}

interface StoreCreditTransactionsResponse {
  customer: {
    storeCreditAccounts: {
      nodes: Array<{
        id: string
        balance: { amount: string; currencyCode: string }
        transactions: {
          nodes: Array<{
            id: string
            type: string
            amount: { amount: string; currencyCode: string }
            createdAt: string
            orderReference: string | null
          }>
        }
      }>
    }
  }
}

const GET_STORE_CREDIT_QUERY = `
  query GetStoreCredit {
    customer {
      storeCreditAccounts(first: 5) {
        nodes {
          id
          balance { amount currencyCode }
        }
      }
    }
  }
`

const GET_STORE_CREDIT_WITH_TRANSACTIONS_QUERY = `
  query GetStoreCreditWithTransactions($first: Int!) {
    customer {
      storeCreditAccounts(first: 5) {
        nodes {
          id
          balance { amount currencyCode }
          transactions(first: $first, sortKey: CREATED_AT, reverse: true) {
            nodes {
              id
              type
              amount { amount currencyCode }
              createdAt
              orderReference
            }
          }
        }
      }
    }
  }
`

/**
 * Get store credit accounts and balances
 */
export async function getStoreCreditAccounts(
  tenantId: string,
  accessToken: string
): Promise<StoreCreditAccount[]> {
  const result = await customerQuery<StoreCreditResponse>(tenantId, accessToken, {
    query: GET_STORE_CREDIT_QUERY,
  })

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get store credit:', result.errors)
    return []
  }

  return result.data.customer.storeCreditAccounts.nodes.map((account) => ({
    id: account.id,
    balance: account.balance,
  }))
}

/**
 * Get total store credit balance across all accounts
 */
export async function getTotalStoreCreditBalance(
  tenantId: string,
  accessToken: string
): Promise<Money | null> {
  const accounts = await getStoreCreditAccounts(tenantId, accessToken)

  if (accounts.length === 0) {
    return null
  }

  // Sum all account balances (assuming same currency)
  const currencyCode = accounts[0]!.balance.currencyCode
  const totalAmount = accounts.reduce((sum, account) => {
    return sum + parseFloat(account.balance.amount)
  }, 0)

  return {
    amount: totalAmount.toFixed(2),
    currencyCode,
  }
}

/**
 * Get store credit transactions
 */
export async function getStoreCreditTransactions(
  tenantId: string,
  accessToken: string,
  options: { first?: number } = {}
): Promise<{
  accounts: StoreCreditAccount[]
  transactions: StoreCreditTransaction[]
}> {
  const { first = 20 } = options

  const result = await customerQuery<StoreCreditTransactionsResponse>(
    tenantId,
    accessToken,
    {
      query: GET_STORE_CREDIT_WITH_TRANSACTIONS_QUERY,
      variables: { first },
    }
  )

  if (result.errors?.length || !result.data?.customer) {
    console.error('Failed to get store credit transactions:', result.errors)
    return { accounts: [], transactions: [] }
  }

  const accounts: StoreCreditAccount[] = []
  const transactions: StoreCreditTransaction[] = []

  for (const account of result.data.customer.storeCreditAccounts.nodes) {
    accounts.push({
      id: account.id,
      balance: account.balance,
    })

    for (const tx of account.transactions.nodes) {
      transactions.push({
        id: tx.id,
        type: mapTransactionType(tx.type),
        amount: tx.amount,
        createdAt: tx.createdAt,
        description: getTransactionDescription(tx.type, tx.orderReference),
        orderId: tx.orderReference,
      })
    }
  }

  // Sort transactions by date descending
  transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return { accounts, transactions }
}

/**
 * Map transaction type from API to our type
 */
function mapTransactionType(type: string): StoreCreditTransaction['type'] {
  const mapping: Record<string, StoreCreditTransaction['type']> = {
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
    EXPIRATION: 'EXPIRATION',
    REFUND: 'REFUND',
    ADJUSTMENT: 'ADJUSTMENT',
  }
  return mapping[type] || 'ADJUSTMENT'
}

/**
 * Generate transaction description
 */
function getTransactionDescription(
  type: string,
  orderReference: string | null
): string {
  switch (type) {
    case 'CREDIT':
      return 'Store credit added'
    case 'DEBIT':
      return orderReference
        ? `Used on order ${orderReference}`
        : 'Store credit used'
    case 'EXPIRATION':
      return 'Store credit expired'
    case 'REFUND':
      return orderReference
        ? `Refund from order ${orderReference}`
        : 'Refund credit'
    case 'ADJUSTMENT':
      return 'Balance adjustment'
    default:
      return 'Transaction'
  }
}
