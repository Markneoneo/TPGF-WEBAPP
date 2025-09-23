import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["jsonContent"]

    connect() {
        this.selectedIpTypes = new Set()

        // Add event listener to clear field errors when user types
        this.element.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' && event.target.classList.contains('error-field')) {
                event.target.classList.remove('error-field')

                // Remove error message for this field
                const errorMessage = event.target.parentElement.querySelector('.error-message')
                if (errorMessage) {
                    errorMessage.remove()
                }
            }
        })
    }

    toggleIpType(event) {
        const checkbox = event.target
        const ipType = checkbox.dataset.ipType
        const configSection = document.getElementById(`${ipType}-config`)

        if (checkbox.checked) {
            this.selectedIpTypes.add(ipType)
            configSection.classList.remove('hidden')
        } else {
            this.selectedIpTypes.delete(ipType)
            configSection.classList.add('hidden')
        }

        // Show/hide global actions
        const globalActions = document.getElementById('global-actions')
        if (this.selectedIpTypes.size > 0) {
            globalActions.classList.remove('hidden')
        } else {
            globalActions.classList.add('hidden')
        }
    }

    async submitForm(event) {
        event.preventDefault()

        const form = this.element
        const formData = new FormData(form)

        // Clear any existing errors
        this.clearErrors()

        // Show loading state
        const button = event.currentTarget
        button.disabled = true
        button.textContent = "Validating and Generating..."

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content,
                    'Accept': 'application/json'
                }
            })

            const responseText = await response.text()
            let data

            try {
                data = JSON.parse(responseText)
            } catch (e) {
                console.error('Failed to parse JSON:', responseText)
                throw new Error('Invalid JSON response from server')
            }

            if (response.ok && data.status === 'success') {
                // Show JSON preview
                const preview = document.getElementById('json-preview')
                const content = document.getElementById('json-content')
                content.textContent = JSON.stringify(data.data, null, 2)
                preview.classList.remove('hidden')

                // Show download button
                document.getElementById('download-button').classList.remove('hidden')

                // Show success message
                this.showSuccessMessage('Test settings generated successfully!')
            } else if (data.validation_errors) {
                // Show validation errors from server
                this.showValidationErrors(data.validation_errors)
            } else {
                // Show generic error
                this.showErrorMessage(data.error || 'An error occurred')
            }
        } catch (error) {
            console.error('Error:', error)
            this.showErrorMessage(`Error: ${error.message}`)
        } finally {
            // Re-enable the button
            button.disabled = false
            button.textContent = "Generate Combined Test Settings"
        }
    }

    showValidationErrors(validationErrors) {
        console.log('Validation errors:', validationErrors)

        // Create error summary
        const errorSummary = this.createOrUpdateElement(
            'validation-error-summary',
            'validation-error-summary'
        )

        let errorHtml = '<strong>Please fix the following errors:</strong><ul>'

        Object.entries(validationErrors).forEach(([ipType, errors]) => {
            errorHtml += `<li class="font-semibold">${ipType} Configuration:`
            errorHtml += '<ul>'

            Object.entries(errors).forEach(([field, message]) => {
                errorHtml += `<li>${message}</li>`
                // Highlight the specific field
                this.highlightErrorField(ipType, field, message)
            })

            errorHtml += '</ul></li>'
        })

        errorHtml += '</ul>'
        errorSummary.innerHTML = errorHtml

        // Insert before global actions
        const globalActions = document.getElementById('global-actions')
        globalActions.parentNode.insertBefore(errorSummary, globalActions)

        // Scroll to errors
        errorSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    highlightErrorField(ipType, fieldError, message) {
        // Parse field error to identify the input
        const configSection = document.querySelector(`[data-ip-type="${ipType}"]`)
        if (!configSection) return

        // Handle different field error formats
        let input = null

        // Core field errors: "core_0", "core_count_0", etc.
        if (fieldError.match(/^(core|core_count|supply|clock)_\d+$/)) {
            const [fieldType, coreIndex] = fieldError.split('_')
            const fieldName = fieldType === 'core' ? 'core' :
                fieldType === 'supply' ? 'supply' :
                    fieldType === 'clock' ? 'clock' : 'core_count'

            input = configSection.querySelector(
                `input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][${fieldName}]"]`
            )
        }
        // Production field errors: "spec_variable_AVGPSM_core_0"
        else if (fieldError.includes('_core_')) {
            const match = fieldError.match(/(.+)_(.+)_core_(\d+)/)
            if (match) {
                const [, fieldType, order, coreIdx] = match

                // Find the production section
                const selector = `input[name*="[production_mappings][${coreIdx}][${order}][${fieldType}]"]`
                input = configSection.querySelector(selector)
            }
        }

        if (input) {
            input.classList.add('error-field')

            // Add error message below field
            if (!input.parentElement.querySelector('.error-message')) {
                const errorSpan = document.createElement('span')
                errorSpan.className = 'error-message'
                errorSpan.textContent = this.getFieldSpecificMessage(fieldError, message)
                input.parentElement.appendChild(errorSpan)
            }
        }
    }

    getFieldSpecificMessage(fieldError, defaultMessage) {
        // Provide more user-friendly messages
        if (fieldError.includes('test_points_range')) {
            return 'Invalid range: step must divide evenly into the range'
        }
        if (fieldError.includes('read_type')) {
            return 'Please select exactly one read type'
        }
        return defaultMessage
    }

    showSuccessMessage(message) {
        const successDiv = this.createOrUpdateElement(
            'success-message',
            'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4'
        )

        successDiv.innerHTML = `<strong>Success!</strong> ${message}`

        const globalActions = document.getElementById('global-actions')
        globalActions.parentNode.insertBefore(successDiv, globalActions)

        // Auto-remove after 5 seconds
        setTimeout(() => {
            successDiv.remove()
        }, 5000)
    }

    showErrorMessage(message) {
        const errorDiv = this.createOrUpdateElement(
            'error-message-general',
            'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'
        )

        errorDiv.innerHTML = `<strong>Error!</strong> ${message}`

        const globalActions = document.getElementById('global-actions')
        globalActions.parentNode.insertBefore(errorDiv, globalActions)
    }

    createOrUpdateElement(id, className) {
        let element = document.getElementById(id)
        if (!element) {
            element = document.createElement('div')
            element.id = id
            element.className = className
        }
        return element
    }

    clearErrors() {
        // Remove error summaries
        ['validation-error-summary', 'success-message', 'error-message-general'].forEach(id => {
            const element = document.getElementById(id)
            if (element) element.remove()
        })

        // Remove error styling from all inputs
        document.querySelectorAll('.error-field').forEach(input => {
            input.classList.remove('error-field')
        })

        // Remove all error messages
        document.querySelectorAll('.error-message').forEach(msg => {
            msg.remove()
        })
    }

    clearAll() {
        // Uncheck all IP type checkboxes
        document.querySelectorAll('input[name="selected_ip_types[]"]').forEach(checkbox => {
            checkbox.checked = false
            checkbox.dispatchEvent(new Event('change'))
        })

        // Reset the form
        this.element.reset()

        // Clear any errors
        this.clearErrors()

        // Hide preview and download button
        document.getElementById('json-preview').classList.add('hidden')
        document.getElementById('download-button').classList.add('hidden')
    }

    closePreview() {
        document.getElementById('json-preview').classList.add('hidden')
    }
}

