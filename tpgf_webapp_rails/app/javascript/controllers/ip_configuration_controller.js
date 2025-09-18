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
        const targetCount = parseInt(this.numCoresTarget.value) || 1

        // Get only direct children with data-core-index, not from template
        const allCoreMappings = Array.from(this.coreMappingsTarget.children).filter(child => {
            // Skip the template div
            if (child.hasAttribute('data-ip-configuration-target') &&
                child.getAttribute('data-ip-configuration-target') === 'coreMappingTemplate') {
                return false
            }
            // Only count elements that have data-core-index
            return child.hasAttribute('data-core-index')
        })

        const currentCount = allCoreMappings.length

        console.log(`Actually found ${currentCount} core mappings (target: ${targetCount})`)
        console.log('Core mappings:', allCoreMappings.map(el => el.getAttribute('data-core-index')))

        if (targetCount > currentCount) {
            // Add new core mappings
            for (let i = currentCount; i < targetCount; i++) {
                console.log(`Adding core type ${i + 1}`)
                this.addCoreMapping(i)
            }
        } else if (targetCount < currentCount) {
            // Remove excess core mappings from the end
            for (let i = currentCount - 1; i >= targetCount; i--) {
                console.log(`Removing core type ${i + 1}`)
                allCoreMappings[i].remove()
            }
        }
    }

    addCoreMapping(index) {
        // Get the template HTML
        let template = this.coreMappingTemplateTarget.innerHTML

        // Replace all occurrences systematically
        // Replace display text
        template = template.replace(/Core Type 1000/g, `Core Type ${index + 1}`)

        // Replace data attributes
        template = template.replace(/data-core-index="999"/g, `data-core-index="${index}"`)
        template = template.replace(/data-production-section="999"/g, `data-production-section="${index}"`)
        template = template.replace(/data-charz-section="999"/g, `data-charz-section="${index}"`)
        template = template.replace(/data-coreIndex="999"/g, `data-core-index="${index}"`)

        // Replace form field names - be specific to avoid replacing other numbers
        template = template.replace(/\[core_mappings\]\[999\]/g, `[core_mappings][${index}]`)
        template = template.replace(/\[flow_orders\]\[999\]/g, `[flow_orders][${index}]`)
        template = template.replace(/\[production_mappings\]\[999\]/g, `[production_mappings][${index}]`)
        template = template.replace(/\[show_production_for_core\]\[999\]/g, `[show_production_for_core][${index}]`)
        template = template.replace(/\[show_charz_for_core\]\[999\]/g, `[show_charz_for_core][${index}]`)
        template = template.replace(/\[charz_data\]\[999\]/g, `[charz_data][${index}]`)

        // Replace any remaining 999s (for IDs, etc)
        template = template.replace(/_999/g, `_${index}`)
        template = template.replace(/="999"/g, `="${index}"`)

        // Append the modified template
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
