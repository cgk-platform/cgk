import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cgk/ui'
import {
  ArrowLeft,
  BanknoteIcon,
  CheckCircle,
  AlertTriangle,
  Edit,
  FileText,
  ExternalLink,
  Clock,
  DollarSign,
  Briefcase,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ContractorStatusBadge,
  ProjectStatusBadge,
  PaymentRequestRow,
} from '@/components/contractors'
import { formatDate, formatMoney } from '@/lib/format'
import {
  getContractorWithPayee,
  getContractorProjects,
  getContractorPaymentMethods,
  getContractorPaymentRequests,
  getContractorPayoutSummary,
} from '@/lib/contractors/db'
import type { ContractorProject } from '@/lib/contractors/types'
import { ContractorDetailActions } from './contractor-detail-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContractorDetailPage({ params }: PageProps) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const contractor = await getContractorWithPayee(tenantSlug, id)
  if (!contractor) {
    notFound()
  }

  const [projects, paymentMethods, paymentRequests, payoutSummary] = await Promise.all([
    getContractorProjects(tenantSlug, id),
    getContractorPaymentMethods(tenantSlug, id),
    getContractorPaymentRequests(tenantSlug, id),
    getContractorPayoutSummary(tenantSlug, id),
  ])

  const pendingRequestCount = paymentRequests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/contractors"
            className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contractor.name}</h1>
              <ContractorStatusBadge status={contractor.status} />
            </div>
            <p className="mt-1 text-muted-foreground">{contractor.email}</p>
            {contractor.tags.length > 0 && (
              <div className="mt-2 flex gap-1">
                {contractor.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/contractors/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
          <ContractorDetailActions
            contractorId={id}
            contractorName={contractor.name}
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Profile and Balance */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium">{contractor.email}</p>
              </div>
              {contractor.phone && (
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-medium">{contractor.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <ContractorStatusBadge status={contractor.status} />
                </div>
              </div>
              {contractor.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Admin Notes</label>
                  <p className="mt-1 rounded-md bg-muted p-2 text-sm">{contractor.notes}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Contract</label>
                {contractor.contractUrl ? (
                  <a
                    href={contractor.contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Contract
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No contract uploaded</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <p>{formatDate(contractor.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="font-mono text-3xl font-bold text-green-600">
                  {formatMoney(contractor.balanceAvailableCents)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="font-mono text-lg font-semibold">
                    {formatMoney(contractor.balancePendingCents)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="font-mono text-lg font-semibold">
                    {formatMoney(contractor.totalPaidCents)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Summary Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payouts</CardTitle>
              <Link
                href={`/admin/payouts?contractor=${id}`}
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-2 text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="font-mono text-lg font-semibold">{payoutSummary.pendingCount}</p>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="font-mono text-lg font-semibold">{payoutSummary.processingCount}</p>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="font-mono text-lg font-semibold text-destructive">
                    {payoutSummary.failedCount}
                  </p>
                </div>
                <div className="rounded-md border p-2 text-center">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-mono text-lg font-semibold text-green-600">
                    {payoutSummary.completedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment methods configured</p>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{method.label}</span>
                        {method.lastFour && (
                          <span className="font-mono text-xs text-muted-foreground">
                            ****{method.lastFour}
                          </span>
                        )}
                      </div>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payee/Tax Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payee ID</span>
                <span className="font-mono text-sm">
                  {contractor.payeeId || 'Not linked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">W-9 Status</span>
                {contractor.hasW9 ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Submitted</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Missing</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Projects and Payment Requests */}
        <div className="space-y-6 lg:col-span-2">
          {/* Projects Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Projects</CardTitle>
                <CardDescription>
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <ContractorDetailActions
                contractorId={id}
                contractorName={contractor.name}
                showProjectButton
              />
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="py-8 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No projects assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <ProjectRow key={project.id} project={project} contractorId={id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Requests Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Payment Requests</CardTitle>
                  <CardDescription>
                    {paymentRequests.length} request{paymentRequests.length !== 1 ? 's' : ''}
                    {pendingRequestCount > 0 && (
                      <Badge variant="warning" className="ml-2">
                        {pendingRequestCount} pending
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paymentRequests.length === 0 ? (
                <div className="py-8 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No payment requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentRequests.map((request) => (
                    <PaymentRequestRow
                      key={request.id}
                      request={request}
                      contractorId={id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProjectRow({
  project,
  contractorId,
}: {
  project: ContractorProject
  contractorId: string
}) {
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date()
  const isDueSoon =
    project.dueDate &&
    new Date(project.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/contractors/${contractorId}/projects/${project.id}`}
              className="font-medium hover:underline"
            >
              {project.title}
            </Link>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {project.dueDate && (
              <span
                className={
                  isOverdue
                    ? 'text-destructive'
                    : isDueSoon
                      ? 'text-yellow-600'
                      : ''
                }
              >
                <Clock className="mr-1 inline h-3 w-3" />
                Due {formatDate(project.dueDate)}
              </span>
            )}
            {project.rateCents && (
              <span>
                <DollarSign className="mr-1 inline h-3 w-3" />
                {formatMoney(project.rateCents)}
              </span>
            )}
            {project.deliverables.length > 0 && (
              <span>
                {project.deliverables.filter((d) => d.completed).length}/{project.deliverables.length} deliverables
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
