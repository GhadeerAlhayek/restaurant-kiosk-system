import { useState } from 'react'
import './CartPage.css'

function CartPage({ cart, onUpdateQuantity, onClear, onBack, onCheckout }) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const handleCheckoutClick = () => {
    setShowConfirmation(true)
  }

  const handleConfirmOrder = () => {
    setShowConfirmation(false)
    onCheckout()
  }

  const handleCancelOrder = () => {
    setShowConfirmation(false)
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <button onClick={onBack}>← Retour</button>
        <h2>Votre Panier</h2>
        <button onClick={onClear} disabled={cart.length === 0}>
          Vider
        </button>
      </div>

      <div className="cart-content">
        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Votre panier est vide</p>
            <button onClick={onBack}>Retour au menu</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => {
                const itemKey = item.cartId || item.id;
                return (
                  <div key={itemKey} className="cart-item">
                    <div className="item-details">
                      <h3>{item.name}</h3>

                      {/* Display customizations */}
                      {item.customizations && (
                        <div className="item-customizations">
                          {item.customizations.size && (
                            <span className="customization-badge">
                              {item.customizations.size.name}
                            </span>
                          )}
                          {item.customizations.ingredients && item.customizations.ingredients.length > 0 && (
                            <div className="ingredients-list">
                              {item.customizations.ingredients.map((ing, idx) => (
                                <span key={idx} className="ingredient-badge">
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display build-your-own */}
                      {item.build_your_own && (
                        <div className="item-customizations">
                          {item.build_your_own.size && (
                            <span className="customization-badge">
                              {item.build_your_own.size.name}
                            </span>
                          )}
                          {item.build_your_own.ingredients && item.build_your_own.ingredients.length > 0 && (
                            <div className="ingredients-list">
                              {item.build_your_own.ingredients.map((ing, idx) => (
                                <span key={idx} className="ingredient-badge">
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {item.instructions && (
                        <p className="item-instructions">Note: {item.instructions}</p>
                      )}

                      <p className="item-price">{item.price.toFixed(2)}€</p>
                    </div>
                    <div className="item-controls">
                      <button onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <p className="item-subtotal">
                      {(item.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="cart-footer">
              <div className="total-section">
                <span>TOTAL</span>
                <span className="total-amount">{total.toFixed(2)}€</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckoutClick}>
                COMMANDER
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="confirmation-overlay" onClick={handleCancelOrder}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmer votre commande?</h2>
            <div className="confirmation-total">
              <span>Total:</span>
              <span className="confirmation-amount">{total.toFixed(2)}€</span>
            </div>
            <div className="confirmation-buttons">
              <button className="cancel-btn" onClick={handleCancelOrder}>
                Annuler
              </button>
              <button className="confirm-btn" onClick={handleConfirmOrder}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CartPage
