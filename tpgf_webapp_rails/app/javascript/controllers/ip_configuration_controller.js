import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["numCores", "coreMappings", "coreMappingTemplate"]

    connect() {
        this.ipType = this.element.dataset.ipType || this.element.closest('[data-ip-type]')?.dataset.ipType

        if (!this.ipType) {
            console.error('IP type not found for controller')
        }

        console.log('IP Configuration controller connected for:', this.ipType)

        // Bind all collapsible headers manually
        this.bindCollapsibleHeaders()
    }

    bindCollapsibleHeaders() {
        // Find all collapsible headers within this controller's scope
        const headers = this.element.querySelectorAll('.collapsible-header[data-section-name]')

        console.log(`Found ${headers.length} collapsible headers for ${this.ipType}`)

        headers.forEach(header => {
            // Remove existing listener if any by cloning and replacing
            const newHeader = header.cloneNode(true)
            header.parentNode.replaceChild(newHeader, header)

            // Add click listener
            newHeader.addEventListener('click', (event) => {
                this.handleCollapsibleClick(event)
            })
        })
    }

    handleCollapsibleClick(event) {
        event.preventDefault()
        event.stopPropagation()

        const header = event.currentTarget
        const sectionName = header.dataset.sectionName
        const collapsibleSection = header.closest('.collapsible-section')

        console.log('Collapsible clicked:', { sectionName })

        // Handle combined settings differently
        if (sectionName === 'combined') {
            const checkbox = collapsibleSection.querySelector('[data-combined-checkbox]')
            const contentSection = collapsibleSection.querySelector('[data-combined-content]')

            if (!checkbox || !contentSection) {
                console.error('Could not find checkbox or content section for combined')
                return
            }

            checkbox.checked = !checkbox.checked
            console.log('Toggled combined checkbox to:', checkbox.checked)

            if (checkbox.checked) {
                contentSection.classList.remove('hidden')
                collapsibleSection.classList.add('expanded')

                // Initialize combined settings controller
                setTimeout(() => {
                    const combinedController = contentSection.querySelector('[data-controller~="combined-settings"]')
                    if (combinedController) {
                        const event = new Event('stimulus:connect')
                        combinedController.dispatchEvent(event)
                    }
                }, 100)
            } else {
                contentSection.classList.add('hidden')
                collapsibleSection.classList.remove('expanded')
            }
            return
        }

        // Existing logic for production and charz
        const coreIndex = header.dataset.coreIndex
        const checkbox = collapsibleSection.querySelector(`[data-${sectionName}-checkbox="${coreIndex}"]`)
        const contentSection = this.element.querySelector(`[data-${sectionName}-section="${coreIndex}"]`)

        if (!checkbox || !contentSection) {
            console.error(`Could not find checkbox or content section for ${sectionName}`, { checkbox, contentSection })
            return
        }

        checkbox.checked = !checkbox.checked
        console.log('Toggled checkbox to:', checkbox.checked)

        if (checkbox.checked) {
            contentSection.classList.remove('hidden')
            collapsibleSection.classList.add('expanded')

            // REMOVE THIS ENTIRE BLOCK:
            /*
            if (sectionName === 'production') {
                setTimeout(() => {
                    this.initializeProductionSelect(coreIndex)
                }, 100)
            }
            */

            // The production-parameters controller will handle its own Tom Select initialization
        } else {
            contentSection.classList.add('hidden')
            collapsibleSection.classList.remove('expanded')
        }
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

        const allCoreMappings = Array.from(this.coreMappingsTarget.children).filter(child => {
            if (child.hasAttribute('data-ip-configuration-target') &&
                child.getAttribute('data-ip-configuration-target') === 'coreMappingTemplate') {
                return false
            }
            return child.hasAttribute('data-core-index') && child.dataset.coreIndex !== '999'
        })

        const currentCount = allCoreMappings.length

        console.log(`Actually found ${currentCount} core mappings (target: ${targetCount})`)

        if (targetCount > currentCount) {
            for (let i = currentCount; i < targetCount; i++) {
                console.log(`Adding core type ${i + 1}`)
                this.addCoreMapping(i)
            }
        } else if (targetCount < currentCount) {
            for (let i = currentCount - 1; i >= targetCount; i--) {
                console.log(`Removing core type ${i + 1}`)
                allCoreMappings[i].remove()
            }
        }

        // Update combined settings core options after core count changes
        setTimeout(() => {
            this.updateCombinedCoreOptions()
            this.refreshCombinedSettings()
            // Re-bind collapsible headers after adding/removing cores
            this.bindCollapsibleHeaders()
        }, 200)
    }

    updateCombinedCoreOptions(event) {
        const combinedSection = this.element.querySelector('[data-combined-settings-target="coreTypesSelect"]')
        if (!combinedSection) return

        const controller = this.application.getControllerForElementAndIdentifier(
            combinedSection.closest('[data-controller~="combined-settings"]'),
            'combined-settings'
        )

        if (controller && controller.populateCoreTypeOptions) {
            controller.populateCoreTypeOptions()
        }
    }

    refreshCombinedSettings() {
        const combinedSection = this.element.querySelector('[data-controller~="combined-settings"]')
        if (!combinedSection) return

        const controller = this.application.getControllerForElementAndIdentifier(
            combinedSection,
            'combined-settings'
        )

        if (controller && controller.refreshOnCoreChange) {
            controller.refreshOnCoreChange()
        }
    }

    addCoreMapping(index) {
        // Get the template HTML
        let template = this.coreMappingTemplateTarget.innerHTML

        // Replace all occurrences systematically
        template = template.replace(/Core Type 1000/g, `Core Type ${index + 1}`)
        template = template.replace(/data-core-index="999"/g, `data-core-index="${index}"`)
        template = template.replace(/data-production-section="999"/g, `data-production-section="${index}"`)
        template = template.replace(/data-production-checkbox="999"/g, `data-production-checkbox="${index}"`)
        template = template.replace(/data-charz-section="999"/g, `data-charz-section="${index}"`)
        template = template.replace(/data-charz-checkbox="999"/g, `data-charz-checkbox="${index}"`)
        template = template.replace(/flow-orders-([^-]+)-999/g, `flow-orders-$1-${index}`)
        template = template.replace(/\[core_mappings\]\[999\]/g, `[core_mappings][${index}]`)
        template = template.replace(/\[flow_orders\]\[999\]/g, `[flow_orders][${index}]`)
        template = template.replace(/\[production_mappings\]\[999\]/g, `[production_mappings][${index}]`)
        template = template.replace(/\[show_production_for_core\]\[999\]/g, `[show_production_for_core][${index}]`)
        template = template.replace(/\[show_charz_for_core\]\[999\]/g, `[show_charz_for_core][${index}]`)
        template = template.replace(/\[charz_data\]\[999\]/g, `[charz_data][${index}]`)
        template = template.replace(/_999/g, `_${index}`)
        template = template.replace(/="999"/g, `="${index}"`)

        // Append the modified template
        this.coreMappingsTarget.insertAdjacentHTML('beforeend', template)

        console.log(`Added core mapping ${index}`)

        // Re-bind collapsible headers after adding new core
        setTimeout(() => {
            this.bindCollapsibleHeaders()
        }, 100)
    }

}
