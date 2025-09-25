import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["jsonContent"]

    connect() {
        this.selectedIpTypes = new Set()

        // Listen for form input changes to clear errors
        this.element.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' && event.target.classList.contains('error-field')) {
                event.target.classList.remove('error-field')
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

        // Clear any existing errors
        this.clearErrors()

        // Validate before submitting
        if (!this.validateBeforeSubmit()) {
            return
        }

        const form = this.element
        const formData = new FormData(form)

        // Disable the button to prevent double submission
        const button = event.currentTarget
        button.disabled = true
        button.textContent = "Generating Files..."

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
            } else if (data.validation_errors) {
                // Show validation errors from server
                this.showValidationErrors(data.validation_errors)
            } else {
                alert(`Error: ${data.error || 'Unknown error'}\n${data.details || ''}`)
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`Error generating settings: ${error.message}`)
        } finally {
            // Re-enable the button
            button.disabled = false
            button.textContent = "Generate Combined Test Settings"
        }
    }

    // ✅ Updated flow order + charz validation
    validateBeforeSubmit() {
        let hasErrors = false
        const errors = []

        // Check each selected IP type
        this.selectedIpTypes.forEach(ipType => {
            const configSection = document.getElementById(`${ipType}-config`)

            // Check core mappings
            const coreMappings = configSection.querySelectorAll('[data-core-index]:not([data-core-index="999"])')

            coreMappings.forEach((mapping, idx) => {
                // Core name
                const coreInput = mapping.querySelector(`input[name*="[core_mappings][${idx}][core]"]`)
                if (coreInput && !coreInput.value.trim()) {
                    coreInput.classList.add('error-field')
                    this.addErrorMessage(coreInput, 'Core name is required')
                    errors.push(`${ipType}: Core name is required for Core Type ${idx + 1}`)
                    hasErrors = true
                }

                // Core count
                const countInput = mapping.querySelector(`input[name*="[core_mappings][${idx}][core_count]"]`)
                if (countInput) {
                    const value = countInput.value.trim()
                    if (!value) {
                        countInput.classList.add('error-field')
                        this.addErrorMessage(countInput, 'Core count is required')
                        errors.push(`${ipType}: Core count is required for Core Type ${idx + 1}`)
                        hasErrors = true
                    } else if (isNaN(value) || parseInt(value) < 1) {
                        countInput.classList.add('error-field')
                        this.addErrorMessage(countInput, 'Must be a number at least 1')
                        errors.push(`${ipType}: Core count must be a valid number at least 1 for Core Type ${idx + 1}`)
                        hasErrors = true
                    }
                }

                // Supply
                const supplyInput = mapping.querySelector(`input[name*="[core_mappings][${idx}][supply]"]`)
                if (supplyInput && !supplyInput.value.trim()) {
                    supplyInput.classList.add('error-field')
                    this.addErrorMessage(supplyInput, 'Supply is required')
                    errors.push(`${ipType}: Supply is required for Core Type ${idx + 1}`)
                    hasErrors = true
                }

                // Clock
                const clockInput = mapping.querySelector(`input[name*="[core_mappings][${idx}][clock]"]`)
                if (clockInput && !clockInput.value.trim()) {
                    clockInput.classList.add('error-field')
                    this.addErrorMessage(clockInput, 'Clock is required')
                    errors.push(`${ipType}: Clock is required for Core Type ${idx + 1}`)
                    hasErrors = true
                }
            })

            // ✅ Updated production validation
            const productionSections = configSection.querySelectorAll('[data-production-section]')

            productionSections.forEach((section) => {
                const coreIndex = section.dataset.productionSection

                const productionCheckbox = configSection.querySelector(`[name*="show_production_for_core][${coreIndex}]"]`)
                if (productionCheckbox && productionCheckbox.checked) {
                    const flowOrders = section.querySelectorAll('input[name*="flow_orders"]:checked')

                    console.log(`Checking flow orders for ${ipType} core ${coreIndex}:`, flowOrders.length)

                    if (flowOrders.length === 0) {
                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1}: At least one flow order must be selected`)
                        hasErrors = true
                    }

                    flowOrders.forEach(checkbox => {
                        const order = checkbox.value
                        const container = section.querySelector(`[data-order="${order}"]`)

                        if (container) {
                            // Read type
                            const readTypes = container.querySelectorAll('[name*="read_type"]:checked')
                            if (readTypes.length === 0) {
                                errors.push(`${ipType} - ${order}: Read type is required`)
                                hasErrors = true
                            }

                            // Spec variable
                            const specVar = container.querySelector('[name*="spec_variable"]')
                            if (specVar && !specVar.value.trim() && !specVar.disabled) {
                                specVar.classList.add('error-field')
                                this.addErrorMessage(specVar, 'Spec variable is required')
                                errors.push(`${ipType} - ${order}: Spec variable is required`)
                                hasErrors = true
                            }

                            // Frequency
                            const frequency = container.querySelector('[name*="frequency"]')
                            if (frequency && !frequency.value.trim()) {
                                frequency.classList.add('error-field')
                                this.addErrorMessage(frequency, 'Frequency is required')
                                errors.push(`${ipType} - ${order}: Frequency is required`)
                                hasErrors = true
                            }

                            // Register size
                            const registerSize = container.querySelector('[name*="register_size"]')
                            if (registerSize && !registerSize.value.trim()) {
                                registerSize.classList.add('error-field')
                                this.addErrorMessage(registerSize, 'Register size is required')
                                errors.push(`${ipType} - ${order}: Register size is required`)
                                hasErrors = true
                            }

                            // Test points
                            const testPointsType = container.querySelector('[name*="test_points_type"]').value
                            if (testPointsType === 'Range') {
                                const startInput = container.querySelector('[name*="test_points_start"]')
                                const stopInput = container.querySelector('[name*="test_points_stop"]')
                                const stepInput = container.querySelector('[name*="test_points_step"]')

                                if (!startInput.value.trim()) {
                                    startInput.classList.add('error-field')
                                    this.addErrorMessage(startInput, 'Start is required')
                                    errors.push(`${ipType} - ${order}: Test points start is required`)
                                    hasErrors = true
                                }

                                if (!stopInput.value.trim()) {
                                    stopInput.classList.add('error-field')
                                    this.addErrorMessage(stopInput, 'Stop is required')
                                    errors.push(`${ipType} - ${order}: Test points stop is required`)
                                    hasErrors = true
                                }

                                if (!stepInput.value.trim()) {
                                    stepInput.classList.add('error-field')
                                    this.addErrorMessage(stepInput, 'Step is required')
                                    errors.push(`${ipType} - ${order}: Test points step is required`)
                                    hasErrors = true
                                }
                            } else {
                                const listInput = container.querySelector('[name*="test_points"][name*="test_points"]:not([name*="test_points_"])')
                                if (listInput && !listInput.value.trim()) {
                                    listInput.classList.add('error-field')
                                    this.addErrorMessage(listInput, 'Test points list is required')
                                    errors.push(`${ipType} - ${order}: Test points list is required`)
                                    hasErrors = true
                                }
                            }
                        }
                    })
                }
            })

            // ✅ Added Charz validation
            const charzSections = configSection.querySelectorAll('[data-charz-section]')

            charzSections.forEach((section) => {
                const coreIndex = section.dataset.coreIndex

                const charzCheckbox = configSection.querySelector(`[name*="show_charz_for_core][${coreIndex}]"]`)
                if (charzCheckbox && charzCheckbox.checked) {
                    // Check search granularity
                    const granularityChecked = section.querySelectorAll('[name*="search_granularity"]:checked')
                    if (granularityChecked.length === 0) {
                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1}: At least one search granularity must be selected`)
                        hasErrors = true
                    }

                    // Check search types
                    const searchTypesChecked = section.querySelectorAll('[name*="search_types"]:checked')
                    if (searchTypesChecked.length === 0) {
                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1}: At least one search type must be selected`)
                        hasErrors = true
                    }

                    // Check each search type table
                    searchTypesChecked.forEach(checkbox => {
                        const searchType = checkbox.value
                        const searchTypeTable = section.querySelector(`[data-search-type="${searchType}"]`)

                        if (searchTypeTable) {
                            // Check spec variable
                            const specVar = searchTypeTable.querySelector('[name*="spec_variables"]')
                            if (specVar && !specVar.value.trim() && !specVar.disabled) {
                                specVar.classList.add('error-field')
                                this.addErrorMessage(specVar, 'Spec variable is required')
                                errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType}: Spec variable is required`)
                                hasErrors = true
                            }

                            // Check selected test types
                            const selectedTestTypes = searchTypeTable.querySelectorAll('[name*="selected_test_types"]:checked')
                            if (selectedTestTypes.length === 0) {
                                errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType}: At least one test type must be selected`)
                                hasErrors = true
                            }

                            // Check table data for each selected test type
                            const tbody = searchTypeTable.querySelector('[data-test-types-tbody]')
                            tbody.querySelectorAll('tr').forEach(row => {
                                const testType = row.dataset.testType

                                // Check all required fields
                                const requiredFields = ['wl_count', 'tp', 'search_start', 'search_end', 'search_step', 'resolution']
                                requiredFields.forEach(field => {
                                    const input = row.querySelector(`[name*="[${field}]"]`)
                                    if (input && !input.value.trim()) {
                                        input.classList.add('error-field')
                                        this.addErrorMessage(input, `${field.replace('_', ' ')} is required`)
                                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType} ${testType}: ${field.replace('_', ' ')} is required`)
                                        hasErrors = true
                                    }
                                })
                            })
                        }
                    })

                    // Check PSM register size
                    const psmInput = section.querySelector('[name*="psm_register_size"]')
                    if (psmInput && !psmInput.value.trim()) {
                        psmInput.classList.add('error-field')
                        this.addErrorMessage(psmInput, 'PSM register size is required')
                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1}: PSM register size is required`)
                        hasErrors = true
                    }
                }
            })
        })

        if (hasErrors) {
            this.showClientSideErrors(errors)
            return false
        }

        return true
    }

    addErrorMessage(input, message) {
        if (!input.parentElement.querySelector('.error-message')) {
            const errorSpan = document.createElement('span')
            errorSpan.className = 'error-message'
            errorSpan.textContent = message
            input.parentElement.appendChild(errorSpan)
        }
    }

    showClientSideErrors(errors) {
        let errorSummary = document.getElementById('validation-error-summary')
        if (!errorSummary) {
            errorSummary = document.createElement('div')
            errorSummary.id = 'validation-error-summary'
            errorSummary.className = 'validation-error-summary'

            const globalActions = document.getElementById('global-actions')
            globalActions.parentNode.insertBefore(errorSummary, globalActions)
        }

        let errorHtml = '<strong>Please fix the following errors:</strong><ul>'
        errors.forEach(error => {
            errorHtml += `<li>${error}</li>`
        })
        errorHtml += '</ul>'

        errorSummary.innerHTML = errorHtml
        errorSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    showValidationErrors(validationErrors) {
        console.log('Server validation errors:', validationErrors)

        let errorSummary = document.getElementById('validation-error-summary')
        if (!errorSummary) {
            errorSummary = document.createElement('div')
            errorSummary.id = 'validation-error-summary'
            errorSummary.className = 'validation-error-summary'

            const globalActions = document.getElementById('global-actions')
            globalActions.parentNode.insertBefore(errorSummary, globalActions)
        }

        let errorHtml = '<strong>Please fix the following errors:</strong><ul>'

        Object.entries(validationErrors).forEach(([ipType, errors]) => {
            errorHtml += `<li class="font-semibold">${ipType} Configuration:`
            errorHtml += '<ul>'

            Object.entries(errors).forEach(([field, message]) => {
                errorHtml += `<li>${message}</li>`
                this.highlightErrorField(ipType, field)
            })

            errorHtml += '</ul></li>'
        })

        errorHtml += '</ul>'
        errorSummary.innerHTML = errorHtml

        errorSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    highlightErrorField(ipType, fieldError) {
        const parts = fieldError.split('_')
        const fieldType = parts[0] === 'core' && parts[1] === 'count'
            ? 'core_count'
            : parts[0]
        const coreIndex = parts[parts.length - 1]

        const configSection = document.querySelector(`[data-ip-type="${ipType}"]`)
        if (!configSection) return

        let selector = ''
        switch (fieldType) {
            case 'core':
                selector = `input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][core]"]`
                break
            case 'core_count':
                selector = `input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][core_count]"]`
                break
            case 'supply':
                selector = `input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][supply]"]`
                break
            case 'clock':
                selector = `input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][clock]"]`
                break
            default:
                if (fieldError.includes('_core_')) {
                    const match = fieldError.match(/(.+)_(.+)_core_(\d+)/)
                    if (match) {
                        const [, fieldName, order, idx] = match
                        selector = `input[name*="[production_mappings][${idx}][${order}][${fieldName}]"]`
                    }
                }
        }

        const input = configSection.querySelector(selector)
        if (input) {
            input.classList.add('error-field')

            let errorSpan = input.parentElement.querySelector('.error-message')
            if (!errorSpan) {
                errorSpan = document.createElement('span')
                errorSpan.className = 'error-message'
                errorSpan.textContent = this.getErrorMessage(fieldType)
                input.parentElement.appendChild(errorSpan)
            }
        }

        // Handle charz errors
        if (fieldError.includes('charz_')) {
            const match = fieldError.match(/charz_(.+)_core_(\d+)/)
            if (match) {
                const [, fieldPart, coreIndex] = match
                const charzSection = configSection.querySelector(`[data-charz-section][data-core-index="${coreIndex}"]`)

                if (!charzSection) return

                // Handle different charz error types
                if (fieldPart === 'search_granularity') {
                    const checkboxes = charzSection.querySelectorAll('[name*="search_granularity"]')
                    checkboxes.forEach(cb => cb.classList.add('error-field'))
                } else if (fieldPart === 'search_types') {
                    const checkboxes = charzSection.querySelectorAll('[name*="search_types"]')
                    checkboxes.forEach(cb => cb.classList.add('error-field'))
                } else if (fieldPart === 'psm_register_size') {
                    const input = charzSection.querySelector('[name*="psm_register_size"]')
                    if (input) {
                        input.classList.add('error-field')
                        this.addErrorMessage(input, 'PSM register size is required')
                    }
                } else if (fieldPart.includes('_')) {
                    // Handle search type specific errors
                    const parts = fieldPart.split('_')
                    const searchType = parts[0].toUpperCase()

                    if (parts[1] === 'spec' && parts[2] === 'variable') {
                        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType}"]`)
                        if (searchTypeTable) {
                            const input = searchTypeTable.querySelector('[name*="spec_variables"]')
                            if (input) {
                                input.classList.add('error-field')
                                this.addErrorMessage(input, 'Spec variable is required')
                            }
                        }
                    } else if (parts[1] === 'test' && parts[2] === 'types') {
                        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType}"]`)
                        if (searchTypeTable) {
                            const checkboxes = searchTypeTable.querySelectorAll('[name*="selected_test_types"]')
                            checkboxes.forEach(cb => cb.classList.add('error-field'))
                        }
                    } else {
                        // Handle table field errors (e.g., VMIN_CREST_wl_count)
                        const testType = parts[1].toUpperCase()
                        const field = parts.slice(2).join('_')
                        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType}"]`)
                        if (searchTypeTable) {
                            const row = searchTypeTable.querySelector(`[data-test-type="${testType}"]`)
                            if (row) {
                                const input = row.querySelector(`[name*="[${field}]"]`)
                                if (input) {
                                    input.classList.add('error-field')
                                    this.addErrorMessage(input, `${field.replace('_', ' ')} is required`)
                                }
                            }
                        }
                    }
                }
            }
            return
        }
    }

    getErrorMessage(fieldType) {
        const messages = {
            'core': 'Core name is required',
            'core_count': 'Must be at least 1',
            'supply': 'Supply is required',
            'clock': 'Clock is required'
        }
        return messages[fieldType] || 'This field is required'
    }

    clearErrors() {
        const errorSummary = document.getElementById('validation-error-summary')
        if (errorSummary) {
            errorSummary.remove()
        }

        document.querySelectorAll('.error-field').forEach(input => {
            input.classList.remove('error-field')
        })

        document.querySelectorAll('.error-message').forEach(msg => {
            msg.remove()
        })
    }

    clearAll() {
        document.querySelectorAll('input[name="selected_ip_types[]"]').forEach(checkbox => {
            checkbox.checked = false
            checkbox.dispatchEvent(new Event('change'))
        })

        this.element.reset()

        document.getElementById('json-preview').classList.add('hidden')
        document.getElementById('download-button').classList.add('hidden')
    }

    closePreview() {
        document.getElementById('json-preview').classList.add('hidden')
    }
}
