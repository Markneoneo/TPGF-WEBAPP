import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
    static targets = ["jsonContent"]

    connect() {
        this.selectedIpTypes = new Set()
    }

    toggleIpType(event) {
        const checkbox = event.target
        const ipType = checkbox.dataset.ipType
        const configSection = document.getElementById(`${ipType}-config`)

        if (checkbox.checked) {
            this.selectedIpTypes.add(ipType)
            configSection.classList.remove('hidden')
        } else {
            this.selectedIpTypes.delete(ipType)
            configSection.classList.add('hidden')
        }

        // Show/hide global actions
        const globalActions = document.getElementById('global-actions')
        if (this.selectedIpTypes.size > 0) {
            globalActions.classList.remove('hidden')
        } else {
            globalActions.classList.add('hidden')
        }
    }

    clearAll() {
        // Uncheck all IP type checkboxes
        document.querySelectorAll('input[name="selected_ip_types[]"]').forEach(checkbox => {
            checkbox.checked = false
            checkbox.dispatchEvent(new Event('change'))
        })

        // Reset all forms
        this.element.reset()

        // Hide preview
        document.getElementById('json-preview').classList.add('hidden')
        document.getElementById('download-button').classList.add('hidden')
    }

    closePreview() {
        document.getElementById('json-preview').classList.add('hidden')
    }

    // Handle form submission response
    handleSuccess(event) {
        const [data, status, xhr] = event.detail

        if (data.status === 'success') {
            // Show JSON preview
            const preview = document.getElementById('json-preview')
            const content = document.getElementById('json-content')
            content.textContent = JSON.stringify(data.data, null, 2)
            preview.classList.remove('hidden')

            // Show download button
            document.getElementById('download-button').classList.remove('hidden')
        }
    }

    handleError(event) {
        const [data, status, xhr] = event.detail
        alert(`Error: ${data.error}\n${data.details || ''}`)
    }
}

