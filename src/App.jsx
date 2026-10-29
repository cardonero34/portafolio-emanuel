import { useState } from 'react'
import './App.css'
import Portafolio from './assets/Portafolio'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Portafolio></Portafolio>
    </>
  )
}

export default App
