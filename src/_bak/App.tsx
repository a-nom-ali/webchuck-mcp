import React from 'react'
import './App.css'
import Header from './components/Header'
import ConnectionStatus from './components/ConnectionStatus'
import ConsoleOutput from './components/ConsoleOutput'
import CodeEditor from './components/CodeEditor'
import ParameterControls from './components/ParameterControls'
import SamplePreloader from './components/SamplePreloader'
import SampleLibrary from './components/SampleLibrary'
import ExamplePrograms from './components/ExamplePrograms'
import CodeLibrary from './components/CodeLibrary'

const App: React.FC = () => {
  return (
    <div className="container">
      <Header />
      <ConnectionStatus />
      <ConsoleOutput />
      <CodeEditor />
      <ParameterControls />
      <SamplePreloader />
      <SampleLibrary />
      <ExamplePrograms />
      <CodeLibrary />
    </div>
  )
}

export default App
