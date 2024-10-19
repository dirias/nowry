import axios from 'axios'

const SERVER = process.env.REACT_APP_SERVER_URL
const PROMPT = process.env.REACT_APP_CARD_GENERATION_PROMPT

export const generateCard = async (sampletText, sampleNumber) => {
  const token = localStorage.getItem('authToken')
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
  const response = await axios.post(
    `${SERVER}card/generate`,
    {
      prompt: PROMPT,
      sampleText: sampletText,
      sampleNumber: sampleNumber
    },
    config
  )

  console.log(response, 'response')
  return response.data
}
