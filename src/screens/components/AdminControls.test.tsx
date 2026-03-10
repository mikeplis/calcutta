import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { AdminControls } from './AdminControls'

function renderControls(overrides?: Partial<Parameters<typeof AdminControls>[0]>) {
  const props = {
    paused: false,
    onUndo: vi.fn(),
    onForceAdvance: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
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

  describe('Skip Lot confirmation', () => {
    it('shows confirmation on click, calls onForceAdvance on confirm', () => {
      const { getByText, queryByText, props } = renderControls()
      fireEvent.click(getByText('Skip Lot'))
      expect(getByText('Are you sure?')).toBeInTheDocument()
      expect(getByText('Yes, skip')).toBeInTheDocument()

      fireEvent.click(getByText('Yes, skip'))
      expect(props.onForceAdvance).toHaveBeenCalledOnce()
      // Confirmation should be dismissed
      expect(queryByText('Are you sure?')).not.toBeInTheDocument()
    })

    it('hides confirmation on Cancel', () => {
      const { getByText, queryByText } = renderControls()
      fireEvent.click(getByText('Skip Lot'))
      fireEvent.click(getByText('Cancel'))
      expect(queryByText('Are you sure?')).not.toBeInTheDocument()
      expect(getByText('Skip Lot')).toBeInTheDocument()
    })
  })

  describe('New Auction confirmation', () => {
    it('shows confirmation on click, calls onNewAuction on confirm', () => {
      const { getByText, queryByText, props } = renderControls()
      fireEvent.click(getByText('New Auction'))
      // There may be two "Are you sure?" if skip is also confirming, but here only new auction is
      expect(getByText('Yes, start over')).toBeInTheDocument()

      fireEvent.click(getByText('Yes, start over'))
      expect(props.onNewAuction).toHaveBeenCalledOnce()
      expect(queryByText('Yes, start over')).not.toBeInTheDocument()
    })

    it('hides confirmation on Cancel', () => {
      const { getByText, queryByText } = renderControls()
      fireEvent.click(getByText('New Auction'))
      // Click the Cancel button (there's only one since Skip Lot isn't confirming)
      fireEvent.click(getByText('Cancel'))
      expect(queryByText('Yes, start over')).not.toBeInTheDocument()
      expect(getByText('New Auction')).toBeInTheDocument()
    })
  })

  // Pause/Resume tests removed — buttons temporarily hidden
})
