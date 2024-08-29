import React from 'react'
import HomePhrase from '../../images/Phrase1.jpeg'

const Landing = () => {
  return (
    <div className='content'>
      <div className='motivation'>
        <h1>Nowry</h1>
        <p>Use Artificial Intelligence to boost the way you learn.</p>
      </div>
      <div className='image'>
        <img src={HomePhrase} alt='Motivational Phrase' />
      </div>
    </div>
  )
}

export default Landing
