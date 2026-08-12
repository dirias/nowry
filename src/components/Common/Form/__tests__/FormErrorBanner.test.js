/**
 * FE-S2 — FormErrorBanner (UX-CONTRACT §5.5, §8.6, §10).
 *
 * The banner replaces five different behaviours: two hand-rolled upgrade CTAs,
 * two bare error strings, and — on the visual card — a save failure that is
 * caught and only console.error'd, so it is completely invisible to the user.
 *
 * jsdom CANNOT verify that the banner is actually brought into view; it has no
 * layout and scrollIntoView is a stub. The call is asserted instead.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } })
}))

const FormErrorBanner = require('../FormErrorBanner').default

describe('FormErrorBanner', () => {
  it('announces itself — role=alert, so a save failure is not a purely visual event', () => {
    render(<FormErrorBanner detailText='title: Field required' />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders the translated title and the flattened API detail together', () => {
    render(<FormErrorBanner detailText='title: Field required' />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('form.saveErrorTitle')
    expect(alert).toHaveTextContent('title: Field required')
  })

  it('renders the title alone when the API gave nothing to quote', () => {
    render(<FormErrorBanner detailText='' />)
    expect(screen.getByRole('alert')).toHaveTextContent('form.saveErrorTitle')
  })

  it('accepts a different title key, so the 403 limit case is not mislabelled "Couldn\'t save"', () => {
    render(<FormErrorBanner titleKey='subscription.limitReached' detailText='Card limit reached' />)
    expect(screen.getByRole('alert')).toHaveTextContent('subscription.limitReached')
  })

  describe('action — the 403 upgrade path, unified', () => {
    it('renders no action button by default', () => {
      render(<FormErrorBanner detailText='boom' />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders a translated action and calls it', () => {
      const onClick = jest.fn()
      render(<FormErrorBanner detailText='limit' action={{ labelKey: 'subscription.upgrade', onClick }} />)
      const button = screen.getByRole('button', { name: 'subscription.upgrade' })
      button.click()
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('scroll into view', () => {
    it('scrolls itself into view on appearance, using block:"nearest"', () => {
      const scrollIntoView = jest.fn()
      window.HTMLElement.prototype.scrollIntoView = scrollIntoView
      render(<FormErrorBanner detailText='boom' />)
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }))
    })

    it('still forwards its ref to the caller — the sheet may want to scroll it too', () => {
      const ref = React.createRef()
      render(<FormErrorBanner ref={ref} detailText='boom' />)
      expect(ref.current).toBeInstanceOf(window.HTMLElement)
      expect(ref.current).toContainElement(screen.getByRole('alert'))
    })

    it('accepts a callback ref without throwing', () => {
      const ref = jest.fn()
      render(<FormErrorBanner ref={ref} detailText='boom' />)
      expect(ref).toHaveBeenCalledWith(expect.any(window.HTMLElement))
    })
  })

  it('has a display name, so it is not "ForwardRef" in a stack trace', () => {
    expect(FormErrorBanner.displayName).toBe('FormErrorBanner')
  })
})
