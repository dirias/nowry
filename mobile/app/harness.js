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
  ActionSheet,
  BottomSheet,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  FormField,
  Icon,
  IconButton,
  IdentityTile,
  Input,
  ListRow,
  Measure,
  Progress,
  Radio,
  Readout,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Stack,
  SummaryObject,
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

        <Section label='Summary object (ADR-021 §1)'>
          <SummaryObject
            title='Today'
            context='Monday, 8 September'
            progress={62}
            readouts={
              <>
                <Readout leading>12 due</Readout>
                <Readout>4 decks</Readout>
                <Readout>18 day streak</Readout>
              </>
            }
            action={<Button size='sm'>Start studying</Button>}
            secondary={
              <Button size='sm' variant='tertiary'>
                History
              </Button>
            }
          />
          <SummaryObject
            title='Today'
            context='Nothing due'
            empty='All caught up. Add a deck when you are ready.'
            action={<Button size='sm'>Add a deck</Button>}
          />
        </Section>

        <Section label='List rows (ADR-021 §2)'>
          <ListRow
            tile={<IdentityTile color='primary.solidBg' />}
            name='Spanish verbs'
            meta='42 cards · reviewed yesterday'
            measure={<Measure value={62} accessibilityLabel='62 percent learned' />}
            readout={<Readout leading>3 due</Readout>}
            onPress={() => {}}
          />
          <Divider />
          <ListRow
            tile={<IdentityTile color='danger.plainColor' />}
            name='Kanji, set two'
            meta='128 cards'
            measure={<Measure value={0} accessibilityLabel='nothing learned yet' />}
            readout={<Readout>up to date</Readout>}
            onPress={() => {}}
          />
        </Section>

        <Section label='Surfaces'>
          <Sheet>
            <Typography level='body-xs' color='text.secondary'>
              Sheet — surface, radius lg, no border, no shadow
            </Typography>
          </Sheet>
          <Card>
            <Typography level='body-xs' color='text.secondary'>
              Card — level1 with a hairline
            </Typography>
          </Card>
        </Section>

        <Section label='Loading and progress'>
          <Skeleton width='70%' height={18} />
          <Skeleton width='40%' height={14} />
          <Progress value={38} accessibilityLabel='38 percent' />
        </Section>

        <Section label='Sheets'>
          <SheetDemo />
        </Section>

        <Section label='Icons'>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
            {['GraduationCap', 'BookOpen', 'Flag', 'Layers', 'CircleQuestionMark', 'Flame', 'Sparkles', 'Trash'].map((n) => (
              <Icon key={n} name={n} />
            ))}
          </Stack>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Icon name='Check' size='sm' color='text.tertiary' />
            <Icon name='Check' size='md' color='text.secondary' />
            <Icon name='Check' size='lg' color='primary.plainColor' />
          </Stack>
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

function SheetDemo() {
  const [sheet, setSheet] = useState(false)
  const [menu, setMenu] = useState(false)
  return (
    <Stack spacing={1}>
      <Button size='sm' variant='secondary' onPress={() => setSheet(true)}>
        Open a bottom sheet
      </Button>
      <Button size='sm' variant='secondary' onPress={() => setMenu(true)}>
        Open an action sheet
      </Button>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title='Drag me down'>
        <Typography level='body-sm' color='text.secondary'>
          Past a third of the height, or fast enough, it goes. Short of that it springs back.
        </Typography>
      </BottomSheet>
      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title='Deck'
        actions={[
          { id: 'rename', label: 'Rename' },
          { id: 'archive', label: 'Archive' },
          { id: 'delete', label: 'Delete', destructive: true }
        ]}
      />
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
