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

        // Replace ORDER placeholder in all elements
        const replaceInElement = (element) => {
            // Replace in text nodes
            if (element.nodeType === Node.TEXT_NODE) {
                element.textContent = element.textContent.replace(/ORDER/g, order)
            }

            // Replace in attributes
            if (element.nodeType === Node.ELEMENT_NODE) {
                ['name', 'id', 'for', 'data-order', 'data-action'].forEach(attr => {
                    if (element.hasAttribute(attr)) {
                        let value = element.getAttribute(attr)
                        value = value.replace(/ORDER/g, order)
                        value = value.replace(/IP_TYPE/g, ipType)
                        value = value.replace(/CORE_INDEX/g, coreIndex)
                        element.setAttribute(attr, value)
                    }
                })
            }

            // Recurse for child nodes
            element.childNodes.forEach(child => replaceInElement(child))
        }

        // Get the flow-order-mapping div from the cloned content
        const flowOrderDiv = content.querySelector('.flow-order-mapping')
        replaceInElement(flowOrderDiv)

        // Set up test points toggle after adding to DOM
        this.mappingContainerTarget.appendChild(content)

        // Initialize test points toggle for this mapping
        this.initializeTestPointsToggle(order)
    }

    removeFlowOrderMapping(order) {
        const mapping = this.mappingContainerTarget.querySelector(`[data-order="${order}"]`)
        if (mapping) {
            mapping.remove()
        }
    }

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
            })

            listBtn.addEventListener('click', () => {
                listBtn.classList.add('active')
                rangeBtn.classList.remove('active')
                rangeFields.style.display = 'none'
                listField.style.display = 'block'
                typeInput.value = 'List'
            })
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
}
