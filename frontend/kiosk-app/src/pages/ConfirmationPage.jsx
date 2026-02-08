import './ConfirmationPage.css'

function ConfirmationPage({ orderNumber, onNewOrder }) {
  return (
    <div className="confirmation-page">
      <div className="confirmation-content">
        <div className="success-icon">✓</div>
        <h1>Confirmé et Payé ou continuer</h1>
        <div className="order-number">
          <p>Votre numéro de commande:</p>
          <h2>{orderNumber}</h2>
        </div>
        <p className="thank-you">Merci de votre commande!</p>
        <button onClick={onNewOrder} className="continue-btn">
          NOUVELLE COMMANDE
        </button>
      </div>
    </div>
  )
}

export default ConfirmationPage
