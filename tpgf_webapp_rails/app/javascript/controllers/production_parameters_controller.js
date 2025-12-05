import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["flowOrders", "mappingContainer", "testPointsType", "rangeFields", "listField", "flowOrdersSelect"]

    connect() {
        this.flowOrders = new Set()

        // Skip initialization for template instances
        const coreIndex = this.element.closest('[data-core-index]')?.dataset.coreIndex
        if (coreIndex === '999') {
            console.log('Skipping Tom Select initialization for template')
            return
        }

        // Initialize Tom Select after a delay to ensure element is visible
        setTimeout(() => {
            if (this.hasFlowOrdersSelectTarget) {
                const selectElement = this.flowOrdersSelectTarget

                // Check if Tom Select is already initialized
                if (selectElement.tomselect) {
                    console.log('Tom Select already initialized, skipping')
                    return
                }

                console.log(`Attempting to initialize Tom Select for core ${coreIndex}`)
                this.initializeFlowOrdersSelect()
            } else {
                console.log('flowOrdersSelectTarget not found')
            }
        }, 200) // Increased delay
    }

    disconnect() {
        // Clean up Tom Select instance
        if (this.tomSelect) {
            this.tomSelect.destroy()
        }
    }

    initializeFlowOrdersSelect() {
        const selectElement = this.flowOrdersSelectTarget
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType
        const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex

        console.log(`Initializing Tom Select for ${ipType} core ${coreIndex}`)

        // Initialize Tom Select
        this.tomSelect = new TomSelect(selectElement, {
            plugins: ['remove_button'],
            create: false,
            maxItems: null,
            placeholder: 'Search and select flow orders...',
            searchField: ['text'],
            closeAfterSelect: false,
            onItemAdd: (value) => {
                console.log(`onItemAdd triggered for: ${value}`)
                this.flowOrders.add(value)
                this.addFlowOrderMapping(value)
            },
            onItemRemove: (value) => {
                console.log(`onItemRemove triggered for: ${value}`)
                this.flowOrders.delete(value)
                this.removeFlowOrderMapping(value)
            }
        })

        console.log('Tom Select initialized:', this.tomSelect)
    }

    addHiddenFlowOrderInput(order, ipType, coreIndex) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = `ip_configurations[${ipType}][flow_orders][${coreIndex}][]`
        input.value = order
        input.dataset.flowOrder = order
        this.element.appendChild(input)
    }

    removeHiddenFlowOrderInput(order, ipType, coreIndex) {
        const input = this.element.querySelector(`input[type="hidden"][data-flow-order="${order}"]`)
        if (input) {
            input.remove()
        }
    }

    toggleFlowOrder(event) {
        const order = event.target.value

        if (event.target.checked) {
            this.flowOrders.add(order)
            this.addFlowOrderMapping(order)
        } else {
            this.flowOrders.delete(order)
            this.removeFlowOrderMapping(order)
        }
    }

    addFlowOrderMapping(order) {
        console.log(`addFlowOrderMapping called for order: ${order}`)

        const template = document.getElementById('flow-order-mapping-template')

        if (!template) {
            console.error('flow-order-mapping-template not found!')
            return
        }

        console.log('Template found:', template)

        // Get the current IP type and core index
        const ipType = this.element.closest('[data-ip-type]')?.dataset.ipType
        const coreIndex = this.element.closest('[data-core-index]')?.dataset.coreIndex

        console.log(`IP Type: ${ipType}, Core Index: ${coreIndex}`)

        if (!ipType || !coreIndex) {
            console.error('Could not find IP type or core index')
            return
        }

        // Get template HTML and replace all placeholders
        let html = template.innerHTML
        html = html.replace(/ORDER/g, order)
        html = html.replace(/IP_TYPE/g, ipType)
        html = html.replace(/CORE_INDEX/g, coreIndex)

        console.log('HTML after replacement (first 200 chars):', html.substring(0, 200))

        // Create a div and set the HTML
        const div = document.createElement('div')
        div.innerHTML = html

        // Append the flow-order-mapping div
        const flowOrderDiv = div.querySelector('.flow-order-mapping')

        if (!flowOrderDiv) {
            console.error('flow-order-mapping div not found in template!')
            console.log('Template HTML:', html)
            return
        }

        console.log('Flow order div found, appending to container')
        this.mappingContainerTarget.appendChild(flowOrderDiv)

        // Initialize components after DOM insertion
        setTimeout(() => {
            console.log(`Initializing components for ${order}`)
            this.initializeReadTypeToggle(order)
            this.initializeBooleanOptionsToggle(order)
            this.initializeUseOptionButtons(order)
            this.initializeInsertionSelect(order)
            this.updateTestPointsSets(order, 1)
            console.log(`Components initialized for ${order}`)
        }, 100)
    }

    removeFlowOrderMapping(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (mapping) {
            mapping.remove()
        }
    }

    /*
    initializeTestPointsToggle(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) return

        const rangeBtn = mapping.querySelector('[data-test-points-type="range"]')
        const listBtn = mapping.querySelector('[data-test-points-type="list"]')
        const rangeFields = mapping.querySelector('[data-range-fields]')
        const listField = mapping.querySelector('[data-list-field]')
        const typeInput = mapping.querySelector('[name*="test_points_type"]')

        if (rangeBtn && listBtn) {
            rangeBtn.addEventListener('click', () => {
                rangeBtn.classList.add('active')
                listBtn.classList.remove('active')
                rangeFields.style.display = 'grid'
                listField.style.display = 'none'
                typeInput.value = 'Range'

                // Clear list field when switching to range
                const listInput = listField.querySelector('input')
                if (listInput) {
                    listInput.value = ''
                    listInput.classList.remove('error-field')
                    const errorMsg = listInput.parentElement.querySelector('.error-message')
                    if (errorMsg) errorMsg.remove()
                }
            })

            listBtn.addEventListener('click', () => {
                listBtn.classList.add('active')
                rangeBtn.classList.remove('active')
                rangeFields.style.display = 'none'
                listField.style.display = 'block'
                typeInput.value = 'List'

                // Clear range fields when switching to list
                const rangeInputs = rangeFields.querySelectorAll('input')
                rangeInputs.forEach(input => {
                    input.value = ''
                    input.classList.remove('error-field')
                    const errorMsg = input.parentElement.querySelector('.error-message')
                    if (errorMsg) errorMsg.remove()
                })
            })
        }
    }
        */

    initializeReadTypeToggle(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) return

        const jtagBtn = mapping.querySelector('[data-read-type="jtag"]')
        const fwBtn = mapping.querySelector('[data-read-type="fw"]')
        const jtagCheckbox = jtagBtn?.querySelector('input[type="checkbox"]')
        const fwCheckbox = fwBtn?.querySelector('input[type="checkbox"]')

        if (jtagBtn && fwBtn && jtagCheckbox && fwCheckbox) {
            jtagBtn.addEventListener('click', () => {
                // Toggle JTAG
                jtagCheckbox.checked = !jtagCheckbox.checked

                // Uncheck FW (only one can be selected)
                if (jtagCheckbox.checked) {
                    fwCheckbox.checked = false
                    fwBtn.classList.remove('active')
                }

                // Update button state
                jtagBtn.classList.toggle('active', jtagCheckbox.checked)
            })

            fwBtn.addEventListener('click', () => {
                // Toggle FW
                fwCheckbox.checked = !fwCheckbox.checked

                // Uncheck JTAG (only one can be selected)
                if (fwCheckbox.checked) {
                    jtagCheckbox.checked = false
                    jtagBtn.classList.remove('active')
                }

                // Update button state
                fwBtn.classList.toggle('active', fwCheckbox.checked)
            })
        }
    }

    initializeBooleanOptionsToggle(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) return

        const booleanButtons = mapping.querySelectorAll('[data-boolean-option]')

        booleanButtons.forEach(button => {
            const checkbox = button.querySelector('input[type="checkbox"]')

            if (checkbox) {
                button.addEventListener('click', () => {
                    // Toggle checkbox
                    checkbox.checked = !checkbox.checked

                    // Update button state
                    button.classList.toggle('active', checkbox.checked)
                })
            }
        })
    }

    initializeUseOptionButtons(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) return

        // Initialize Use Power Supply button
        // const usePowerSupplyBtn = mapping.querySelector('[data-use-power-supply]')
        // if (usePowerSupplyBtn) {
        //     const checkbox = usePowerSupplyBtn.querySelector('input[type="checkbox"]')

        //     usePowerSupplyBtn.addEventListener('click', () => {
        //         checkbox.checked = !checkbox.checked
        //         usePowerSupplyBtn.classList.toggle('active', checkbox.checked)

        //         // Trigger the togglePowerSupply logic
        //         this.togglePowerSupply({ target: checkbox, currentTarget: usePowerSupplyBtn })
        //     })
        // }

        // Initialize Use Core Frequency button
        const useCoreFreqBtn = mapping.querySelector('[data-use-core-frequency]')
        if (useCoreFreqBtn) {
            const checkbox = useCoreFreqBtn.querySelector('input[type="checkbox"]')

            useCoreFreqBtn.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked
                useCoreFreqBtn.classList.toggle('active', checkbox.checked)

                // Trigger the toggleCoreFrequency logic
                this.toggleCoreFrequency({ target: checkbox, currentTarget: useCoreFreqBtn })
            })
        }
    }

    incrementTestPointsSets(event) {
        const order = event.currentTarget.dataset.order
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const input = mapping.querySelector(`[data-test-points-sets-count="${order}"]`)
        const current = parseInt(input.value) || 1

        if (current < 10) {
            input.value = current + 1
            this.updateTestPointsSets(order, current + 1)
        }
    }

    decrementTestPointsSets(event) {
        const order = event.currentTarget.dataset.order
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const input = mapping.querySelector(`[data-test-points-sets-count="${order}"]`)
        const current = parseInt(input.value) || 1

        if (current > 1) {
            input.value = current - 1
            this.updateTestPointsSets(order, current - 1)
        }
    }

    updateTestPointsSetsCount(event) {
        const order = event.target.closest('[data-order]').dataset.order
        let value = parseInt(event.target.value) || 1

        // Enforce min/max
        if (value < 1) value = 1
        if (value > 10) value = 10

        event.target.value = value
        this.updateTestPointsSets(order, value)
    }

    updateTestPointsSets(order, count) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const container = mapping.querySelector(`[data-test-points-sets-container="${order}"]`)

        if (!container) return

        // Get IP type and core index
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType
        const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex

        // Clear existing sets
        container.innerHTML = ''

        // Add new sets based on count
        for (let i = 0; i < count; i++) {
            const testPointsSet = this.createTestPointsSet(order, i, ipType, coreIndex)
            container.appendChild(testPointsSet)

            // Initialize toggles for this set
            setTimeout(() => {
                this.initializeTestPointsToggleForSet(order, i, testPointsSet)
                this.initializeUsePowerSupplyForSet(order, i, testPointsSet)
            }, 50)
        }
    }

    createTestPointsSet(order, index, ipType, coreIndex) {
        const set = document.createElement('div')
        set.className = 'test-points-set'
        set.dataset.setIndex = index

        set.innerHTML = `
            <div class="test-points-set-header">
                <h5>Test Points Set ${index + 1}</h5>
            </div>
            
            <!-- Spec Variable -->
            <div class="form-group">
                <div class="flex items-center justify-between mb-2">
                    <label class="form-label mb-0">Spec Variable <span class="text-red-500">*</span></label>
                    <button type="button" class="use-option-btn" data-use-power-supply-set="${index}">
                        <input type="checkbox" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][use_power_supply]"
                               class="sr-only">
                        Use Power Supply
                    </button>
                </div>
                <input type="text" 
                       name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][spec_variable]"
                       placeholder="e.g., VDDCR_${index + 1}"
                       class="form-input"
                       data-spec-variable-set="${index}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Test Points Configuration</label>
                <div class="test-points-toggle">
                    <button type="button" class="active" data-test-points-type="range" data-set="${index}">
                        Range
                    </button>
                    <button type="button" data-test-points-type="list" data-set="${index}">
                        List
                    </button>
                </div>
                <input type="hidden" 
                       name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][type]" 
                       value="Range"
                       data-type-input-set="${index}">
            </div>
            
            <!-- Test Points Range -->
            <div data-range-fields-set="${index}" class="test-points-range-grid">
                <div class="form-group">
                    <label class="form-label">Start</label>
                    <div class="input-group">
                        <input type="text" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][start]"
                               class="form-input form-input-sm">
                        <span class="input-addon">V</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Stop</label>
                    <div class="input-group">
                        <input type="text" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][stop]"
                               class="form-input form-input-sm">
                        <span class="input-addon">V</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Step</label>
                    <div class="input-group">
                        <input type="text" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][step]"
                               class="form-input form-input-sm">
                        <span class="input-addon">V</span>
                    </div>
                </div>
            </div>
            
            <!-- Test Points List -->
            <div data-list-field-set="${index}" style="display: none;">
                <div class="form-group">
                    <input type="text" 
                           name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][test_points_sets][${index}][list]"
                           placeholder="Enter comma-separated values (e.g., 0.5, 0.6, 0.7)"
                           class="form-input">
                </div>
            </div>
        `

        return set
    }

    initializeTestPointsToggleForSet(order, setIndex, setElement) {
        const rangeBtn = setElement.querySelector(`[data-test-points-type="range"][data-set="${setIndex}"]`)
        const listBtn = setElement.querySelector(`[data-test-points-type="list"][data-set="${setIndex}"]`)
        const rangeFields = setElement.querySelector(`[data-range-fields-set="${setIndex}"]`)
        const listField = setElement.querySelector(`[data-list-field-set="${setIndex}"]`)
        const typeInput = setElement.querySelector(`[data-type-input-set="${setIndex}"]`)

        if (rangeBtn && listBtn) {
            rangeBtn.addEventListener('click', () => {
                rangeBtn.classList.add('active')
                listBtn.classList.remove('active')
                rangeFields.style.display = 'grid'
                listField.style.display = 'none'
                typeInput.value = 'Range'

                // Clear list field
                const listInput = listField.querySelector('input')
                if (listInput) {
                    listInput.value = ''
                    listInput.classList.remove('error-field')
                    const errorMsg = listInput.parentElement.querySelector('.error-message')
                    if (errorMsg) errorMsg.remove()
                }
            })

            listBtn.addEventListener('click', () => {
                listBtn.classList.add('active')
                rangeBtn.classList.remove('active')
                rangeFields.style.display = 'none'
                listField.style.display = 'block'
                typeInput.value = 'List'

                // Clear range fields
                const rangeInputs = rangeFields.querySelectorAll('input')
                rangeInputs.forEach(input => {
                    input.value = ''
                    input.classList.remove('error-field')
                    const errorMsg = input.parentElement.querySelector('.error-message')
                    if (errorMsg) errorMsg.remove()
                })
            })
        }
    }

    initializeUsePowerSupplyForSet(order, setIndex, setElement) {
        const usePowerSupplyBtn = setElement.querySelector(`[data-use-power-supply-set="${setIndex}"]`)
        if (!usePowerSupplyBtn) return

        const checkbox = usePowerSupplyBtn.querySelector('input[type="checkbox"]')

        usePowerSupplyBtn.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked
            usePowerSupplyBtn.classList.toggle('active', checkbox.checked)
            // Trigger the togglePowerSupply logic for this set
            this.togglePowerSupplyForSet({ target: checkbox, currentTarget: usePowerSupplyBtn }, setIndex, setElement)
        })
    }

    togglePowerSupplyForSet(event, setIndex, setElement) {
        const specVariableInput = setElement.querySelector(`[data-spec-variable-set="${setIndex}"]`)
        const button = event.currentTarget

        if (!specVariableInput) {
            console.error('Spec variable input not found')
            return
        }

        // Get the core index from the production parameters container
        const productionContainer = this.element.closest('[data-core-index]')
        const coreIndex = productionContainer ? productionContainer.dataset.coreIndex : '0'

        // Get the IP type
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType

        // Find the supply input for this specific core and IP type
        const supplySelector = `[data-ip-type="${ipType}"] input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][supply]"]`
        const supplyInput = document.querySelector(supplySelector)

        if (event.target.checked) {
            if (supplyInput && supplyInput.value) {
                // Store original value if not already stored
                if (!specVariableInput.dataset.originalValue) {
                    specVariableInput.dataset.originalValue = specVariableInput.value || ''
                }
                specVariableInput.value = supplyInput.value
                specVariableInput.disabled = true
                specVariableInput.classList.add('bg-gray-100')
            } else {
                // No supply value, uncheck and alert
                event.target.checked = false
                if (button) button.classList.remove('active')
                alert('Please enter a supply value first')
            }
        } else {
            // Restore original value
            specVariableInput.value = specVariableInput.dataset.originalValue || ''
            delete specVariableInput.dataset.originalValue
            specVariableInput.disabled = false
            specVariableInput.classList.remove('bg-gray-100')
        }
    }

    /*
    toggleTestPointsType(event) {
        const container = event.target.closest('.flow-order-mapping')
        const rangeFields = container.querySelector('.test-points-range')
        const listField = container.querySelector('.test-points-list')

        if (event.target.value === 'List') {
            rangeFields.classList.add('hidden')
            listField.classList.remove('hidden')
        } else {
            rangeFields.classList.remove('hidden')
            listField.classList.add('hidden')
        }
    }

    togglePowerSupply(event) {
        const container = event.target.closest('.flow-order-mapping')
        // Find spec variable inside test points config
        const testPointsConfig = container.querySelector('.test-points-config')
        const specVariableInput = testPointsConfig?.querySelector('[name*="spec_variable"]')
        const button = event.currentTarget

        if (!specVariableInput) {
            console.error('Spec variable input not found')
            return
        }

        // Get the core index from the production parameters container
        const productionContainer = this.element.closest('[data-core-index]')
        const coreIndex = productionContainer ? productionContainer.dataset.coreIndex : '0'

        // Get the IP type
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType

        // Find the supply input for this specific core and IP type
        const supplySelector = `[data-ip-type="${ipType}"] input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][supply]"]`
        const supplyInput = document.querySelector(supplySelector)

        if (event.target.checked) {
            if (supplyInput && supplyInput.value) {
                // Store original value if not already stored
                if (!specVariableInput.dataset.originalValue) {
                    specVariableInput.dataset.originalValue = specVariableInput.value || ''
                }
                specVariableInput.value = supplyInput.value
                specVariableInput.disabled = true
                specVariableInput.classList.add('bg-gray-100')
            } else {
                // No supply value, uncheck and alert
                event.target.checked = false
                if (button) button.classList.remove('active')
                alert('Please enter a supply value first')
            }
        } else {
            // Restore original value
            specVariableInput.value = specVariableInput.dataset.originalValue || ''
            delete specVariableInput.dataset.originalValue
            specVariableInput.disabled = false
            specVariableInput.classList.remove('bg-gray-100')
        }
    }
    */

    toggleCoreFrequency(event) {
        const container = event.target.closest('.flow-order-mapping')
        const frequencyInput = container.querySelector('[data-frequency-input]')
        const button = event.currentTarget

        if (!frequencyInput) {
            console.error('Frequency input not found')
            return
        }

        // Get the core index from the production parameters container
        const productionContainer = this.element.closest('[data-core-index]')
        const coreIndex = productionContainer ? productionContainer.dataset.coreIndex : '0'

        // Get the IP type
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType

        // Find the frequency input for this specific core and IP type
        const frequencySelector = `[data-ip-type="${ipType}"] input[name="ip_configurations[${ipType}][core_mappings][${coreIndex}][frequency]"]`
        const coreFrequencyInput = document.querySelector(frequencySelector)

        if (event.target.checked) {
            if (coreFrequencyInput && coreFrequencyInput.value) {
                // Store original value if not already stored
                if (!frequencyInput.dataset.originalValue) {
                    frequencyInput.dataset.originalValue = frequencyInput.value || ''
                }
                frequencyInput.value = coreFrequencyInput.value
                frequencyInput.disabled = true
                frequencyInput.classList.add('bg-gray-100')

                // Add a hidden input to ensure the checkbox state is sent
                const hiddenInput = document.createElement('input')
                hiddenInput.type = 'hidden'
                hiddenInput.name = frequencyInput.name
                hiddenInput.value = coreFrequencyInput.value
                hiddenInput.dataset.coreFrequencyHidden = 'true'
                frequencyInput.parentElement.appendChild(hiddenInput)
            } else {
                // No frequency value, uncheck and alert
                event.target.checked = false
                if (button) button.classList.remove('active')
                alert('Please enter a frequency value in the core configuration first')
            }
        } else {
            // Restore original value
            frequencyInput.value = frequencyInput.dataset.originalValue || ''
            delete frequencyInput.dataset.originalValue
            frequencyInput.disabled = false
            frequencyInput.classList.remove('bg-gray-100')

            // Remove hidden input
            const hiddenInput = frequencyInput.parentElement.querySelector('[data-core-frequency-hidden="true"]')
            if (hiddenInput) {
                hiddenInput.remove()
            }
        }
    }

    initializeInsertionSelect(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) {
            console.error('Mapping not found for order:', order)
            return
        }

        const selectElement = mapping.querySelector(`select[data-insertion-select="${order}"]`)
        if (!selectElement) {
            console.error('Insertion select not found for order:', order)
            return
        }

        // Initialize Tom Select for insertion list
        new TomSelect(selectElement, {
            plugins: ['remove_button'],
            create: false,
            maxItems: null,
            placeholder: 'Select insertions...',
            searchField: ['text'],
            closeAfterSelect: false,
            maxOptions: null
        })
    }

    incrementRepetitions(event) {
        const order = event.currentTarget.dataset.order
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const input = mapping.querySelector(`[data-repetition-count="${order}"]`)
        const current = parseInt(input.value) || 0

        if (current < 3) {
            input.value = current + 1
            this.updateRepetitionFields(order, current + 1)
        }
    }

    decrementRepetitions(event) {
        const order = event.currentTarget.dataset.order
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const input = mapping.querySelector(`[data-repetition-count="${order}"]`)
        const current = parseInt(input.value) || 0

        if (current > 0) {
            input.value = current - 1
            this.updateRepetitionFields(order, current - 1)
        }
    }

    updateRepetitionCount(event) {
        const order = event.target.closest('[data-order]').dataset.order
        let value = parseInt(event.target.value) || 0

        // Enforce min/max
        if (value < 0) value = 0
        if (value > 3) value = 3

        event.target.value = value
        this.updateRepetitionFields(order, value)
    }

    updateRepetitionFields(order, count) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        const container = mapping.querySelector(`[data-repetition-container="${order}"]`)

        if (!container) return

        // Get IP type and core index
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType
        const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex

        // Clear existing fields
        container.innerHTML = ''

        // Add new fields based on count
        for (let i = 0; i < count; i++) {
            const fieldSet = document.createElement('div')
            fieldSet.className = 'repetition-field-set'
            fieldSet.innerHTML = `
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Setting Name ${i + 1}</label>
                        <input type="text" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][repetition_settings][${i}][name]"
                               placeholder="e.g., setting_${i + 1}"
                               class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Setting List ${i + 1}</label>
                        <input type="text" 
                               name="ip_configurations[${ipType}][production_mappings][${coreIndex}][${order}][repetition_settings][${i}][list]"
                               placeholder="e.g., value_${i + 1}"
                               class="form-input">
                    </div>
                </div>
            `
            container.appendChild(fieldSet)
        }
    }

}
