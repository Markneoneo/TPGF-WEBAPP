import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["coreTypesSelect", "flowOrdersSelect", "mappingContainer", "flowOrdersSection"]

    connect() {
        this.selectedCoreTypes = new Set()
        this.flowOrders = new Set()
        this.ipType = this.element.closest('[data-ip-type]')?.dataset.ipType

        // Initialize after a delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeCoreTypesSelect()
        }, 100)
    }

    initializeCoreTypesSelect() {
        if (!this.hasCoreTypesSelectTarget) return

        const selectElement = this.coreTypesSelectTarget

        // Destroy existing instance if present
        if (selectElement.tomselect) {
            selectElement.tomselect.destroy()
        }

        this.coreTypesSelect = new TomSelect(selectElement, {
            plugins: ['remove_button'],
            create: false,
            maxItems: null,
            placeholder: 'Select core types to combine...',
            searchField: ['text'],
            closeAfterSelect: false,
            onItemAdd: (value) => {
                this.selectedCoreTypes.add(value)
                this.updateFlowOrderOptions()
                this.updateTestPointsSections()
            },
            onItemRemove: (value) => {
                this.selectedCoreTypes.delete(value)
                this.updateFlowOrderOptions()
                this.updateTestPointsSections()
            }
        })

        // Populate options from existing core types
        this.populateCoreTypeOptions()
    }


    initializeFlowOrdersSelect() {
        if (!this.hasFlowOrdersSelectTarget) return

        const selectElement = this.flowOrdersSelectTarget

        if (selectElement.tomselect) {
            selectElement.tomselect.destroy()
        }

        this.flowOrdersSelect = new TomSelect(selectElement, {
            plugins: ['remove_button'],
            create: false,
            maxItems: null,
            placeholder: 'Search and select flow orders...',
            searchField: ['text'],
            closeAfterSelect: false,
            onItemAdd: (value) => {
                this.flowOrders.add(value)
                this.addFlowOrderMapping(value)
                this.disableFlowOrderInCoreTypes(value)
            },
            onItemRemove: (value) => {
                this.flowOrders.delete(value)
                this.removeFlowOrderMapping(value)
                this.enableFlowOrderInCoreTypes(value)
            }
        })
    }

    populateCoreTypeOptions() {
        const ipSection = this.element.closest('[data-ip-type]')
        if (!ipSection) return

        // Get all core mappings except the template
        const coreMappings = ipSection.querySelectorAll('[data-core-index]:not([data-core-index="999"])')

        const select = this.coreTypesSelectTarget
        if (!select) return

        // Store currently selected values
        const currentlySelected = this.coreTypesSelect ? this.coreTypesSelect.items : []

        // Clear and rebuild options
        select.innerHTML = ''

        coreMappings.forEach((mapping) => {
            const coreIndex = mapping.dataset.coreIndex
            const coreNameInput = mapping.querySelector('input[name*="[core]"]')
            const coreName = coreNameInput?.value || `Core Type ${parseInt(coreIndex) + 1}`

            const option = document.createElement('option')
            option.value = coreIndex
            option.text = coreName
            select.appendChild(option)
        })

        // Refresh Tom Select if it exists
        if (this.coreTypesSelect) {
            this.coreTypesSelect.clearOptions()
            this.coreTypesSelect.sync()

            // Restore previously selected values that still exist
            currentlySelected.forEach(value => {
                const optionExists = Array.from(select.options).some(opt => opt.value === value)
                if (optionExists) {
                    this.coreTypesSelect.addItem(value, true) // true = silent (no events)
                }
            })
        }
    }

    updateFlowOrderOptions() {
        // Show/hide flow orders section based on core selection
        if (this.selectedCoreTypes.size > 0) {
            if (this.hasFlowOrdersSectionTarget) {
                this.flowOrdersSectionTarget.style.display = 'block'
            }

            // Initialize flow orders select if not already done
            if (!this.flowOrdersSelect) {
                setTimeout(() => this.initializeFlowOrdersSelect(), 100)
            }
        } else {
            if (this.hasFlowOrdersSectionTarget) {
                this.flowOrdersSectionTarget.style.display = 'none'
            }

            // Clear flow orders if cores are deselected
            if (this.flowOrdersSelect) {
                this.flowOrdersSelect.clear()
            }
        }
    }

    disableFlowOrderInCoreTypes(flowOrder) {
        const ipSection = this.element.closest('[data-ip-type]')

        this.selectedCoreTypes.forEach(coreIndex => {
            const coreMapping = ipSection.querySelector(`[data-core-index="${coreIndex}"]`)
            if (!coreMapping) return

            const productionSection = coreMapping.querySelector('[data-production-section]')
            if (!productionSection) return

            const flowOrderSelect = productionSection.querySelector('select[data-production-parameters-target="flowOrdersSelect"]')
            if (!flowOrderSelect || !flowOrderSelect.tomselect) return

            // Remove the option and any selected value
            if (flowOrderSelect.tomselect.items.includes(flowOrder)) {
                flowOrderSelect.tomselect.removeItem(flowOrder)
            }
            flowOrderSelect.tomselect.removeOption(flowOrder)
        })
    }

    enableFlowOrderInCoreTypes(flowOrder) {
        const ipSection = this.element.closest('[data-ip-type]')

        this.selectedCoreTypes.forEach(coreIndex => {
            const coreMapping = ipSection.querySelector(`[data-core-index="${coreIndex}"]`)
            if (!coreMapping) return

            const productionSection = coreMapping.querySelector('[data-production-section]')
            if (!productionSection) return

            const flowOrderSelect = productionSection.querySelector('select[data-production-parameters-target="flowOrdersSelect"]')
            if (!flowOrderSelect || !flowOrderSelect.tomselect) return

            // Add the option back only if it doesn't exist
            const existingOption = flowOrderSelect.tomselect.options[flowOrder]
            if (!existingOption) {
                flowOrderSelect.tomselect.addOption({ value: flowOrder, text: flowOrder })
            }
        })
    }

    addFlowOrderMapping(order) {
        const template = document.getElementById('combined-flow-order-template')
        if (!template) return

        const ipType = this.ipType
        const coreTypesArray = Array.from(this.selectedCoreTypes)

        let html = template.innerHTML
        html = html.replace(/ORDER/g, order)
        html = html.replace(/IP_TYPE/g, ipType)
        html = html.replace(/CORE_TYPES_JSON/g, JSON.stringify(coreTypesArray))

        const div = document.createElement('div')
        div.innerHTML = html

        const flowOrderDiv = div.querySelector('.combined-flow-order-mapping')
        this.mappingContainerTarget.appendChild(flowOrderDiv)

        setTimeout(() => {
            this.initializeFlowOrderComponents(order)
            this.updateTestPointsSections()
        }, 100)
    }

    removeFlowOrderMapping(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (mapping) {
            mapping.remove()
        }
    }

    initializeFlowOrderComponents(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (!mapping) return

        this.initializeReadTypeToggle(order, mapping)
        this.initializeBooleanOptionsToggle(order, mapping)
        // this.initializeUseOptionButtons(order, mapping)
        this.initializeInsertionSelect(order, mapping)
    }

    updateTestPointsSections() {
        // Update test points sections for all flow orders
        this.flowOrders.forEach(order => {
            const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
            if (!mapping) return

            const container = mapping.querySelector('[data-test-points-container]')
            if (!container) return

            container.innerHTML = ''

            const coreTypesArray = Array.from(this.selectedCoreTypes)
            const ipSection = this.element.closest('[data-ip-type]')

            coreTypesArray.forEach((coreIndex, idx) => {
                const coreMapping = ipSection.querySelector(`[data-core-index="${coreIndex}"]`)
                const coreNameInput = coreMapping?.querySelector('input[name*="[core]"]')
                const coreName = coreNameInput?.value || `Core Type ${parseInt(coreIndex) + 1}`

                const testPointsSection = this.createTestPointsSection(order, coreIndex, coreName, idx)
                container.appendChild(testPointsSection)

                // Initialize test points toggle for this section
                setTimeout(() => {
                    this.initializeTestPointsToggle(order, coreIndex, testPointsSection)
                }, 50)
            })
        })
    }

    createTestPointsSection(order, coreIndex, coreName, idx) {
        const section = document.createElement('div')
        section.className = 'combined-test-points-section'
        section.dataset.coreIndex = coreIndex

        section.innerHTML = `
            <div class="test-points-section-header">
                <h5>${coreName} Test Points</h5>
            </div>
            
            <div class="form-group">
                <label class="form-label">Spec Variable <span class="text-red-500">*</span></label>
                <input type="text" 
                       name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][spec_variable]"
                       placeholder="e.g., SPEC${order}${idx + 1}"
                       class="form-input">
            </div>

            <div class="test-points-config">
                <div class="form-group">
                    <label class="form-label">Test Points Configuration</label>
                    <div class="test-points-toggle">
                        <button type="button" class="active" data-test-points-type="range" data-core="${coreIndex}">
                            Range
                        </button>
                        <button type="button" data-test-points-type="list" data-core="${coreIndex}">
                            List
                        </button>
                    </div>
                    <input type="hidden" 
                           name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][type]" 
                           value="Range"
                           data-type-input="${coreIndex}">
                </div>
                
                <div data-range-fields="${coreIndex}" class="test-points-range-grid">
                    <div class="form-group">
                        <label class="form-label">Start</label>
                        <div class="input-group">
                            <input type="text" 
                                   name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][start]"
                                   class="form-input form-input-sm">
                            <span class="input-addon">V</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stop</label>
                        <div class="input-group">
                            <input type="text" 
                                   name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][stop]"
                                   class="form-input form-input-sm">
                            <span class="input-addon">V</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Step</label>
                        <div class="input-group">
                            <input type="text" 
                                   name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][step]"
                                   class="form-input form-input-sm">
                            <span class="input-addon">V</span>
                        </div>
                    </div>
                </div>
                
                <div data-list-field="${coreIndex}" style="display: none;">
                    <div class="form-group">
                        <input type="text" 
                               name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][test_points][${coreIndex}][list]"
                               placeholder="Enter comma-separated values (e.g., 0.5, 0.6, 0.7)"
                               class="form-input">
                    </div>
                </div>
            </div>
        `

        return section
    }

    initializeTestPointsToggle(order, coreIndex, section) {
        const rangeBtn = section.querySelector(`[data-test-points-type="range"][data-core="${coreIndex}"]`)
        const listBtn = section.querySelector(`[data-test-points-type="list"][data-core="${coreIndex}"]`)
        const rangeFields = section.querySelector(`[data-range-fields="${coreIndex}"]`)
        const listField = section.querySelector(`[data-list-field="${coreIndex}"]`)
        const typeInput = section.querySelector(`[data-type-input="${coreIndex}"]`)

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

    initializeReadTypeToggle(order, mapping) {
        const jtagBtn = mapping.querySelector('[data-read-type="jtag"]')
        const fwBtn = mapping.querySelector('[data-read-type="fw"]')
        const jtagCheckbox = jtagBtn?.querySelector('input[type="checkbox"]')
        const fwCheckbox = fwBtn?.querySelector('input[type="checkbox"]')

        if (jtagBtn && fwBtn && jtagCheckbox && fwCheckbox) {
            jtagBtn.addEventListener('click', () => {
                jtagCheckbox.checked = !jtagCheckbox.checked
                if (jtagCheckbox.checked) {
                    fwCheckbox.checked = false
                    fwBtn.classList.remove('active')
                }
                jtagBtn.classList.toggle('active', jtagCheckbox.checked)
            })

            fwBtn.addEventListener('click', () => {
                fwCheckbox.checked = !fwCheckbox.checked
                if (fwCheckbox.checked) {
                    jtagCheckbox.checked = false
                    jtagBtn.classList.remove('active')
                }
                fwBtn.classList.toggle('active', fwCheckbox.checked)
            })
        }
    }

    initializeBooleanOptionsToggle(order, mapping) {
        const booleanButtons = mapping.querySelectorAll('[data-boolean-option]')

        booleanButtons.forEach(button => {
            const checkbox = button.querySelector('input[type="checkbox"]')

            if (checkbox) {
                button.addEventListener('click', () => {
                    checkbox.checked = !checkbox.checked
                    button.classList.toggle('active', checkbox.checked)
                })
            }
        })
    }

    // initializeUseOptionButtons(order, mapping) {
    //     const useCoreFreqBtn = mapping.querySelector('[data-use-core-frequency]')
    //     if (useCoreFreqBtn) {
    //         const checkbox = useCoreFreqBtn.querySelector('input[type="checkbox"]')

    //         useCoreFreqBtn.addEventListener('click', () => {
    //             checkbox.checked = !checkbox.checked
    //             useCoreFreqBtn.classList.toggle('active', checkbox.checked)
    //             this.toggleCoreFrequency({ target: checkbox, currentTarget: useCoreFreqBtn })
    //         })
    //     }
    // }

    toggleCoreFrequency(event) {
        const container = event.target.closest('.combined-flow-order-mapping')
        const frequencyInput = container.querySelector('[data-frequency-input]')
        const button = event.currentTarget

        if (!frequencyInput) return

        const ipSection = this.element.closest('[data-ip-type]')
        const coreTypesArray = Array.from(this.selectedCoreTypes)

        if (event.target.checked) {
            // Get frequencies from all selected core types
            const frequencies = coreTypesArray.map(coreIndex => {
                const selector = `[data-ip-type="${this.ipType}"] input[name="ip_configurations[${this.ipType}][core_mappings][${coreIndex}][frequency]"]`
                const freqInput = document.querySelector(selector)
                return freqInput?.value
            }).filter(f => f)

            // Check if all frequencies are the same
            const allSame = frequencies.every(f => f === frequencies[0])

            if (!allSame) {
                event.target.checked = false
                if (button) button.classList.remove('active')
                alert('All selected core types must have the same frequency value')
                return
            }

            if (frequencies[0]) {
                if (!frequencyInput.dataset.originalValue) {
                    frequencyInput.dataset.originalValue = frequencyInput.value || ''
                }
                frequencyInput.value = frequencies[0]
                frequencyInput.disabled = true
                frequencyInput.classList.add('bg-gray-100')
            } else {
                event.target.checked = false
                if (button) button.classList.remove('active')
                alert('Please enter frequency values in all selected core types first')
            }
        } else {
            frequencyInput.value = frequencyInput.dataset.originalValue || ''
            delete frequencyInput.dataset.originalValue
            frequencyInput.disabled = false
            frequencyInput.classList.remove('bg-gray-100')
        }
    }

    initializeInsertionSelect(order, mapping) {
        const selectElement = mapping.querySelector(`select[data-insertion-select="${order}"]`)
        if (!selectElement) return

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

    refreshOnCoreChange() {
        // Re-populate core type options
        this.populateCoreTypeOptions()

        // Check if any selected cores no longer exist
        if (this.coreTypesSelect) {
            const currentItems = [...this.coreTypesSelect.items]
            const ipSection = this.element.closest('[data-ip-type]')
            const existingCores = Array.from(ipSection.querySelectorAll('[data-core-index]:not([data-core-index="999"])')).map(
                (el, idx) => idx.toString()
            )

            currentItems.forEach(item => {
                if (!existingCores.includes(item)) {
                    this.coreTypesSelect.removeItem(item)
                    this.selectedCoreTypes.delete(item)
                }
            })

            // Update test points sections
            this.updateTestPointsSections()
        }
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
                               name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][repetition_settings][${i}][name]"
                               placeholder="e.g., setting_${i + 1}"
                               class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Setting List ${i + 1}</label>
                        <input type="text" 
                               name="ip_configurations[${this.ipType}][combined_settings][flow_orders][${order}][repetition_settings][${i}][list]"
                               placeholder="e.g., value_${i + 1}"
                               class="form-input">
                    </div>
                </div>
            `
            container.appendChild(fieldSet)
        }
    }

    disconnect() {
        if (this.coreTypesSelect) {
            this.coreTypesSelect.destroy()
        }
        if (this.flowOrdersSelect) {
            this.flowOrdersSelect.destroy()
        }
    }

}
