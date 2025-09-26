import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tablesContainer"]

  connect() {
    this.searchTypes = new Set()
    this.testTypes = {}
  }

  toggleSearchType(event) {
    const searchType = event.target.value

    if (event.target.checked) {
      this.searchTypes.add(searchType)
      this.addSearchTypeTable(searchType)
    } else {
      this.searchTypes.delete(searchType)
      this.removeSearchTypeTable(searchType)
    }
  }

  addSearchTypeTable(searchType) {
    const template = document.getElementById('search-type-table-template')

    if (!template) {
      console.error('Template not found!')
      return
    }

    // Get IP type and core index from the parent element
    const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
    const ipType = this.element.closest('[data-ip-type]').dataset.ipType

    // Clone the template content
    const content = template.content.cloneNode(true)

    // Replace placeholders in all elements
    const replaceInElement = (element) => {
      // Replace in text nodes
      if (element.nodeType === Node.TEXT_NODE) {
        element.textContent = element.textContent.replace(/SEARCH_TYPE/g, searchType)
      }

      // Replace in attributes
      if (element.nodeType === Node.ELEMENT_NODE) {
        // Replace in all attributes
        Array.from(element.attributes).forEach(attr => {
          let value = attr.value
          value = value.replace(/SEARCH_TYPE/g, searchType)
          value = value.replace(/IP_TYPE/g, ipType)
          value = value.replace(/CORE_INDEX/g, coreIndex)
          element.setAttribute(attr.name, value)
        })
      }

      // Recurse for child nodes
      Array.from(element.childNodes).forEach(child => replaceInElement(child))
    }

    // Get the search type div from content
    const searchTypeDiv = content.querySelector('.search-type-section')
    replaceInElement(searchTypeDiv)

    // Append to container
    this.tablesContainerTarget.appendChild(searchTypeDiv)

    // Initialize test types for this search type
    this.testTypes[searchType] = new Set()
  }

  removeSearchTypeTable(searchType) {
    const table = this.tablesContainerTarget.querySelector(`[data-search-type="${searchType}"]`)
    if (table) {
      table.remove()
      delete this.testTypes[searchType]
    }
  }

  toggleTestType(event) {
    const checkbox = event.target
    const testType = checkbox.value
    const searchTypeTable = checkbox.closest('[data-search-type]')
    const searchType = searchTypeTable.dataset.searchType
    const tbody = searchTypeTable.querySelector('[data-test-types-tbody]')

    if (checkbox.checked) {
      if (!this.testTypes[searchType]) {
        this.testTypes[searchType] = new Set()
      }
      this.testTypes[searchType].add(testType)
      this.addTestTypeRow(tbody, searchType, testType)
    } else {
      this.testTypes[searchType].delete(testType)
      this.removeTestTypeRow(tbody, testType)
    }

    // Update workload table after adding/removing test type
    this.updateWorkloadTable(searchTypeTable)
  }

  addTestTypeRow(tbody, searchType, testType) {
    const row = document.createElement('tr')
    const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
    const ipType = this.element.closest('[data-ip-type]').dataset.ipType

    const units = searchType === 'VMIN'
      ? { tp: 'MHz', search: 'V' }
      : { tp: 'V', search: 'MHz' }

    row.innerHTML = `
      <td class="border px-2 py-1">${testType}</td>
      <td class="border px-2 py-1">
        <input type="number" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][wl_count]"
               class="w-20 px-1 py-1 border rounded"
               min="0"
               value="0"
               data-action="input->charz-parameters#updateWorkloadTable">
      </td>
      <td class="border px-2 py-1">
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][tp]"
               placeholder="${units.tp}"
               class="w-24 px-1 py-1 border rounded">
      </td>
      <td class="border px-2 py-1">
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_start]"
               placeholder="${units.search}"
               class="w-24 px-1 py-1 border rounded">
      </td>
      <td class="border px-2 py-1">
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_end]"
               placeholder="${units.search}"
               class="w-24 px-1 py-1 border rounded">
      </td>
      <td class="border px-2 py-1">
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_step]"
               placeholder="${units.search}"
               class="w-24 px-1 py-1 border rounded">
      </td>
      <td class="border px-2 py-1">
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][resolution]"
               placeholder="${units.search}"
               class="w-24 px-1 py-1 border rounded">
      </td>
    `

    row.dataset.testType = testType
    tbody.appendChild(row)
  }

  removeTestTypeRow(tbody, testType) {
    const row = tbody.querySelector(`[data-test-type="${testType}"]`)
    if (row) {
      row.remove()
    }
  }

  updateWorkloadTable(event) {
    // Handle both direct calls and event calls
    const searchTypeTable = event.target ? event.target.closest('[data-search-type]') : event
    if (!searchTypeTable) return

    const searchType = searchTypeTable.dataset.searchType
    const workloadContainer = searchTypeTable.querySelector('[data-workload-container]')
    const tbody = searchTypeTable.querySelector('[data-test-types-tbody]')

    if (!workloadContainer || !tbody) return

    // Clear existing workload table
    workloadContainer.innerHTML = ''

    // Get max WL count
    let maxWlCount = 0
    const wlCounts = {}

    tbody.querySelectorAll('tr').forEach(row => {
      const testType = row.dataset.testType
      const wlCountInput = row.querySelector('input[name*="wl_count"]')
      const count = parseInt(wlCountInput?.value) || 0

      if (count > 0) {
        wlCounts[testType] = count
        maxWlCount = Math.max(maxWlCount, count)
      }
    })

    // Only create workload table if there are workloads to show
    if (maxWlCount === 0 || Object.keys(wlCounts).length === 0) return

    // Create workload table
    const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
    const ipType = this.element.closest('[data-ip-type]').dataset.ipType

    const table = document.createElement('div')
    table.className = 'mt-4'
    table.innerHTML = `
      <h6 class="font-semibold mb-2">${searchType} Workload Table</h6>
      <div class="overflow-x-auto border rounded">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-gray-100">
              ${Object.keys(wlCounts).map(tt => `<th class="border px-2 py-1 text-sm">${tt}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: maxWlCount }).map((_, idx) => `
              <tr>
                ${Object.entries(wlCounts).map(([testType, count]) => `
                  <td class="border px-2 py-1">
                    ${idx < count ? `
                      <input type="text" 
                             name="ip_configurations[${ipType}][charz_data][${coreIndex}][workload_table][${searchType}][${testType}][]"
                             placeholder="WL ${idx + 1}"
                             class="w-full px-1 py-1 border rounded text-sm">
                    ` : ''}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `

    workloadContainer.appendChild(table)
  }

  togglePowerSupply(event) {
    const searchTypeTable = event.target.closest('[data-search-type]')
    const specVariableInput = searchTypeTable.querySelector('input[name*="spec_variables"]')

    // Get the core index and IP type
    const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
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
