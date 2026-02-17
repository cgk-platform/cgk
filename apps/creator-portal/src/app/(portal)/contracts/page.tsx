'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  StatusBadge,
} from '@cgk-platform/ui'
import {
  FileText,
  Clock,
  CheckCircle,
  Search,
  ExternalLink,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { EsignDocument, EsignSigner } from '@/lib/esign'

interface ContractWithSigner extends EsignDocument {
  signer: EsignSigner
}

interface ContractsData {
  pending: ContractWithSigner[]
  signed: ContractWithSigner[]
  counts: {
    pending: number
    signed: number
  }
}

type FilterStatus = 'all' | 'pending' | 'signed'

export default function ContractsPage() {
  const [data, setData] = useState<ContractsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadContracts() {
      try {
        const response = await fetch('/api/creator/esign')
        if (!response.ok) {
          throw new Error('Failed to load contracts')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contracts')
      } finally {
        setLoading(false)
      }
    }
    loadContracts()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contracts</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Contracts</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCount = data?.counts.pending || 0
  const signedCount = data?.counts.signed || 0

  // Filter and search contracts
  const allContracts = [
    ...(data?.pending || []),
    ...(data?.signed || []),
  ]

  const filteredContracts = allContracts.filter((contract) => {
    // Apply status filter
    if (filter === 'pending' && contract.signer.status !== 'pending' && contract.signer.status !== 'sent' && contract.signer.status !== 'viewed') {
      return false
    }
    if (filter === 'signed' && contract.signer.status !== 'signed') {
      return false
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        contract.name.toLowerCase().includes(searchLower) ||
        contract.signer.name.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Contracts</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          icon={Clock}
          label="Pending Signature"
          value={pendingCount}
          variant={pendingCount > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          icon={CheckCircle}
          label="Signed"
          value={signedCount}
          variant="success"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <FilterTab
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterTab
            label="Pending"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <FilterTab
            label="Signed"
            active={filter === 'signed'}
            onClick={() => setFilter('signed')}
          />
        </div>
      </div>

      {/* Contract List */}
      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No contracts found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try adjusting your search terms'
                : filter === 'pending'
                  ? "You don't have any pending contracts to sign"
                  : filter === 'signed'
                    ? "You haven't signed any contracts yet"
                    : 'No contracts available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatsCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ElementType
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning'
}) {
  const variantStyles = {
    default: '',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg bg-muted p-3 ${variant !== 'default' ? `bg-${variant}/10` : ''}`}>
          <Icon className={`h-5 w-5 ${variantStyles[variant] || 'text-muted-foreground'}`} />
        </div>
        <div>
          <div className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterTab({
  label,
  active,
  onClick,
  badge,
}: {
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <Badge variant={active ? 'secondary' : 'destructive'} className="ml-1 h-5 min-w-5 px-1.5">
          {badge}
        </Badge>
      )}
    </button>
  )
}

function ContractCard({ contract }: { contract: ContractWithSigner }) {
  const isPending =
    contract.signer.status === 'pending' ||
    contract.signer.status === 'sent' ||
    contract.signer.status === 'viewed'
  const isSigned = contract.signer.status === 'signed'

  const formatDate = (date: Date | string | null) => {
    if (!date) return null
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="transition-all duration-normal hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-muted p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{contract.name}</h3>
              <p className="text-sm text-muted-foreground">
                Signer: {contract.signer.name}
              </p>
            </div>
          </div>
          <StatusBadge
            status={
              isSigned
                ? 'signed'
                : contract.signer.status === 'viewed'
                  ? 'viewed'
                  : 'pending'
            }
            showDot
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {isSigned
                ? `Signed ${formatDate(contract.signer.signedAt)}`
                : contract.expiresAt
                  ? `Expires ${formatDate(contract.expiresAt)}`
                  : `Created ${formatDate(contract.createdAt)}`}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isPending && contract.signer.accessToken && (
            <Link href={`/sign/${contract.signer.accessToken}`} className="flex-1">
              <Button className="w-full">
                Sign Document
              </Button>
            </Link>
          )}
          {isSigned && contract.signedFileUrl && (
            <a
              href={contract.signedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Signed Document
              </Button>
            </a>
          )}
          {isSigned && !contract.signedFileUrl && contract.fileUrl && (
            <a
              href={contract.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Document
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
