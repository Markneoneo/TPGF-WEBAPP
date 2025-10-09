export function showToast(message, type = 'info', options = {}) {
  const {
    duration = 5000,
    position = 'top-right',
    dismissible = true,
    progress = true
  } = options

  const container = getOrCreateContainer(position)

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`

  const icon = getIcon(type)
  const progressBar = progress ? '<div class="toast-progress"></div>' : ''
  const closeButton = dismissible ? `
      <button class="toast-close" aria-label="Close">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
      </button>
  ` : ''

  toast.innerHTML = `
      <div class="toast-content">
          <div class="toast-icon">${icon}</div>
          <div class="toast-message">${message}</div>
          ${closeButton}
      </div>
      ${progressBar}
  `

  // Add close button functionality
  if (dismissible) {
    const closeBtn = toast.querySelector('.toast-close')
    closeBtn.addEventListener('click', () => removeToast(toast))
  }

  // Add to container with animation
  container.appendChild(toast)

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-show')
  })

  // Progress bar animation
  if (progress && duration > 0) {
    const progressElement = toast.querySelector('.toast-progress')
    progressElement.style.animationDuration = `${duration}ms`
  }

  // Auto remove
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast)
    }, duration)
  }

  // Pause on hover
  toast.addEventListener('mouseenter', () => {
    toast.classList.add('toast-paused')
  })

  toast.addEventListener('mouseleave', () => {
    toast.classList.remove('toast-paused')
  })

  return toast
}

function removeToast(toast) {
  toast.classList.remove('toast-show')
  toast.classList.add('toast-hide')

  setTimeout(() => {
    toast.remove()

    // Remove container if empty
    const container = toast.parentElement
    if (container && container.children.length === 0) {
      container.remove()
    }
  }, 300)
}

function getOrCreateContainer(position) {
  let container = document.getElementById(`toast-container-${position}`)

  if (!container) {
    container = document.createElement('div')
    container.id = `toast-container-${position}`
    container.className = `toast-container toast-${position}`
    document.body.appendChild(container)
  }

  return container
}

function getIcon(type) {
  const icons = {
    success: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
      `,
    error: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
      `,
    warning: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
      `,
    info: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
      `,
    loading: `
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
      `
  }
  return icons[type] || icons.info
}

// Helper functions for common use cases
export function showSuccess(message, options = {}) {
  return showToast(message, 'success', options)
}

export function showError(message, options = {}) {
  return showToast(message, 'error', { ...options, duration: 7000 })
}

export function showWarning(message, options = {}) {
  return showToast(message, 'warning', options)
}

export function showInfo(message, options = {}) {
  return showToast(message, 'info', options)
}

export function showLoading(message, options = {}) {
  return showToast(message, 'loading', { ...options, duration: 0, dismissible: false })
}

// Export for use in controllers
window.showToast = showToast
window.showSuccess = showSuccess
window.showError = showError
window.showWarning = showWarning
window.showInfo = showInfo
window.showLoading = showLoading
