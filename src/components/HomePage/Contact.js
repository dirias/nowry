import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Sheet,
  Stack,
  Card,
  CardContent,
  Container,
  Grid,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Alert
} from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from '@mui/joy/styles'
import {
  EmailRounded,
  LocationOnRounded,
  PhoneRounded,
  SendRounded,
  X,
  Facebook,
  LinkedIn,
  Instagram,
  CheckCircleRounded
} from '@mui/icons-material'

const Contact = () => {
  const { mode } = useColorScheme()
  const isDark = mode === 'dark'
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const contactInfo = [
    {
      icon: <EmailRounded />,
      title: t('contact.info.email.title'),
      content: 'support@nowry.com',
      description: t('contact.info.email.desc'),
      color: 'primary'
    },
    {
      icon: <PhoneRounded />,
      title: t('contact.info.phone.title'),
      content: '+1 (555) 123-4567',
      description: t('contact.info.phone.desc'),
      color: 'success'
    },
    {
      icon: <LocationOnRounded />,
      title: t('contact.info.visit.title'),
      content: '123 Learning Street',
      description: t('contact.info.visit.desc'),
      color: 'warning'
    }
  ]

  const socialLinks = [
    { icon: <X />, label: 'Twitter', url: '#', color: '#1DA1F2' },
    { icon: <Facebook />, label: 'Facebook', url: '#', color: '#1877F2' },
    { icon: <LinkedIn />, label: 'LinkedIn', url: '#', color: '#0A66C2' },
    { icon: <Instagram />, label: 'Instagram', url: '#', color: '#E4405F' }
  ]

  const faqs = [
    {
      question: t('contact.faq.q1'),
      answer: t('contact.faq.a1')
    },
    {
      question: t('contact.faq.q2'),
      answer: t('contact.faq.a2')
    },
    {
      question: t('contact.faq.q3'),
      answer: t('contact.faq.a3')
    },
    {
      question: t('contact.faq.q4'),
      answer: t('contact.faq.a4')
    }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
      setFormData({ name: '', email: '', subject: '', message: '' })

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000)
    }, 1500)
  }

  return (
    <Sheet
      sx={{
        minHeight: '100vh',
        backgroundColor: isDark ? 'neutral.900' : 'background.body'
      }}
    >
      <Container maxWidth='lg'>
        {/* Hero Section */}
        <Box
          sx={{
            pt: { xs: 12, md: 16 },
            pb: { xs: 6, md: 8 },
            textAlign: 'center'
          }}
        >
          <Typography
            level='h1'
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.1,
              mb: 3,
              color: isDark ? 'primary.300' : 'primary.700'
            }}
          >
            {t('contact.title')}
          </Typography>
          <Typography
            level='body-lg'
            sx={{
              maxWidth: 700,
              mx: 'auto',
              color: 'text.secondary',
              fontSize: { xs: '1rem', md: '1.25rem' },
              mb: 2
            }}
          >
            {t('contact.subtitle')}
          </Typography>
        </Box>

        {/* Contact Info Cards */}
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {contactInfo.map((info, index) => (
            <Grid key={index} xs={12} md={4}>
              <Card
                variant='soft'
                color={info.color}
                sx={{
                  height: '100%',
                  p: 3,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 'lg'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${info.color}.solidBg`,
                    color: `${info.color}.solidColor`,
                    mx: 'auto',
                    mb: 2,
                    fontSize: 28
                  }}
                >
                  {info.icon}
                </Box>
                <Typography level='title-lg' fontWeight={600} mb={1}>
                  {info.title}
                </Typography>
                <Typography level='title-md' mb={0.5}>
                  {info.content}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  {info.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Main Content: Form + FAQ */}
        <Grid container spacing={6} sx={{ mb: 8 }}>
          {/* Contact Form */}
          <Grid xs={12} md={7}>
            <Card variant='outlined' sx={{ p: 4 }}>
              <Typography level='h3' fontWeight={700} mb={3}>
                {t('contact.form.title')}
              </Typography>

              {submitted && (
                <Alert color='success' variant='soft' sx={{ mb: 3 }} startDecorator={<CheckCircleRounded />}>
                  {t('contact.form.success')}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <FormControl required>
                    <FormLabel>{t('contact.form.name')}</FormLabel>
                    <Input
                      name='name'
                      placeholder={t('contact.form.namePlaceholder')}
                      value={formData.name}
                      onChange={handleChange}
                      size='lg'
                    />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>{t('contact.form.email')}</FormLabel>
                    <Input
                      type='email'
                      name='email'
                      placeholder='you@example.com'
                      value={formData.email}
                      onChange={handleChange}
                      size='lg'
                    />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>{t('contact.form.subject')}</FormLabel>
                    <Input
                      name='subject'
                      placeholder={t('contact.form.subjectPlaceholder')}
                      value={formData.subject}
                      onChange={handleChange}
                      size='lg'
                    />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>{t('contact.form.message')}</FormLabel>
                    <Textarea
                      name='message'
                      placeholder={t('contact.form.messagePlaceholder')}
                      value={formData.message}
                      onChange={handleChange}
                      minRows={6}
                      size='lg'
                    />
                  </FormControl>

                  <Button
                    type='submit'
                    size='lg'
                    loading={loading}
                    endDecorator={!loading && <SendRounded />}
                    sx={{
                      mt: 1,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg'
                      }
                    }}
                  >
                    {t('contact.form.send')}
                  </Button>
                </Stack>
              </form>
            </Card>
          </Grid>

          {/* FAQ Section */}
          <Grid xs={12} md={5}>
            <Box>
              <Typography level='h3' fontWeight={700} mb={3}>
                {t('contact.faq.title')}
              </Typography>

              <Stack spacing={2}>
                {faqs.map((faq, index) => (
                  <Card key={index} variant='outlined' sx={{ p: 2.5 }}>
                    <Typography level='title-md' fontWeight={600} mb={1}>
                      {faq.question}
                    </Typography>
                    <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                      {faq.answer}
                    </Typography>
                  </Card>
                ))}
              </Stack>

              {/* Social Links */}
              <Box sx={{ mt: 4 }}>
                <Typography level='title-md' fontWeight={600} mb={2}>
                  {t('contact.followUs')}
                </Typography>
                <Stack direction='row' spacing={1.5}>
                  {socialLinks.map((social, index) => (
                    <Box
                      key={index}
                      component='a'
                      href={social.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'neutral.800' : 'neutral.100',
                        color: 'text.primary',
                        transition: 'all 0.2s ease',
                        textDecoration: 'none',
                        '&:hover': {
                          backgroundColor: social.color,
                          color: 'white',
                          transform: 'translateY(-3px)',
                          boxShadow: `0 8px 20px ${social.color}40`
                        }
                      }}
                    >
                      {social.icon}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Map Section (Placeholder) */}
        <Box sx={{ mb: 8 }}>
          <Card
            variant='outlined'
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
            }}
          >
            <Stack spacing={2} alignItems='center'>
              <LocationOnRounded sx={{ fontSize: 60, color: 'primary.500' }} />
              <Typography level='h4' fontWeight={600}>
                {t('contact.location.title')}
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                123 Learning Street, San Francisco, CA 94102
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                {t('contact.location.subtitle')}
              </Typography>
            </Stack>
          </Card>
        </Box>

        {/* Business Hours */}
        <Box sx={{ pb: 12 }}>
          <Card variant='soft' color='primary' sx={{ p: 4, textAlign: 'center' }}>
            <Typography level='h4' fontWeight={700} mb={3}>
              {t('contact.hours.title')}
            </Typography>
            <Grid container spacing={2} sx={{ maxWidth: 600, mx: 'auto' }}>
              <Grid xs={6}>
                <Typography level='body-md' fontWeight={600}>
                  {t('contact.hours.weekdays')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  9:00 AM - 6:00 PM EST
                </Typography>
              </Grid>
              <Grid xs={6}>
                <Typography level='body-md' fontWeight={600}>
                  {t('contact.hours.weekends')}
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  10:00 AM - 4:00 PM EST
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Box>
      </Container>
    </Sheet>
  )
}

export default Contact
