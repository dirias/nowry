/* eslint-disable react/react-in-jsx-scope */
import Sheet from '@mui/joy/Sheet'
import Grid from '@mui/joy/Grid'
import Stack from '@mui/joy/Stack'
import Deck from './Deck'
import Typography from '@mui/joy/Typography'

const deckGroups = [
  {
    title: 'Nuevas',
    disabled: true,
    decks: [
      {
        deckName: 'Japonés',
        deckTotal: 50,
        url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg',
        status: 'new',
        progress: 10
      },
      {
        deckName: 'Alemán',
        deckTotal: 32,
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0MovKqAubySdDgL-9jKyX8qIZmhmVJ4Q6tg&s',
        status: 'new',
        progress: 0
      },
      {
        deckName: 'Inglés',
        deckTotal: 145,
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRM9y47htjOSJ0HEDhCb7OpND3PhLX8XNxOxA&s',
        status: 'new',
        progress: 25
      }
    ]
  },
  {
    title: 'Repasar',
    decks: [
      {
        deckName: 'Progra',
        deckTotal: 88,
        url: 'https://concepto.de/wp-content/uploads/2020/08/Programacion-informatica-scaled-e1724960033513.jpg',
        status: null,
        progress: 70
      }
    ]
  },
  {
    title: 'Necesita atención',
    decks: [
      {
        deckName: 'Mandarín',
        deckTotal: 63,
        url: 'https://www.shutterstock.com/image-vector/snake-asian-dragon-chinase-japan-600w-2304596157.jpg',
        status: 'attention',
        progress: 30
      },
      {
        deckName: 'IA',
        deckTotal: 77,
        url: 'https://eu-images.contentstack.com/v3/assets/blt23eb5bbc4124baa6/blt7f58256bb2a1ddc6/6503353220e2ed989973220d/AI_Learning_and_Artificial_Intelligence_Concept_-_Icon_Graphic_Interface_showing_computer_machine_thinking_and_AI_Artificial_Intelligence_of_Digital.jpg?width=1280&auto=webp&quality=95&format=jpg&disable=upscale',
        status: 'attention',
        progress: 15
      }
    ]
  },
  {
    title: 'Archivados',
    decks: [
      {
        deckName: 'Mandarín',
        deckTotal: 63,
        url: 'https://www.shutterstock.com/image-vector/snake-asian-dragon-chinase-japan-600w-2304596157.jpg',
        status: null,
        progress: 100
      },
      {
        deckName: 'IA',
        deckTotal: 77,
        url: 'https://eu-images.contentstack.com/v3/assets/blt23eb5bbc4124baa6/blt7f58256bb2a1ddc6/6503353220e2ed989973220d/AI_Learning_and_Artificial_Intelligence_Concept_-_Icon_Graphic_Interface_showing_computer_machine_thinking_and_AI_Artificial_Intelligence_of_Digital.jpg?width=1280&auto=webp&quality=95&format=jpg&disable=upscale',
        status: null,
        progress: 100
      }
    ]
  }
]

export default function DecksView() {
  return (
    <Sheet
      sx={{
        paddingTop: 6,
        paddingBottom: 10,
        backgroundColor: '#f9fcfd',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <Grid container spacing={4} justifyContent='center' sx={{ maxWidth: '1280px', mx: 'auto', px: 2 }}>
        {deckGroups.map((group, index) => (
          <Grid
            item
            key={index}
            xs={12}
            sm={6}
            md={4}
            lg={3}
            sx={{
              backgroundColor: 'white',
              borderRadius: 'xl',
              boxShadow: 'lg',
              px: 3,
              py: 4,
              minWidth: 280
            }}
          >
            <Typography
              level='title-sm'
              sx={{
                fontWeight: 800,
                textAlign: 'center',
                textTransform: 'uppercase',
                color: 'primary.600',
                fontSize: 'md',
                letterSpacing: 1,
                mb: 2
              }}
            >
              {group.title}
            </Typography>

            <Stack direction='column' spacing={2}>
              {group.decks.map((deck, idx) => (
                <Deck
                  key={idx}
                  deckName={deck.deckName}
                  deckTotal={deck.deckTotal}
                  url={deck.url}
                  status={deck.status}
                  progress={deck.progress}
                />
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Sheet>
  )
}
