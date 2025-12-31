import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Sheet,
  Stack,
  Select,
  Option,
  Chip,
  Table,
  Button,
  Modal,
  ModalDialog,
  ModalClose,
  Textarea,
  CircularProgress,
  Alert
} from '@mui/joy'
import { Bug, Filter, TrendingUp } from 'lucide-react'
import { bugsService } from '../../api/services/bugs.service'

export default function BugDashboard() {
  const [bugs, setBugs] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: ''
  })
  const [selectedBug, setSelectedBug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [filters])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [bugsData, statsData] = await Promise.all([bugsService.getAllBugs(filters), bugsService.getBugStats()])
      setBugs(bugsData)
      setStats(statsData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load bug data')
      console.error('Failed to fetch bug dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await bugsService.updateBugStatus(bugId, { status: newStatus })
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 3 }}>
        <Bug size={32} color='#f97316' />
        <Typography level='h2'>Bug Dashboard</Typography>
        <Chip size='sm' color='warning'>
          Developer
        </Chip>
      </Stack>

      {error && (
        <Alert color='danger' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Stack direction='row' spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <StatCard label='Total Bugs' value={stats.total} color='neutral' icon={<Bug size={20} />} />
          <StatCard label='Open' value={stats.by_status.open} color='warning' />
          <StatCard label='In Progress' value={stats.by_status.in_progress} color='primary' />
          <StatCard label='Resolved' value={stats.by_status.resolved} color='success' />
          <StatCard label='Critical' value={stats.by_severity.critical} color='danger' />
          <StatCard label='High' value={stats.by_severity.high} color='warning' />
        </Stack>
      )}

      {/* Filters */}
      <Sheet variant='outlined' sx={{ p: 2, borderRadius: 'sm', mb: 2 }}>
        <Stack direction='row' alignItems='center' spacing={2}>
          <Filter size={20} />
          <Select
            placeholder='All Status'
            value={filters.status}
            onChange={(e, value) => setFilters({ ...filters, status: value || '' })}
            sx={{ minWidth: 150 }}
          >
            <Option value=''>All Status</Option>
            <Option value='open'>Open</Option>
            <Option value='in-progress'>In Progress</Option>
            <Option value='resolved'>Resolved</Option>
            <Option value='closed'>Closed</Option>
          </Select>

          <Select
            placeholder='All Severity'
            value={filters.severity}
            onChange={(e, value) => setFilters({ ...filters, severity: value || '' })}
            sx={{ minWidth: 150 }}
          >
            <Option value=''>All Severity</Option>
            <Option value='critical'>Critical</Option>
            <Option value='high'>High</Option>
            <Option value='medium'>Medium</Option>
            <Option value='low'>Low</Option>
          </Select>

          <Select
            placeholder='All Categories'
            value={filters.category}
            onChange={(e, value) => setFilters({ ...filters, category: value || '' })}
            sx={{ minWidth: 150 }}
          >
            <Option value=''>All Categories</Option>
            <Option value='ui'>UI/Design</Option>
            <Option value='functionality'>Functionality</Option>
            <Option value='performance'>Performance</Option>
            <Option value='other'>Other</Option>
          </Select>

          {(filters.status || filters.severity || filters.category) && (
            <Button variant='outlined' color='neutral' onClick={() => setFilters({ status: '', severity: '', category: '' })}>
              Clear Filters
            </Button>
          )}
        </Stack>
      </Sheet>

      {/* Bugs Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : bugs.length === 0 ? (
        <Sheet variant='soft' sx={{ p: 4, textAlign: 'center', borderRadius: 'sm' }}>
          <Bug size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
          <Typography level='body-lg'>No bugs found</Typography>
          <Typography level='body-sm' sx={{ color: 'neutral.500' }}>
            Try adjusting your filters or wait for users to report bugs
          </Typography>
        </Sheet>
      ) : (
        <Sheet variant='outlined' sx={{ borderRadius: 'sm', overflow: 'auto' }}>
          <Table stickyHeader>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Title</th>
                <th style={{ width: '10%' }}>Severity</th>
                <th style={{ width: '12%' }}>Category</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '13%' }}>Date</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr key={bug._id}>
                  <td>
                    <Typography
                      level='body-sm'
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 500,
                        '&:hover': { textDecoration: 'underline', color: 'primary.500' }
                      }}
                      onClick={() => setSelectedBug(bug)}
                    >
                      {bug.title}
                    </Typography>
                    <Typography level='body-xs' sx={{ color: 'neutral.500', mt: 0.5 }}>
                      {bug.description.substring(0, 80)}
                      {bug.description.length > 80 && '...'}
                    </Typography>
                  </td>
                  <td>
                    <Chip size='sm' color={getSeverityColor(bug.severity)}>
                      {bug.severity}
                    </Chip>
                  </td>
                  <td>
                    <Typography level='body-sm'>{bug.category}</Typography>
                  </td>
                  <td>
                    <Select size='sm' value={bug.status} onChange={(e, value) => handleStatusChange(bug._id, value)} sx={{ minWidth: 130 }}>
                      <Option value='open'>Open</Option>
                      <Option value='in-progress'>In Progress</Option>
                      <Option value='resolved'>Resolved</Option>
                      <Option value='closed'>Closed</Option>
                    </Select>
                  </td>
                  <td>
                    <Typography level='body-sm'>{new Date(bug.created_at).toLocaleDateString()}</Typography>
                  </td>
                  <td>
                    <Button size='sm' variant='outlined' onClick={() => setSelectedBug(bug)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}

      {/* Bug Detail Modal */}
      {selectedBug && (
        <BugDetailModal bug={selectedBug} onClose={() => setSelectedBug(null)} onStatusChange={handleStatusChange} onRefresh={fetchData} />
      )}
    </Box>
  )
}

// Stat Card Component
function StatCard({ label, value, color, icon }) {
  return (
    <Sheet variant='soft' color={color} sx={{ p: 2, borderRadius: 'sm', minWidth: 140, flex: 1 }}>
      <Stack direction='row' alignItems='center' spacing={1}>
        {icon}
        <Typography level='body-sm'>{label}</Typography>
      </Stack>
      <Typography level='h3' sx={{ mt: 1 }}>
        {value}
      </Typography>
    </Sheet>
  )
}

// Bug Detail Modal Component
function BugDetailModal({ bug, onClose, onStatusChange, onRefresh }) {
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')

  const handleUpdateWithNotes = async () => {
    setUpdating(true)
    try {
      await bugsService.updateBugStatus(bug._id, {
        status: bug.status,
        notes: notes
      })
      onRefresh()
      onClose()
    } catch (error) {
      console.error('Failed to update notes:', error)
    } finally {
      setUpdating(false)
    }
  }

  const [selectedScreenshot, setSelectedScreenshot] = useState(null)

  return (
    <>
      <Modal open={true} onClose={onClose}>
        <ModalDialog sx={{ width: '95vw', maxWidth: 1100, maxHeight: '90vh', overflow: 'auto' }}>
          <ModalClose />

          <Stack spacing={2}>
            {/* Header */}
            <Stack direction='row' spacing={2} alignItems='flex-start'>
              <div style={{ flex: 1 }}>
                <Typography level='h4'>{bug.title}</Typography>
                <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                  <Chip size='sm' color={getSeverityColor(bug.severity)}>
                    {bug.severity}
                  </Chip>
                  <Chip size='sm' variant='outlined'>
                    {bug.category}
                  </Chip>
                  <Chip size='sm' color={getStatusColor(bug.status)}>
                    {bug.status}
                  </Chip>
                </Stack>
              </div>
            </Stack>

            {/* Description */}
            <Box>
              <Typography level='title-sm' sx={{ mb: 1 }}>
                Description
              </Typography>
              <Typography level='body-sm'>{bug.description}</Typography>
            </Box>

            {/* Steps to Reproduce */}
            {bug.steps_to_reproduce && (
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  Steps to Reproduce
                </Typography>
                <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap' }}>
                  {bug.steps_to_reproduce}
                </Typography>
              </Box>
            )}

            {/* Expected vs Actual */}
            {(bug.expected_behavior || bug.actual_behavior) && (
              <Stack direction='row' spacing={2}>
                {bug.expected_behavior && (
                  <Box sx={{ flex: 1 }}>
                    <Typography level='title-sm' sx={{ mb: 1 }}>
                      Expected Behavior
                    </Typography>
                    <Typography level='body-sm'>{bug.expected_behavior}</Typography>
                  </Box>
                )}
                {bug.actual_behavior && (
                  <Box sx={{ flex: 1 }}>
                    <Typography level='title-sm' sx={{ mb: 1 }}>
                      Actual Behavior
                    </Typography>
                    <Typography level='body-sm'>{bug.actual_behavior}</Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* Browser Info */}
            {bug.browser_info && (
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  Browser Information
                </Typography>
                <Typography level='body-sm'>
                  {bug.browser_info.name} {bug.browser_info.version} • {bug.browser_info.os} • {bug.browser_info.screen_resolution}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'neutral.500', mt: 0.5 }}>
                  URL: {bug.url}
                </Typography>
              </Box>
            )}

            {/* Screenshots */}
            {bug.screenshots && bug.screenshots.length > 0 && (
              <Box>
                <Typography level='title-sm' sx={{ mb: 1 }}>
                  Screenshots ({bug.screenshots.length})
                </Typography>
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {bug.screenshots.map((screenshot, idx) => (
                    <img
                      key={idx}
                      src={screenshot.data}
                      alt={screenshot.filename}
                      style={{
                        maxWidth: 200,
                        maxHeight: 200,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' }
                      }}
                      onClick={() => setSelectedScreenshot(screenshot)}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Dev Notes */}
            <Box>
              <Typography level='title-sm' sx={{ mb: 1 }}>
                Developer Notes
              </Typography>
              <Textarea minRows={3} placeholder='Add notes about this bug...' value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Box>

            {/* Metadata */}
            <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
              <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                Created: {new Date(bug.created_at).toLocaleString()} • Updated: {new Date(bug.updated_at).toLocaleString()}
                {bug.resolved_at && ` • Resolved: ${new Date(bug.resolved_at).toLocaleString()}`}
              </Typography>
            </Box>

            {/* Actions */}
            <Stack direction='row' spacing={2}>
              <Button variant='outlined' color='neutral' onClick={onClose} fullWidth>
                Close
              </Button>
              <Button onClick={handleUpdateWithNotes} loading={updating} disabled={!notes} fullWidth>
                Save Notes
              </Button>
            </Stack>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Lightbox Modal */}
      <Modal open={!!selectedScreenshot} onClose={() => setSelectedScreenshot(null)}>
        <ModalDialog
          layout='center'
          sx={{
            bgcolor: 'transparent',
            boxShadow: 'none',
            p: 0,
            border: 'none',
            maxWidth: '98vw',
            maxHeight: '98vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            outline: 'none'
          }}
        >
          {/* Close button for lightbox */}
          <ModalClose
            variant='solid'
            color='neutral'
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 1000,
              borderRadius: '50%'
            }}
            onClick={() => setSelectedScreenshot(null)}
          />

          {selectedScreenshot && (
            <img
              src={selectedScreenshot.data}
              alt='Full view'
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </ModalDialog>
      </Modal>
    </>
  )
}

// Helper functions
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'primary'
    default:
      return 'neutral'
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'open':
      return 'warning'
    case 'in-progress':
      return 'primary'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'neutral'
    default:
      return 'neutral'
  }
}
