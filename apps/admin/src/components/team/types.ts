export interface TeamMember {
  id: string
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  status: 'active' | 'invited'
  joinedAt: Date | string | null
  invitedAt: Date | string
  invitedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface TeamInvitation {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  message: string | null
  invitedBy: {
    id: string
    name: string | null
    email: string
  }
  expiresAt: Date | string
  createdAt: Date | string
  acceptedAt: Date | string | null
}

export interface RateLimit {
  used: number
  remaining: number
  limit: number
}
