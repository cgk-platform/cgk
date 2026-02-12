/**
 * Addresses Page Components
 *
 * Client components for address book management.
 */

'use client'

import { Button, cn, Input, Label } from '@cgk/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { EmptyState } from '@/components/account/EmptyState'
import { Modal, ModalFooter } from '@/components/account/Modal'
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
  type CreateAddressRequest,
  type CustomerAddress,
} from '@/lib/account/api'
import { getContent } from '@/lib/account/content'
import type { PortalContentStrings } from '@/lib/account/types'

interface AddressesClientProps {
  addresses: CustomerAddress[]
  content: PortalContentStrings
}

export function AddressesClient({ addresses, content }: AddressesClientProps) {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<CustomerAddress | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingAddress) return
    setIsDeleting(true)
    try {
      await deleteAddress(deletingAddress.id)
      setDeletingAddress(null)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete address:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetDefault = async (addressId: string) => {
    setSettingDefault(addressId)
    try {
      await setDefaultAddress(addressId)
      router.refresh()
    } catch (error) {
      console.error('Failed to set default address:', error)
    } finally {
      setSettingDefault(null)
    }
  }

  if (addresses.length === 0) {
    return (
      <>
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title={getContent(content, 'addresses.empty')}
          description={getContent(content, 'addresses.empty_description')}
          action={
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]/90"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {getContent(content, 'addresses.add_new')}
            </Button>
          }
        />

        <AddressModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          content={content}
          onSuccess={() => {
            setShowAddModal(false)
            router.refresh()
          }}
        />
      </>
    )
  }

  return (
    <>
      {/* Add Address Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]/90"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {getContent(content, 'addresses.add_new')}
        </Button>
      </div>

      {/* Addresses Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            content={content}
            isSettingDefault={settingDefault === address.id}
            onEdit={() => setEditingAddress(address)}
            onDelete={() => setDeletingAddress(address)}
            onSetDefault={() => handleSetDefault(address.id)}
          />
        ))}
      </div>

      {/* Add Address Modal */}
      <AddressModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        content={content}
        onSuccess={() => {
          setShowAddModal(false)
          router.refresh()
        }}
      />

      {/* Edit Address Modal */}
      {editingAddress && (
        <AddressModal
          isOpen={!!editingAddress}
          onClose={() => setEditingAddress(null)}
          address={editingAddress}
          content={content}
          onSuccess={() => {
            setEditingAddress(null)
            router.refresh()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingAddress}
        onClose={() => setDeletingAddress(null)}
        title={getContent(content, 'addresses.delete_confirm')}
        description={getContent(content, 'addresses.delete_confirm_description')}
        size="sm"
      >
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeletingAddress(null)}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {getContent(content, 'common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </>
            ) : (
              getContent(content, 'common.delete')
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

interface AddressCardProps {
  address: CustomerAddress
  content: PortalContentStrings
  isSettingDefault: boolean
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

function AddressCard({
  address,
  content,
  isSettingDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border p-6 transition-all duration-200',
        address.isDefault
          ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]/5'
          : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/50'
      )}
    >
      {/* Default Badge */}
      {address.isDefault && (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center rounded-full bg-[hsl(var(--portal-primary))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--portal-primary-foreground))]">
            {getContent(content, 'addresses.default_badge')}
          </span>
        </div>
      )}

      {/* Address Content */}
      <address className="not-italic space-y-1">
        <p className="font-medium">
          {address.firstName} {address.lastName}
        </p>
        {address.company && (
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">{address.company}</p>
        )}
        <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">{address.address1}</p>
        {address.address2 && (
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">{address.address2}</p>
        )}
        <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
          {address.city}, {address.province} {address.postalCode}
        </p>
        <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">{address.country}</p>
        {address.phone && (
          <p className="pt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">{address.phone}</p>
        )}
      </address>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-[hsl(var(--portal-border))]">
        <Button variant="outline" size="sm" onClick={onEdit} className="rounded-lg text-xs">
          {getContent(content, 'addresses.edit')}
        </Button>
        {!address.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetDefault}
            disabled={isSettingDefault}
            className="rounded-lg text-xs"
          >
            {isSettingDefault ? (
              <svg className="mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {getContent(content, 'addresses.set_default')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {getContent(content, 'addresses.delete')}
        </Button>
      </div>
    </div>
  )
}

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  address?: CustomerAddress
  content: PortalContentStrings
  onSuccess: () => void
}

function AddressModal({
  isOpen,
  onClose,
  address,
  content,
  onSuccess,
}: AddressModalProps) {
  const isEditing = !!address
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateAddressRequest>({
    firstName: address?.firstName || '',
    lastName: address?.lastName || '',
    company: address?.company || '',
    address1: address?.address1 || '',
    address2: address?.address2 || '',
    city: address?.city || '',
    province: address?.province || '',
    postalCode: address?.postalCode || '',
    country: address?.country || 'United States',
    countryCode: address?.countryCode || 'US',
    phone: address?.phone || '',
    isDefault: address?.isDefault || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isEditing && address) {
        await updateAddress({ id: address.id, ...formData })
      } else {
        await createAddress(formData)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getContent(content, isEditing ? 'addresses.modal.edit_title' : 'addresses.modal.add_title')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">{getContent(content, 'addresses.form.first_name')}</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="mt-1.5 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="lastName">{getContent(content, 'addresses.form.last_name')}</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="mt-1.5 rounded-lg"
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <Label htmlFor="company">{getContent(content, 'addresses.form.company')}</Label>
          <Input
            id="company"
            value={formData.company || ''}
            onChange={(e) => setFormData({ ...formData, company: e.target.value || null })}
            className="mt-1.5 rounded-lg"
          />
        </div>

        {/* Address Line 1 */}
        <div>
          <Label htmlFor="address1">{getContent(content, 'addresses.form.address1')}</Label>
          <Input
            id="address1"
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            required
            className="mt-1.5 rounded-lg"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <Label htmlFor="address2">{getContent(content, 'addresses.form.address2')}</Label>
          <Input
            id="address2"
            value={formData.address2 || ''}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value || null })}
            className="mt-1.5 rounded-lg"
          />
        </div>

        {/* City, State, Zip Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="city">{getContent(content, 'addresses.form.city')}</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              className="mt-1.5 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="province">{getContent(content, 'addresses.form.province')}</Label>
            <Input
              id="province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              required
              className="mt-1.5 rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">{getContent(content, 'addresses.form.postal_code')}</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              required
              className="mt-1.5 rounded-lg"
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <Label htmlFor="country">{getContent(content, 'addresses.form.country')}</Label>
          <select
            id="country"
            value={formData.countryCode}
            onChange={(e) => {
              const code = e.target.value
              const selectedOption = e.target.options[e.target.selectedIndex]
              const name = selectedOption?.text ?? code
              setFormData({ ...formData, countryCode: code, country: name })
            }}
            className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
          </select>
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">{getContent(content, 'addresses.form.phone')}</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
            className="mt-1.5 rounded-lg"
          />
        </div>

        {/* Default Address Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-stone-300 text-[hsl(var(--portal-primary))] focus:ring-[hsl(var(--portal-primary))]"
          />
          <Label htmlFor="isDefault" className="cursor-pointer">
            {getContent(content, 'addresses.set_default')}
          </Label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {getContent(content, 'common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[hsl(var(--portal-primary))] hover:bg-[hsl(var(--portal-primary))]/90"
          >
            {isSubmitting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              getContent(content, 'addresses.form.save')
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export function AddressesListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-[hsl(var(--portal-muted))]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6"
          >
            <div className="space-y-3">
              <div className="h-5 w-32 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-48 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-40 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-36 rounded bg-[hsl(var(--portal-muted))]" />
            </div>
            <div className="mt-4 flex gap-2 pt-4 border-t border-[hsl(var(--portal-border))]">
              <div className="h-8 w-16 rounded-lg bg-[hsl(var(--portal-muted))]" />
              <div className="h-8 w-24 rounded-lg bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
