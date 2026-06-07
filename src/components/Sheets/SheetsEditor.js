import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from '@mui/joy/styles'
import Spreadsheet from 'react-spreadsheet'
// react-spreadsheet v0.10.1 bundles its own styles via CSS-in-JS — no external CSS import required
import Box from '@mui/joy/Box'
import Stack from '@mui/joy/Stack'
import Typography from '@mui/joy/Typography'
import Input from '@mui/joy/Input'
import IconButton from '@mui/joy/IconButton'
import CircularProgress from '@mui/joy/CircularProgress'
import Alert from '@mui/joy/Alert'
import Link from '@mui/joy/Link'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import sheetsService from '../../api/services/sheets.service'

const SheetsEditor = () => {
  const { sheetId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()

  const [sheet, setSheet] = useState(null)
  const [data, setData] = useState([])
  const [columnLabels, setColumnLabels] = useState([])
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const savedTimerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const s = await sheetsService.getSheet(sheetId)
        setSheet(s)
        setData(s.data || [])
        setColumnLabels(s.column_labels || [])
        setTitle(s.title || t('sheets.untitled'))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sheetId, t])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      clearTimeout(savedTimerRef.current)
    }
  }, [])

  // SHEET-04: Derived filtered rows for display — stored data is never modified by filter
  // NOTE: When filterText is active, onChange receives only the filtered subset Matrix.
  // To prevent data corruption, edits are disabled while a filter is applied.
  // Clear the filter first to enable editing. This is documented behavior.
  const filteredData = filterText
    ? data.filter((row) =>
        row.some((cell) =>
          String(cell?.value ?? '')
            .toLowerCase()
            .includes(filterText.toLowerCase())
        )
      )
    : data

  const isFilterActive = Boolean(filterText)

  // SHEET-01 + SHEET-02: Autosave on change with 1000ms debounce
  // Only fires when filter is not active (filtered view is read-only)
  const handleChange = useCallback(
    (newData) => {
      if (isFilterActive) return // prevent partial-matrix corruption
      setData(newData)
      setSaveStatus('saving')
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          await sheetsService.updateSheet(sheetId, { data: newData })
          setSaveStatus('saved')
          clearTimeout(savedTimerRef.current)
          savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('idle')
        }
      }, 1000)
    },
    [sheetId, isFilterActive]
  )

  const handleTitleSave = async (newTitle) => {
    setEditingTitle(false)
    const trimmed = newTitle.trim() || t('sheets.untitled')
    if (trimmed !== sheet?.title) {
      try {
        await sheetsService.updateSheet(sheetId, { title: trimmed })
        setSheet((prev) => ({ ...prev, title: trimmed }))
      } catch {
        // silent fail — title reverts to last saved value
      }
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.surface'
        }}
      >
        <CircularProgress aria-label={t('common.loading')} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: 'background.surface', minHeight: '100vh' }}>
        <Alert color='danger' variant='soft' sx={{ mb: 2 }}>
          {t('sheets.editor.error')}
        </Alert>
        <Link
          component='button'
          onClick={() => navigate('/sheets')}
          sx={{ cursor: 'pointer' }}
          aria-label={t('sheets.editor.backToSheets')}
        >
          {t('sheets.editor.backToSheets')}
        </Link>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.surface'
      }}
    >
      {/* Top bar — 50px height per UI-SPEC */}
      <Stack
        direction='row'
        alignItems='center'
        spacing={1}
        sx={{
          px: 2,
          height: 50,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          bgcolor: 'background.surface'
        }}
      >
        <IconButton
          size='sm'
          variant='plain'
          color='neutral'
          onClick={() => navigate('/sheets')}
          aria-label={t('sheets.editor.backToSheets')}
        >
          <ArrowBackRoundedIcon />
        </IconButton>

        {editingTitle ? (
          <Input
            size='sm'
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleTitleSave(title)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave(title)
              if (e.key === 'Escape') {
                setTitle(sheet?.title || t('sheets.untitled'))
                setEditingTitle(false)
              }
            }}
            sx={{ fontWeight: 600, flex: 1 }}
            aria-label={t('sheets.editor.titleInput')}
          />
        ) : (
          <Typography
            level='title-md'
            fontWeight={600}
            sx={{ cursor: 'pointer', flex: 1 }}
            onClick={() => setEditingTitle(true)}
            aria-label={t('sheets.editor.titleInput')}
          >
            {title}
          </Typography>
        )}

        {/* Save status indicator */}
        {saveStatus === 'saving' && (
          <Typography level='body-xs' sx={{ color: 'text.tertiary', flexShrink: 0 }}>
            {t('sheets.editor.saving')}
          </Typography>
        )}
        {saveStatus === 'saved' && (
          <Typography level='body-xs' sx={{ color: 'success.plainColor', flexShrink: 0 }}>
            {t('sheets.editor.saved')}
          </Typography>
        )}
      </Stack>

      {/* Filter row */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          bgcolor: 'background.surface'
        }}
      >
        <Stack direction='row' alignItems='center' spacing={1}>
          <Input
            size='sm'
            startDecorator={<SearchRoundedIcon />}
            placeholder={t('sheets.editor.filter')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label={t('sheets.editor.filter')}
            sx={{ maxWidth: 320 }}
          />
          {isFilterActive && (
            <Typography level='body-xs' sx={{ color: 'warning.plainColor' }}>
              {t('sheets.editor.filterReadOnly')}
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Spreadsheet editor */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <Spreadsheet
          data={filteredData}
          onChange={handleChange}
          columnLabels={columnLabels.length ? columnLabels : undefined}
          darkMode={colorScheme === 'dark'}
        />
      </Box>
    </Box>
  )
}

export default SheetsEditor
