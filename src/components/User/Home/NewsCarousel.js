import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  AspectRatio,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Button
} from '@mui/joy'
import { useKeenSlider } from 'keen-slider/react'
import { ArrowBackIosNew, ArrowForwardIos, TrendingUp, OpenInNew, Star, StarBorder, Refresh, ErrorOutline } from '@mui/icons-material'
import { userService } from '../../../api/services'
import 'keen-slider/keen-slider.min.css'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../context/AuthContext'
import { useNews } from '../../../hooks/useNews'

export default function NewsCarousel() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // Read language/interests straight off the auth user rather than mirroring
  // them into local state first. The old mirror meant one render pass where
  // preferences were "not loaded yet", during which a throwaway `general`
  // request was fired that could land after — and overwrite — the real one.
  const preferences = user?.preferences?.general
  const { articles: news, loading, error, refetch } = useNews(preferences?.language, preferences?.interests)

  const [currentSlide, setCurrentSlide] = useState(0)

  // Favourites stay in local state so a star toggle can render optimistically.
  // AuthContext does not re-fetch /users/me after the PATCH, so this remains
  // authoritative until the next profile load replaces it.
  const [favoriteNews, setFavoriteNews] = useState(preferences?.favorite_news ?? [])
  useEffect(() => {
    setFavoriteNews(preferences?.favorite_news ?? [])
  }, [preferences?.favorite_news])

  const favoriteUrls = favoriteNews.map((article) => article.url)

  // Filter regular news (exclude favorited ones)
  const regularNews = news.filter((article) => !favoriteUrls.includes(article.url))

  // Toggle favorite - persist full article to user preferences
  const toggleFavorite = async (article) => {
    const isFavorite = favoriteUrls.includes(article.url)
    // Snapshot for rollback on error
    const previousFavorites = favoriteNews

    const newFavoriteNews = isFavorite
      ? favoriteNews.filter((fav) => fav.url !== article.url)
      : [
          ...favoriteNews,
          {
            url: article.url,
            title: article.title,
            description: article.description || '',
            urlToImage: article.urlToImage || '',
            category: article.category || ''
          }
        ]

    // Optimistic update for immediate UI feedback
    setFavoriteNews(newFavoriteNews)

    try {
      await userService.updateGeneralPreferences({
        favorite_news: newFavoriteNews
      })
    } catch (err) {
      console.error('Failed to update favorite:', err)
      // Revert optimistic update on error
      setFavoriteNews(previousFavorites)
    }
  }

  // Latest News slider
  const [sliderRef, instanceRef] = useKeenSlider({
    loop: regularNews.length > 3,
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

  // Favorites slider
  const [favoritesSliderRef, favoritesInstanceRef] = useKeenSlider({
    loop: favoriteNews.length > 3,
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

  // Re-sync the slider when the rendered slide count changes. Keyed on the
  // length rather than the array, because `regularNews` is derived and so is a
  // fresh reference on every render — using it directly would re-run this on
  // each render and fight with `slideChanged`'s setState.
  const regularNewsCount = regularNews.length
  useEffect(() => {
    if (instanceRef.current && regularNewsCount > 0) {
      setTimeout(() => {
        instanceRef.current?.update({
          loop: regularNewsCount > 3,
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
  }, [regularNewsCount, instanceRef])

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
        {preferences?.interests?.length > 0 ? t('news.adjustInterests') : t('news.setInterests')}
      </Typography>
    </Box>
  )

  // Error State — distinct from Empty so "the feed is down" never reads as
  // "your interests matched nothing", and offers a way back without a reload.
  const ErrorState = () => (
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
          backgroundColor: 'danger.softBg',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
        }}
      >
        <ErrorOutline sx={{ fontSize: 40, color: 'danger.plainColor' }} />
      </Box>
      <Typography level='h4' sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
        {t('news.loadError')}
      </Typography>
      <Typography level='body-sm' sx={{ color: 'text.secondary', maxWidth: 400, mb: 2 }}>
        {t('news.loadErrorHint')}
      </Typography>
      <Button
        variant='soft'
        color='neutral'
        size='sm'
        startDecorator={<Refresh />}
        onClick={() => refetch()}
        aria-label={t('common.retry')}
      >
        {t('common.retry')}
      </Button>
    </Box>
  )

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: { xs: 380, md: 500 },
        py: { xs: 2, md: 4 },
        px: { xs: 0.5, md: 2 },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Tabs for Latest News and Favorites */}
      <Tabs defaultValue={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tab Header */}
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: { xs: 1.5, md: 2 }, px: { xs: 1, md: 0 } }}>
          <TabList>
            <Tab sx={{ fontSize: 'xs', py: { xs: 0.5, md: 1 }, px: { xs: 1, md: 2 } }}>
              <TrendingUp sx={{ mr: { xs: 0.5, md: 1 }, fontSize: 'md' }} />
              {t('news.title')}
            </Tab>
            <Tab sx={{ fontSize: 'xs', py: { xs: 0.5, md: 1 }, px: { xs: 1, md: 2 } }}>
              <Star sx={{ mr: { xs: 0.5, md: 1 }, fontSize: 'md' }} />
              {t('news.favorites')} {favoriteNews.length > 0 && `(${favoriteNews.length})`}
            </Tab>
          </TabList>

          {preferences?.language && (
            <Chip variant='soft' color='primary' size='sm'>
              {preferences.language.toUpperCase()}
            </Chip>
          )}
        </Stack>

        {/* Latest News Tab */}
        <TabPanel value={0} sx={{ p: 0 }}>
          {/* Error takes precedence, then empty, then the carousel itself */}
          {!loading && error ? (
            <ErrorState />
          ) : !loading && regularNews.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Slider Container */}
              <Box
                sx={{
                  position: 'relative',
                  mx: 'auto',
                  maxWidth: '100%'
                }}
              >
                <Box
                  ref={sliderRef}
                  className='keen-slider'
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 'md'
                  }}
                >
                  {(() => {
                    const itemsToRender = loading ? Array.from({ length: placeholderCount }) : regularNews
                    return itemsToRender.map((article, index) => (
                      <Box
                        key={loading ? `skeleton-${index}` : article?.url || index}
                        className='keen-slider__slide'
                        sx={{
                          minHeight: { xs: 320, md: 400 },
                          minWidth: { xs: '260px', sm: '320px' },
                          width: { xs: '260px', sm: '320px' }
                        }}
                      >
                        <Box sx={{ px: { xs: 0.5, md: 1 }, height: '100%' }}>
                          <NewsCard
                            article={article}
                            loading={loading}
                            t={t}
                            isFavorite={favoriteUrls.includes(article?.url)}
                            onToggleFavorite={() => toggleFavorite(article)}
                          />
                        </Box>
                      </Box>
                    ))
                  })()}
                </Box>

                {/* Navigation Arrows */}
                {!loading && regularNews.length > 1 && instanceRef.current && (
                  <>
                    <IconButton
                      variant='solid'
                      color='neutral'
                      size='sm'
                      aria-label={t('news.previousArticle')}
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
                      aria-label={t('news.nextArticle')}
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
              {!loading && regularNews.length > 0 && instanceRef.current && (
                <Stack direction='row' justifyContent='center' spacing={1} sx={{ mt: 3 }}>
                  {Array.from({ length: Math.min(regularNews.length, 7) }).map((_, idx) => {
                    // Smart pagination: show first, current, and last on mobile
                    const shouldShow = regularNews.length <= 7 || idx < 2 || idx === currentSlide || idx >= regularNews.length - 2
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
                          backgroundColor: currentSlide === idx ? 'primary.solidBg' : 'neutral.outlinedBorder',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          transform: currentSlide === idx ? 'scale(1.2)' : 'scale(1)',
                          '&:hover': {
                            backgroundColor: 'primary.outlinedHoverBorder'
                          }
                        }}
                      />
                    )
                  })}
                </Stack>
              )}
            </>
          )}
        </TabPanel>

        {/* Favorites Tab */}
        <TabPanel value={1} sx={{ p: 0 }}>
          {favoriteNews.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 4,
                textAlign: 'center'
              }}
            >
              <Star sx={{ fontSize: 60, color: 'text.tertiary', mb: 2 }} />
              <Typography level='h4' sx={{ mb: 1, color: 'text.primary' }}>
                {t('news.noFavorites')}
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('news.noFavoritesHint')}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Favorites Carousel */}
              <Box
                sx={{
                  position: 'relative',
                  mx: 'auto',
                  maxWidth: '1200px',
                  px: { xs: 2, md: 8 }
                }}
              >
                <Box
                  ref={favoritesSliderRef}
                  className='keen-slider'
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 'md',
                    mx: 2,
                    // Center single cards
                    display: 'flex',
                    justifyContent: favoriteNews.length === 1 ? 'center' : 'flex-start'
                  }}
                >
                  {favoriteNews.map((article) => (
                    <Box
                      key={article.url}
                      className='keen-slider__slide'
                      sx={{
                        minHeight: { xs: 350, md: 400 },
                        minWidth: { xs: '280px', sm: '320px' },
                        width: { xs: '280px', sm: '320px' },
                        maxWidth: { xs: '280px', sm: '320px' }, // Prevent expansion
                        flex: '0 0 auto' // Don't grow
                      }}
                    >
                      <Box sx={{ px: 1, height: '100%' }}>
                        <NewsCard
                          article={article}
                          loading={false}
                          t={t}
                          isFavorite={true}
                          onToggleFavorite={() => toggleFavorite(article)}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>

                {/* Navigation Arrows */}
                {favoriteNews.length > 1 && favoritesInstanceRef.current && (
                  <>
                    <IconButton
                      variant='solid'
                      color='neutral'
                      size='sm'
                      aria-label={t('news.previousArticle')}
                      onClick={(e) => {
                        e.stopPropagation()
                        favoritesInstanceRef.current?.prev()
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
                      aria-label={t('news.nextArticle')}
                      onClick={(e) => {
                        e.stopPropagation()
                        favoritesInstanceRef.current?.next()
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
            </>
          )}
        </TabPanel>
      </Tabs>
    </Box>
  )
}

const NewsCard = ({ article, loading, t, isFavorite, onToggleFavorite }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

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
      <AspectRatio
        ratio='16/9'
        objectFit='cover'
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        sx={{ position: 'relative' }}
      >
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

        {/* Star Icon Overlay - Always visible on mobile, hover on desktop */}
        {!loading && (
          <IconButton
            variant='solid'
            color={isFavorite ? 'warning' : 'neutral'}
            size='sm'
            aria-label={isFavorite ? t('news.removeFavorite') : t('news.addFavorite')}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              backgroundColor: isFavorite ? 'warning.solidBg' : 'background.level2',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
              // Always visible on mobile (xs/sm), hover-based on desktop (md+)
              opacity: { xs: 1, md: isHovering || isFavorite ? 1 : 0 },
              transform: { xs: 'scale(1)', md: isHovering || isFavorite ? 'scale(1)' : 'scale(0.8)' },
              '&:hover': {
                backgroundColor: isFavorite ? 'warning.solidHoverBg' : 'background.level3',
                transform: 'scale(1.1)'
              }
            }}
          >
            {isFavorite ? <Star sx={{ fontSize: 18 }} /> : <StarBorder sx={{ fontSize: 18 }} />}
          </IconButton>
        )}
      </AspectRatio>

      {/* Content */}
      <CardContent sx={{ flex: 1, p: { xs: 1.5, md: 2.5 } }}>
        {/* Title */}
        <Typography
          level='title-md'
          sx={{
            mb: { xs: 1, md: 1.5 },
            fontWeight: 600,
            // Static sm (14), below title-md's own 16px default: this is a news
            // card title inside a compact carousel tile, not a standalone card
            // heading, so the smaller mobile-first value was kept at all widths.
            fontSize: 'sm',
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
            // Static xs (12), below body-sm's own 14px default: this is the news
            // card's clamped excerpt line, secondary to the title above it.
            fontSize: 'xs',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: { xs: 2, md: 3 },
            overflow: 'hidden',
            lineHeight: 1.6,
            mb: { xs: 1, md: 2 }
          }}
        >
          {loading ? (
            <>
              <Skeleton width='100%' />
              <Skeleton width='100%' />
              <Skeleton width='70%' />
            </>
          ) : (
            // Google News feeds carry no real summary — their entry text is
            // just the headline again, which the API now returns as empty
            // rather than as a hardcoded English call to action.
            article.description || t('news.readMore')
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
                  px: { xs: 0.75, md: 1 },
                  py: 0
                }}
              >
                {t(`news.categories.${article.category}`, article.category.charAt(0).toUpperCase() + article.category.slice(1))}
              </Chip>
            )}
            <Box sx={{ flex: 1 }} />
            <OpenInNew sx={{ fontSize: 'sm', color: 'primary.plainColor' }} />
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
