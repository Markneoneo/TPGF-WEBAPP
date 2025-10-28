import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tablesContainer"]

  connect() {
    this.searchTypes = new Set()
    this.testTypes = {}

    // Initialize granularity buttons
    this.initializeGranularityButtons()
    // Initialize search type buttons
    this.initializeSearchTypeButtons()
  }

  initializeGranularityButtons() {
    const buttons = this.element.querySelectorAll('[data-granularity]')

    buttons.forEach(button => {
      const checkbox = button.querySelector('input[type="checkbox"]')

      if (checkbox) {
        button.addEventListener('click', () => {
          checkbox.checked = !checkbox.checked
          button.classList.toggle('active', checkbox.checked)
        })
      }
    })
  }

  initializeSearchTypeButtons() {
    const buttons = this.element.querySelectorAll('[data-search-type-btn]')

    buttons.forEach(button => {
      const checkbox = button.querySelector('input[type="checkbox"]')

      if (checkbox) {
        button.addEventListener('click', () => {
          checkbox.checked = !checkbox.checked
          button.classList.toggle('active', checkbox.checked)

          // Trigger the toggleSearchType logic
          const searchType = checkbox.value
          if (checkbox.checked) {
            this.searchTypes.add(searchType)
            this.addSearchTypeTable(searchType)
          } else {
            this.searchTypes.delete(searchType)
            this.removeSearchTypeTable(searchType)
          }
        })
      }
    })
  }

  initializeTestTypeButtons(searchTypeTable) {
    const buttons = searchTypeTable.querySelectorAll('[data-test-type-btn]')

    buttons.forEach(button => {
      const checkbox = button.querySelector('input[type="checkbox"]')

      if (checkbox) {
        button.addEventListener('click', () => {
          checkbox.checked = !checkbox.checked
          button.classList.toggle('active', checkbox.checked)

          // Trigger the toggleTestType logic
          const testType = checkbox.value
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
        })
      }
    })
  }

  initializeUsePowerSupplyButton(searchTypeTable) {
    const usePowerSupplyBtn = searchTypeTable.querySelector('[data-use-power-supply-charz]')

    if (usePowerSupplyBtn) {
      const checkbox = usePowerSupplyBtn.querySelector('input[type="checkbox"]')

      usePowerSupplyBtn.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked
        usePowerSupplyBtn.classList.toggle('active', checkbox.checked)

        // Trigger the togglePowerSupply logic
        this.togglePowerSupply({ target: checkbox, currentTarget: usePowerSupplyBtn })
      })
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

    // Get template HTML and replace all placeholders
    let html = template.innerHTML
    html = html.replace(/SEARCH_TYPE/g, searchType)
    html = html.replace(/IP_TYPE/g, ipType)
    html = html.replace(/CORE_INDEX/g, coreIndex)

    // Create a temporary div to hold the HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    // Get the search type card
    const searchTypeCard = tempDiv.querySelector('.charz-search-type-card')

    // Append to container
    this.tablesContainerTarget.appendChild(searchTypeCard)

    // Initialize test types for this search type
    this.testTypes[searchType] = new Set()

    // Set default value for FMAX spec variable
    if (searchType === 'FMAX') {
      const specVariableInput = searchTypeCard.querySelector('input[name*="spec_variables"]')
      if (specVariableInput) {
        specVariableInput.value = 'TIM.1.refclk_freq[MHz]'
      }
    }

    // Initialize test type buttons and use power supply button for this search type table
    setTimeout(() => {
      this.initializeTestTypeButtons(searchTypeCard)
      this.initializeUsePowerSupplyButton(searchTypeCard)
    }, 100)
  }

  removeSearchTypeTable(searchType) {
    const table = this.tablesContainerTarget.querySelector(`[data-search-type="${searchType}"]`)
    if (table) {
      table.remove()
      delete this.testTypes[searchType]
    }
  }

  addTestTypeRow(tbody, searchType, testType) {
    const row = document.createElement('tr')
    const coreIndex = this.element.closest('[data-core-index]').dataset.coreIndex
    const ipType = this.element.closest('[data-ip-type]').dataset.ipType

    const units = searchType === 'VMIN'
      ? { tp: 'MHz', search: 'V' }
      : { tp: 'V', search: 'MHz' }

    row.innerHTML = `
      <td>${testType}</td>
      <!-- REMOVED RM Settings input -->
      <td>
        <input type="number" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][wl_count]"
               min="0"
               value="0"
               placeholder="0"
               data-action="input->charz-parameters#updateWorkloadTable">
      </td>
      <td>
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][tp]"
               placeholder="${units.tp}"
               data-action="blur->charz-parameters#convertPeriodsToP">
      </td>
      <td>
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_start]"
               placeholder="${units.search}">
      </td>
      <td>
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_end]"
               placeholder="${units.search}">
      </td>
      <td>
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][search_step]"
               placeholder="${units.search}">
      </td>
      <td>
        <input type="text" 
               name="ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType}][resolution]"
               placeholder="${units.search}">
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
    table.className = 'charz-workload-section'
    table.innerHTML = `
      <div class="charz-workload-header">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
        <h6>${searchType} Workload Configuration</h6>
      </div>
      <div class="charz-workload-table-container">
        <table class="charz-workload-table">
          <thead>
            <tr>
              ${Object.keys(wlCounts).map(tt => `<th>${tt}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: maxWlCount }).map((_, idx) => `
              <tr>
                ${Object.entries(wlCounts).map(([testType, count]) => `
                  <td>
                    ${idx < count ? `
                      <input type="text" 
                             name="ip_configurations[${ipType}][charz_data][${coreIndex}][workload_table][${searchType}][${testType}][]"
                             placeholder="Workload ${idx + 1}">
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
    const button = event.currentTarget

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
        if (button) button.classList.remove('active')
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

  convertPeriodsToP(event) {
    const input = event.target
    let value = input.value.trim()

    if (!value) return

    // Convert periods to 'p' in the value
    // Handles both single values and comma-separated lists
    const convertedValue = value
      .split(',')
      .map(item => item.trim())
      .map(item => {
        // Replace decimal point with 'p'
        // e.g., "1.1" becomes "1p1", "0.75" becomes "0p75"
        return item.replace('.', 'p')
      })
      .join(', ')

    // Update the input value
    input.value = convertedValue
  }

}
