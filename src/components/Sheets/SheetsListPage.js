import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Container from '@mui/joy/Container'
import Box from '@mui/joy/Box'
import Stack from '@mui/joy/Stack'
import Typography from '@mui/joy/Typography'
import Input from '@mui/joy/Input'
import Button from '@mui/joy/Button'
import IconButton from '@mui/joy/IconButton'
import Card from '@mui/joy/Card'
import Grid from '@mui/joy/Grid'
import Chip from '@mui/joy/Chip'
import Alert from '@mui/joy/Alert'
import Skeleton from '@mui/joy/Skeleton'
import Modal from '@mui/joy/Modal'
import ModalDialog from '@mui/joy/ModalDialog'
import DialogTitle from '@mui/joy/DialogTitle'
import DialogContent from '@mui/joy/DialogContent'
import DialogActions from '@mui/joy/DialogActions'
import Menu from '@mui/joy/Menu'
import MenuItem from '@mui/joy/MenuItem'
import Dropdown from '@mui/joy/Dropdown'
import MenuButton from '@mui/joy/MenuButton'
import AddIcon from '@mui/icons-material/Add'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded'
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import sheetsService from '../../api/services/sheets.service'
import CreateSheetModal from './CreateSheetModal'

export default function SheetsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState(localStorage.getItem('sheets_view_mode') || 'grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingSheet, setDeletingSheet] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchSheets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await sheetsService.listSheets()
      setSheets(data)
    } catch (err) {
      setError(t('sheets.list.errorFetch'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSheets()
  }, [fetchSheets])

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode)
    localStorage.setItem('sheets_view_mode', mode)
  }, [])

  const filteredSheets = useMemo(() => {
    if (!searchTerm.trim()) return sheets
    const lower = searchTerm.toLowerCase()
    return sheets.filter((s) => s.title?.toLowerCase().includes(lower))
  }, [sheets, searchTerm])

  const handleDelete = useCallback(async () => {
    if (!deletingSheet) return
    setDeleteLoading(true)
    try {
      await sheetsService.deleteSheet(deletingSheet._id || deletingSheet.id)
      setDeletingSheet(null)
      await fetchSheets()
    } catch {
      setDeleteLoading(false)
    } finally {
      setDeleteLoading(false)
    }
  }, [deletingSheet, fetchSheets])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Loading skeleton
  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
          <Skeleton variant='text' level='h2' width={200} />
          <Skeleton variant='rectangular' width={120} height={36} sx={{ borderRadius: 'sm' }} />
        </Stack>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} xs={6} sm={4} md={3}>
              <Skeleton variant='rectangular' height={120} sx={{ borderRadius: 'md' }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    )
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Alert color='danger' variant='soft' sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant='outlined' onClick={fetchSheets}>
          {t('common.retry')}
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
        <Typography level='h2' fontWeight={700}>
          {t('sheets.list.title')}
        </Typography>
        <Button
          startDecorator={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          aria-label={t('sheets.list.new')}
        >
          {t('sheets.list.new')}
        </Button>
      </Stack>

      {/* Empty state */}
      {sheets.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            px: 4,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 'lg',
            bgcolor: 'background.surface'
          }}
        >
          <TableChartRoundedIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
          <Typography level='title-md' fontWeight={600} sx={{ mb: 1 }}>
            {t('sheets.list.emptyTitle')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 3, maxWidth: 400, mx: 'auto' }}>
            {t('sheets.list.emptySubtitle')}
          </Typography>
          <Button startDecorator={<AddIcon />} onClick={() => setShowCreateModal(true)}>
            {t('sheets.list.new')}
          </Button>
        </Box>
      )}

      {/* Toolbar — search + view toggle */}
      {sheets.length > 0 && (
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 2 }}>
          <Input
            size='sm'
            startDecorator={<SearchRoundedIcon />}
            placeholder={t('sheets.list.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={t('sheets.list.search')}
            sx={{ maxWidth: 280 }}
          />
          <Box sx={{ flex: 1 }} />
          <IconButton
            size='sm'
            variant={viewMode === 'grid' ? 'solid' : 'plain'}
            color={viewMode === 'grid' ? 'primary' : 'neutral'}
            onClick={() => handleViewChange('grid')}
            aria-label={t('sheets.list.gridView')}
          >
            <GridViewRoundedIcon fontSize='small' />
          </IconButton>
          <IconButton
            size='sm'
            variant={viewMode === 'list' ? 'solid' : 'plain'}
            color={viewMode === 'list' ? 'primary' : 'neutral'}
            onClick={() => handleViewChange('list')}
            aria-label={t('sheets.list.listView')}
          >
            <ViewListRoundedIcon fontSize='small' />
          </IconButton>
        </Stack>
      )}

      {/* No search results */}
      {sheets.length > 0 && filteredSheets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography level='body-md' sx={{ color: 'text.secondary' }}>
            {t('sheets.list.noResults', { term: searchTerm })}
          </Typography>
        </Box>
      )}

      {/* Grid view */}
      {filteredSheets.length > 0 && viewMode === 'grid' && (
        <Grid container spacing={2}>
          {filteredSheets.map((sheet) => {
            const sheetId = sheet._id || sheet.id
            return (
              <Grid key={sheetId} xs={6} sm={4} md={3}>
                <Card
                  variant='outlined'
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: 'md' },
                    position: 'relative'
                  }}
                  onClick={() => navigate(`/sheets/${sheetId}`)}
                >
                  <Stack spacing={0.5}>
                    <Stack direction='row' alignItems='flex-start' justifyContent='space-between'>
                      <Typography level='title-sm' fontWeight={600} sx={{ flex: 1, mr: 1 }} noWrap>
                        {sheet.title || t('sheets.untitled')}
                      </Typography>
                      <Dropdown>
                        <MenuButton
                          slots={{ root: IconButton }}
                          slotProps={{
                            root: {
                              size: 'sm',
                              variant: 'plain',
                              color: 'neutral',
                              onClick: (e) => e.stopPropagation(),
                              'aria-label': t('common.moreActions')
                            }
                          }}
                        >
                          <MoreVertIcon fontSize='small' />
                        </MenuButton>
                        <Menu>
                          <MenuItem
                            color='danger'
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingSheet(sheet)
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize='small' />
                            {t('common.delete')}
                          </MenuItem>
                        </Menu>
                      </Dropdown>
                    </Stack>
                    {sheet.column_labels && sheet.column_labels.length > 0 && (
                      <Chip size='sm' variant='soft' color='neutral'>
                        {sheet.column_labels[0]}
                        {sheet.column_labels.length > 1 ? ` +${sheet.column_labels.length - 1}` : ''}
                      </Chip>
                    )}
                    <Typography level='body-xs' sx={{ color: 'text.tertiary', mt: 'auto' }}>
                      {formatDate(sheet.updated_at)}
                    </Typography>
                  </Stack>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* List view */}
      {filteredSheets.length > 0 && viewMode === 'list' && (
        <Stack spacing={0}>
          {filteredSheets.map((sheet) => {
            const sheetId = sheet._id || sheet.id
            return (
              <Box
                key={sheetId}
                onClick={() => navigate(`/sheets/${sheetId}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'background.level1' }
                }}
              >
                <TableChartRoundedIcon sx={{ fontSize: 20, color: 'text.tertiary', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level='title-sm' fontWeight={600} noWrap>
                    {sheet.title || t('sheets.untitled')}
                  </Typography>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                    {formatDate(sheet.updated_at)}
                  </Typography>
                </Box>
                {sheet.column_labels && sheet.column_labels.length > 0 && (
                  <Chip size='sm' variant='soft' color='neutral' sx={{ display: { xs: 'none', sm: 'flex' } }}>
                    {sheet.column_labels.length} {t('sheets.list.columns')}
                  </Chip>
                )}
                <Dropdown>
                  <MenuButton
                    slots={{ root: IconButton }}
                    slotProps={{
                      root: {
                        size: 'sm',
                        variant: 'plain',
                        color: 'neutral',
                        onClick: (e) => e.stopPropagation(),
                        'aria-label': t('common.moreActions')
                      }
                    }}
                  >
                    <MoreVertIcon fontSize='small' />
                  </MenuButton>
                  <Menu>
                    <MenuItem
                      color='danger'
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingSheet(sheet)
                      }}
                    >
                      <DeleteOutlineRoundedIcon fontSize='small' />
                      {t('common.delete')}
                    </MenuItem>
                  </Menu>
                </Dropdown>
              </Box>
            )
          })}
        </Stack>
      )}

      {/* Create sheet modal */}
      <CreateSheetModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Delete confirmation modal */}
      <Modal open={!!deletingSheet} onClose={() => !deleteLoading && setDeletingSheet(null)}>
        <ModalDialog variant='outlined' role='alertdialog'>
          <DialogTitle>{t('sheets.delete.title')}</DialogTitle>
          <DialogContent>
            <Typography level='body-md' sx={{ color: 'text.secondary' }}>
              {t('sheets.delete.confirm', { title: deletingSheet?.title || t('sheets.untitled') })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              variant='plain'
              color='neutral'
              onClick={() => setDeletingSheet(null)}
              disabled={deleteLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button color='danger' onClick={handleDelete} loading={deleteLoading}>
              {t('common.delete')}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Container>
  )
}
