import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    connect() {
        this.initializeCollapsibles()
        this.initializeTooltips()
        this.initializeStatusIndicators()
    }

    initializeCollapsibles() {
        // Handle collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const section = header.closest('.collapsible-section')
                    const checkbox = header.querySelector('input[type="checkbox"]')

                    // Toggle the checkbox if clicking on header (not the checkbox itself)
                    if (checkbox && !e.target.closest('input')) {
                        checkbox.checked = !checkbox.checked
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }))
                    }

                    section.classList.toggle('expanded')
                }
            })
        })
    }

    initializeTooltips() {
        // Add tooltip functionality
        document.querySelectorAll('.tooltip').forEach(tooltip => {
            const content = tooltip.querySelector('.tooltip-content')
            if (content) {
                tooltip.addEventListener('mouseenter', () => {
                    const rect = tooltip.getBoundingClientRect()
                    content.style.left = '50%'
                    content.style.transform = 'translateX(-50%)'
                })
            }
        })
    }

    initializeStatusIndicators() {
        // Update status indicators based on form completion
        this.updateAllStatuses()

        // Listen for form changes
        document.addEventListener('input', () => this.updateAllStatuses())
        document.addEventListener('change', () => this.updateAllStatuses())
    }

    updateAllStatuses() {
        document.querySelectorAll('.ip-config-section').forEach(section => {
            const ipType = section.closest('[data-ip-type]')?.dataset.ipType
            if (!ipType) return

            const indicator = section.querySelector('.status-indicator')
            if (!indicator) return

            const isValid = this.validateIpConfig(section)

            if (isValid) {
                indicator.className = 'status-indicator valid'
                indicator.innerHTML = '<span class="status-dot"></span>Configuration Valid'
            } else {
                indicator.className = 'status-indicator pending'
                indicator.innerHTML = '<span class="status-dot"></span>Configuration Required'
            }
        })
    }

    validateIpConfig(section) {
        // Check required fields in core mappings
        const requiredFields = section.querySelectorAll('input[placeholder*="Enter"]')
        let allFilled = true

        requiredFields.forEach(field => {
            if (!field.value.trim() && !field.closest('.hidden')) {
                allFilled = false
            }
        })

        return allFilled
    }
}
