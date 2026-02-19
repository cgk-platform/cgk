'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@cgk-platform/ui'
import { FolderOpen, Plus, Trash2 } from 'lucide-react'

interface ContentCluster {
  id: string
  name: string
  pillarTopic: string
  pillarPostCount: number
  clusterPostCount: number
  status: 'active' | 'draft'
  createdAt: string
}

const MOCK_CLUSTERS: ContentCluster[] = [
  {
    id: '1',
    name: 'Skincare Routines',
    pillarTopic: 'Complete Skincare Routine Guide',
    pillarPostCount: 1,
    clusterPostCount: 12,
    status: 'active',
    createdAt: '2025-10-01',
  },
  {
    id: '2',
    name: 'Supplements for Athletes',
    pillarTopic: 'Sports Nutrition 101',
    pillarPostCount: 1,
    clusterPostCount: 8,
    status: 'active',
    createdAt: '2025-11-15',
  },
  {
    id: '3',
    name: 'Anti-Aging Tips',
    pillarTopic: 'Anti-Aging Science Explained',
    pillarPostCount: 1,
    clusterPostCount: 3,
    status: 'draft',
    createdAt: '2026-01-20',
  },
]

interface CreateClusterForm {
  name: string
  pillarTopic: string
}

export default function ContentClustersPage() {
  const [clusters, setClusters] = useState<ContentCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateClusterForm>({ name: '', pillarTopic: '' })
  const [saving, setSaving] = useState(false)

  const fetchClusters = useCallback(async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    setClusters(MOCK_CLUSTERS)
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchClusters()
  }, [fetchClusters])

  async function handleCreate() {
    if (!form.name.trim() || !form.pillarTopic.trim()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    const newCluster: ContentCluster = {
      id: String(Date.now()),
      name: form.name,
      pillarTopic: form.pillarTopic,
      pillarPostCount: 0,
      clusterPostCount: 0,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0] ?? '',
    }
    setClusters((prev) => [newCluster, ...prev])
    setForm({ name: '', pillarTopic: '' })
    setDialogOpen(false)
    setSaving(false)
  }

  function handleDelete(id: string) {
    setClusters((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Clusters</h1>
          <p className="text-muted-foreground">
            Manage topic clusters with pillar and supporting posts.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Cluster
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Content Cluster</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cluster-name">Cluster Name</Label>
                <Input
                  id="cluster-name"
                  placeholder="e.g. Skincare Routines"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pillar-topic">Pillar Post Topic</Label>
                <Textarea
                  id="pillar-topic"
                  placeholder="e.g. The Ultimate Guide to Building a Skincare Routine"
                  rows={3}
                  value={form.pillarTopic}
                  onChange={(e) => setForm((f) => ({ ...f, pillarTopic: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? 'Creating…' : 'Create Cluster'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Pillar Topic</TableHead>
                  <TableHead className="text-right">Pillar</TableHead>
                  <TableHead className="text-right">Cluster Posts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.length === 0 ? (
                  <TableEmpty
                    icon={FolderOpen}
                    title="No clusters yet"
                    description="Create your first content cluster to get started."
                    colSpan={7}
                  />
                ) : (
                  clusters.map((cluster) => (
                    <TableRow key={cluster.id}>
                      <TableCell className="font-medium">{cluster.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {cluster.pillarTopic}
                      </TableCell>
                      <TableCell className="text-right">{cluster.pillarPostCount}</TableCell>
                      <TableCell className="text-right">{cluster.clusterPostCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={cluster.status === 'active' ? 'default' : 'outline'}
                          className="capitalize"
                        >
                          {cluster.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cluster.createdAt}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cluster.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
