import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import { createStore } from './store'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={createStore()}>
      <App />
    </Provider>
  </StrictMode>,
)
