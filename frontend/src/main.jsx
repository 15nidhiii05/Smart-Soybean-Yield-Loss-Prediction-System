import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const show = (e) => (
  <pre style={{ padding: 24, color: '#B8512E', whiteSpace: 'pre-wrap', fontSize: 14 }}>
    {'The app failed to start:\n\n' + String(e?.stack || e)}
  </pre>
)

// Catches errors while the app is running
class Boundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() { return this.state.error ? show(this.state.error) : this.props.children }
}

const root = ReactDOM.createRoot(document.getElementById('root'))

// Loading App through import() also catches missing files and missing exports
Promise.all([import('framer-motion'), import('./App.jsx')])
  .then(([{ MotionConfig }, { default: App }]) =>
    root.render(<Boundary><MotionConfig reducedMotion="user"><App /></MotionConfig></Boundary>))
  .catch((e) => root.render(show(e)))