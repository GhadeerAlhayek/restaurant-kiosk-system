import { useState, useEffect } from 'react'
import './AdminPage.css'

const API_URL = '/api'

function AdminPage() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (currentPage === 'categories') fetchCategories()
    if (currentPage === 'menu') {
      fetchMenuItems()
      fetchCategories()
    }
    if (currentPage === 'orders') fetchOrders()
    if (currentPage === 'dashboard') {
      fetchCategories()
      fetchMenuItems()
      fetchOrders()
    }
  }, [currentPage])

  // Auto-refresh orders every 5 seconds
  useEffect(() => {
    if (currentPage === 'orders' || currentPage === 'dashboard') {
      const interval = setInterval(fetchOrders, 5000)
      return () => clearInterval(interval)
    }
  }, [currentPage])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`)
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchMenuItems = async () => {
    try {
      const res = await fetch(`${API_URL}/menu`)
      const data = await res.json()
      if (data.success) setMenuItems(data.data)
    } catch (error) {
      console.error('Error fetching menu:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`)
      const data = await res.json()
      if (data.success) setOrders(data.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  return (
    <div className="admin-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Admin Panel</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`nav-btn ${currentPage === 'categories' ? 'active' : ''}`}
            onClick={() => setCurrentPage('categories')}
          >
            <span className="nav-icon">📁</span>
            Catégories
          </button>
          <button
            className={`nav-btn ${currentPage === 'menu' ? 'active' : ''}`}
            onClick={() => setCurrentPage('menu')}
          >
            <span className="nav-icon">🍕</span>
            Menu Items
          </button>
          <button
            className={`nav-btn ${currentPage === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('orders')}
          >
            <span className="nav-icon">📋</span>
            Commandes
          </button>
          <a href="/" className="nav-btn back-link">
            <span className="nav-icon">🏠</span>
            Retour Kiosk
          </a>
        </nav>
      </aside>

      <main className="main-content">
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {currentPage === 'dashboard' && (
          <DashboardPage
            categories={categories}
            menuItems={menuItems}
            orders={orders}
          />
        )}

        {currentPage === 'categories' && (
          <CategoriesPage
            categories={categories}
            onRefresh={fetchCategories}
            showNotification={showNotification}
          />
        )}

        {currentPage === 'menu' && (
          <MenuItemsPage
            menuItems={menuItems}
            categories={categories}
            onRefresh={fetchMenuItems}
            showNotification={showNotification}
          />
        )}

        {currentPage === 'orders' && (
          <OrdersPage
            orders={orders}
            onRefresh={fetchOrders}
            showNotification={showNotification}
          />
        )}
      </main>
    </div>
  )
}

function DashboardPage({ categories, menuItems, orders }) {
  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString()
    return new Date(o.created_at).toDateString() === today
  })

  const todayRevenue = todayOrders
    .filter(o => o.status === 'confirmed' || o.status === 'completed')
    .reduce((sum, o) => sum + o.total_amount, 0)
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const inKitchenOrders = orders.filter(o => o.status === 'confirmed')

  return (
    <div className="page dashboard-page">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-info">
            <span className="stat-value">{categories.length}</span>
            <span className="stat-label">Catégories</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🍕</div>
          <div className="stat-info">
            <span className="stat-value">{menuItems.length}</span>
            <span className="stat-label">Menu Items</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{todayOrders.length}</span>
            <span className="stat-label">Commandes Aujourd'hui</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">{todayRevenue.toFixed(2)}€</span>
            <span className="stat-label">Revenu Aujourd'hui</span>
          </div>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div className="pending-orders urgent">
          <h3>🔔 Nouvelles commandes ({pendingOrders.length})</h3>
          <p className="urgent-notice">Allez dans Commandes pour confirmer</p>
          <div className="orders-list">
            {pendingOrders.map(order => (
              <div key={order.id} className="order-card pending">
                <div className="order-header">
                  <span className="order-number">#{order.order_number}</span>
                </div>
                <div className="order-total">{order.total_amount.toFixed(2)}€</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inKitchenOrders.length > 0 && (
        <div className="pending-orders">
          <h3>👨‍🍳 En cuisine ({inKitchenOrders.length})</h3>
          <div className="orders-list">
            {inKitchenOrders.map(order => (
              <div key={order.id} className="order-card confirmed">
                <div className="order-header">
                  <span className="order-number">#{order.order_number}</span>
                  <span className="payment-small">{order.payment_method === 'card' ? '💳' : '💵'}</span>
                </div>
                <div className="order-total">{order.total_amount.toFixed(2)}€</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoriesPage({ categories, onRefresh, showNotification }) {
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [managingCustomization, setManagingCustomization] = useState(null) // Category being managed
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    icon: '',
    display_order: 0,
    is_active: true,
    is_customizable: false,
    is_build_your_own: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingCategory
        ? `${API_URL}/categories/${editingCategory.id}`
        : `${API_URL}/categories`

      const res = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        showNotification(editingCategory ? 'Catégorie mise à jour' : 'Catégorie créée')
        setShowModal(false)
        setEditingCategory(null)
        setFormData({ name: '', display_name: '', icon: '', display_order: 0, is_active: true })
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      display_name: category.display_name,
      icon: category.icon || '',
      display_order: category.display_order,
      is_active: category.is_active,
      is_customizable: category.is_customizable || false,
      is_build_your_own: category.is_build_your_own || false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette catégorie?')) return

    try {
      const res = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        showNotification('Catégorie supprimée')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  return (
    <div className="page categories-page">
      <div className="page-header">
        <h2>Catégories</h2>
        <button className="btn-primary" onClick={() => {
          setEditingCategory(null)
          setFormData({ name: '', display_name: '', icon: '', display_order: 0, is_active: true, is_customizable: false, is_build_your_own: false })
          setShowModal(true)
        }}>
          + Nouvelle Catégorie
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Nom</th>
              <th>Nom affiché</th>
              <th>Ordre</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td className="icon-cell">{category.icon}</td>
                <td>{category.name}</td>
                <td>{category.display_name}</td>
                <td>{category.display_order}</td>
                <td>
                  {category.is_customizable && (
                    <span className="badge-customizable">Personnalisable</span>
                  )}
                  {category.is_build_your_own && (
                    <span className="badge-build-your-own">Composer</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${category.is_active ? 'active' : 'inactive'}`}>
                    {category.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(category)}>Modifier</button>
                  {(category.is_customizable || category.is_build_your_own) && (
                    <button className="btn-manage" onClick={() => setManagingCustomization(category)}>Gérer</button>
                  )}
                  <button className="btn-delete" onClick={() => handleDelete(category.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingCategory ? 'Modifier Catégorie' : 'Nouvelle Catégorie'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom (identifiant)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="ex: drinks"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom affiché</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={e => setFormData({...formData, display_name: e.target.value})}
                  placeholder="ex: Boissons"
                  required
                />
              </div>
              <div className="form-group">
                <label>Icon (emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={e => setFormData({...formData, icon: e.target.value})}
                  placeholder="ex: 🥤"
                />
              </div>
              <div className="form-group">
                <label>Ordre d'affichage</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData({...formData, display_order: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Actif
                </label>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_customizable}
                    onChange={e => setFormData({...formData, is_customizable: e.target.checked})}
                  />
                  Personnalisable (tailles & ingrédients)
                </label>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_build_your_own}
                    onChange={e => setFormData({...formData, is_build_your_own: e.target.checked})}
                  />
                  Composer soi-même (sandwich à créer)
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingCustomization && (
        <CustomizationManager
          category={managingCustomization}
          onClose={() => setManagingCustomization(null)}
          onRefresh={onRefresh}
          showNotification={showNotification}
        />
      )}
    </div>
  )
}

function CustomizationManager({ category, onClose, onRefresh, showNotification }) {
  const [sizes, setSizes] = useState(category.sizes || [])
  const [ingredients, setIngredients] = useState(category.ingredients || [])
  const [newSize, setNewSize] = useState({ name: '', price: '', display_order: 0 })
  const [newIngredient, setNewIngredient] = useState({ name: '', price: '', display_order: 0 })
  const [editingSize, setEditingSize] = useState(null)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [sizeImageFile, setSizeImageFile] = useState(null)
  const [ingredientImageFile, setIngredientImageFile] = useState(null)

  const addSize = async (e) => {
    e.preventDefault()

    // Validate fields
    if (!newSize.name || !newSize.price) {
      showNotification('Nom et prix sont requis', 'error')
      return
    }

    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/sizes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSize.name.trim(),
          price: parseFloat(newSize.price),
          display_order: newSize.display_order || 0
        })
      })
      const data = await res.json()
      if (data.success) {
        setSizes([...sizes, data.data])
        setNewSize({ name: '', price: '', display_order: 0 })
        showNotification('Taille ajoutée')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      console.error('Error adding size:', error)
      showNotification('Erreur de connexion', 'error')
    }
  }

  const updateSize = async (sizeId, updates) => {
    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/sizes/${sizeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.success) {
        setSizes(sizes.map(s => s.id === sizeId ? data.data : s))
        setEditingSize(null)
        showNotification('Taille mise à jour')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const deleteSize = async (sizeId) => {
    if (!confirm('Supprimer cette taille?')) return
    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/sizes/${sizeId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setSizes(sizes.filter(s => s.id !== sizeId))
        showNotification('Taille supprimée')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const addIngredient = async (e) => {
    e.preventDefault()

    // Validate fields
    if (!newIngredient.name || !newIngredient.price) {
      showNotification('Nom et prix sont requis', 'error')
      return
    }

    try {
      const formData = new FormData()
      formData.append('name', newIngredient.name.trim())
      formData.append('price', parseFloat(newIngredient.price))
      formData.append('display_order', newIngredient.display_order || 0)
      if (ingredientImageFile) {
        formData.append('image', ingredientImageFile)
      }

      console.log('Sending ingredient data:', {
        name: newIngredient.name,
        price: newIngredient.price,
        display_order: newIngredient.display_order
      })

      const res = await fetch(`${API_URL}/categories/${category.id}/ingredients`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setIngredients([...ingredients, data.data])
        setNewIngredient({ name: '', price: '', display_order: 0 })
        setIngredientImageFile(null)
        showNotification('Ingrédient ajouté')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      console.error('Error adding ingredient:', error)
      showNotification('Erreur de connexion', 'error')
    }
  }

  const updateIngredient = async (ingredientId, updates) => {
    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (data.success) {
        setIngredients(ingredients.map(i => i.id === ingredientId ? data.data : i))
        setEditingIngredient(null)
        showNotification('Ingrédient mis à jour')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const deleteIngredient = async (ingredientId) => {
    if (!confirm('Supprimer cet ingrédient?')) return
    try {
      const res = await fetch(`${API_URL}/categories/${category.id}/ingredients/${ingredientId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setIngredients(ingredients.filter(i => i.id !== ingredientId))
        showNotification('Ingrédient supprimé')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <h3>Gérer: {category.display_name}</h3>

        <div className="customization-sections">
          {/* Sizes Section */}
          <div className="customization-section">
            <h4>Tailles</h4>
            <form onSubmit={addSize} className="inline-form">
              <input
                type="text"
                placeholder="Nom (ex: Petit)"
                value={newSize.name}
                onChange={e => setNewSize({...newSize, name: e.target.value})}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Prix"
                value={newSize.price}
                onChange={e => setNewSize({...newSize, price: e.target.value})}
                required
              />
              <button type="submit" className="btn-primary btn-sm">+ Ajouter</button>
            </form>

            <div className="items-list">
              {sizes.map(size => (
                <div key={size.id} className="item-row">
                  {editingSize === size.id ? (
                    <>
                      <input
                        type="text"
                        value={size.name}
                        onChange={e => setSizes(sizes.map(s => s.id === size.id ? {...s, name: e.target.value} : s))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={size.price}
                        onChange={e => setSizes(sizes.map(s => s.id === size.id ? {...s, price: e.target.value} : s))}
                      />
                      <button className="btn-edit btn-sm" onClick={() => updateSize(size.id, size)}>✓</button>
                      <button className="btn-cancel btn-sm" onClick={() => setEditingSize(null)}>✗</button>
                    </>
                  ) : (
                    <>
                      <span className="item-name">{size.name}</span>
                      <span className="item-price">{size.price}€</span>
                      <button className="btn-edit btn-sm" onClick={() => setEditingSize(size.id)}>Modifier</button>
                      <button className="btn-delete btn-sm" onClick={() => deleteSize(size.id)}>Supprimer</button>
                    </>
                  )}
                </div>
              ))}
              {sizes.length === 0 && <p className="empty-message">Aucune taille</p>}
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="customization-section">
            <h4>Ingrédients</h4>
            <form onSubmit={addIngredient} className="inline-form">
              <input
                type="text"
                placeholder="Nom (ex: Fromage)"
                value={newIngredient.name}
                onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Prix"
                value={newIngredient.price}
                onChange={e => setNewIngredient({...newIngredient, price: e.target.value})}
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={e => setIngredientImageFile(e.target.files[0])}
              />
              <button type="submit" className="btn-primary btn-sm">+ Ajouter</button>
            </form>

            <div className="items-list">
              {ingredients.map(ingredient => (
                <div key={ingredient.id} className="item-row">
                  {editingIngredient === ingredient.id ? (
                    <>
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={e => setIngredients(ingredients.map(i => i.id === ingredient.id ? {...i, name: e.target.value} : i))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={ingredient.price}
                        onChange={e => setIngredients(ingredients.map(i => i.id === ingredient.id ? {...i, price: e.target.value} : i))}
                      />
                      <button className="btn-edit btn-sm" onClick={() => updateIngredient(ingredient.id, ingredient)}>✓</button>
                      <button className="btn-cancel btn-sm" onClick={() => setEditingIngredient(null)}>✗</button>
                    </>
                  ) : (
                    <>
                      <span className="item-name">{ingredient.name}</span>
                      <span className="item-price">{ingredient.price}€</span>
                      <button className="btn-edit btn-sm" onClick={() => setEditingIngredient(ingredient.id)}>Modifier</button>
                      <button className="btn-delete btn-sm" onClick={() => deleteIngredient(ingredient.id)}>Supprimer</button>
                    </>
                  )}
                </div>
              ))}
              {ingredients.length === 0 && <p className="empty-message">Aucun ingrédient</p>}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>Terminé</button>
        </div>
      </div>
    </div>
  )
}

function MenuItemsPage({ menuItems, categories, onRefresh, showNotification }) {
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null) // null = all items
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_type: 'tomato',
    price: '',
    category_id: '',
    is_available: true,
    display_order: 0
  })
  const [imageFile, setImageFile] = useState(null)

  // Filter items by selected category
  const filteredItems = selectedCategory === null
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setImageFile(null)
    setImagePreview(null)
    // Auto-select current category when adding new item
    setFormData({
      name: '',
      description: '',
      base_type: 'tomato',
      price: '',
      category_id: selectedCategory || '',
      is_available: true,
      display_order: 0
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key])
      })
      if (imageFile) {
        formDataToSend.append('image', imageFile)
      }

      const url = editingItem ? `${API_URL}/menu/${editingItem.id}` : `${API_URL}/menu`

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        body: formDataToSend
      })

      const data = await res.json()

      if (data.success) {
        showNotification(editingItem ? 'Item mis à jour' : 'Item créé')
        setShowModal(false)
        setEditingItem(null)
        setImageFile(null)
        setImagePreview(null)
        setFormData({ name: '', description: '', base_type: 'tomato', price: '', category_id: '', is_available: true, display_order: 0 })
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      base_type: item.base_type,
      price: item.price,
      category_id: item.category_id || '',
      is_available: item.is_available,
      display_order: item.display_order || 0
    })
    setImagePreview(item.image_url ? `${API_URL}/images/${item.image_url}` : null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet item?')) return

    try {
      const res = await fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        showNotification('Item supprimé')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const toggleAvailability = async (item) => {
    try {
      const res = await fetch(`${API_URL}/menu/${item.id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !item.is_available })
      })
      const data = await res.json()

      if (data.success) {
        showNotification(item.is_available ? 'Item marqué indisponible' : 'Item marqué disponible')
        onRefresh()
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  // Get current category name for header
  const currentCategoryName = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.display_name || 'Catégorie'
    : 'Tous les Items'

  // Check if icon is an image path or emoji
  const isImageIcon = (icon) => {
    if (!icon) return false
    return icon.startsWith('/') || icon.endsWith('.jpg') || icon.endsWith('.png') || icon.endsWith('.svg')
  }

  return (
    <div className="menu-items-page-layout">
      {/* Category Sidebar */}
      <div className="category-sidebar">
        <h3>Catégories</h3>
        <div className="category-list">
          <button
            className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            <span className="cat-icon">📋</span>
            <span className="cat-name">Tous</span>
            <span className="cat-count">{menuItems.length}</span>
          </button>
          {categories.map(cat => {
            const itemCount = menuItems.filter(i => i.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {isImageIcon(cat.icon) ? (
                  <img
                    src={cat.icon.startsWith('/') ? cat.icon : `/assets/category-icons/${cat.icon}`}
                    alt=""
                    className="cat-icon-img"
                  />
                ) : (
                  <span className="cat-icon">{cat.icon || '📋'}</span>
                )}
                <span className="cat-name">{cat.display_name}</span>
                <span className="cat-count">{itemCount}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="menu-items-content">
        <div className="page-header">
          <h2>{currentCategoryName}</h2>
          <button className="btn-primary" onClick={handleAddNew}>
            + Nouvel Item
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="no-items">
            <p>Aucun item dans cette catégorie</p>
            <button className="btn-primary" onClick={handleAddNew}>
              + Ajouter un item
            </button>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredItems.map(item => (
              <div key={item.id} className={`menu-card ${!item.is_available ? 'unavailable' : ''}`}>
                <div className="menu-card-image">
                  {item.image_url ? (
                    <img src={`${API_URL}/images/${item.image_url}`} alt={item.name} />
                  ) : (
                    <div className="no-image">📷</div>
                  )}
                  <button
                    className={`availability-toggle ${item.is_available ? 'available' : 'unavailable'}`}
                    onClick={() => toggleAvailability(item)}
                  >
                    {item.is_available ? '✓' : '✕'}
                  </button>
                </div>
                <div className="menu-card-content">
                  <h4>{item.name}</h4>
                  {item.category_name && (
                    <span className="category-tag">{item.category_name}</span>
                  )}
                  <p className="description">{item.description}</p>
                  <div className="menu-card-footer">
                    <span className="price">{item.price.toFixed(2)}€</span>
                    <span className={`base-type ${item.base_type}`}>
                      {item.base_type === 'tomato' ? '🍅' : '🥛'}
                    </span>
                  </div>
                  <div className="menu-card-actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)}>Modifier</button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)}>Supprimer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <h3>{editingItem ? 'Modifier Item' : 'Nouvel Item'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Prix (€)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Catégorie</label>
                <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} required>
                  <option value="">-- Sélectionner --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
              </div>

              {/* Only show base type for pizza category */}
              {categories.find(c => c.id === parseInt(formData.category_id))?.name === 'pizza' && (
                <div className="form-group">
                  <label>Type de base</label>
                  <select value={formData.base_type} onChange={e => setFormData({...formData, base_type: e.target.value})}>
                    <option value="tomato">Base Tomate 🍅</option>
                    <option value="cream">Base Crème 🥛</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ordre d'affichage</label>
                  <input type="number" value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value)})} />
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" checked={formData.is_available} onChange={e => setFormData({...formData, is_available: e.target.checked})} />
                    Disponible
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary">{editingItem ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function OrdersPage({ orders, onRefresh, showNotification }) {
  const [filter, setFilter] = useState('all')
  const [confirmModal, setConfirmModal] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)

  // Simple filter: pending (new), confirmed (in kitchen), completed/cancelled (done)
  const getFilteredOrders = () => {
    if (filter === 'all') return orders
    if (filter === 'pending') return orders.filter(o => o.status === 'pending')
    if (filter === 'active') return orders.filter(o => o.status === 'confirmed')
    if (filter === 'done') return orders.filter(o => o.status === 'completed' || o.status === 'cancelled')
    return orders
  }

  const filteredOrders = getFilteredOrders()

  const cancelOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      })
      const data = await res.json()

      if (data.success) {
        showNotification('Commande annulée')
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const confirmOrder = async () => {
    if (!confirmModal || !selectedPayment) return

    try {
      const res = await fetch(`${API_URL}/orders/${confirmModal.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: selectedPayment })
      })
      const data = await res.json()

      if (data.success) {
        showNotification(`Commande envoyée en cuisine - ${selectedPayment === 'card' ? 'Carte' : 'Espèces'}`)
        setConfirmModal(null)
        setSelectedPayment(null)
        onRefresh()
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Erreur de connexion', 'error')
    }
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const activeCount = orders.filter(o => o.status === 'confirmed').length

  return (
    <div className="page orders-page">
      <div className="page-header">
        <h2>Commandes</h2>
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Toutes
          </button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            Nouvelles {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
          <button className={`filter-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
            En cuisine {activeCount > 0 && <span className="badge">{activeCount}</span>}
          </button>
          <button className={`filter-btn ${filter === 'done' ? 'active' : ''}`} onClick={() => setFilter('done')}>
            Terminées
          </button>
        </div>
      </div>

      <div className="orders-grid">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">Aucune commande</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className={`order-detail-card ${order.status}`}>
              <div className="order-detail-header">
                <div className="order-number-large">#{order.order_number}</div>
                <span className={`status-tag ${order.status}`}>
                  {order.status === 'pending' && '🆕 Nouvelle'}
                  {order.status === 'confirmed' && '👨‍🍳 En cuisine'}
                  {order.status === 'completed' && '✅ Terminée'}
                  {order.status === 'cancelled' && '❌ Annulée'}
                </span>
              </div>

              <div className="order-meta">
                <span>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                {order.payment_method && (
                  <span className="payment-badge-small">
                    {order.payment_method === 'card' ? '💳 Carte' : '💵 Espèces'}
                  </span>
                )}
              </div>

              <div className="order-items">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="order-item-row">
                    <span className="qty">{item.quantity}x</span>
                    <span className="name">{item.name || `Item #${item.menu_item_id}`}</span>
                    <span className="price">{item.subtotal?.toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              <div className="order-total-row">
                <span>Total:</span>
                <span className="total-value">{order.total_amount.toFixed(2)}€</span>
              </div>

              {order.status === 'pending' && (
                <div className="order-actions">
                  <button className="btn-action confirm" onClick={() => {
                    setConfirmModal(order)
                    setSelectedPayment(null)
                  }}>
                    ✓ Confirmer
                  </button>
                  <button className="btn-action cancel" onClick={() => cancelOrder(order.id)}>
                    ✕ Annuler
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Payment Method Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
            <h3>Confirmer la commande #{confirmModal.order_number}</h3>
            <p className="modal-subtitle">Montant: <strong>{confirmModal.total_amount.toFixed(2)}€</strong></p>

            <div className="payment-options">
              <button
                className={`payment-btn card ${selectedPayment === 'card' ? 'selected' : ''}`}
                onClick={() => setSelectedPayment('card')}
              >
                <span className="payment-icon">💳</span>
                <span className="payment-label">Carte</span>
              </button>
              <button
                className={`payment-btn cash ${selectedPayment === 'cash' ? 'selected' : ''}`}
                onClick={() => setSelectedPayment('cash')}
              >
                <span className="payment-icon">💵</span>
                <span className="payment-label">Espèces</span>
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setConfirmModal(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmOrder}
                disabled={!selectedPayment}
              >
                Envoyer en cuisine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
