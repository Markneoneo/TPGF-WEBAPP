import { Controller } from "@hotwired/stimulus"
import { showSuccess, showError, showWarning, showInfo, showLoading } from "../utils/toast"

export default class extends Controller {
    static targets = ["jsonContent", "jsonPreview"]

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

        // Bind close button event if preview exists
        this.bindCloseButton()
    }

    toggleIpType(event) {
        const checkbox = event.target
        const ipType = checkbox.dataset.ipType
        const configSection = document.getElementById(`${ipType}-config`)
        const ipCard = checkbox.closest('.ip-checkbox-card')

        if (checkbox.checked) {
            this.selectedIpTypes.add(ipType)
            configSection.classList.remove('hidden')
            ipCard.classList.add('selected')
            showInfo(`${ipType} configuration enabled`)
        } else {
            this.selectedIpTypes.delete(ipType)
            configSection.classList.add('hidden')
            ipCard.classList.remove('selected')
            showInfo(`${ipType} configuration disabled`)
        }

        // Show/hide global actions with animation
        const globalActions = document.getElementById('global-actions')
        if (this.selectedIpTypes.size > 0) {
            globalActions.classList.remove('hidden')
            globalActions.classList.add('animate-fadeIn')
        } else {
            globalActions.classList.add('hidden')
        }
    }

    async submitForm(event) {
        event.preventDefault()

        // Show loading toast
        const loadingToast = showLoading('Generating test settings...')

        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay')
        loadingOverlay.classList.remove('hidden')

        // Clear any existing errors
        this.clearErrors()

        // Validate before submitting
        if (!this.validateBeforeSubmit()) {
            loadingOverlay.classList.add('hidden')
            loadingToast.remove()
            showError('Please fix the validation errors')
            return
        }

        const form = this.element
        const formData = new FormData(form)

        // Disable the button to prevent double submission
        const button = event.currentTarget
        button.disabled = true
        button.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
        `

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

            // Remove loading toast
            loadingToast.remove()

            if (response.ok && data.status === 'success') {
                // Show JSON preview with animation
                const preview = document.getElementById('json-preview')
                const content = document.getElementById('json-content')
                content.textContent = JSON.stringify(data.data, null, 2)
                preview.classList.remove('hidden')
                preview.classList.add('animate-fadeIn')

                // Re-bind close button after showing preview
                setTimeout(() => this.bindCloseButton(), 100)

                // Show download button
                document.getElementById('download-button').classList.remove('hidden')

                showSuccess('Test settings generated successfully!', { duration: 4000 })
            } else if (data.validation_errors) {
                // Show validation errors from server
                this.showValidationErrors(data.validation_errors)
                showError('Validation failed. Please check the errors below.', { duration: 6000 })
            } else {
                showError(data.error || 'Unknown error occurred', { duration: 6000 })
            }
        } catch (error) {
            console.error('Error:', error)
            loadingToast.remove()
            showError(`Error generating settings: ${error.message}`, { duration: 7000 })
        } finally {
            // Hide loading overlay
            loadingOverlay.classList.add('hidden')

            // Re-enable the button
            button.disabled = false
            button.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Generate Test Settings
            `
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all configurations?')) {
            // Clear all errors first
            this.clearErrors()

            // Uncheck all IP types
            document.querySelectorAll('input[name="selected_ip_types[]"]').forEach(checkbox => {
                if (checkbox.checked) {
                    checkbox.checked = false

                    // Remove selected class from IP card
                    const ipCard = checkbox.closest('.ip-checkbox-card')
                    if (ipCard) {
                        ipCard.classList.remove('selected')
                    }

                    // Hide the config section
                    const ipType = checkbox.dataset.ipType
                    const configSection = document.getElementById(`${ipType}-config`)
                    if (configSection) {
                        configSection.classList.add('hidden')
                    }
                }
            })

            // Clear all Tom Select instances (flow orders and insertions)
            document.querySelectorAll('select').forEach(select => {
                if (select.tomselect) {
                    select.tomselect.clear()
                    select.tomselect.clearOptions()
                }
            })

            // Remove all dynamically added flow order mappings
            document.querySelectorAll('[data-production-section]').forEach(section => {
                const mappingContainer = section.querySelector('[data-production-parameters-target="mappingContainer"]')
                if (mappingContainer) {
                    mappingContainer.innerHTML = ''
                }
            })

            // Remove all dynamically added search type tables
            document.querySelectorAll('[data-charz-section]').forEach(section => {
                const tablesContainer = section.querySelector('[data-charz-parameters-target="tablesContainer"]')
                if (tablesContainer) {
                    tablesContainer.innerHTML = ''
                }
            })

            // Reset all button states (read type, boolean options, etc.)
            document.querySelectorAll('button.active').forEach(button => {
                button.classList.remove('active')
                const checkbox = button.querySelector('input[type="checkbox"]')
                if (checkbox) {
                    checkbox.checked = false
                }
            })

            // Reset the form
            this.element.reset()

            // Clear selected IP types set
            this.selectedIpTypes.clear()

            // Hide global actions
            const globalActions = document.getElementById('global-actions')
            globalActions.classList.add('hidden')

            // Hide JSON preview and download button
            document.getElementById('json-preview').classList.add('hidden')
            document.getElementById('download-button').classList.add('hidden')

            // Clear JSON content
            const jsonContent = document.getElementById('json-content')
            if (jsonContent) {
                jsonContent.textContent = ''
            }

            showWarning('All configurations cleared')
        }
    }

    bindCloseButton() {
        const closeButton = document.querySelector('[data-action="click->test-settings-form#closePreview"]')
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault()
                this.closePreview()
            })
        }
    }

    closePreview() {
        const preview = document.getElementById('json-preview')
        if (preview) {
            preview.classList.add('hidden')
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

            // Check production mappings
            const productionSections = configSection.querySelectorAll('[data-production-section]')

            productionSections.forEach((section) => {

                const coreIndex = section.dataset.productionSection

                const productionCheckbox = configSection.querySelector(`[name*="show_production_for_core][${coreIndex}]"]`)

                if (productionCheckbox && productionCheckbox.checked) {
                    // Check for Tom Select instance
                    const selectElement = section.querySelector('select[name*="flow_orders"]')
                    let flowOrdersSelected = []

                    if (selectElement && selectElement.tomselect) {
                        // Get values from Tom Select
                        flowOrdersSelected = selectElement.tomselect.items || []
                    } else {
                        // Fallback to checking checkboxes
                        const flowOrders = section.querySelectorAll('input[name*="flow_orders"]:checked')
                        flowOrdersSelected = Array.from(flowOrders).map(cb => cb.value)
                    }

                    if (flowOrdersSelected.length === 0) {
                        errors.push(`${ipType} Core ${parseInt(coreIndex) + 1}: At least one flow order must be selected`)
                        hasErrors = true
                        return
                    }

                    flowOrdersSelected.forEach(order => {
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
                            const usesCoreFreq = container.querySelector('[name*="use_core_frequency"]')
                            const frequency = container.querySelector('[name*="frequency"]')
                            if (frequency && !frequency.value.trim() && (!usesCoreFreq || !usesCoreFreq.checked)) {
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

                            // Test points - check the type first
                            const testPointsTypeInput = container.querySelector('[name*="test_points_type"]')
                            const testPointsType = testPointsTypeInput ? testPointsTypeInput.value : 'Range'

                            if (testPointsType === 'Range') {
                                // Only validate range fields if Range is selected
                                const startInput = container.querySelector('[name*="test_points_start"]')
                                const stopInput = container.querySelector('[name*="test_points_stop"]')
                                const stepInput = container.querySelector('[name*="test_points_step"]')

                                if (startInput && !startInput.value.trim()) {
                                    startInput.classList.add('error-field')
                                    this.addErrorMessage(startInput, 'Start is required')
                                    errors.push(`${ipType} - ${order}: Test points start is required`)
                                    hasErrors = true
                                }

                                if (stopInput && !stopInput.value.trim()) {
                                    stopInput.classList.add('error-field')
                                    this.addErrorMessage(stopInput, 'Stop is required')
                                    errors.push(`${ipType} - ${order}: Test points stop is required`)
                                    hasErrors = true
                                }

                                if (stepInput && !stepInput.value.trim()) {
                                    stepInput.classList.add('error-field')
                                    this.addErrorMessage(stepInput, 'Step is required')
                                    errors.push(`${ipType} - ${order}: Test points step is required`)
                                    hasErrors = true
                                }
                            } else {
                                // Validate list field if List is selected
                                const listInput = container.querySelector('[name*="test_points"][name$="[test_points]"]')
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
}
