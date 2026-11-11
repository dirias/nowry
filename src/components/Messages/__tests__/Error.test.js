import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ErrorWindow from '../Error'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }))

describe('ErrorWindow (IMPORT-051)', () => {
  it('is an alert dialog named by its title and described by its message, with focus on its key', async () => {
    render(<ErrorWindow title='Error' error_msg='notes.md is not a file Nowry can import.' onClose={() => {}} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAccessibleName('Error')
    expect(dialog).toHaveAccessibleDescription('notes.md is not a file Nowry can import.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'common.close' })).toHaveFocus())
  })

  it('gives focus back to the control it was opened from when it closes', async () => {
    const ref = React.createRef()
    const Page = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <>
          <button ref={ref}>Add</button>
          {open && <ErrorWindow title='Error' error_msg='x' onClose={() => setOpen(false)} returnFocusRef={ref} />}
        </>
      )
    }
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await waitFor(() => expect(ref.current).toHaveFocus())
  })
})
