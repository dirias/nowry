/* eslint-disable react/react-in-jsx-scope */
// components/MotivationBanner.js
import { Typography, Sheet } from '@mui/joy'
import { useTranslation } from 'react-i18next'

export function MotivationBanner() {
  const { t } = useTranslation()
  const phrases = t('motivation.phrases', { returnObjects: true })
  const phraseList = Array.isArray(phrases) ? phrases : ['Keep learning!']
  const phrase = phraseList[Math.floor(Math.random() * phraseList.length)]
  return (
    <Sheet
      variant='soft'
      sx={{
        p: 3,
        textAlign: 'center',
        borderRadius: 'md',
        backgroundColor: 'warning.softBg',
        boxShadow: 'sm'
      }}
    >
      <Typography level='body-md' fontWeight='lg' color='warning.800'>
        {phrase}
      </Typography>
    </Sheet>
  )
}
