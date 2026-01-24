import React from 'react'
import { Container, Typography, Box } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import NewsCarousel from '../components/User/Home/NewsCarousel'

/**
 * News Page - Dedicated page for news articles
 *
 * Following DESIGN_GUIDELINES.md:
 * - Content-first: News is now its own destination
 * - Decluttered: Removed from homepage to reduce noise
 */
const News = () => {
  const { t } = useTranslation()

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level='h2' fontWeight={600} sx={{ mb: 0.5 }}>
          {t('news.title', 'Latest News')}
        </Typography>
        <Typography level='body-md' sx={{ color: 'text.secondary' }}>
          Stay updated with the latest articles and insights
        </Typography>
      </Box>

      {/* News Content */}
      <NewsCarousel />
    </Container>
  )
}

export default News
