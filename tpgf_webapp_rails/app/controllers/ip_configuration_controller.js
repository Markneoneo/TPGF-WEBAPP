import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["numCores", "coreMappings", "coreMappingTemplate"]

    connect() {
        this.ipType = this.element.closest('[data-ip-type]').dataset.ipType
    }

    incrementCores() {
        const current = parseInt(this.numCoresTarget.value) || 1
        this.numCoresTarget.value = current + 1
        this.updateCoreCount()
    }

    decrementCores() {
        const current = parseInt(this.numCoresTarget.value) || 1
        if (current > 1) {
            this.numCoresTarget.value = current - 1
            this.updateCoreCount()
        }
    }

    updateCoreCount() {
        const count = parseInt(this.numCoresTarget.value) || 1
        const currentMappings = this.coreMappingsTarget.querySelectorAll('[data-core-index]').length

        if (count > currentMappings) {
            // Add new core mappings
            for (let i = currentMappings; i < count; i++) {
                this.addCoreMapping(i)
            }
        } else if (count < currentMappings) {
            // Remove excess core mappings
            const mappings = this.coreMappingsTarget.querySelectorAll('[data-core-index]')
            for (let i = currentMappings - 1; i >= count; i--) {
                mappings[i].remove()
            }
        }
    }

    addCoreMapping(index) {
        const template = this.coreMappingTemplateTarget.innerHTML
            .replace(/999/g, index)
            .replace(/Core Type \d+/g, `Core Type ${index + 1}`)

        this.coreMappingsTarget.insertAdjacentHTML('beforeend', template)
    }


    toggleProduction(event) {
        const coreIndex = event.target.dataset.coreIndex
        const section = this.element.querySelector(`[data-production-section="${coreIndex}"]`)

        if (event.target.checked) {
            section.classList.remove('hidden')
        } else {
            section.classList.add('hidden')
        }
    }

    toggleCharz(event) {
        const coreIndex = event.target.dataset.coreIndex
        const section = this.element.querySelector(`[data-charz-section="${coreIndex}"]`)

        if (event.target.checked) {
            section.classList.remove('hidden')
        } else {
            section.classList.add('hidden')
        }
    }
}
