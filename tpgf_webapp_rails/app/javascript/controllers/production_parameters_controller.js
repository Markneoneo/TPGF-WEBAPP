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

        // Update all placeholders with actual order
        content.querySelectorAll('[data-order-placeholder]').forEach(element => {
            element.textContent = element.textContent.replace('ORDER', order)
            element.dataset.order = order
        })

        // Update input names
        content.querySelectorAll('input, select').forEach(input => {
            if (input.name) {
                input.name = input.name.replace('ORDER', order)
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
        const supplyInput = document.querySelector('[data-supply-field="true"]')

        if (event.target.checked && supplyInput) {
            specVariableInput.value = supplyInput.value
            specVariableInput.disabled = true
        } else {
            specVariableInput.disabled = false
        }
    }
}
