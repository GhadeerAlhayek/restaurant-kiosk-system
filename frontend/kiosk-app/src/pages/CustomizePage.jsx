import { useState, useEffect } from 'react'
import './CustomizePage.css'
import { API_URL } from '../config'

function CustomizePage({
  selectedItem,
  category,
  onComplete,
  onBack
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [selections, setSelections] = useState({})
  const [ingredients, setIngredients] = useState([])

  // Use item's customization_steps if available, otherwise fall back to category's steps
  const steps = selectedItem?.customization_steps || category?.customization_steps || []
  const currentStep = steps[currentStepIndex]

  useEffect(() => {
    // Fetch items for the current step
    if (currentStep) {
      fetchStepItems()
    }
  }, [currentStepIndex, currentStep])

  const fetchStepItems = async () => {
    try {
      // Fetch all ingredients for this category
      const res = await fetch(`${API_URL}/api/categories/${category.id}/ingredients`)
      const data = await res.json()

      if (data.success) {
        // Filter ingredients based on step's ingredient_ids
        const stepIngredientIds = currentStep.ingredient_ids || []

        if (stepIngredientIds.length > 0) {
          // Show only selected ingredients for this step
          const filtered = data.data.filter(ing => stepIngredientIds.includes(ing.id))
          setIngredients(filtered)
        } else {
          // No ingredients selected - show empty
          setIngredients([])
        }
      }
    } catch (error) {
      console.error('Error fetching step items:', error)
    }
  }

  const handleSelectItem = (item) => {
    const stepKey = `step_${currentStepIndex}`
    const selectionMode = currentStep.selection_mode || 'multiple'

    if (selectionMode === 'single') {
      // Single selection - replace
      setSelections({
        ...selections,
        [stepKey]: item
      })
    } else {
      // Multiple selection - toggle
      const current = selections[stepKey] || []
      const exists = current.find(i => i.id === item.id)

      if (exists) {
        // Remove
        setSelections({
          ...selections,
          [stepKey]: current.filter(i => i.id !== item.id)
        })
      } else {
        // Check max limit before adding
        const maxSelections = currentStep.max_selections
        if (maxSelections && current.length >= maxSelections) {
          // Already at max, don't add
          return
        }

        setSelections({
          ...selections,
          [stepKey]: [...current, item]
        })
      }
    }
  }

  const isItemSelected = (item) => {
    const stepKey = `step_${currentStepIndex}`
    const selectionMode = currentStep.selection_mode || 'multiple'

    if (selectionMode === 'single') {
      return selections[stepKey]?.id === item.id
    } else {
      const current = selections[stepKey] || []
      return current.some(i => i.id === item.id)
    }
  }

  const canContinue = () => {
    const stepKey = `step_${currentStepIndex}`
    const selected = selections[stepKey]
    const selectionMode = currentStep.selection_mode || 'multiple'

    if (selectionMode === 'single') {
      return currentStep.required ? !!selected : true
    } else {
      const count = selected ? selected.length : 0
      const minSelections = currentStep.min_selections || (currentStep.required ? 1 : 0)
      return count >= minSelections
    }
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      // All steps complete, prepare final item
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    } else {
      onBack()
    }
  }

  const handleComplete = () => {
    // Calculate total price and collect all selections
    let finalPrice = selectedItem.price
    const allIngredients = []

    Object.keys(selections).forEach(stepKey => {
      const stepSelection = selections[stepKey]
      const stepMode = steps[parseInt(stepKey.replace('step_', ''))]?.selection_mode || 'multiple'

      if (stepMode === 'single') {
        // Single selection item
        if (stepSelection) {
          finalPrice += stepSelection.price || 0
          allIngredients.push(stepSelection)
        }
      } else {
        // Multiple selection items
        if (Array.isArray(stepSelection)) {
          stepSelection.forEach(item => {
            finalPrice += item.price || 0
            allIngredients.push(item)
          })
        }
      }
    })

    // Prepare customization data
    const customizationData = {
      ...selectedItem,
      price: finalPrice,
      originalPrice: selectedItem.price,
      build_your_own: {
        size: null,
        ingredients: allIngredients
      }
    }

    onComplete(customizationData)
  }

  if (!currentStep) {
    return (
      <div className="customize-page">
        <div className="customize-header">
          <button className="back-btn" onClick={onBack}>← Retour</button>
          <h1>Personnalisation</h1>
        </div>
        <div className="no-steps">
          <p>Aucune étape de personnalisation configurée</p>
          <button onClick={handleComplete}>Continuer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="customize-page">
      <div className="customize-header">
        <button className="back-btn" onClick={handlePrevious}>
          ← {currentStepIndex === 0 ? 'Retour' : 'Précédent'}
        </button>
        <div className="header-info">
          <h1>
            {currentStep.title}
            {currentStep.selection_mode === 'multiple' && (currentStep.min_selections || currentStep.max_selections) && (
              <span style={{fontSize: '0.8em', fontWeight: 'normal', marginLeft: '0.5rem'}}>
                (
                {currentStep.min_selections && currentStep.max_selections ? (
                  `MIN ${currentStep.min_selections} - MAX ${currentStep.max_selections}`
                ) : currentStep.min_selections ? (
                  `MIN ${currentStep.min_selections}`
                ) : (
                  `MAX ${currentStep.max_selections}`
                )}
                )
              </span>
            )}
          </h1>
          <p className="step-indicator">Étape {currentStepIndex + 1} sur {steps.length}</p>
        </div>
      </div>

      <div className="customize-content">
        <div className="ingredients-grid">
          {ingredients.map(item => (
            <div
              key={item.id}
              className={`ingredient-card ${isItemSelected(item) ? 'selected' : ''}`}
              onClick={() => handleSelectItem(item)}
            >
              {item.image_url && (
                <img src={`${API_URL}${item.image_url}`} alt={item.name} />
              )}
              <div className="ingredient-info">
                <h3>{item.name}</h3>
                {item.price > 0 && (
                  <span className="ingredient-price">+{item.price.toFixed(2)}€</span>
                )}
              </div>
              {isItemSelected(item) && (
                <div className="selected-badge">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="customize-footer">
        <button
          className="next-btn"
          onClick={handleNext}
          disabled={!canContinue()}
        >
          {currentStepIndex < steps.length - 1 ? 'Suivant →' : 'Terminer'}
        </button>
      </div>
    </div>
  )
}

export default CustomizePage
