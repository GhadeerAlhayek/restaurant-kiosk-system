import { useState } from 'react'
import './HomePage.css'

function HomePage({ onStart }) {
  const [showSelection, setShowSelection] = useState(false)

  const handleVideoClick = () => {
    setShowSelection(true)
  }

  const handleSelection = (orderType) => {
    onStart(orderType) // Pass the order type (takeaway or dine-in)
  }

  return (
    <div className="home-page">
      {/* Video Welcome Screen */}
      {!showSelection && (
        <div className="video-welcome-screen" onClick={handleVideoClick}>
          <video
            className="intro-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/assets/intro-video.mp4" type="video/mp4" />
          </video>

          <div className="video-overlay">
            <button className="start-order-btn">
              Touchez pour commander
            </button>
          </div>
        </div>
      )}

      {/* Order Type Selection */}
      {showSelection && (
        <div className="selection-screen">
          <h2 className="selection-title">Bienvenue</h2>

          <div className="selection-buttons">
            <button
              className="selection-btn takeaway-btn"
              onClick={() => handleSelection('takeaway')}
            >
              <img src="/assets/a-emporter.png" alt="À Emporter" className="btn-icon-img" />
              <span className="btn-text">À Emporter</span>
            </button>

            <button
              className="selection-btn dinein-btn"
              onClick={() => handleSelection('dine-in')}
            >
              <img src="/assets/sur-place.png" alt="Sur Place" className="btn-icon-img" />
              <span className="btn-text">Sur Place</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
