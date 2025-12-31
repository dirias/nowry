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
      title: 'Email Us',
      content: 'support@nowry.com',
      description: 'We typically respond within 24 hours',
      color: 'primary'
    },
    {
      icon: <PhoneRounded />,
      title: 'Call Us',
      content: '+1 (555) 123-4567',
      description: 'Mon-Fri, 9AM-6PM EST',
      color: 'success'
    },
    {
      icon: <LocationOnRounded />,
      title: 'Visit Us',
      content: '123 Learning Street',
      description: 'San Francisco, CA 94102',
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
      question: 'How do I get started?',
      answer: 'Simply create a free account and start exploring our features. No credit card required!'
    },
    {
      question: 'Is Nowry really free?',
      answer: 'Yes! Our core features are completely free. We also offer premium plans with advanced features.'
    },
    {
      question: 'Can I import my existing flashcards?',
      answer: 'Absolutely! We support importing from various formats including CSV, Anki, and Quizlet.'
    },
    {
      question: 'Do you offer student discounts?',
      answer: 'Yes! Students with a valid .edu email get 50% off all premium plans.'
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
            Get in Touch
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
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
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
                Send us a Message
              </Typography>

              {submitted && (
                <Alert color='success' variant='soft' sx={{ mb: 3 }} startDecorator={<CheckCircleRounded />}>
                  Thank you! Your message has been sent successfully. We&apos;ll get back to you soon.
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                  <FormControl required>
                    <FormLabel>Your Name</FormLabel>
                    <Input name='name' placeholder='John Doe' value={formData.name} onChange={handleChange} size='lg' />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>Email Address</FormLabel>
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
                    <FormLabel>Subject</FormLabel>
                    <Input name='subject' placeholder='How can we help?' value={formData.subject} onChange={handleChange} size='lg' />
                  </FormControl>

                  <FormControl required>
                    <FormLabel>Message</FormLabel>
                    <Textarea
                      name='message'
                      placeholder='Tell us more about your question or feedback...'
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
                    Send Message
                  </Button>
                </Stack>
              </form>
            </Card>
          </Grid>

          {/* FAQ Section */}
          <Grid xs={12} md={5}>
            <Box>
              <Typography level='h3' fontWeight={700} mb={3}>
                Frequently Asked
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
                  Follow Us
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
                Our Location
              </Typography>
              <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                123 Learning Street, San Francisco, CA 94102
              </Typography>
              <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                Interactive map coming soon
              </Typography>
            </Stack>
          </Card>
        </Box>

        {/* Business Hours */}
        <Box sx={{ pb: 12 }}>
          <Card variant='soft' color='primary' sx={{ p: 4, textAlign: 'center' }}>
            <Typography level='h4' fontWeight={700} mb={3}>
              Business Hours
            </Typography>
            <Grid container spacing={2} sx={{ maxWidth: 600, mx: 'auto' }}>
              <Grid xs={6}>
                <Typography level='body-md' fontWeight={600}>
                  Monday - Friday
                </Typography>
                <Typography level='body-sm' sx={{ color: 'text.tertiary' }}>
                  9:00 AM - 6:00 PM EST
                </Typography>
              </Grid>
              <Grid xs={6}>
                <Typography level='body-md' fontWeight={600}>
                  Saturday - Sunday
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
