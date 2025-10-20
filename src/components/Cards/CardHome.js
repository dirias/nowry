import React, { Component } from 'react'
import { Container, Stack, Typography, Box, Input, Chip, Divider, LinearProgress, Skeleton } from '@mui/joy'
import DecksView from './DecksView'
import LastCardsAdded from './LastCardsAdded'

export class CardHome extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: true
    }
  }

  componentDidMount() {
    setTimeout(() => this.setState({ loading: false }), 1500)
  }

  render() {
    const { loading } = this.state

    return (
      <Container maxWidth='lg' sx={{ py: 4, transition: 'background-color 0.3s ease' }}>
        <Stack spacing={4} direction='column'>
          {/* Header Title */}
          {loading ? (
            <Skeleton variant='text' width={300} sx={{ mx: 'auto', height: 40 }} />
          ) : (
            <Typography level='h2' sx={{ fontWeight: 'bold', color: 'primary.700', textAlign: 'center', transition: 'color 0.3s ease' }}>
              ¡Sigue aprendiendo!
            </Typography>
          )}

          {/* Search Bar */}
          {loading ? (
            <Skeleton variant='rectangular' height={40} sx={{ borderRadius: 'lg', maxWidth: 500, mx: 'auto' }} />
          ) : (
            <Input
              placeholder='Buscar mazos o tarjetas...'
              variant='outlined'
              fullWidth
              sx={{ borderRadius: 'lg', maxWidth: 500, mx: 'auto', transition: 'all 0.3s ease' }}
            />
          )}

          {/* Learning Summary */}
          {loading ? (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Skeleton variant='rectangular' width={100} height={60} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' width={100} height={60} sx={{ borderRadius: 'md' }} />
              <Skeleton variant='rectangular' width={120} height={60} sx={{ borderRadius: 'md' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                justifyContent: 'center',
                alignItems: 'center',
                p: 3,
                borderRadius: 'lg',
                backgroundColor: 'background.level1',
                boxShadow: 'sm',
                transition: 'all 0.3s ease'
              }}
            >
              <Box textAlign='center'>
                <Typography level='h4' fontWeight='lg'>
                  56
                </Typography>
                <Typography level='body-sm' color='neutral'>
                  tarjetas aprendidas hoy
                </Typography>
              </Box>
              <Divider orientation='vertical' sx={{ height: 40 }} />
              <Box textAlign='center'>
                <Typography level='h4' fontWeight='lg'>
                  Racha: 3 días
                </Typography>
                <Chip size='sm' variant='soft' color='success'>
                  ✅
                </Chip>
              </Box>
              <Divider orientation='vertical' sx={{ height: 40 }} />
              <Box textAlign='center'>
                <Typography level='body-sm'>Progreso general</Typography>
                <LinearProgress determinate value={50} sx={{ width: 120, borderRadius: 'md' }} />
              </Box>
            </Box>
          )}

          {/* Decks Section */}
          <Box>
            <Typography level='h3' sx={{ fontWeight: 'bold', mb: 2, color: 'primary.700', transition: 'color 0.3s ease' }}>
              Tus mazos
            </Typography>
            {loading ? <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 'lg' }} /> : <DecksView />}
          </Box>

          {/* Recently Added Cards Section */}
          <Box>
            <Typography level='h3' sx={{ fontWeight: 'bold', mb: 2, color: 'primary.700', transition: 'color 0.3s ease' }}>
              Tarjetas añadidas recientemente
            </Typography>
            {loading ? <Skeleton variant='rectangular' height={150} sx={{ borderRadius: 'lg' }} /> : <LastCardsAdded />}
          </Box>
        </Stack>
      </Container>
    )
  }
}

export default CardHome
