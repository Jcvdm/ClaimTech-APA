'use client'

import { Suspense } from 'react'
import { ClaimListHydrated } from './ClaimList/ClaimListHydrated'
import { ClaimListSkeleton } from './ClaimList/ClaimListSkeleton'

// Export the ClaimsListSkeleton for backward compatibility
export { ClaimListSkeleton as ClaimsListSkeleton } from './ClaimList/ClaimListSkeleton'

export default function Claims() {
  return (
    <Suspense fallback={<ClaimListSkeleton />}>
      <ClaimListHydrated suspense={true} />
    </Suspense>
  )
}
