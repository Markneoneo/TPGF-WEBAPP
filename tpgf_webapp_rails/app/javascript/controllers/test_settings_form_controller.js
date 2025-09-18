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

    async submitForm(event) {
        event.preventDefault()

        const form = this.element
        const formData = new FormData(form)

        // Log what we're sending
        console.log('Form data being sent:')
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`)
        }

        // Disable the button to prevent double submission
        const button = event.currentTarget
        button.disabled = true
        button.textContent = "Generating Files..."

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content,
                    'Accept': 'application/json'
                }
            })

            // Log the raw response
            const responseText = await response.text()
            console.log('Raw response:', responseText)

            let data
            try {
                data = JSON.parse(responseText)
            } catch (e) {
                console.error('Failed to parse JSON:', responseText)
                throw new Error('Invalid JSON response from server')
            }

            if (response.ok && data.status === 'success') {
                // Show JSON preview
                const preview = document.getElementById('json-preview')
                const content = document.getElementById('json-content')
                content.textContent = JSON.stringify(data.data, null, 2)
                preview.classList.remove('hidden')

                // Show download button
                document.getElementById('download-button').classList.remove('hidden')
            } else {
                alert(`Error: ${data.error || 'Unknown error'}\n${data.details || ''}`)
            }
        } catch (error) {
            console.error('Error:', error)
            alert(`Error generating settings: ${error.message}`)
        } finally {
            // Re-enable the button
            button.disabled = false
            button.textContent = "Generate Combined Test Settings"
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
}
