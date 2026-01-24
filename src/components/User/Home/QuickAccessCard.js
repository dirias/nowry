import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Stack, Sheet } from '@mui/joy'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Layers, Target, Newspaper, ListTodo, Zap } from 'lucide-react'

/**
 * QuickAccessCard - Fast navigation to main features
 *
 * Following DESIGN_GUIDELINES.md:
 * - Minimal: Icons + labels only
 * - Actionable: One click to any section
 * - Clean: Grid layout, no clutter
 */
const QuickAccessCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const quickActions = [
    {
      icon: Layers,
      label: t('dashboard.quickAccess.studyCenter', 'Study Center'),
      path: '/study',
      color: 'primary'
    },
    {
      icon: BookOpen,
      label: t('dashboard.quickAccess.books', 'Books'),
      path: '/books',
      color: 'success'
    },
    {
      icon: Target,
      label: t('dashboard.quickAccess.annualPlanning', 'Annual Planning'),
      path: '/annual-planning',
      color: 'warning'
    },
    {
      icon: Newspaper,
      label: t('dashboard.quickAccess.newsFeed', 'News Feed'),
      path: '/news',
      color: 'neutral'
    },
    {
      icon: ListTodo,
      label: t('dashboard.quickAccess.taskManager', 'Task Manager'),
      path: '/home',
      color: 'primary'
    },
    {
      icon: Zap,
      label: t('dashboard.quickAccess.bugReport', 'Report Bug'),
      path: '/report-bug',
      color: 'danger'
    }
  ]

  return (
    <Sheet
      variant='outlined'
      sx={{
        p: 3,
        borderRadius: 'lg',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 'md',
          transform: 'translateY(-2px)'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Zap size={24} strokeWidth={2} />
        <Typography level='title-lg' fontWeight={600}>
          {t('dashboard.quickAccess.title', 'Quick Access')}
        </Typography>
      </Box>

      {/* Actions Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          flex: 1
        }}
      >
        {quickActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Box
              key={index}
              onClick={() => navigate(action.path)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                p: 2,
                borderRadius: 'sm',
                bgcolor: 'background.level1',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: `${action.color}.softBg`,
                  transform: 'scale(1.05)',
                  boxShadow: 'sm'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 'md',
                  bgcolor: `${action.color}.softBg`,
                  color: `${action.color}.solidColor`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: `${action.color}.solidBg`
                  }
                }}
              >
                <Icon size={24} strokeWidth={2} />
              </Box>
              <Typography level='body-xs' textAlign='center' fontWeight={600} sx={{ color: 'text.primary' }}>
                {action.label}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Sheet>
  )
}

export default QuickAccessCard
