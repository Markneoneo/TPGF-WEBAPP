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

        console.log(`Found ${headers.length} collapsible headers`)

        headers.forEach(header => {
            // Remove existing listener if any
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
        const coreIndex = header.dataset.coreIndex
        const sectionName = header.dataset.sectionName
        const collapsibleSection = header.closest('.collapsible-section')

        console.log('Collapsible clicked:', { coreIndex, sectionName })

        // Find the checkbox
        const checkbox = collapsibleSection.querySelector(`[data-${sectionName}-checkbox="${coreIndex}"]`)

        // Find the content section
        const contentSection = this.element.querySelector(`[data-${sectionName}-section="${coreIndex}"]`)

        if (!checkbox || !contentSection) {
            console.error(`Could not find checkbox or content section for ${sectionName}`, { checkbox, contentSection })
            return
        }

        // Toggle checkbox
        checkbox.checked = !checkbox.checked

        console.log('Toggled checkbox to:', checkbox.checked)

        // Toggle UI
        if (checkbox.checked) {
            contentSection.classList.remove('hidden')
            collapsibleSection.classList.add('expanded')

            // Initialize Tom Select for production parameters if needed
            if (sectionName === 'production') {
                setTimeout(() => {
                    this.initializeProductionSelect(coreIndex)
                }, 100)
            }
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

    initializeProductionSelect(coreIndex) {
        const selectElement = this.element.querySelector(`#flow-orders-${this.ipType}-${coreIndex}`)

        if (!selectElement) {
            console.log(`No flow orders select found for core ${coreIndex}`)
            return
        }

        // Check if Tom Select is already initialized
        if (selectElement.tomselect) {
            console.log('Tom Select already initialized for core', coreIndex)
            return
        }

        console.log(`Initializing Tom Select for ${this.ipType} core ${coreIndex}`)

        // Initialize Tom Select
        new TomSelect(selectElement, {
            plugins: ['remove_button'],
            create: false,
            maxItems: null,
            placeholder: 'Search and select flow orders...',
            searchField: ['text'],
            closeAfterSelect: false
        })
    }
}
