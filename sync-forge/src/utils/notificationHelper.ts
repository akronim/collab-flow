import { useNotificationStore } from '@/stores/notification'
import { getErrorMessage } from '@/utils/errorMessage'
import Logger from '@/utils/logger'

export const showErrorNotification = (error: unknown, fallbackMessage: string): void => {
  const notificationStore = useNotificationStore()
  const message = getErrorMessage(error, fallbackMessage)
  Logger.apiError(error, { message: fallbackMessage })
  notificationStore.show({ message, type: `error` })
}

export const showSuccessNotification = (message: string): void => {
  const notificationStore = useNotificationStore()
  notificationStore.show({ message, type: `success` })
}
