import type { PiniaPluginContext, Store } from 'pinia'
import { useAuthStore } from '@/stores'

function isAuthStore(store: Store): store is ReturnType<typeof useAuthStore> {
  return store.$id === `auth` && `fetchUser` in store
}

export const authPlugin = async ({ store }: PiniaPluginContext): Promise<void> => {
  if (isAuthStore(store)) {
    await store.fetchUser()
  }
}
