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
        const content = template.content.cloneNode(true)

        // Replace all occurrences of SEARCH_TYPE
        content.querySelectorAll('*').forEach(element => {
            if (element.textContent) {
                element.textContent = element.textContent.replace(/SEARCH_TYPE/g, searchType)
            }
            if (element.name) {
                element.name = element.name.replace(/SEARCH_TYPE/g, searchType)
            }
            if (element.dataset.searchType) {
                element.dataset.searchType = searchType
            }
        })

        this.tablesContainerTarget.appendChild(content)
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
            this.testTypes[searchType].add(testType)
            this.addTestTypeRow(tbody, searchType, testType)
        } else {
            this.testTypes[searchType].delete(testType)
            this.removeTestTypeRow(tbody, testType)
        }

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
               data-action="change->charz-parameters#updateWorkloadTable">
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
        const searchTypeTable = event.target ? event.target.closest('[data-search-type]') : event
        const searchType = searchTypeTable.dataset.searchType
        const workloadContainer = searchTypeTable.querySelector('[data-workload-container]')
        const tbody = searchTypeTable.querySelector('[data-test-types-tbody]')

        // Clear existing workload table
        workloadContainer.innerHTML = ''

        // Get max WL count
        let maxWlCount = 0
        const wlCounts = {}

        tbody.querySelectorAll('tr').forEach(row => {
            const testType = row.dataset.testType
            const wlCountInput = row.querySelector('input[name*="wl_count"]')
            const count = parseInt(wlCountInput.value) || 0

            if (count > 0) {
                wlCounts[testType] = count
                maxWlCount = Math.max(maxWlCount, count)
            }
        })

        if (maxWlCount === 0) return

        // Create workload table
        const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
        const ipType = this.element.closest('[data-ip-type]').dataset.ipType

        const table = document.createElement('div')
        table.innerHTML = `
      <h6 class="font-semibold mb-2">${searchType} Workload Table</h6>
      <div class="overflow-x-auto">
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
                             class="w-full px-1 py-1 border rounded">
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
        const supplyInput = document.querySelector('[data-supply-field="true"]')

        if (event.target.checked && supplyInput) {
            specVariableInput.value = supplyInput.value
            specVariableInput.disabled = true
        } else {
            specVariableInput.disabled = false
        }
    }
}


