import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { showErrorNotification, showSuccessNotification } from '@/utils/notificationHelper'
import { useNotificationStore } from '@/stores/notification'
import { NotificationMessages } from '@/constants/notificationMessages'
import Logger from '@/utils/logger'

describe(`showErrorNotification`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(Logger, `apiError`).mockImplementation(() => { /* noop */ })
  })

  it(`shows notification with extracted error message`, () => {
    const store = useNotificationStore()
    const showSpy = vi.spyOn(store, `show`)
    const error = new Error(NotificationMessages.SOMETHING_WENT_WRONG)

    showErrorNotification(error, NotificationMessages.UNEXPECTED_ERROR)

    expect(showSpy).toHaveBeenCalledWith({
      message: NotificationMessages.SOMETHING_WENT_WRONG,
      type: `error`
    })
  })

  it(`shows notification with fallback message when error has no message`, () => {
    const store = useNotificationStore()
    const showSpy = vi.spyOn(store, `show`)

    showErrorNotification(null, NotificationMessages.SAVE_FAILED)

    expect(showSpy).toHaveBeenCalledWith({
      message: NotificationMessages.SAVE_FAILED,
      type: `error`
    })
  })

  it(`logs the error via Logger.apiError`, () => {
    const error = new Error(NotificationMessages.SOMETHING_WENT_WRONG)

    showErrorNotification(error, NotificationMessages.SAVE_FAILED)

    expect(Logger.apiError).toHaveBeenCalledWith(error, { message: NotificationMessages.SAVE_FAILED })
  })
})

describe(`showSuccessNotification`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it(`shows success notification with provided message`, () => {
    const store = useNotificationStore()
    const showSpy = vi.spyOn(store, `show`)

    showSuccessNotification(NotificationMessages.CREATED)

    expect(showSpy).toHaveBeenCalledWith({
      message: NotificationMessages.CREATED,
      type: `success`
    })
  })
})
