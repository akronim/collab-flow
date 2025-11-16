import type { Store } from 'pinia'
import { useAuthStore } from '@/stores/auth'

function isAuthStore(s: Store): s is ReturnType<typeof useAuthStore> {
  return s.$id === 'auth' && 'init' in s
}

export const authPlugin = ({ store }: { store: Store }) => {
  if (isAuthStore(store)) {
    store.init()
  }
}
