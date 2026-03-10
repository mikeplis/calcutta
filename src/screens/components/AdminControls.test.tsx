import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { AdminControls } from './AdminControls'

function renderControls(overrides?: Partial<Parameters<typeof AdminControls>[0]>) {
  const props = {
    onUndo: vi.fn(),
    onNewAuction: vi.fn(),
    canUndo: true,
    ...overrides,
  }
  const result = render(<AdminControls {...props} />)
  return { ...result, props }
}

describe('AdminControls', () => {
  it('disables Undo when canUndo is false', () => {
    const { getByText } = renderControls({ canUndo: false })
    expect(getByText('Undo')).toBeDisabled()
  })

  it('enables Undo when canUndo is true', () => {
    const { getByText, props } = renderControls({ canUndo: true })
    const btn = getByText('Undo')
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(props.onUndo).toHaveBeenCalledOnce()
  })

  describe('New Auction confirmation', () => {
    it('shows confirmation on click, calls onNewAuction on confirm', () => {
      const { getByText, queryByText, props } = renderControls()
      fireEvent.click(getByText('New Auction'))
      expect(getByText('Yes, start over')).toBeInTheDocument()

      fireEvent.click(getByText('Yes, start over'))
      expect(props.onNewAuction).toHaveBeenCalledOnce()
      expect(queryByText('Yes, start over')).not.toBeInTheDocument()
    })

    it('hides confirmation on Cancel', () => {
      const { getByText, queryByText } = renderControls()
      fireEvent.click(getByText('New Auction'))
      fireEvent.click(getByText('Cancel'))
      expect(queryByText('Yes, start over')).not.toBeInTheDocument()
      expect(getByText('New Auction')).toBeInTheDocument()
    })
  })
})
