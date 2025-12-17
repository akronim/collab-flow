import { defineStore } from 'pinia'

export type NotificationType = `success` | `error` | `info`

interface NotificationState {
  message: string;
  type: NotificationType;
  visible: boolean;
  timeoutId?: number;
}

export const useNotificationStore = defineStore(`notification`, {
  state: (): NotificationState => ({
    message: ``,
    type: `info`,
    visible: false,
    timeoutId: undefined
  }),

  actions: {
    show(notification: {
      message: string;
      type: NotificationType;
      duration?: number;
    }) {
      this.message = notification.message
      this.type = notification.type
      this.visible = true

      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
      }

      this.timeoutId = setTimeout(() => {
        this.hide()
      }, notification.duration ?? 5000) as unknown as number
    },

    hide() {
      this.visible = false
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
        this.timeoutId = undefined
      }
    }
  }
})
