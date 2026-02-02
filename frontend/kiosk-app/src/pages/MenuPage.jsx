import { useState, useEffect } from 'react'
import './MenuPage.css'

// Mapping pizza names to grid photos (transparent background)
const pizzaGridPhotos = {
  'Mergheritta': '/assets/pizza-grid/Mergheritta_processed.png',
  'Fruits de mer': '/assets/pizza-grid/Fruit_de_mer_processed.png',
  'Végétarienne': '/assets/pizza-grid/Vegeterian_processed.png',
  'Halloumi': '/assets/pizza-grid/Halloumi_processed.png',
  'Bolognaise': '/assets/pizza-grid/Bolognaise_processed.png',
  '4 fromage': '/assets/pizza-grid/4_fromage_processed.png',
  'Thon': '/assets/pizza-grid/Thon_processed.png',
  'Mexicain': '/assets/pizza-grid/Mexican_processed.png',
  'Poulet': '/assets/pizza-grid/Chicken_base_creme_processed.png',
  'Poulet raclette': '/assets/pizza-grid/Chicken_raclette_base_creme_processed.png',
  'Saumon': '/assets/pizza-grid/Saumon_base_creme_processed.png',
  'Royal': '/assets/pizza-grid/Royal_processed.png',
}

function MenuPage({ cart, onAddToCart, onViewCart, onBack }) {
  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null) // null = first category
  const [baseFilter, setBaseFilter] = useState('all') // all, tomato, cream
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)

  // Customization state
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedIngredients, setSelectedIngredients] = useState([])

  // Build-your-own state
  const [buildYourOwnStep, setBuildYourOwnStep] = useState('size') // 'size' or 'ingredients' or 'confirm'
  const [buildYourOwnSize, setBuildYourOwnSize] = useState(null)
  const [buildYourOwnIngredients, setBuildYourOwnIngredients] = useState([])
  const [buildYourOwnName, setBuildYourOwnName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch both menu and categories
      const [menuRes, catRes] = await Promise.all([
        fetch('/api/menu?available=true'),
        fetch('/api/categories')
      ])

      const menuData = await menuRes.json()
      const catData = await catRes.json()

      if (menuData.success) {
        setMenu(menuData.data)
      }
      if (catData.success) {
        // Only show active categories that have items
        const activeCategories = catData.data.filter(c => c.is_active)
        setCategories(activeCategories)
        // Select first category by default
        if (activeCategories.length > 0 && selectedCategoryId === null) {
          setSelectedCategoryId(activeCategories[0].id)
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setLoading(false)
    }
  }

  // Get current category info
  const currentCategory = categories.find(c => c.id === selectedCategoryId)
  const isPizzaCategory = currentCategory?.name === 'pizza'

  // Filter menu based on category and base type
  const filteredMenu = menu.filter(item => {
    // First filter by category
    if (item.category_id !== selectedCategoryId) return false
    // Then filter by base type (only for pizza category)
    if (isPizzaCategory && baseFilter !== 'all' && item.base_type !== baseFilter) return false
    return true
  })

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleItemClick = (item) => {
    setSelectedItem(item)
    setInstructions('')
    setSelectedSize(null)
    setSelectedIngredients([])

    // If category is customizable and has sizes, pre-select first size
    if (currentCategory?.is_customizable && currentCategory.sizes?.length > 0) {
      setSelectedSize(currentCategory.sizes[0])
    }

    setShowModal(true)
  }

  const handleAddToCart = () => {
    // Calculate total price with customizations
    let finalPrice = selectedItem.price
    if (currentCategory?.is_customizable) {
      if (selectedSize) {
        finalPrice += selectedSize.price
      }
      if (selectedIngredients.length > 0) {
        finalPrice += selectedIngredients.reduce((sum, ing) => sum + ing.price, 0)
      }
    }

    onAddToCart({
      ...selectedItem,
      price: finalPrice,
      originalPrice: selectedItem.price,
      instructions: instructions.trim() || null,
      customizations: currentCategory?.is_customizable ? {
        size: selectedSize,
        ingredients: selectedIngredients
      } : null
    })
    setShowModal(false)
    setSelectedItem(null)
    setInstructions('')
    setSelectedSize(null)
    setSelectedIngredients([])
  }

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId)
    setBaseFilter('all') // Reset base filter when changing category
    // Reset build-your-own state
    setBuildYourOwnStep('size')
    setBuildYourOwnSize(null)
    setBuildYourOwnIngredients([])
    setBuildYourOwnName('')
  }

  const getGridPhoto = (pizzaName) => {
    return pizzaGridPhotos[pizzaName] || null
  }

  // Check if icon is an image path or emoji
  const isImageIcon = (icon) => {
    if (!icon) return false
    return icon.startsWith('/') || icon.endsWith('.jpg') || icon.endsWith('.png') || icon.endsWith('.svg')
  }

  return (
    <div className="menu-page">
      {/* Left sidebar with menu categories */}
      <div className="menu-sidebar">
        <div className="menu-header">
          <h2>Menu</h2>
        </div>

        <div className="category-list">
          {categories.map(category => (
            <button
              key={category.id}
              className={`sidebar-category-btn ${selectedCategoryId === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category.id)}
            >
              {isImageIcon(category.icon) ? (
                <img
                  src={category.icon.startsWith('/') ? category.icon : `/assets/category-icons/${category.icon}`}
                  alt=""
                  className="category-icon-img"
                />
              ) : (
                <span className="category-icon">{category.icon || '📋'}</span>
              )}
              <span className="category-label">{category.display_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="menu-content">
        {/* Top header with back button and cart */}
        <div className="content-header">
          <button className="back-btn" onClick={onBack}>
            ← Retour
          </button>
          <div className="cart-summary" onClick={onViewCart}>
            <span className="cart-count">{cartCount}</span>
            <span>Panier • {cartTotal.toFixed(2)}€</span>
          </div>
        </div>

        {/* Base filter bar - only shown for pizza category */}
        {isPizzaCategory && (
          <div className="base-filter-bar">
            <button
              className={`filter-btn ${baseFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBaseFilter('all')}
            >
              Toutes les Pizzas
            </button>
            <button
              className={`filter-btn tomato ${baseFilter === 'tomato' ? 'active' : ''}`}
              onClick={() => setBaseFilter('tomato')}
            >
              <span className="filter-icon">🍅</span>
              Base Tomate
            </button>
            <button
              className={`filter-btn cream ${baseFilter === 'cream' ? 'active' : ''}`}
              onClick={() => setBaseFilter('cream')}
            >
              <span className="filter-icon">🥛</span>
              Base Crème
            </button>
          </div>
        )}

        {/* Items grid */}
        <div className="pizza-grid">
          {loading ? (
            <div className="loading-message">Chargement...</div>
          ) : currentCategory?.is_build_your_own ? (
            // For build-your-own categories, show sizes and ingredients grid
            <>
              {buildYourOwnStep === 'size' && (
                <>
                  <div className="builder-header">
                    <h3>Choisissez la taille</h3>
                  </div>
                  {currentCategory.sizes && currentCategory.sizes.length > 0 ? (
                    <div className="size-selection-wrapper">
                      {currentCategory.sizes.map(size => (
                        <div
                          key={size.id}
                          className="size-card"
                          onClick={() => {
                            setBuildYourOwnSize(size)
                            setBuildYourOwnStep('ingredients')
                          }}
                        >
                          <div className="size-name">{size.name}</div>
                          <div className="size-price">{size.price.toFixed(2)}€</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-message">Aucune taille disponible</div>
                  )}
                </>
              )}

              {buildYourOwnStep === 'ingredients' && (
                <>
                  <div className="builder-header">
                    <button className="back-step-btn" onClick={() => {
                      setBuildYourOwnStep('size')
                      setBuildYourOwnSize(null)
                    }}>
                      ← Retour aux tailles
                    </button>
                    <h3>Choisissez vos ingrédients</h3>
                    <button className="continue-btn" onClick={() => setBuildYourOwnStep('confirm')}>
                      Continuer →
                    </button>
                  </div>
                  {currentCategory.ingredients && currentCategory.ingredients.length > 0 ? (
                    currentCategory.ingredients.map(ingredient => {
                      const isSelected = buildYourOwnIngredients.some(i => i.id === ingredient.id)
                      return (
                        <div
                          key={ingredient.id}
                          className={`pizza-grid-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setBuildYourOwnIngredients(buildYourOwnIngredients.filter(i => i.id !== ingredient.id))
                            } else {
                              setBuildYourOwnIngredients([...buildYourOwnIngredients, ingredient])
                            }
                          }}
                        >
                          {isSelected && <div className="selection-checkmark">✓</div>}
                          <div className="pizza-grid-image-container">
                            <img
                              className="pizza-grid-image"
                              src={ingredient.image_url ? `/api/images/${ingredient.image_url}` : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f0f0f0" width="200" height="200"/><text x="50%" y="50%" fill="%23999" font-size="48" text-anchor="middle">🥗</text></svg>'}
                              alt={ingredient.name}
                            />
                          </div>
                          <div className="pizza-grid-name">{ingredient.name}</div>
                          <div className="pizza-grid-price">+{ingredient.price.toFixed(2)}€</div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-message">Aucun ingrédient disponible</div>
                  )}
                </>
              )}
            </>
          ) : filteredMenu.length === 0 ? (
            <div className="empty-message">Aucun item dans cette catégorie</div>
          ) : (
            filteredMenu.map(item => (
              <div
                key={item.id}
                className="pizza-grid-item"
                onClick={() => handleItemClick(item)}
              >
                <div className="pizza-grid-image-container">
                  <img
                    className="pizza-grid-image"
                    src={getGridPhoto(item.name) || `/api/images/${item.image_url}`}
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = `/api/images/${item.image_url}`
                    }}
                  />
                </div>
                <div className="pizza-grid-name">{item.name}</div>
                <div className="pizza-grid-price">{item.price.toFixed(2)}€</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Build-your-own confirmation modal */}
      {currentCategory?.is_build_your_own && buildYourOwnStep === 'confirm' && (
        <div className="modal-overlay" onClick={() => setBuildYourOwnStep('ingredients')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setBuildYourOwnStep('ingredients')}>×</button>

            <div className="modal-pizza-info">
              <h2 className="modal-pizza-name">Votre {currentCategory.display_name}</h2>

              {/* Name input */}
              <div className="name-input-section">
                <label htmlFor="build-name">Donnez un nom à votre création:</label>
                <input
                  id="build-name"
                  type="text"
                  className="name-input"
                  placeholder={`Ex: Mon ${currentCategory.display_name} spécial`}
                  value={buildYourOwnName}
                  onChange={(e) => setBuildYourOwnName(e.target.value)}
                />
              </div>

              {/* Selected items summary */}
              <div className="build-summary">
                <h3>Votre sélection:</h3>
                {buildYourOwnSize && (
                  <div className="summary-item">
                    <span className="summary-label">Taille:</span>
                    <span>{buildYourOwnSize.name} (+{buildYourOwnSize.price.toFixed(2)}€)</span>
                  </div>
                )}
                {buildYourOwnIngredients.length > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Ingrédients:</span>
                    <div className="ingredients-list">
                      {buildYourOwnIngredients.map((ing, idx) => (
                        <span key={idx} className="ingredient-badge">
                          {ing.name} (+{ing.price.toFixed(2)}€)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="price-breakdown">
                {buildYourOwnSize && (
                  <div className="price-line">
                    <span>Taille ({buildYourOwnSize.name}):</span>
                    <span>{buildYourOwnSize.price.toFixed(2)}€</span>
                  </div>
                )}
                {buildYourOwnIngredients.length > 0 && (
                  <div className="price-line">
                    <span>Ingrédients ({buildYourOwnIngredients.length}):</span>
                    <span>+{buildYourOwnIngredients.reduce((sum, i) => sum + i.price, 0).toFixed(2)}€</span>
                  </div>
                )}
                <div className="price-line total">
                  <span>Total:</span>
                  <span>{(
                    (buildYourOwnSize?.price || 0) +
                    buildYourOwnIngredients.reduce((sum, i) => sum + i.price, 0)
                  ).toFixed(2)}€</span>
                </div>
              </div>

              <div className="instructions-section">
                <label htmlFor="build-instructions">Instructions pour la cuisine:</label>
                <textarea
                  id="build-instructions"
                  className="instructions-input"
                  placeholder="Ex: Sans oignons, bien cuite, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                className="modal-add-btn"
                onClick={() => {
                  const totalPrice = (buildYourOwnSize?.price || 0) + buildYourOwnIngredients.reduce((sum, i) => sum + i.price, 0)
                  onAddToCart({
                    id: `build-${Date.now()}`,
                    name: buildYourOwnName.trim() || `${currentCategory.display_name} personnalisé`,
                    price: totalPrice,
                    instructions: instructions.trim() || null,
                    build_your_own: {
                      size: buildYourOwnSize,
                      ingredients: buildYourOwnIngredients
                    }
                  })
                  // Reset state
                  setBuildYourOwnStep('size')
                  setBuildYourOwnSize(null)
                  setBuildYourOwnIngredients([])
                  setBuildYourOwnName('')
                  setInstructions('')
                }}
                disabled={!buildYourOwnSize}
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item detail modal */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>

            <div className="modal-pizza-image">
              <img
                src={`/api/images/${selectedItem.image_url}`}
                alt={selectedItem.name}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="%23f0f0f0" width="400" height="400"/><text x="50%" y="50%" fill="%23999" font-size="24" text-anchor="middle">Photo</text></svg>'
                }}
              />
            </div>

            <div className="modal-pizza-info">
              <h2 className="modal-pizza-name">{selectedItem.name}</h2>
              <p className="modal-pizza-description">{selectedItem.description}</p>
              <div className="modal-pizza-price">{selectedItem.price.toFixed(2)}€</div>

              {/* Customization section for customizable categories */}
              {currentCategory?.is_customizable && (
                <div className="customization-section">
                  {/* Size selection */}
                  {currentCategory.sizes && currentCategory.sizes.length > 0 && (
                    <div className="customization-group">
                      <h3 className="customization-title">Taille <span className="required">*</span></h3>
                      <div className="size-options">
                        {currentCategory.sizes.map(size => (
                          <button
                            key={size.id}
                            className={`size-option ${selectedSize?.id === size.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSize(size)}
                          >
                            <span className="size-name">{size.name}</span>
                            <span className="size-price">+{size.price.toFixed(2)}€</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingredients selection */}
                  {currentCategory.ingredients && currentCategory.ingredients.length > 0 && (
                    <div className="customization-group">
                      <h3 className="customization-title">Ingrédients</h3>
                      <div className="ingredient-options">
                        {currentCategory.ingredients.map(ingredient => {
                          const isSelected = selectedIngredients.some(i => i.id === ingredient.id)
                          return (
                            <button
                              key={ingredient.id}
                              className={`ingredient-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedIngredients(selectedIngredients.filter(i => i.id !== ingredient.id))
                                } else {
                                  setSelectedIngredients([...selectedIngredients, ingredient])
                                }
                              }}
                            >
                              <span className="ingredient-checkbox">{isSelected ? '✓' : ''}</span>
                              <span className="ingredient-name">{ingredient.name}</span>
                              <span className="ingredient-price">+{ingredient.price.toFixed(2)}€</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total price calculation */}
                  <div className="price-breakdown">
                    <div className="price-line">
                      <span>Prix de base:</span>
                      <span>{selectedItem.price.toFixed(2)}€</span>
                    </div>
                    {selectedSize && (
                      <div className="price-line">
                        <span>Taille ({selectedSize.name}):</span>
                        <span>+{selectedSize.price.toFixed(2)}€</span>
                      </div>
                    )}
                    {selectedIngredients.length > 0 && (
                      <div className="price-line">
                        <span>Ingrédients ({selectedIngredients.length}):</span>
                        <span>+{selectedIngredients.reduce((sum, i) => sum + i.price, 0).toFixed(2)}€</span>
                      </div>
                    )}
                    <div className="price-line total">
                      <span>Total:</span>
                      <span>{(
                        selectedItem.price +
                        (selectedSize?.price || 0) +
                        selectedIngredients.reduce((sum, i) => sum + i.price, 0)
                      ).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="instructions-section">
                <label htmlFor="instructions">Instructions pour la cuisine:</label>
                <textarea
                  id="instructions"
                  className="instructions-input"
                  placeholder="Ex: Sans oignons, bien cuite, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                className="modal-add-btn"
                onClick={handleAddToCart}
                disabled={currentCategory?.is_customizable && currentCategory.sizes?.length > 0 && !selectedSize}
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage
