/**
 * The visual harness (MOB-010).
 *
 * Phase B is graded against this screen, not against a feature. Every primitive
 * appears here in BOTH schemes at once, side by side, because the failure this
 * catches is a colour that only works in one of them — and reading a design in
 * one scheme, then toggling the OS and reading it again, is exactly how that
 * failure survives review.
 *
 * A primitive that is not on this screen does not count as built. Reachable at
 * `nowry://harness`.
 */
import { ScrollView, View } from 'react-native'
import { ThemeProvider } from '../src/theme'
import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormField,
  IconButton,
  Input,
  Radio,
  Segmented,
  Select,
  Stack,
  Typography,
  BUTTON_SIZE_NAMES,
  BUTTON_VARIANT_NAMES,
  TYPE_LEVEL_NAMES
} from '../src/ui'

export default function Harness() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <ThemeProvider scheme='light'>
          <Panel title='Light' />
        </ThemeProvider>
        <ThemeProvider scheme='dark'>
          <Panel title='Dark' />
        </ThemeProvider>
      </View>
    </ScrollView>
  )
}

function Panel({ title }) {
  return (
    <Box bg='background.body' padding={3} style={{ flex: 1 }}>
      <Stack spacing={3}>
        <Typography level='title-sm' color='text.tertiary'>
          {title}
        </Typography>

        <Section label='Type levels'>
          {TYPE_LEVEL_NAMES.map((level) => (
            <Typography key={level} level={level}>
              {level}
            </Typography>
          ))}
        </Section>

        <Section label='Text colours'>
          {['text.primary', 'text.secondary', 'text.tertiary'].map((c) => (
            <Typography key={c} level='body-sm' color={c}>
              {c}
            </Typography>
          ))}
        </Section>

        <Section label='Surfaces'>
          {['background.surface', 'background.level1', 'background.level2'].map((bg) => (
            <Box key={bg} bg={bg} padding={2} radius='md' border>
              <Typography level='body-xs' color='text.secondary'>
                {bg}
              </Typography>
            </Box>
          ))}
        </Section>

        <Section label='Elevation'>
          {['none', 'xs', 'sm', 'md', 'lg'].map((level) => (
            <Box key={level} bg='background.surface' padding={2} radius='md' elevation={level}>
              <Typography level='body-xs' color='text.secondary'>
                elevation {level}
              </Typography>
            </Box>
          ))}
        </Section>

        <Section label='Accent'>
          {['primary.solidBg', 'primary.softBg', 'primary.plainColor'].map((c) => (
            <Box key={c} bg={c} padding={2} radius='sm'>
              <Typography level='body-xs' color='text.primary'>
                {c}
              </Typography>
            </Box>
          ))}
        </Section>

        <Section label='Buttons — every variant'>
          {BUTTON_VARIANT_NAMES.map((variant) => (
            <Button key={variant} variant={variant} onPress={() => {}}>
              {variant}
            </Button>
          ))}
        </Section>

        <Section label='Buttons — every size'>
          {BUTTON_SIZE_NAMES.map((size) => (
            <Button key={size} size={size} onPress={() => {}}>
              size {size}
            </Button>
          ))}
        </Section>

        <Section label='Buttons — states'>
          <Button loading accessibilityLabel='Saving'>
            Saving…
          </Button>
          <Button disabled accessibilityLabel='Unavailable'>
            disabled
          </Button>
        </Section>

        <Section label='Icon buttons'>
          <Stack direction='row' spacing={2} alignItems='center'>
            {['tertiary', 'secondary', 'primary'].map((variant) => (
              <IconButton key={variant} variant={variant} accessibilityLabel={`${variant} icon button`} onPress={() => {}}>
                <Typography level='title-sm' color={variant === 'primary' ? 'primary.solidColor' : 'text.secondary'}>
                  ×
                </Typography>
              </IconButton>
            ))}
          </Stack>
        </Section>

        <Section label='Chips'>
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            <Chip onPress={() => {}}>unselected</Chip>
            <Chip selected onPress={() => {}}>
              selected
            </Chip>
            <Chip size='md' onPress={() => {}}>
              md
            </Chip>
          </Stack>
        </Section>

        <Section label='Segmented'>
          <SegmentedDemo />
        </Section>

        <Section label='Inputs'>
          <InputDemo />
        </Section>

        <Section label='Choices'>
          <ChoiceDemo />
        </Section>

        <Section label='Stack, row'>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Box bg='background.level2' padding={1} radius='sm' />
            <Box bg='background.level2' padding={2} radius='sm' />
            <Divider orientation='vertical' />
            <Typography level='body-xs' color='text.tertiary'>
              gap from the scale
            </Typography>
          </Stack>
        </Section>
      </Stack>
    </Box>
  )
}

function SegmentedDemo() {
  const [value, setValue] = useState('decks')
  return (
    <Segmented
      accessibilityLabel='Library view'
      value={value}
      onChange={setValue}
      options={[
        { value: 'decks', label: 'Decks' },
        { value: 'cards', label: 'Cards' },
        { value: 'tags', label: 'Tags' }
      ]}
    />
  )
}

function InputDemo() {
  const [text, setText] = useState('')
  const [choice, setChoice] = useState('flashcard')
  return (
    <Stack spacing={2}>
      <FormField labelKey='Title' helperKey='What this deck is for' required>
        <Input
          value={text}
          onChangeText={setText}
          placeholder='Spanish verbs'
          accessibilityLabel='Title'
          returnKeyType='done'
          autoCapitalize='sentences'
        />
      </FormField>
      <FormField labelKey='Title' errorKey='This field is required'>
        <Input value='' onChangeText={() => {}} invalid accessibilityLabel='Title, invalid' />
      </FormField>
      <FormField labelKey='Card type'>
        <Select
          accessibilityLabel='Card type'
          value={choice}
          onChange={setChoice}
          placeholderKey='Choose one'
          options={[
            { value: 'flashcard', label: 'Flashcard' },
            { value: 'quiz', label: 'Quiz' },
            { value: 'visual', label: 'Visual' }
          ]}
        />
      </FormField>
      <FormField labelKey='Notes'>
        <Input value='' onChangeText={() => {}} multiline accessibilityLabel='Notes' />
      </FormField>
    </Stack>
  )
}

function ChoiceDemo() {
  const [checked, setChecked] = useState(true)
  const [picked, setPicked] = useState('daily')
  return (
    <Stack spacing={1}>
      <Checkbox checked={checked} label='Shuffle the deck' onPress={() => setChecked(!checked)} />
      <Checkbox checked={false} disabled label='Unavailable' onPress={() => {}} />
      <Radio checked={picked === 'daily'} label='Every day' onPress={() => setPicked('daily')} />
      <Radio checked={picked === 'weekly'} label='Every week' onPress={() => setPicked('weekly')} />
    </Stack>
  )
}

function Section({ label, children }) {
  return (
    <Stack spacing={1}>
      <Typography level='body-xs' color='text.tertiary'>
        {label}
      </Typography>
      <Divider />
      <Stack spacing={1}>{children}</Stack>
    </Stack>
  )
}
