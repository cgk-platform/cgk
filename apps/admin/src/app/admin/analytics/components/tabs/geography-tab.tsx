'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@cgk-platform/ui'

import type { DateRange, GeographyData } from '@/lib/analytics'
import { formatCurrency, formatNumber } from '@/lib/format'

interface GeographyTabProps {
  dateRange: DateRange
}

export function GeographyTab({ dateRange }: GeographyTabProps) {
  const [data, setData] = useState<GeographyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          preset: dateRange.preset,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        })
        const res = await fetch(`/api/admin/analytics/geography?${params}`)
        const json = await res.json()
        setData(json.data)
      } catch (error) {
        console.error('Failed to fetch geography data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateRange])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!data) {
    return <div className="text-muted-foreground">No data available</div>
  }

  const totalRevenue = data.revenueByCountry.reduce((sum, c) => sum + c.revenue, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue by Country */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Revenue by Country</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.revenueByCountry.slice(0, 10).map((country) => {
              const percent = totalRevenue > 0 ? (country.revenue / totalRevenue) * 100 : 0
              return (
                <div key={country.country}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{country.countryName}</span>
                    <span>{formatCurrency(country.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Regions */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Top Regions</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Region</th>
                <th className="pb-3 font-medium text-right">Revenue</th>
                <th className="pb-3 font-medium text-right">Orders</th>
                <th className="pb-3 font-medium text-right">AOV</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.revenueByRegion.slice(0, 10).map((region, i) => (
                <tr key={i}>
                  <td className="py-3">
                    <div className="font-medium">{region.region}</div>
                    <div className="text-xs text-muted-foreground">{region.countryName}</div>
                  </td>
                  <td className="py-3 text-right">{formatCurrency(region.revenue)}</td>
                  <td className="py-3 text-right">{formatNumber(region.orders)}</td>
                  <td className="py-3 text-right">{formatCurrency(region.aov)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Cities */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="font-semibold">Top Cities</h3>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">City</th>
                <th className="pb-3 font-medium">Region</th>
                <th className="pb-3 font-medium text-right">Revenue</th>
                <th className="pb-3 font-medium text-right">Orders</th>
                <th className="pb-3 font-medium text-right">Customers</th>
                <th className="pb-3 font-medium text-right">New %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.topCities.slice(0, 15).map((city, i) => (
                <tr key={i}>
                  <td className="py-3 font-medium">{city.city}</td>
                  <td className="py-3 text-muted-foreground">
                    {city.region}, {city.countryName}
                  </td>
                  <td className="py-3 text-right">{formatCurrency(city.revenue)}</td>
                  <td className="py-3 text-right">{formatNumber(city.orders)}</td>
                  <td className="py-3 text-right">{formatNumber(city.customers)}</td>
                  <td className="py-3 text-right">
                    {city.customers > 0
                      ? ((city.newCustomers / city.customers) * 100).toFixed(0)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Map Visualization Placeholder */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="font-semibold">Geographic Distribution</h3>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <div className="text-center text-muted-foreground">
              <div className="mb-2 text-4xl">🗺️</div>
              <p>Interactive map visualization</p>
              <p className="text-sm">Integrate with mapping library (e.g., Mapbox, Leaflet)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className={i >= 2 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
