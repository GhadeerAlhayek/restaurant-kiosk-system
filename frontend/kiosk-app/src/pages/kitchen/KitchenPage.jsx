import { useState, useEffect } from 'react'
import './KitchenPage.css'

const API_URL = '/api'

function KitchenPage() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    fetchOrders()
    // Refresh every 5 seconds
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      if (data.success) {
        // Only show confirmed orders (sent by admin), sorted oldest first
        const confirmed = data.data
          .filter(o => o.status === 'confirmed')
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setOrders(confirmed)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const markDone = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      const data = await res.json()
      if (data.success) {
        fetchOrders()
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  return (
    <div className="kitchen-page">
      <header className="kitchen-header">
        <h1>🍕 Cuisine</h1>
        <div className="header-stats">
          <span className="stat confirmed">{orders.length} commandes</span>
        </div>
        <a href="/" className="back-btn">🏠 Kiosk</a>
      </header>

      <div className="orders-container">
        {orders.length === 0 ? (
          <div className="no-orders">
            <span className="no-orders-icon">✨</span>
            <p>Aucune commande</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="kitchen-order-card confirmed">
              <div className="order-card-header">
                <div className="order-number">#{order.order_number}</div>
                <div className="payment-badge">
                  {order.payment_method === 'card' ? '💳' : '💵'}
                </div>
              </div>

              <div className="order-time">
                {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div className="order-items-list">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span className="item-qty">{item.quantity}x</span>
                    <span className="item-name">{item.name || `Item #${item.menu_item_id}`}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="order-notes">
                  📝 {order.notes}
                </div>
              )}

              <div className="order-actions">
                <button className="action-btn done" onClick={() => markDone(order.id)}>
                  ✅ Terminée
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default KitchenPage
