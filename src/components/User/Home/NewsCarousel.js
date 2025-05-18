import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Card, CardContent, Typography, AspectRatio, Box, Button, Skeleton } from '@mui/joy'
import { useKeenSlider } from 'keen-slider/react'
import 'keen-slider/keen-slider.min.css'

function useAutoplay(interval = 8000) {
  return (slider) => {
    if (!slider) return
    let timeout
    let mouseOver = false

    const clear = () => clearTimeout(timeout)
    const next = () => {
      clear()
      if (mouseOver || !slider) return
      timeout = setTimeout(() => {
        if (slider.next) slider.next()
      }, interval)
    }

    slider.on('created', () => {
      slider.container?.addEventListener('mouseover', () => {
        mouseOver = true
        clear()
      })
      slider.container?.addEventListener('mouseout', () => {
        mouseOver = false
        next()
      })
      next()
    })

    slider.on('dragStarted', clear)
    slider.on('animationEnded', next)
    slider.on('updated', next)
  }
}

const apiKey = 'caeb2784955f4fe191eade6917713cb3'

export default function NewsCarousel() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  const [sliderRef] = useKeenSlider(
    {
      loop: true,
      mode: 'snap',
      slides: {
        perView: 1,
        spacing: 16
      },
      breakpoints: {
        '(min-width: 640px)': {
          slides: { perView: 2, spacing: 16 }
        },
        '(min-width: 960px)': {
          slides: { perView: 3, spacing: 16 }
        }
      }
    },
    [useAutoplay(8000)]
  )

  useEffect(() => {
    axios
      .get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`)
      .then((res) => {
        const filtered = res.data.articles.filter((a) => a.urlToImage && a.description)
        setNews(filtered.slice(0, 10))
        setLoading(false)
      })
      .catch((err) => {
        console.error('News error:', err)
        setLoading(false)
      })
  }, [])

  const placeholderCount = 3

  return (
    <Box
      ref={sliderRef}
      className='keen-slider'
      sx={{
        width: '100%',
        maxWidth: '1200px',
        mx: 'auto',
        px: 2,
        py: 3,
        overflow: 'visible'
      }}
    >
      {(loading ? Array.from({ length: placeholderCount }) : news).map((article, index) => (
        <Box key={index} className='keen-slider__slide' sx={{ px: 1 }}>
          <Card
            variant='outlined'
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'sm',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 'md',
                transform: 'translateY(-4px)'
              }
            }}
          >
            <Box>
              <AspectRatio ratio='16/9' objectFit='cover'>
                {loading ? <Skeleton variant='rectangular' /> : <img src={article.urlToImage} alt={article.title} loading='lazy' />}
              </AspectRatio>
            </Box>

            <CardContent sx={{ flex: 1 }}>
              <Typography
                level='title-md'
                sx={{
                  mb: 1,
                  fontWeight: 'md',
                  color: 'text.primary',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden'
                }}
              >
                {loading ? <Skeleton width='80%' /> : article.title}
              </Typography>

              <Typography
                level='body-sm'
                sx={{
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden'
                }}
              >
                {loading ? <Skeleton width='100%' height={48} /> : article.description}
              </Typography>

              {!loading && article.url && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size='sm'
                    variant='outlined'
                    color='primary'
                    component='a'
                    href={article.url}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Read more
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  )
}
