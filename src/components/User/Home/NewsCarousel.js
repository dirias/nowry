import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, Typography, AspectRatio, Box, Chip, IconButton, Skeleton, Stack } from '@mui/joy'
import { useKeenSlider } from 'keen-slider/react'
import { ArrowBackIosNew, ArrowForwardIos, TrendingUp, OpenInNew } from '@mui/icons-material'
import { userService } from '../../../api/services'
import 'keen-slider/keen-slider.min.css'
import { useTranslation } from 'react-i18next'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// Map user interests to categories (multilingual support)
const INTEREST_TO_CATEGORY = {
  // English
  technology: 'technology',
  science: 'science',
  business: 'business',
  health: 'health',
  art: 'entertainment',
  music: 'entertainment',
  literature: 'entertainment',
  books: 'entertainment',
  film: 'entertainment',
  marketing: 'business',
  social: 'general',
  politics: 'politics',

  // Spanish
  tecnología: 'technology',
  ciencia: 'science',
  negocios: 'business',
  salud: 'health',
  arte: 'entertainment',
  música: 'entertainment',
  literatura: 'entertainment',
  libros: 'entertainment',
  cine: 'entertainment',

  política: 'politics'
}

const getCategoryFromInterest = (interest) => {
  if (!interest) return 'general'

  // Normalize interest: lowercase, remove special chars if needed
  const normalized = interest.toLowerCase().trim()

  // Direct match
  if (INTEREST_TO_CATEGORY[normalized]) {
    return INTEREST_TO_CATEGORY[normalized]
  }

  // Partial match check (e.g. "tech" -> "technology")
  const entries = Object.entries(INTEREST_TO_CATEGORY)
  for (const [key, value] of entries) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  return 'general'
}

import { useAuth } from '../../../context/AuthContext'

export default function NewsCarousel() {
  const { t } = useTranslation()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('general')
  const [currentSlide, setCurrentSlide] = useState(0)

  const { user } = useAuth()
  const [userPreferences, setUserPreferences] = useState(null)

  // ... (slider ref code) ...

  const [sliderRef, instanceRef] = useKeenSlider({
    loop: news.length > 3,
    slides: {
      perView: 'auto',
      spacing: 16
    },
    breakpoints: {
      '(min-width: 640px)': {
        slides: { perView: 'auto', spacing: 16 }
      },
      '(min-width: 1024px)': {
        slides: { perView: 'auto', spacing: 20 }
      }
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel)
    }
  })

  const fetchedRef = React.useRef(false)

  // Update slider when news changes
  useEffect(() => {
    // ... (keep existing slider update logic) ...
    if (instanceRef.current && news.length > 0) {
      setTimeout(() => {
        instanceRef.current?.update({
          loop: news.length > 3,
          slides: {
            perView: 'auto',
            spacing: 16
          },
          breakpoints: {
            '(min-width: 640px)': {
              slides: { perView: 'auto', spacing: 16 }
            },
            '(min-width: 1024px)': {
              slides: { perView: 'auto', spacing: 20 }
            }
          }
        })
      }, 100)
    }
  }, [news])

  // Sync preferences from AuthContext and handle cache clearing
  useEffect(() => {
    const syncPreferences = async () => {
      if (user?.preferences) {
        // Check if preferences changed to clear cache
        if (userPreferences) {
          const oldPrefs = JSON.stringify(userPreferences)
          const newPrefs = JSON.stringify(user.preferences)

          if (oldPrefs !== newPrefs) {
            console.log('🔄 User preferences changed, clearing news cache...')
            try {
              await fetch(`${API_BASE_URL}/news/cache/clear`, { method: 'DELETE' })
              console.log('✅ Cache cleared')
            } catch (err) {
              console.warn('Failed to clear cache:', err)
            }
          }
        }

        setUserPreferences(user.preferences)
      }
    }
    syncPreferences()
  }, [user])

  // Reset fetch ref when preferences change to allow re-fetching
  useEffect(() => {
    fetchedRef.current = false
  }, [userPreferences?.language, JSON.stringify(userPreferences?.interests)])

  // Fetch news from backend
  useEffect(() => {
    const fetchNews = async () => {
      // Prevent double fetching in StrictMode
      if (fetchedRef.current) return
      fetchedRef.current = true

      try {
        setLoading(true)

        // Get user language and categories
        const userLang = userPreferences?.language || 'en'
        const userInterests = userPreferences?.interests || []

        // Get ALL categories from ALL interests
        const categories =
          userInterests.length > 0
            ? userInterests
                .map((interest) => {
                  const category = getCategoryFromInterest(interest)
                  return category
                })
                .filter((cat) => cat !== 'general')
            : []

        // If no specific categories, use general
        const finalCategories = categories.length > 0 ? categories : ['general']
        setActiveCategory(finalCategories.join(', ')) // Update active categories for display

        // Fetch from ALL categories in parallel
        const promises = finalCategories.map((category) =>
          fetch(`${API_BASE_URL}/news/${userLang}/${category}`)
            .then(async (res) => {
              // Handle non-200 responses (including 404)
              if (!res.ok) {
                console.warn(`News API returned ${res.status} for ${category}`)
                return []
              }
              return res.json()
            })
            .then((data) => {
              // Tag each article with its category
              if (data.status === 'success' && data.articles) {
                return data.articles.map((article) => ({
                  ...article,
                  category: category // Add category to each article
                }))
              }
              return []
            })
            .catch((err) => {
              console.warn(`Failed to fetch ${category} news:`, err.message)
              return []
            })
        )

        const results = await Promise.all(promises)

        // Combine all articles from all categories
        const allArticles = results.flatMap((articles) => articles)

        // Remove duplicates based on URL
        const uniqueArticles = allArticles.filter((article, index, self) => index === self.findIndex((a) => a.url === article.url))

        // Shuffle to mix categories
        const shuffled = uniqueArticles.sort(() => Math.random() - 0.5)

        setNews(shuffled.slice(0, 15)) // Show up to 15 articles
      } catch (error) {
        console.error('News fetch error:', error)
        setNews([])
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [userPreferences?.language, JSON.stringify(userPreferences?.interests)])

  const placeholderCount = 3

  // Empty State Component
  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
        minHeight: 300
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: 'neutral.softBg',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1
            },
            '50%': {
              opacity: 0.5
            }
          }
        }}
      >
        <TrendingUp sx={{ fontSize: 40, color: 'neutral.plainColor' }} />
      </Box>
      <Typography level='h4' sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
        {t('news.noArticles')}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', maxWidth: 400 }}>
        {userPreferences?.interests?.length > 0
          ? 'Try adjusting your interests in Settings to see personalized news.'
          : 'Set your interests in Settings to see personalized news articles.'}
      </Typography>
    </Box>
  )

  return (
    <Box sx={{ position: 'relative', width: '100%', py: 4 }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3, px: { xs: 1, md: 2 } }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <TrendingUp sx={{ color: 'primary.500', fontSize: 28 }} />
          <Typography level='h3' fontWeight={700} sx={{ color: 'text.primary' }}>
            {t('news.title')}
          </Typography>
        </Stack>

        {userPreferences?.language && (
          <Chip variant='outlined' color='neutral' size='sm'>
            {userPreferences.language.toUpperCase()}
          </Chip>
        )}
      </Stack>

      {/* Show Empty State if no loading and no news */}
      {!loading && news.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Slider Container */}
          <Box
            sx={{
              position: 'relative',
              mx: 'auto',
              maxWidth: '1200px',
              px: { xs: 2, md: 8 }
            }}
          >
            <Box
              ref={sliderRef}
              className='keen-slider'
              sx={{
                overflow: 'hidden',
                borderRadius: 'md',
                mx: 2
              }}
            >
              {(() => {
                const itemsToRender = loading ? Array.from({ length: placeholderCount }) : news
                return itemsToRender.map((article, index) => (
                  <Box
                    key={loading ? `skeleton-${index}` : article?.url || index}
                    className='keen-slider__slide'
                    sx={{
                      minHeight: { xs: 350, md: 400 },
                      minWidth: { xs: '280px', sm: '320px' },
                      width: { xs: '280px', sm: '320px' }
                    }}
                  >
                    <Box sx={{ px: 1, height: '100%' }}>
                      <NewsCard article={article} loading={loading} t={t} />
                    </Box>
                  </Box>
                ))
              })()}
            </Box>

            {/* Navigation Arrows */}
            {!loading && news.length > 1 && instanceRef.current && (
              <>
                <IconButton
                  variant='solid'
                  color='neutral'
                  size='sm'
                  onClick={(e) => {
                    e.stopPropagation()
                    instanceRef.current?.prev()
                  }}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    position: 'absolute',
                    left: 0,
                    top: '40%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    backgroundColor: 'background.surface',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder',
                    boxShadow: 'sm',
                    '&:hover': {
                      backgroundColor: 'background.surface',
                      borderColor: 'primary.outlinedBorder',
                      transform: 'translateY(-50%) scale(1.1)'
                    }
                  }}
                >
                  <ArrowBackIosNew />
                </IconButton>

                <IconButton
                  variant='solid'
                  color='neutral'
                  size='sm'
                  onClick={(e) => {
                    e.stopPropagation()
                    instanceRef.current?.next()
                  }}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    position: 'absolute',
                    right: 0,
                    top: '40%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    backgroundColor: 'background.surface',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder',
                    boxShadow: 'sm',
                    '&:hover': {
                      backgroundColor: 'background.surface',
                      borderColor: 'primary.outlinedBorder',
                      transform: 'translateY(-50%) scale(1.1)'
                    }
                  }}
                >
                  <ArrowForwardIos />
                </IconButton>
              </>
            )}
          </Box>

          {/* Pagination Dots */}
          {!loading && news.length > 0 && instanceRef.current && (
            <Stack direction='row' justifyContent='center' spacing={1} sx={{ mt: 3 }}>
              {Array.from({ length: Math.min(news.length, 7) }).map((_, idx) => {
                // Smart pagination: show first, current, and last on mobile
                const shouldShow = news.length <= 7 || idx < 2 || idx === currentSlide || idx >= news.length - 2
                if (!shouldShow) return null

                return (
                  <Box
                    key={idx}
                    onClick={() => {
                      instanceRef.current?.moveToIdx(idx)
                    }}
                    sx={{
                      width: { xs: 6, md: 8 },
                      height: { xs: 6, md: 8 },
                      borderRadius: '50%',
                      backgroundColor: currentSlide === idx ? 'primary.500' : 'neutral.300',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      transform: currentSlide === idx ? 'scale(1.2)' : 'scale(1)',
                      '&:hover': {
                        backgroundColor: 'primary.400'
                      }
                    }}
                  />
                )
              })}
            </Stack>
          )}
        </>
      )}
    </Box>
  )
}

// Extracted Card Component to handle Image Loading State
const NewsCard = ({ article, loading, t }) => {
  const [imgLoaded, setImgLoaded] = useState(false)

  // Determine if we should show skeleton
  // Show skeleton if:
  // 1. Data is loading (loading=true)
  // 2. OR Image is defined but hasn't loaded yet (!imgLoaded)
  const showImageSkeleton = loading || (article?.urlToImage && !imgLoaded)

  return (
    <Card
      variant='outlined'
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: loading ? 'default' : 'pointer',
        '&:hover': loading
          ? {}
          : {
              transform: 'translateY(-4px)',
              boxShadow: 'lg',
              borderColor: 'primary.outlinedBorder'
            }
      }}
      onClick={!loading && article?.url ? () => window.open(article.url, '_blank', 'noopener,noreferrer') : undefined}
    >
      {/* Image */}
      <AspectRatio ratio='16/9' objectFit='cover'>
        {showImageSkeleton && (
          <Skeleton
            variant='rectangular'
            animation='wave'
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}
          />
        )}

        {!loading && article?.urlToImage && (
          <img
            src={article.urlToImage}
            alt={article.title}
            loading='lazy'
            onLoad={() => setImgLoaded(true)}
            style={{
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        )}
      </AspectRatio>

      {/* Content */}
      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* Title */}
        <Typography
          level='title-md'
          sx={{
            mb: 1.5,
            fontWeight: 600,
            color: 'text.primary',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            lineHeight: 1.4
          }}
        >
          {loading ? <Skeleton width='90%' /> : article.title}
        </Typography>

        {/* Description */}
        <Typography
          level='body-sm'
          sx={{
            color: 'text.secondary',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            overflow: 'hidden',
            lineHeight: 1.6,
            mb: 2
          }}
        >
          {loading ? (
            <>
              <Skeleton width='100%' />
              <Skeleton width='100%' />
              <Skeleton width='70%' />
            </>
          ) : (
            article.description
          )}
        </Typography>

        {/* Footer */}
        {!loading && (
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={1}>
            {/* Category Badge - Minimalistic */}
            {article.category && (
              <Chip
                variant='soft'
                color='primary'
                size='sm'
                sx={{
                  fontSize: '0.65rem',
                  height: '20px',
                  minHeight: '20px',
                  px: 1,
                  py: 0
                }}
              >
                {t(`news.categories.${article.category}`, article.category.charAt(0).toUpperCase() + article.category.slice(1))}
              </Chip>
            )}
            <Box sx={{ flex: 1 }} />
            <OpenInNew sx={{ fontSize: 16, color: 'primary.500' }} />
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
