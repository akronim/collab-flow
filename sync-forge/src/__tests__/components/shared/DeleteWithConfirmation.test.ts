import { describe, it, expect } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import DeleteWithConfirmation from '@/components/shared/DeleteWithConfirmation.vue'

describe(`DeleteWithConfirmation.vue`, () => {
  it(`correctly sets itemCodeToRemove when delete button is clicked - 1 (number)`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 1
      }
    })

    await wrapper.find(`[data-testid="delete-confirm-button-1"]`).trigger(`click`)

    expect(wrapper.vm.itemCodeToRemove).toBe(1)
  })

  it(`correctly sets itemCodeToRemove when delete button is clicked - 2 (string)`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: `foo`
      }
    })

    await wrapper.find(`[data-testid="delete-confirm-button-foo"]`).trigger(`click`)

    expect(wrapper.vm.itemCodeToRemove).toBe(`foo`)
  })

  it(`emits "delete" event with correct code when delete button is clicked - 1 (number)`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 13
      }
    })

    wrapper.vm.itemCodeToRemove = 13
    await flushPromises()

    await wrapper.find(`[data-testid="delete-button-13"]`).trigger(`click`)

    expect(wrapper.emitted(`delete`)?.[0]).toStrictEqual([13])
  })

  it(`emits "delete" event with correct code when delete button is clicked - 2 (string)`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: `foo`
      }
    })

    wrapper.vm.itemCodeToRemove = `foo`
    await flushPromises()

    await wrapper.find(`[data-testid="delete-button-foo"]`).trigger(`click`)

    expect(wrapper.emitted(`delete`)?.[0]).toStrictEqual([`foo`])
  })

  it(`hides delete button initially`, () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 1
      }
    })

    const deleteButton = wrapper.find(`[data-testid="delete-button-1"]`)

    expect(deleteButton.exists()).toBe(true)
    expect(deleteButton.attributes(`style`)).toContain(`display: none;`)
  })

  it(`shows delete button when requireConfirmation is called`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 1
      }
    })

    wrapper.vm.requireConfirmation()
    await flushPromises()

    const deleteButton = wrapper.find(`[data-testid="delete-button-1"]`)

    expect(deleteButton.exists()).toBe(true)
    expect(deleteButton.attributes(`style`)).toBeUndefined()
  })

  it(`resets itemCodeToRemove when mouse leaves delete button`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 1
      }
    })

    wrapper.vm.requireConfirmation()
    await flushPromises()

    await wrapper.find(`[data-testid="delete-button-1"]`).trigger(`mouseleave`)

    expect(wrapper.vm.itemCodeToRemove).toBeNull()
  })

  it(`does not emit "delete" event when delete button is not clicked`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 1
      }
    })

    await wrapper.find(`[data-testid="delete-confirm-button-1"]`).trigger(`click`)

    expect(wrapper.emitted(`delete`)).toBeUndefined()
  })

  it(`emits "delete" event when confirmation button is clicked`, async () => {
    const wrapper = shallowMount(DeleteWithConfirmation, {
      props: {
        itemCode: 4
      }
    })

    await wrapper.find(`[data-testid="delete-confirm-button-4"]`).trigger(`click`)
    await wrapper.find(`[data-testid="delete-button-4"]`).trigger(`click`)

    expect(wrapper.emitted(`delete`)?.[0]).toStrictEqual([4])
  })
})
