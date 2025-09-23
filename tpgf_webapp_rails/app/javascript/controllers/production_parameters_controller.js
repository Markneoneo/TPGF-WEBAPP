import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["flowOrders", "mappingContainer", "testPointsType", "rangeFields", "listField"]

    connect() {
        this.flowOrders = new Set()
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
        const template = document.getElementById('flow-order-mapping-template')
        const content = template.content.cloneNode(true)

        // Get the current IP type and core index
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType
        const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex

        // Update all placeholders with actual order
        content.querySelectorAll('[data-order-placeholder]').forEach(element => {
            element.textContent = element.textContent.replace('ORDER', order)
            element.dataset.order = order
        })

        // Update input names - replace ORDER and fix the IP type
        content.querySelectorAll('input, select').forEach(input => {
            if (input.name) {
                // First, replace any incorrect IP type with the correct one
                input.name = input.name.replace(/ip_configurations\[CPU\]/g, `ip_configurations[${ipType}]`)
                // Then replace ORDER with the actual order
                input.name = input.name.replace(/ORDER/g, order)
                // And replace the core index if needed
                input.name = input.name.replace(/production_mappings\[\d+\]/g, `production_mappings[${coreIndex}]`)
            }
        })

        const container = content.querySelector('.flow-order-mapping')
        container.dataset.order = order

        this.mappingContainerTarget.appendChild(content)
    }

    removeFlowOrderMapping(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (mapping) {
            mapping.remove()
        }
    }

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
        const specVariableInput = container.querySelector('[name*="spec_variable"]')

        // Get the core index from the current production parameters container
        const productionContainer = this.element.closest('[data-core-index]')
        const coreIndex = productionContainer ? productionContainer.dataset.coreIndex : '0'

        // Find the supply input for this specific core
        const supplyInput = document.querySelector(`input[name*="[core_mappings][${coreIndex}][supply]"]`)

        if (event.target.checked && supplyInput && supplyInput.value) {
            // Store the original value
            specVariableInput.dataset.originalValue = specVariableInput.value
            // Set the supply value
            specVariableInput.value = supplyInput.value
            specVariableInput.disabled = true
            specVariableInput.classList.add('bg-gray-100')
        } else {
            // Restore the original value if it exists
            if (specVariableInput.dataset.originalValue !== undefined) {
                specVariableInput.value = specVariableInput.dataset.originalValue
                delete specVariableInput.dataset.originalValue
            }
            specVariableInput.disabled = false
            specVariableInput.classList.remove('bg-gray-100')
        }
    }
}
