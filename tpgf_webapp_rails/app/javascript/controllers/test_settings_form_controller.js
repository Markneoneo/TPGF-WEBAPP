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

            // Uncheck all production and charz checkboxes
            document.querySelectorAll('[data-production-checkbox], [data-charz-checkbox]').forEach(checkbox => {
                checkbox.checked = false
            })

            // Hide all production and charz content sections
            document.querySelectorAll('[data-production-section], [data-charz-section]').forEach(section => {
                section.classList.add('hidden')
            })

            // Remove expanded class from collapsible sections
            document.querySelectorAll('.collapsible-section').forEach(section => {
                section.classList.remove('expanded')
            })

            // Clear all Tom Select instances (flow orders and insertions)
            document.querySelectorAll('select').forEach(select => {
                if (select.tomselect) {
                    // Store the options before destroying
                    const options = Array.from(select.options).map(opt => ({
                        value: opt.value,
                        text: opt.text
                    }))

                    // Destroy the Tom Select instance
                    select.tomselect.destroy()

                    // Restore the original options
                    select.innerHTML = ''
                    options.forEach(opt => {
                        const option = document.createElement('option')
                        option.value = opt.value
                        option.text = opt.text
                        select.appendChild(option)
                    })
                }
            })

            // Remove all dynamically added flow order mappings
            document.querySelectorAll('[data-production-section]').forEach(section => {
                const mappingContainer = section.querySelector('[data-production-parameters-target="mappingContainer"]')
                if (mappingContainer) {
                    mappingContainer.innerHTML = ''
                }
            })

            // Remove all dynamically added combined flow order mappings
            document.querySelectorAll('[data-combined-settings-target="mappingContainer"]').forEach(container => {
                container.innerHTML = ''
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

            // Re-initialize Tom Select for core type 1 (index 0) after clearing
            setTimeout(() => {
                // Re-initialize production parameters Tom Select
                document.querySelectorAll('[data-production-section="0"]').forEach(section => {
                    const flowOrderSelect = section.querySelector('select[data-production-parameters-target="flowOrdersSelect"]')

                    if (flowOrderSelect && !flowOrderSelect.tomselect) {
                        new TomSelect(flowOrderSelect, {
                            plugins: ['remove_button'],
                            create: false,
                            maxItems: null,
                            placeholder: 'Search and select flow orders...',
                            searchField: ['text'],
                            closeAfterSelect: false
                        })
                    }
                })

                // Re-initialize combined settings selects
                document.querySelectorAll('[data-combined-settings-target="coreTypesSelect"]').forEach(select => {
                    if (!select.tomselect) {
                        new TomSelect(select, {
                            plugins: ['remove_button'],
                            create: false,
                            maxItems: null,
                            placeholder: 'Select core types...',
                            searchField: ['text'],
                            closeAfterSelect: false
                        })
                    }
                })
            }, 300) // Increased delay to ensure DOM is fully reset

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

    validateBeforeSubmit() {
        let hasErrors = false
        const errors = []

        // Check each selected IP type
        this.selectedIpTypes.forEach(ipType => {
            const configSection = document.getElementById(`${ipType}-config`)

            // Validate combined settings if enabled
            const combinedCheckbox = configSection.querySelector('[data-combined-checkbox]')
            if (combinedCheckbox && combinedCheckbox.checked) {
                const combinedSection = configSection.querySelector('[data-combined-settings-target="coreTypesSelect"]')

                if (combinedSection) {
                    const selectedCores = combinedSection.tomselect ? combinedSection.tomselect.items : []

                    if (selectedCores.length === 0) {
                        errors.push(`${ipType}: At least one core type must be selected for combined settings`)
                        hasErrors = true
                    } else {
                        // Validate that all selected cores have same clock and frequency
                        const clocks = new Set()
                        const frequencies = new Set()

                        selectedCores.forEach(coreIdx => {
                            const coreMapping = configSection.querySelector(`[data-core-index="${coreIdx}"]`)
                            if (coreMapping) {
                                const clockInput = coreMapping.querySelector('input[name*="[clock]"]')
                                const freqInput = coreMapping.querySelector('input[name*="[frequency]"]')

                                if (clockInput) clocks.add(clockInput.value)
                                if (freqInput) frequencies.add(freqInput.value)
                            }
                        })

                        if (clocks.size > 1) {
                            errors.push(`${ipType}: All selected core types in combined settings must have the same clock value`)
                            hasErrors = true
                        }

                        if (frequencies.size > 1) {
                            errors.push(`${ipType}: All selected core types in combined settings must have the same frequency value`)
                            hasErrors = true
                        }

                        // Validate combined flow orders
                        const combinedContainer = configSection.querySelector('[data-combined-settings-target="mappingContainer"]')
                        if (combinedContainer) {
                            const flowOrderMappings = combinedContainer.querySelectorAll('.combined-flow-order-mapping')

                            flowOrderMappings.forEach(mapping => {
                                const order = mapping.dataset.order

                                // Validate read type
                                const readTypes = mapping.querySelectorAll('[name*="read_type"]:checked')
                                if (readTypes.length === 0) {
                                    errors.push(`${ipType} Combined - ${order}: Read type is required`)
                                    hasErrors = true
                                }

                                // Validate frequency (no use_core_frequency in combined settings)
                                const frequency = mapping.querySelector('[data-frequency-input]')
                                if (frequency && !frequency.value.trim()) {
                                    frequency.classList.add('error-field')
                                    this.addErrorMessage(frequency, 'Frequency is required')
                                    errors.push(`${ipType} Combined - ${order}: Frequency is required`)
                                    hasErrors = true
                                }

                                // Validate register size
                                const registerSize = mapping.querySelector('[name*="register_size"]')
                                if (registerSize && !registerSize.value.trim()) {
                                    registerSize.classList.add('error-field')
                                    this.addErrorMessage(registerSize, 'Register size is required')
                                    errors.push(`${ipType} Combined - ${order}: Register size is required`)
                                    hasErrors = true
                                }

                                // Validate test points for each core
                                const testPointsSections = mapping.querySelectorAll('.combined-test-points-section')
                                testPointsSections.forEach(section => {
                                    const coreIdx = section.dataset.coreIndex

                                    // Validate spec variable
                                    const specVar = section.querySelector('[name*="spec_variable"]')
                                    if (specVar && !specVar.value.trim()) {
                                        specVar.classList.add('error-field')
                                        this.addErrorMessage(specVar, 'Spec variable is required')
                                        errors.push(`${ipType} Combined - ${order} Core ${coreIdx}: Spec variable is required`)
                                        hasErrors = true
                                    }

                                    // Validate test points based on type
                                    const typeInput = section.querySelector(`[data-type-input="${coreIdx}"]`)
                                    const testPointsType = typeInput ? typeInput.value : 'Range'

                                    if (testPointsType === 'Range') {
                                        const startInput = section.querySelector(`[data-range-fields="${coreIdx}"] input[name*="[start]"]`)
                                        const stopInput = section.querySelector(`[data-range-fields="${coreIdx}"] input[name*="[stop]"]`)
                                        const stepInput = section.querySelector(`[data-range-fields="${coreIdx}"] input[name*="[step]"]`)

                                        if (startInput && !startInput.value.trim()) {
                                            startInput.classList.add('error-field')
                                            this.addErrorMessage(startInput, 'Start is required')
                                            errors.push(`${ipType} Combined - ${order} Core ${coreIdx}: Test points start is required`)
                                            hasErrors = true
                                        }

                                        if (stopInput && !stopInput.value.trim()) {
                                            stopInput.classList.add('error-field')
                                            this.addErrorMessage(stopInput, 'Stop is required')
                                            errors.push(`${ipType} Combined - ${order} Core ${coreIdx}: Test points stop is required`)
                                            hasErrors = true
                                        }

                                        if (stepInput && !stepInput.value.trim()) {
                                            stepInput.classList.add('error-field')
                                            this.addErrorMessage(stepInput, 'Step is required')
                                            errors.push(`${ipType} Combined - ${order} Core ${coreIdx}: Test points step is required`)
                                            hasErrors = true
                                        }
                                    } else {
                                        const listInput = section.querySelector(`[data-list-field="${coreIdx}"] input`)
                                        if (listInput && !listInput.value.trim()) {
                                            listInput.classList.add('error-field')
                                            this.addErrorMessage(listInput, 'Test points list is required')
                                            errors.push(`${ipType} Combined - ${order} Core ${coreIdx}: Test points list is required`)
                                            hasErrors = true
                                        }
                                    }
                                })

                                // Validate repetition settings
                                const numRepetitions = mapping.querySelector('[name*="num_repetitions"]')
                                if (numRepetitions && parseInt(numRepetitions.value) > 0) {
                                    const repCount = parseInt(numRepetitions.value)
                                    const repContainer = mapping.querySelector(`[data-repetition-container="${order}"]`)

                                    if (repContainer) {
                                        const nameInputs = repContainer.querySelectorAll('[name*="[name]"]')
                                        const listInputs = repContainer.querySelectorAll('[name*="[list]"]')

                                        nameInputs.forEach((input, idx) => {
                                            if (!input.value.trim()) {
                                                input.classList.add('error-field')
                                                this.addErrorMessage(input, `Setting name ${idx + 1} is required`)
                                                errors.push(`${ipType} Combined - ${order}: Repetition setting name ${idx + 1} is required`)
                                                hasErrors = true
                                            }
                                        })

                                        listInputs.forEach((input, idx) => {
                                            if (!input.value.trim()) {
                                                input.classList.add('error-field')
                                                this.addErrorMessage(input, `Setting list ${idx + 1} is required`)
                                                errors.push(`${ipType} Combined - ${order}: Repetition setting list ${idx + 1} is required`)
                                                hasErrors = true
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    }
                }
            }

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
                        const orderContainer = section.querySelector(`[data-order="${order}"]`)

                        if (orderContainer) {
                            // Validate read type
                            const readTypes = orderContainer.querySelectorAll('[name*="read_type"]:checked')
                            if (readTypes.length === 0) {
                                errors.push(`${ipType} - ${order}: Read type is required`)
                                hasErrors = true
                            }

                            // Validate test points sets
                            const testPointsSetsContainer = orderContainer.querySelector(`[data-test-points-sets-container="${order}"]`)
                            if (testPointsSetsContainer) {
                                const testPointsSets = testPointsSetsContainer.querySelectorAll('.test-points-set')

                                testPointsSets.forEach((set, setIdx) => {
                                    // Validate spec variable for this set
                                    const specVar = set.querySelector(`[data-spec-variable-set="${setIdx}"]`)
                                    if (specVar && !specVar.value.trim() && !specVar.disabled) {
                                        specVar.classList.add('error-field')
                                        this.addErrorMessage(specVar, 'Spec variable is required')
                                        errors.push(`${ipType} - ${order} Set ${setIdx + 1}: Spec variable is required`)
                                        hasErrors = true
                                    }

                                    // Validate test points based on type
                                    const typeInput = set.querySelector(`[data-type-input-set="${setIdx}"]`)
                                    const testPointsType = typeInput ? typeInput.value : 'Range'

                                    if (testPointsType === 'Range') {
                                        const rangeFields = set.querySelector(`[data-range-fields-set="${setIdx}"]`)
                                        const startInput = rangeFields?.querySelector('input[name*="[start]"]')
                                        const stopInput = rangeFields?.querySelector('input[name*="[stop]"]')
                                        const stepInput = rangeFields?.querySelector('input[name*="[step]"]')

                                        if (startInput && !startInput.value.trim()) {
                                            startInput.classList.add('error-field')
                                            this.addErrorMessage(startInput, 'Start is required')
                                            errors.push(`${ipType} - ${order} Set ${setIdx + 1}: Test points start is required`)
                                            hasErrors = true
                                        }

                                        if (stopInput && !stopInput.value.trim()) {
                                            stopInput.classList.add('error-field')
                                            this.addErrorMessage(stopInput, 'Stop is required')
                                            errors.push(`${ipType} - ${order} Set ${setIdx + 1}: Test points stop is required`)
                                            hasErrors = true
                                        }

                                        if (stepInput && !stepInput.value.trim()) {
                                            stepInput.classList.add('error-field')
                                            this.addErrorMessage(stepInput, 'Step is required')
                                            errors.push(`${ipType} - ${order} Set ${setIdx + 1}: Test points step is required`)
                                            hasErrors = true
                                        }
                                    } else {
                                        const listField = set.querySelector(`[data-list-field-set="${setIdx}"]`)
                                        const listInput = listField?.querySelector('input')
                                        if (listInput && !listInput.value.trim()) {
                                            listInput.classList.add('error-field')
                                            this.addErrorMessage(listInput, 'Test points list is required')
                                            errors.push(`${ipType} - ${order} Set ${setIdx + 1}: Test points list is required`)
                                            hasErrors = true
                                        }
                                    }
                                })
                            }

                            // Validate frequency
                            const usesCoreFreq = orderContainer.querySelector('[name*="use_core_frequency"]')
                            const frequency = orderContainer.querySelector('[data-frequency-input]')
                            if (frequency && !frequency.value.trim() && (!usesCoreFreq || !usesCoreFreq.checked)) {
                                frequency.classList.add('error-field')
                                this.addErrorMessage(frequency, 'Frequency is required')
                                errors.push(`${ipType} - ${order}: Frequency is required`)
                                hasErrors = true
                            }

                            // Validate register size
                            const registerSize = orderContainer.querySelector('[name*="register_size"]')
                            if (registerSize && !registerSize.value.trim()) {
                                registerSize.classList.add('error-field')
                                this.addErrorMessage(registerSize, 'Register size is required')
                                errors.push(`${ipType} - ${order}: Register size is required`)
                                hasErrors = true
                            }

                            // Validate repetition settings
                            const numRepetitions = orderContainer.querySelector('[name*="num_repetitions"]')
                            if (numRepetitions && parseInt(numRepetitions.value) > 0) {
                                const repCount = parseInt(numRepetitions.value)
                                const repContainer = orderContainer.querySelector(`[data-repetition-container="${order}"]`)

                                if (repContainer) {
                                    const nameInputs = repContainer.querySelectorAll('[name*="[name]"]')
                                    const listInputs = repContainer.querySelectorAll('[name*="[list]"]')

                                    nameInputs.forEach((input, idx) => {
                                        if (!input.value.trim()) {
                                            input.classList.add('error-field')
                                            this.addErrorMessage(input, `Setting name ${idx + 1} is required`)
                                            errors.push(`${ipType} - ${order}: Repetition setting name ${idx + 1} is required`)
                                            hasErrors = true
                                        }
                                    })

                                    listInputs.forEach((input, idx) => {
                                        if (!input.value.trim()) {
                                            input.classList.add('error-field')
                                            this.addErrorMessage(input, `Setting list ${idx + 1} is required`)
                                            errors.push(`${ipType} - ${order}: Repetition setting list ${idx + 1} is required`)
                                            hasErrors = true
                                        }
                                    })
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

                            // Validate RM Settings
                            const numRmSettings = searchTypeTable.querySelector(`[data-rm-count="${searchType}"]`)
                            if (numRmSettings && parseInt(numRmSettings.value) > 0) {
                                const rmCount = parseInt(numRmSettings.value)
                                const rmContainer = searchTypeTable.querySelector(`[data-rm-settings-container="${searchType}"]`)

                                if (rmContainer) {
                                    const nameInputs = rmContainer.querySelectorAll('[name*="[name]"]')
                                    const fuseNameInputs = rmContainer.querySelectorAll('[name*="[fuse_name]"]')
                                    const fuseValueInputs = rmContainer.querySelectorAll('[name*="[fuse_value]"]')

                                    nameInputs.forEach((input, idx) => {
                                        if (!input.value.trim()) {
                                            input.classList.add('error-field')
                                            this.addErrorMessage(input, `Setting name ${idx + 1} is required`)
                                            errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType}: RM setting name ${idx + 1} is required`)
                                            hasErrors = true
                                        }
                                    })

                                    fuseNameInputs.forEach((input, idx) => {
                                        if (!input.value.trim()) {
                                            input.classList.add('error-field')
                                            this.addErrorMessage(input, `Fuse name ${idx + 1} is required`)
                                            errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType}: RM fuse name ${idx + 1} is required`)
                                            hasErrors = true
                                        }
                                    })

                                    fuseValueInputs.forEach((input, idx) => {
                                        if (!input.value.trim()) {
                                            input.classList.add('error-field')
                                            this.addErrorMessage(input, `Fuse value ${idx + 1} is required`)
                                            errors.push(`${ipType} Core ${parseInt(coreIndex) + 1} - ${searchType}: RM fuse value ${idx + 1} is required`)
                                            hasErrors = true
                                        }
                                    })
                                }
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

                                // REMOVED: RM settings validation from table row
                                // Check all required fields (excluding rm_settings)
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

                        // Special handling for spec_variable which is now in test points config
                        if (fieldName === 'spec' && fieldError.includes('variable')) {
                            const productionSection = configSection.querySelector(`[data-production-section="${idx}"]`)
                            if (productionSection) {
                                const orderMapping = productionSection.querySelector(`[data-order="${order}"]`)
                                if (orderMapping) {
                                    const testPointsConfig = orderMapping.querySelector('.test-points-config')
                                    const specInput = testPointsConfig?.querySelector('[name*="spec_variable"]')
                                    if (specInput) {
                                        specInput.classList.add('error-field')
                                        this.addErrorMessage(specInput, 'Spec variable is required')
                                    }
                                }
                            }
                        } else {
                            // Other fields remain the same
                            selector = `input[name*="[production_mappings][${idx}][${order}][${fieldName}]"]`
                            const input = configSection.querySelector(selector)
                            if (input) {
                                input.classList.add('error-field')
                                let errorSpan = input.parentElement.querySelector('.error-message')
                                if (!errorSpan) {
                                    errorSpan = document.createElement('span')
                                    errorSpan.className = 'error-message'
                                    errorSpan.textContent = this.getErrorMessage(fieldName)
                                    input.parentElement.appendChild(errorSpan)
                                }
                            }
                        }
                    }
                }

                // Handle combined settings errors
                if (fieldError.includes('combined_')) {
                    const configSection = document.querySelector(`[data-ip-type="${ipType}"]`)
                    if (!configSection) return

                    const combinedSection = configSection.querySelector('[data-combined-settings-target="mappingContainer"]')
                    if (!combinedSection) return

                    // Parse the error field
                    const parts = fieldError.split('_')

                    if (fieldError.includes('combined_core_types')) {
                        const select = configSection.querySelector('[data-combined-settings-target="coreTypesSelect"]')
                        if (select) {
                            select.classList.add('error-field')
                        }
                    } else if (fieldError.includes('combined_clock')) {
                        // Highlight all clock fields in selected cores
                        const coreSelects = configSection.querySelector('[data-combined-settings-target="coreTypesSelect"]')
                        if (coreSelects && coreSelects.tomselect) {
                            coreSelects.tomselect.items.forEach(coreIdx => {
                                const coreMapping = configSection.querySelector(`[data-core-index="${coreIdx}"]`)
                                const clockInput = coreMapping?.querySelector('input[name*="[clock]"]')
                                if (clockInput) {
                                    clockInput.classList.add('error-field')
                                    this.addErrorMessage(clockInput, 'All selected cores must have same clock')
                                }
                            })
                        }
                    } else if (fieldError.includes('combined_frequency') && !fieldError.includes('_core_')) {
                        // Highlight all frequency fields in selected cores
                        const coreSelects = configSection.querySelector('[data-combined-settings-target="coreTypesSelect"]')
                        if (coreSelects && coreSelects.tomselect) {
                            coreSelects.tomselect.items.forEach(coreIdx => {
                                const coreMapping = configSection.querySelector(`[data-core-index="${coreIdx}"]`)
                                const freqInput = coreMapping?.querySelector('input[name*="[frequency]"]')
                                if (freqInput) {
                                    freqInput.classList.add('error-field')
                                    this.addErrorMessage(freqInput, 'All selected cores must have same frequency')
                                }
                            })
                        }
                    } else {
                        // Handle specific flow order errors
                        const match = fieldError.match(/combined_(.+?)_(.+?)(?:_core_(\d+))?$/)
                        if (match) {
                            const [, fieldType, order, coreIdx] = match
                            const flowOrderMapping = combinedSection.querySelector(`[data-order="${order}"]`)

                            if (flowOrderMapping) {
                                if (fieldType === 'read' && fieldError.includes('type')) {
                                    const readTypeButtons = flowOrderMapping.querySelectorAll('[data-read-type]')
                                    readTypeButtons.forEach(btn => btn.classList.add('error-field'))
                                } else if (fieldType === 'frequency') {
                                    const freqInput = flowOrderMapping.querySelector('[data-frequency-input]')
                                    if (freqInput) {
                                        freqInput.classList.add('error-field')
                                        this.addErrorMessage(freqInput, 'Frequency is required')
                                    }
                                } else if (fieldType === 'register' && fieldError.includes('size')) {
                                    const regInput = flowOrderMapping.querySelector('[name*="register_size"]')
                                    if (regInput) {
                                        regInput.classList.add('error-field')
                                        this.addErrorMessage(regInput, 'Register size is required')
                                    }
                                } else if (fieldType === 'spec' && coreIdx) {
                                    const testPointsSection = flowOrderMapping.querySelector(`[data-core-index="${coreIdx}"]`)
                                    const specInput = testPointsSection?.querySelector('[name*="spec_variable"]')
                                    if (specInput) {
                                        specInput.classList.add('error-field')
                                        this.addErrorMessage(specInput, 'Spec variable is required')
                                    }
                                } else if (fieldType === 'test' && fieldError.includes('points') && coreIdx) {
                                    const testPointsSection = flowOrderMapping.querySelector(`[data-core-index="${coreIdx}"]`)
                                    if (testPointsSection) {
                                        const typeInput = testPointsSection.querySelector(`[data-type-input="${coreIdx}"]`)
                                        const isRange = typeInput?.value === 'Range'

                                        if (isRange) {
                                            if (fieldError.includes('start')) {
                                                const input = testPointsSection.querySelector('[name*="[start]"]')
                                                if (input) {
                                                    input.classList.add('error-field')
                                                    this.addErrorMessage(input, 'Start is required')
                                                }
                                            } else if (fieldError.includes('stop')) {
                                                const input = testPointsSection.querySelector('[name*="[stop]"]')
                                                if (input) {
                                                    input.classList.add('error-field')
                                                    this.addErrorMessage(input, 'Stop is required')
                                                }
                                            } else if (fieldError.includes('step')) {
                                                const input = testPointsSection.querySelector('[name*="[step]"]')
                                                if (input) {
                                                    input.classList.add('error-field')
                                                    this.addErrorMessage(input, 'Step is required')
                                                }
                                            }
                                        } else {
                                            const input = testPointsSection.querySelector(`[data-list-field="${coreIdx}"] input`)
                                            if (input) {
                                                input.classList.add('error-field')
                                                this.addErrorMessage(input, 'Test points list is required')
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return
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
                } else if (fieldPart.includes('_rm_')) {
                    // Handle RM settings errors
                    const rmMatch = fieldPart.match(/(.+)_rm_(name|fuse_name|fuse_value)_(\d+)/)
                    if (rmMatch) {
                        const [, searchType, fieldType, rmIdx] = rmMatch
                        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType.toUpperCase()}"]`)
                        if (searchTypeTable) {
                            const rmContainer = searchTypeTable.querySelector(`[data-rm-settings-container="${searchType.toUpperCase()}"]`)
                            if (rmContainer) {
                                const fieldSets = rmContainer.querySelectorAll('.rm-setting-field-set')
                                if (fieldSets[parseInt(rmIdx)]) {
                                    const input = fieldSets[parseInt(rmIdx)].querySelector(`[name*="[${fieldType}]"]`)
                                    if (input) {
                                        input.classList.add('error-field')
                                        this.addErrorMessage(input, `${fieldType.replace('_', ' ')} is required`)
                                    }
                                }
                            }
                        }
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
                    } else if (parts[1] === 'rm' && parts[2] === 'settings') {
                        // NEW: Handle RM settings error at search type level
                        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType}"]`)
                        if (searchTypeTable) {
                            const input = searchTypeTable.querySelector('[name*="rm_settings"]')
                            if (input) {
                                input.classList.add('error-field')
                                this.addErrorMessage(input, 'RM settings is required')
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
                        // NOTE: No longer handling rm_settings here since it's moved out of the table
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
