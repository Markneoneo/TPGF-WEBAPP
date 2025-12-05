import { Controller } from "@hotwired/stimulus"
import { showSuccess, showError, showWarning, showInfo, showLoading } from "../utils/toast"

export default class extends Controller {
    static targets = ["fileInput", "previewModal", "previewContent", "fileName"]

    connect() {
        console.log('Import settings controller connected')
        this.checkForImportData()
    }

    async checkForImportData() {
        const importData = sessionStorage.getItem('importData')

        if (importData) {
            sessionStorage.removeItem('importData')
            const loadingToast = showLoading('Importing settings...')

            try {
                const data = JSON.parse(importData)
                await new Promise(resolve => setTimeout(resolve, 500))
                const results = await this.populateForm(data)

                loadingToast.remove()

                if (results.failed === 0) {
                    showSuccess(`Successfully imported ${results.successful} IP configuration(s)!`, { duration: 5000 })
                } else if (results.successful > 0) {
                    showWarning(`Partially imported: ${results.successful} successful, ${results.failed} failed.`, { duration: 8000 })
                } else {
                    showError(`Import failed for all ${results.total} IP type(s).`, { duration: 8000 })
                }
            } catch (error) {
                loadingToast.remove()
                showError(`Failed to import settings: ${error.message}`, { duration: 8000 })
                this.logImportError('checkForImportData', error)
            }
        }
    }

    selectFile() {
        this.fileInputTarget.click()
    }

    async handleFileSelect(event) {
        const file = event.target.files[0]
        if (!file) return

        if (!file.name.endsWith('.json')) {
            showError('Please select a JSON file')
            this.fileInputTarget.value = ''
            return
        }

        const loadingToast = showInfo('Reading file...')

        try {
            const content = await this.readFile(file)
            const data = JSON.parse(content)

            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                loadingToast.remove()
                showError('Invalid JSON file: must be a non-empty object')
                this.fileInputTarget.value = ''
                return
            }

            loadingToast.remove()
            this.showPreview(file.name, data)

        } catch (error) {
            loadingToast.remove()
            if (error instanceof SyntaxError) {
                showError('Invalid JSON format. Please check your file.', { duration: 7000 })
            } else {
                showError(`Failed to read file: ${error.message}`, { duration: 7000 })
            }
            this.logImportError('handleFileSelect', error)
        }

        this.fileInputTarget.value = ''
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (e) => reject(new Error('Failed to read file'))
            reader.readAsText(file)
        })
    }

    showPreview(fileName, data) {
        this.fileNameTarget.textContent = fileName
        this.previewContentTarget.textContent = JSON.stringify(data, null, 2)
        this.importData = data
        this.previewModalTarget.classList.remove('hidden')
        this.previewModalTarget.classList.add('animate-fadeIn')
    }

    closePreview() {
        this.previewModalTarget.classList.add('hidden')
        this.importData = null
    }

    async confirmImport() {
        if (!this.importData) {
            showError('No data to import')
            return
        }

        const dataToImport = this.importData
        this.closePreview()

        sessionStorage.setItem('importData', JSON.stringify(dataToImport))
        window.location.reload()
    }

    async populateForm(data) {
        this.logImportProgress('=== Starting Form Population ===')

        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format')
        }

        const ipTypesInData = Object.keys(data)
        const ipTypes = ipTypesInData
            .filter(key => ['cpu', 'gfx', 'soc'].includes(key.toLowerCase()))
            .map(key => key.toUpperCase())

        if (ipTypes.length === 0) {
            throw new Error('No valid IP types found')
        }

        const results = { total: ipTypes.length, successful: 0, failed: 0, errors: [] }

        // Select IP types
        for (const ipType of ipTypes) {
            this.logImportProgress(`Selecting IP type: ${ipType}`)

            const checkbox = document.querySelector(`input[name="selected_ip_types[]"][value="${ipType}"]`)

            if (checkbox && !checkbox.checked) {
                checkbox.click()
                await new Promise(resolve => setTimeout(resolve, 600))

                const section = document.querySelector(`[data-ip-type="${ipType}"]`)
                if (section) {
                    this.logImportProgress(`✓ Section for ${ipType} appeared`)
                    await new Promise(resolve => setTimeout(resolve, 400))
                }
            }
        }

        this.logImportProgress('Waiting for all sections to initialize...')
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Populate each IP type
        for (const ipType of ipTypes) {
            const originalKey = ipTypesInData.find(k => k.toUpperCase() === ipType)

            this.logImportProgress(`Processing ${ipType} (original key: ${originalKey})`)

            if (originalKey && data[originalKey]) {
                try {
                    await this.populateIpConfiguration(ipType, data[originalKey])
                    results.successful++
                    this.logImportProgress(`✓ ${ipType} imported successfully`)
                } catch (error) {
                    results.failed++
                    results.errors.push(`${ipType}: ${error.message}`)
                    this.logImportError(`${ipType} configuration`, error)
                    this.logImportProgress(`✗ ${ipType} failed: ${error.message}`)
                }
            }
        }

        this.logImportProgress('=== Form Population Complete ===', results)
        return results
    }

    async populateIpConfiguration(ipType, ipData) {
        this.logImportProgress(`Starting ${ipType} configuration`)

        const ipSection = document.getElementById(`${ipType}-config`)

        if (!ipSection) {
            throw new Error(`IP section not found for ${ipType}`)
        }

        const cores = this.extractCores(ipData)
        this.logImportProgress(`Extracted ${cores.length} cores for ${ipType}`)

        if (cores.length === 0) {
            this.logImportProgress(`No cores found for ${ipType}`)
            return
        }

        // Separate combined cores from regular cores
        const regularCores = cores.filter(c => !c.isCombined || !c.isCombined.isCombined)
        const combinedCores = cores.filter(c => c.isCombined && c.isCombined.isCombined)

        this.logImportProgress(`Regular cores: ${regularCores.length}, Combined cores: ${combinedCores.length}`)

        // Get the IP configuration controller
        const ipConfigController = this.application.getControllerForElementAndIdentifier(
            ipSection,
            'ip-configuration'
        )

        // Set number of core types (only regular cores)
        const numCoresInput = ipSection.querySelector('input[name*="num_core_types"]')

        if (numCoresInput && regularCores.length > 0) {
            this.logImportProgress(`Setting core count to ${regularCores.length} for ${ipType}`)

            numCoresInput.value = regularCores.length

            if (ipConfigController && ipConfigController.updateCoreCount) {
                this.logImportProgress(`Calling updateCoreCount on controller`)
                ipConfigController.updateCoreCount()
            } else {
                this.logImportProgress(`Dispatching change event on numCoresInput`)
                numCoresInput.dispatchEvent(new Event('change', { bubbles: true }))
            }

            // Wait for core mappings to be created
            this.logImportProgress(`Waiting for ${regularCores.length} core mappings to be created...`)

            for (let i = 0; i < regularCores.length; i++) {
                try {
                    await this.waitForCoreMapping(ipSection, i, 30, 200)
                    this.logImportProgress(`✓ Core mapping ${i} confirmed`)
                } catch (error) {
                    this.logImportError(`waitForCoreMapping ${i}`, error)
                    throw error
                }
            }

            this.logImportProgress(`All ${regularCores.length} core mappings confirmed`)
        }

        // Populate regular cores
        for (let index = 0; index < regularCores.length; index++) {
            try {
                this.logImportProgress(`Populating regular core ${index} (${regularCores[index].name}) for ${ipType}`)
                await this.populateCore(ipSection, ipType, index, regularCores[index])
            } catch (error) {
                this.logImportError(`populateCore ${index}`, error)
            }
        }

        // Populate combined cores
        for (const combinedCore of combinedCores) {
            try {
                this.logImportProgress(`Populating combined core ${combinedCore.name} for ${ipType}`)
                await this.populateCombinedSettings(ipSection, ipType, combinedCore, combinedCore.isCombined.cores)
            } catch (error) {
                this.logImportError(`populateCombinedSettings ${combinedCore.name}`, error)
            }
        }

        this.logImportProgress(`Completed ${ipType} configuration`)
    }

    waitForCoreMapping(ipSection, coreIndex, maxRetries = 20, interval = 150) {
        return new Promise((resolve, reject) => {
            let retries = 0

            const checkInterval = setInterval(() => {
                retries++

                const coreMapping = ipSection.querySelector(`[data-core-index="${coreIndex}"]`)

                if (coreMapping) {
                    clearInterval(checkInterval)
                    this.logImportProgress(`✓ Core mapping ${coreIndex} found`)
                    resolve(coreMapping)
                } else if (retries >= maxRetries) {
                    clearInterval(checkInterval)
                    const error = new Error(`Core mapping ${coreIndex} not created after ${maxRetries * interval}ms`)
                    this.logImportError(`waitForCoreMapping ${coreIndex}`, error)
                    reject(error)
                } else {
                    this.logImportProgress(`Waiting for core mapping ${coreIndex}... (${retries}/${maxRetries})`)
                }
            }, interval)
        })
    }

    extractCores(ipData) {
        const cores = []
        const combinedCores = []

        if (!ipData || typeof ipData !== 'object') {
            return cores
        }

        Object.entries(ipData).forEach(([coreName, coreConfig]) => {
            if (!coreConfig || typeof coreConfig !== 'object') {
                return
            }

            const hasDirectCoreProps = coreConfig.power_supply !== undefined ||
                coreConfig.clock !== undefined ||
                coreConfig.frequency !== undefined

            if (hasDirectCoreProps) {
                // Check if this is a combined core (name contains multiple core names without underscore)
                // Combined cores have prod_settings directly, not nested
                const hasProdSettings = coreConfig.prod_settings &&
                    typeof coreConfig.prod_settings === 'object' &&
                    Object.keys(coreConfig.prod_settings).length > 0

                // Check if any prod_settings values have nested prod_settings (indicating individual cores)
                const hasNestedProdSettings = hasProdSettings &&
                    Object.values(coreConfig.prod_settings).some(val =>
                        val && typeof val === 'object' && val.prod_settings !== undefined
                    )

                if (hasNestedProdSettings) {
                    // This is a combined core wrapper - skip it, we'll get the individual cores
                    this.logImportProgress(`Skipping combined wrapper: ${coreName}`)
                    combinedCores.push({
                        name: coreName,
                        ...coreConfig
                    })
                } else {
                    // This is a regular core or a combined core with direct settings
                    cores.push({
                        name: coreName,
                        ...coreConfig,
                        isCombined: this.isCombinedCoreName(coreName, ipData)
                    })
                }
            }
        })

        this.logImportProgress(`Extracted ${cores.length} cores:`, cores.map(c => c.name))
        this.logImportProgress(`Found ${combinedCores.length} combined wrappers`)

        // Store combined cores for later use
        this.combinedCoresData = combinedCores

        return cores
    }

    // Helper to detect if a core name is a combination of other cores
    isCombinedCoreName(coreName, ipData) {
        // Get all other core names
        const allCoreNames = Object.keys(ipData).filter(name => name !== coreName)

        // Check if this core name is a concatenation of 2 or more other core names
        // For example: "CORE1CORE2" is a combination of "CORE1" and "CORE2"
        let matchedCores = []

        for (let i = 0; i < allCoreNames.length; i++) {
            for (let j = i + 1; j < allCoreNames.length; j++) {
                const combined1 = allCoreNames[i] + allCoreNames[j]
                const combined2 = allCoreNames[j] + allCoreNames[i]

                if (coreName === combined1 || coreName === combined2) {
                    matchedCores = [allCoreNames[i], allCoreNames[j]]
                    return { isCombined: true, cores: matchedCores }
                }
            }
        }

        return { isCombined: false, cores: [] }
    }

    async populateCore(ipSection, ipType, coreIndex, coreData) {
        this.logImportProgress(`--- populateCore START: ${ipType} core ${coreIndex} ---`)

        const coreMapping = ipSection.querySelector(`[data-core-index="${coreIndex}"]`)

        if (!coreMapping) {
            const existingMappings = ipSection.querySelectorAll('[data-core-index]')
            const existingIndices = Array.from(existingMappings).map(m => m.dataset.coreIndex)
            this.logImportProgress(`Available core indices:`, existingIndices)

            throw new Error(`Core mapping not found for index ${coreIndex}`)
        }

        this.logImportProgress(`✓ Core mapping found for index ${coreIndex}`)

        // Check if this is a combined core
        const combinedInfo = coreData.isCombined || { isCombined: false, cores: [] }

        if (combinedInfo.isCombined) {
            this.logImportProgress(`This is a combined core: ${coreData.name} = ${combinedInfo.cores.join(' + ')}`)

            // For combined cores, we don't populate the core mapping fields
            // Instead, we'll populate the Combined Settings section
            await this.populateCombinedSettings(ipSection, ipType, coreData, combinedInfo.cores)

        } else {
            // Regular core - populate normally
            this.setInputValue(coreMapping, `ip_configurations[${ipType}][core_mappings][${coreIndex}][core]`, coreData.name || '')
            this.setInputValue(coreMapping, `ip_configurations[${ipType}][core_mappings][${coreIndex}][core_count]`, '1')
            this.setInputValue(coreMapping, `ip_configurations[${ipType}][core_mappings][${coreIndex}][supply]`, coreData.power_supply || '')
            this.setInputValue(coreMapping, `ip_configurations[${ipType}][core_mappings][${coreIndex}][clock]`, coreData.clock || '')
            this.setInputValue(coreMapping, `ip_configurations[${ipType}][core_mappings][${coreIndex}][frequency]`, coreData.frequency || '')

            await new Promise(resolve => setTimeout(resolve, 200))

            if (coreData.prod_settings && Object.keys(coreData.prod_settings).length > 0) {
                this.logImportProgress(`Found ${Object.keys(coreData.prod_settings).length} production settings`)
                try {
                    await this.populateProductionSettings(ipSection, ipType, coreIndex, coreData.prod_settings)
                } catch (error) {
                    this.logImportError(`populateProductionSettings core ${coreIndex}`, error)
                }
            }

            if (coreData.charz_settings && Object.keys(coreData.charz_settings).length > 0) {
                this.logImportProgress(`Found charz settings`)
                try {
                    await this.populateCharzSettings(ipSection, ipType, coreIndex, coreData.charz_settings)
                } catch (error) {
                    this.logImportError(`populateCharzSettings core ${coreIndex}`, error)
                }
            }
        }

        this.logImportProgress(`--- populateCore END: ${ipType} core ${coreIndex} ---`)
    }

    async populateProductionSettings(ipSection, ipType, coreIndex, prodSettings) {
        this.logImportProgress(`Populating production settings for core ${coreIndex}`)

        const productionCheckbox = ipSection.querySelector(`[data-production-checkbox="${coreIndex}"]`)
        if (productionCheckbox && !productionCheckbox.checked) {
            const collapsibleHeader = productionCheckbox.closest('.collapsible-header')
            if (collapsibleHeader) {
                collapsibleHeader.click()
            }
        }

        await new Promise(resolve => setTimeout(resolve, 800))

        const productionSection = ipSection.querySelector(`[data-production-section="${coreIndex}"]`)
        if (!productionSection) {
            throw new Error(`Production section not found for core ${coreIndex}`)
        }

        const flowOrders = Object.keys(prodSettings).filter(key =>
            !['power_supply', 'clock', 'frequency', 'setup_settings'].includes(key)
        )

        if (flowOrders.length === 0) {
            this.logImportProgress(`No flow orders found for core ${coreIndex}`)
            return
        }

        this.logImportProgress(`Found ${flowOrders.length} flow orders:`, flowOrders)

        const flowOrderSelect = productionSection.querySelector('select[data-production-parameters-target="flowOrdersSelect"]')
        if (!flowOrderSelect) {
            throw new Error('Flow order select not found')
        }

        await this.waitForTomSelect(flowOrderSelect, 20, 100)

        // Get the production parameters controller
        const productionController = this.application.getControllerForElementAndIdentifier(
            productionSection,
            'production-parameters'
        )

        this.logImportProgress(`Production controller found:`, productionController ? 'YES' : 'NO')

        // Add flow orders one by one and wait for mappings to be created
        for (const order of flowOrders) {
            this.logImportProgress(`Adding flow order: ${order}`)

            try {
                flowOrderSelect.tomselect.addItem(order.toUpperCase())

                // Wait for the mapping to be created
                await new Promise(resolve => setTimeout(resolve, 400))

                // Verify mapping was created
                const mapping = productionSection.querySelector(`[data-order="${order.toUpperCase()}"]`)
                if (!mapping) {
                    this.logImportProgress(`⚠️ Mapping not created for ${order}, trying manual creation`)

                    // Manually trigger mapping creation if controller is available
                    if (productionController && productionController.addFlowOrderMapping) {
                        productionController.addFlowOrderMapping(order.toUpperCase())
                        await new Promise(resolve => setTimeout(resolve, 300))
                    }
                } else {
                    this.logImportProgress(`✓ Mapping created for ${order}`)
                }
            } catch (error) {
                this.logImportError(`addItem ${order}`, error)
            }
        }

        // Extra wait to ensure all mappings are ready
        await new Promise(resolve => setTimeout(resolve, 500))

        // Populate each flow order
        for (const order of flowOrders) {
            try {
                this.logImportProgress(`Populating flow order ${order} for core ${coreIndex}`)
                await this.populateFlowOrder(productionSection, ipType, coreIndex, order, prodSettings[order])
            } catch (error) {
                this.logImportError(`populateFlowOrder ${order}`, error)
            }
        }
    }

    waitForTomSelect(selectElement, maxRetries = 20, interval = 100) {
        return new Promise((resolve, reject) => {
            let retries = 0

            const checkInterval = setInterval(() => {
                retries++

                if (selectElement.tomselect) {
                    clearInterval(checkInterval)
                    resolve(selectElement.tomselect)
                } else if (retries >= maxRetries) {
                    clearInterval(checkInterval)
                    reject(new Error(`Tom Select not initialized after ${maxRetries} attempts`))
                }
            }, interval)
        })
    }

    async populateFlowOrder(productionSection, ipType, coreIndex, flowOrder, flowData) {
        const flowMapping = productionSection.querySelector(`[data-order="${flowOrder.toUpperCase()}"]`)
        if (!flowMapping) {
            this.logImportError('populateFlowOrder', new Error(`Flow mapping not found for ${flowOrder}`))
            return
        }

        this.logImportProgress(`Populating flow order: ${flowOrder}`)

        const readTypeFw = flowMapping.querySelector('[data-read-type="fw"]')
        if (readTypeFw && !readTypeFw.classList.contains('active')) {
            readTypeFw.click()
        }

        this.setInputValue(flowMapping, `ip_configurations[${ipType}][production_mappings][${coreIndex}][${flowOrder.toUpperCase()}][frequency]`, flowData.frequency || 0)

        const registerSize = flowData.register_setup?.pattern ? Object.values(flowData.register_setup.pattern)[0] : 512
        this.setInputValue(flowMapping, `ip_configurations[${ipType}][production_mappings][${coreIndex}][${flowOrder.toUpperCase()}][register_size]`, registerSize)

        if (flowData.binnable) {
            const binnableBtn = flowMapping.querySelector('[data-boolean-option="binnable"]')
            if (binnableBtn && !binnableBtn.classList.contains('active')) {
                binnableBtn.click()
            }
        }

        if (flowData.softsets) {
            const softsetBtn = flowMapping.querySelector('[data-boolean-option="softsetenable"]')
            if (softsetBtn && !softsetBtn.classList.contains('active')) {
                softsetBtn.click()
            }
        }

        if (flowData.fallback_enable) {
            const fallbackBtn = flowMapping.querySelector('[data-boolean-option="fallbackenable"]')
            if (fallbackBtn && !fallbackBtn.classList.contains('active')) {
                fallbackBtn.click()
            }
        }

        if (flowData.insertion_list && flowData.insertion_list.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 300))

            const insertionSelect = flowMapping.querySelector(`select[data-insertion-select="${flowOrder.toUpperCase()}"]`)
            if (insertionSelect) {
                try {
                    await this.waitForTomSelect(insertionSelect, 10, 100)
                    flowData.insertion_list.forEach(insertion => {
                        insertionSelect.tomselect.addItem(insertion)
                    })
                } catch (error) {
                    this.logImportError('insertion list Tom Select', error)
                }
            }
        }

        if (flowData.test_points && Object.keys(flowData.test_points).length > 0) {
            await this.populateTestPointsSets(flowMapping, ipType, coreIndex, flowOrder, flowData.test_points)
        }

        if (flowData.repetition_settings && flowData.repetition_settings.length > 0) {
            await this.populateRepetitionSettings(flowMapping, ipType, coreIndex, flowOrder, flowData.repetition_settings)
        }
    }

    async populateTestPointsSets(flowMapping, ipType, coreIndex, flowOrder, testPointsData) {
        if (!testPointsData || typeof testPointsData !== 'object') {
            return
        }

        const specVariables = Object.keys(testPointsData)
        const numSets = specVariables.length

        if (numSets === 0) {
            return
        }

        this.logImportProgress(`Setting ${numSets} test points sets for ${flowOrder}`)

        const numSetsInput = flowMapping.querySelector(`[data-test-points-sets-count="${flowOrder.toUpperCase()}"]`)
        if (numSetsInput) {
            numSetsInput.value = numSets
            numSetsInput.dispatchEvent(new Event('change', { bubbles: true }))

            await new Promise(resolve => setTimeout(resolve, 500))

            for (let setIndex = 0; setIndex < specVariables.length; setIndex++) {
                const specVar = specVariables[setIndex]
                try {
                    await this.populateTestPointsSet(flowMapping, ipType, coreIndex, flowOrder, setIndex, specVar, testPointsData[specVar])
                } catch (error) {
                    this.logImportError(`populateTestPointsSet ${setIndex}`, error)
                }
            }
        }
    }

    async populateTestPointsSet(flowMapping, ipType, coreIndex, flowOrder, setIndex, specVar, testPointsValues) {
        const testPointsSet = flowMapping.querySelector(`[data-set-index="${setIndex}"]`)
        if (!testPointsSet) {
            this.logImportError('populateTestPointsSet', new Error(`Test points set ${setIndex} not found`))
            return
        }

        this.logImportProgress(`Populating test points set ${setIndex}: ${specVar}`)

        this.setInputValue(testPointsSet, `ip_configurations[${ipType}][production_mappings][${coreIndex}][${flowOrder.toUpperCase()}][test_points_sets][${setIndex}][spec_variable]`, specVar)

        const tpValues = Object.values(testPointsValues).map(tp => tp.value)

        if (tpValues.length > 0) {
            const listBtn = testPointsSet.querySelector(`[data-test-points-type="list"][data-set="${setIndex}"]`)
            if (listBtn && !listBtn.classList.contains('active')) {
                listBtn.click()
            }

            await new Promise(resolve => setTimeout(resolve, 200))

            const listInput = testPointsSet.querySelector(`[data-list-field-set="${setIndex}"] input`)
            if (listInput) {
                listInput.value = tpValues.join(', ')
            }
        }
    }

    async populateRepetitionSettings(flowMapping, ipType, coreIndex, flowOrder, repetitionData) {
        const numReps = repetitionData.length
        if (numReps === 0) return

        this.logImportProgress(`Setting ${numReps} repetition settings for ${flowOrder}`)

        const numRepsInput = flowMapping.querySelector(`[data-repetition-count="${flowOrder.toUpperCase()}"]`)
        if (numRepsInput) {
            numRepsInput.value = numReps
            numRepsInput.dispatchEvent(new Event('change', { bubbles: true }))

            await new Promise(resolve => setTimeout(resolve, 500))

            const repContainer = flowMapping.querySelector(`[data-repetition-container="${flowOrder.toUpperCase()}"]`)
            if (!repContainer) {
                this.logImportError('populateRepetitionSettings', new Error('Repetition container not found'))
                return
            }

            const repFieldSets = repContainer.querySelectorAll('.repetition-field-set')

            repetitionData.forEach((repData, repIndex) => {
                const fieldSet = repFieldSets[repIndex]
                if (!fieldSet) return

                const [name, value] = Object.entries(repData)[0] || ['', '']

                const nameInput = fieldSet.querySelector('input[name*="[name]"]')
                const listInput = fieldSet.querySelector('input[name*="[list]"]')

                if (nameInput) nameInput.value = name
                if (listInput) listInput.value = value
            })
        }
    }

    async populateCharzSettings(ipSection, ipType, coreIndex, charzSettings) {
        this.logImportProgress(`Starting charz settings for core ${coreIndex}`)

        const charzCheckbox = ipSection.querySelector(`[data-charz-checkbox="${coreIndex}"]`)
        if (charzCheckbox && !charzCheckbox.checked) {
            const collapsibleHeader = charzCheckbox.closest('.collapsible-header')
            if (collapsibleHeader) {
                collapsibleHeader.click()
            }
        }

        await new Promise(resolve => setTimeout(resolve, 800))

        const charzSection = ipSection.querySelector(`[data-charz-section][data-core-index="${coreIndex}"]`)
        if (!charzSection) {
            throw new Error(`Charz section not found for core ${coreIndex}`)
        }

        if (charzSettings.psm_register_size) {
            this.setInputValue(charzSection, `ip_configurations[${ipType}][charz_data][${coreIndex}][psm_register_size]`, charzSettings.psm_register_size)
        }

        const granularities = Object.keys(charzSettings).filter(k => k !== 'psm_register_size')

        if (granularities.length === 0) {
            this.logImportProgress('No granularities found in charz settings')
            return
        }

        this.logImportProgress(`Found granularities:`, granularities)

        granularities.forEach(gran => {
            const granCheckbox = charzSection.querySelector(`input[name*="search_granularity"][value="${gran}"]`)
            if (granCheckbox && !granCheckbox.checked) {
                const granBtn = granCheckbox.closest('button')
                if (granBtn) {
                    granBtn.click()
                }
            }
        })

        const firstGran = charzSettings[granularities[0]]
        const searchTypes = Object.keys(firstGran)

        this.logImportProgress(`Found search types:`, searchTypes)

        searchTypes.forEach(searchType => {
            const searchCheckbox = charzSection.querySelector(`input[name*="search_types"][value="${searchType}"]`)
            if (searchCheckbox && !searchCheckbox.checked) {
                const searchBtn = searchCheckbox.closest('button')
                if (searchBtn) {
                    searchBtn.click()
                }
            }
        })

        await new Promise(resolve => setTimeout(resolve, 700))

        for (const searchType of searchTypes) {
            try {
                await this.populateSearchType(charzSection, ipType, coreIndex, searchType, firstGran[searchType])
            } catch (error) {
                this.logImportError(`populateSearchType ${searchType}`, error)
            }
        }
    }

    async populateSearchType(charzSection, ipType, coreIndex, searchType, searchData) {
        this.logImportProgress(`Populating search type: ${searchType}`)

        const searchTypeTable = charzSection.querySelector(`[data-search-type="${searchType}"]`)
        if (!searchTypeTable) {
            throw new Error(`Search type table not found for ${searchType}`)
        }

        const testTypes = Object.keys(searchData).filter(k => k !== 'rm_types' && k !== 'specvariable')

        if (testTypes.length === 0) {
            this.logImportProgress(`No test types found for ${searchType}`)
            return
        }

        const firstTestType = testTypes[0]
        const firstWorkload = Object.values(searchData[firstTestType])[0]
        const specVariable = firstWorkload?.test_points?.spec_variable || ''

        const specVarInput = searchTypeTable.querySelector('input[name*="spec_variables"]')
        if (specVarInput && specVariable) {
            specVarInput.value = specVariable
        }

        if (searchData.rm_types) {
            await this.populateRmSettings(searchTypeTable, ipType, coreIndex, searchType, searchData.rm_types)
        }

        this.logImportProgress(`Found test types for ${searchType}:`, testTypes)

        testTypes.forEach(testType => {
            const testTypeCheckbox = searchTypeTable.querySelector(`input[name*="selected_test_types"][value="${testType.toUpperCase()}"]`)
            if (testTypeCheckbox && !testTypeCheckbox.checked) {
                const testTypeBtn = testTypeCheckbox.closest('button')
                if (testTypeBtn) {
                    testTypeBtn.click()
                }
            }
        })

        await new Promise(resolve => setTimeout(resolve, 500))

        for (const testType of testTypes) {
            try {
                await this.populateTestType(searchTypeTable, ipType, coreIndex, searchType, testType, searchData[testType])
            } catch (error) {
                this.logImportError(`populateTestType ${testType}`, error)
            }
        }
    }

    async populateRmSettings(searchTypeTable, ipType, coreIndex, searchType, rmTypes) {
        const rmEntries = Object.entries(rmTypes)
        const numRmSettings = rmEntries.length

        if (numRmSettings === 0) return

        this.logImportProgress(`Setting ${numRmSettings} RM settings for ${searchType}`)

        const numRmInput = searchTypeTable.querySelector(`[data-rm-count="${searchType}"]`)
        if (numRmInput) {
            numRmInput.value = numRmSettings
            numRmInput.dispatchEvent(new Event('change', { bubbles: true }))

            await new Promise(resolve => setTimeout(resolve, 500))

            const rmContainer = searchTypeTable.querySelector(`[data-rm-settings-container="${searchType}"]`)
            if (!rmContainer) {
                this.logImportError('populateRmSettings', new Error('RM container not found'))
                return
            }

            const rmFieldSets = rmContainer.querySelectorAll('.rm-setting-field-set')

            rmEntries.forEach(([settingName, fuseData], rmIndex) => {
                const fieldSet = rmFieldSets[rmIndex]
                if (!fieldSet) return

                const [fuseName, fuseValue] = Object.entries(fuseData)[0] || ['', '']

                const nameInput = fieldSet.querySelector('input[name*="[name]"]')
                const fuseNameInput = fieldSet.querySelector('input[name*="[fuse_name]"]')
                const fuseValueInput = fieldSet.querySelector('input[name*="[fuse_value]"]')

                if (nameInput) nameInput.value = settingName
                if (fuseNameInput) fuseNameInput.value = fuseName
                if (fuseValueInput) fuseValueInput.value = fuseValue
            })
        }
    }

    async populateTestType(searchTypeTable, ipType, coreIndex, searchType, testType, testTypeData) {
        this.logImportProgress(`Populating test type: ${testType}`)

        const tbody = searchTypeTable.querySelector('[data-test-types-tbody]')
        if (!tbody) {
            throw new Error('Test types tbody not found')
        }

        const row = tbody.querySelector(`[data-test-type="${testType.toUpperCase()}"]`)
        if (!row) {
            throw new Error(`Test type row not found for ${testType}`)
        }

        const workloads = Object.keys(testTypeData)
        if (workloads.length === 0) {
            this.logImportProgress(`No workloads found for ${testType}`)
            return
        }

        this.logImportProgress(`Found ${workloads.length} workloads for ${testType}`)

        const firstWorkload = testTypeData[workloads[0]]

        this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][wl_count]`, workloads.length)

        const testPoints = firstWorkload.test_points?.values ? Object.keys(firstWorkload.test_points.values) : []
        if (testPoints.length > 0) {
            this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][tp]`, testPoints.join(', '))
        }

        const searchSettings = firstWorkload.search_settings || {}
        this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][search_start]`, searchSettings.start || '')
        this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][search_end]`, searchSettings.stop || '')
        this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][search_step]`, searchSettings.step || '')
        this.setInputValue(row, `ip_configurations[${ipType}][charz_data][${coreIndex}][table][${searchType}][${testType.toUpperCase()}][resolution]`, searchSettings.res || '')

        const wlCountInput = row.querySelector('input[name*="wl_count"]')
        if (wlCountInput) {
            wlCountInput.dispatchEvent(new Event('input', { bubbles: true }))

            await new Promise(resolve => setTimeout(resolve, 500))

            await this.populateWorkloads(searchTypeTable, ipType, coreIndex, searchType, testType, workloads)
        }
    }

    async populateWorkloads(searchTypeTable, ipType, coreIndex, searchType, testType, workloads) {
        this.logImportProgress(`Populating ${workloads.length} workloads for ${testType}`)

        const workloadContainer = searchTypeTable.querySelector('[data-workload-container]')
        if (!workloadContainer) {
            this.logImportError('populateWorkloads', new Error('Workload container not found'))
            return
        }

        const workloadInputs = workloadContainer.querySelectorAll(`input[name*="[workload_table][${searchType}][${testType.toUpperCase()}]"]`)

        workloads.forEach((wl, wlIndex) => {
            if (workloadInputs[wlIndex]) {
                workloadInputs[wlIndex].value = wl
            }
        })
    }

    async populateCombinedSettings(ipSection, ipType, combinedCoreData, individualCoreNames) {
        this.logImportProgress(`Populating combined settings for ${combinedCoreData.name}`)

        // Enable combined settings checkbox
        const combinedCheckbox = ipSection.querySelector('[data-combined-checkbox]')
        if (combinedCheckbox && !combinedCheckbox.checked) {
            const collapsibleHeader = combinedCheckbox.closest('.collapsible-header')
            if (collapsibleHeader) {
                collapsibleHeader.click()
            }
        }

        await new Promise(resolve => setTimeout(resolve, 800))

        const combinedSection = ipSection.querySelector('[data-combined-content]')
        if (!combinedSection) {
            throw new Error('Combined settings section not found')
        }

        // FIXED: Find the indices of the individual cores by matching the populated data
        // We need to match against the cores we already populated, not search by value
        const coreIndices = []

        // Get all core mappings (excluding template)
        const coreMappings = ipSection.querySelectorAll('[data-core-index]:not([data-core-index="999"])')

        // For each individual core name in the combined core
        individualCoreNames.forEach(coreName => {
            // Find the matching core mapping by checking the input values
            coreMappings.forEach((mapping) => {
                const coreIndex = mapping.dataset.coreIndex
                const coreInput = mapping.querySelector(`input[name*="[core_mappings][${coreIndex}][core]"]`)

                if (coreInput && coreInput.value === coreName) {
                    coreIndices.push(coreIndex)
                    this.logImportProgress(`Matched ${coreName} to core index ${coreIndex}`)
                }
            })
        })

        this.logImportProgress(`Found core indices for combined settings:`, coreIndices)

        if (coreIndices.length === 0) {
            this.logImportProgress(`⚠️ Could not find core indices for combined cores`)
            return
        }

        // Validate that we found all the cores we need
        if (coreIndices.length !== individualCoreNames.length) {
            this.logImportProgress(`⚠️ Warning: Expected ${individualCoreNames.length} cores but found ${coreIndices.length}`)
        }

        // Select the core types in the combined settings
        const coreTypesSelect = combinedSection.querySelector('[data-combined-settings-target="coreTypesSelect"]')
        if (coreTypesSelect) {
            await this.waitForTomSelect(coreTypesSelect, 20, 100)

            coreIndices.forEach(idx => {
                this.logImportProgress(`Adding core index ${idx} to combined select`)
                coreTypesSelect.tomselect.addItem(idx)
            })

            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Get flow orders from combined core's prod_settings
        const flowOrders = Object.keys(combinedCoreData.prod_settings || {}).filter(key =>
            !['power_supply', 'clock', 'frequency', 'setup_settings'].includes(key)
        )

        if (flowOrders.length === 0) {
            this.logImportProgress(`No flow orders in combined settings`)
            return
        }

        this.logImportProgress(`Found ${flowOrders.length} flow orders in combined settings:`, flowOrders)

        // Select flow orders
        const flowOrdersSelect = combinedSection.querySelector('[data-combined-settings-target="flowOrdersSelect"]')
        if (flowOrdersSelect) {
            await this.waitForTomSelect(flowOrdersSelect, 20, 100)

            for (const order of flowOrders) {
                this.logImportProgress(`Adding flow order ${order.toUpperCase()} to combined select`)
                flowOrdersSelect.tomselect.addItem(order.toUpperCase())
                await new Promise(resolve => setTimeout(resolve, 400))
            }

            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Populate each flow order in combined settings
        const mappingContainer = combinedSection.querySelector('[data-combined-settings-target="mappingContainer"]')
        if (mappingContainer) {
            for (const order of flowOrders) {
                try {
                    await this.populateCombinedFlowOrder(mappingContainer, ipType, order, combinedCoreData.prod_settings[order], coreIndices)
                } catch (error) {
                    this.logImportError(`populateCombinedFlowOrder ${order}`, error)
                }
            }
        }
    }

    async populateCombinedFlowOrder(mappingContainer, ipType, flowOrder, flowData, coreIndices) {
        const flowMapping = mappingContainer.querySelector(`[data-order="${flowOrder.toUpperCase()}"]`)
        if (!flowMapping) {
            this.logImportError('populateCombinedFlowOrder', new Error(`Flow mapping not found for ${flowOrder}`))
            return
        }

        this.logImportProgress(`Populating combined flow order: ${flowOrder}`)

        // Set read type
        const readTypeFw = flowMapping.querySelector('[data-read-type="fw"]')
        if (readTypeFw && !readTypeFw.classList.contains('active')) {
            readTypeFw.click()
        }

        // Set frequency (no use_core_frequency in combined settings)
        this.setInputValue(flowMapping, `ip_configurations[${ipType}][combined_settings][flow_orders][${flowOrder.toUpperCase()}][frequency]`, flowData.frequency || 0)

        // Set register size
        const registerSize = flowData.register_setup?.pattern ? Object.values(flowData.register_setup.pattern)[0] : 512
        this.setInputValue(flowMapping, `ip_configurations[${ipType}][combined_settings][flow_orders][${flowOrder.toUpperCase()}][register_size]`, registerSize)

        // Set boolean options
        if (flowData.binnable) {
            const binnableBtn = flowMapping.querySelector('[data-boolean-option="binnable"]')
            if (binnableBtn && !binnableBtn.classList.contains('active')) {
                binnableBtn.click()
            }
        }

        if (flowData.softsets) {
            const softsetBtn = flowMapping.querySelector('[data-boolean-option="softsetenable"]')
            if (softsetBtn && !softsetBtn.classList.contains('active')) {
                softsetBtn.click()
            }
        }

        if (flowData.fallback_enable) {
            const fallbackBtn = flowMapping.querySelector('[data-boolean-option="fallbackenable"]')
            if (fallbackBtn && !fallbackBtn.classList.contains('active')) {
                fallbackBtn.click()
            }
        }

        // Set insertion list
        if (flowData.insertion_list && flowData.insertion_list.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 300))

            const insertionSelect = flowMapping.querySelector(`select[data-insertion-select="${flowOrder.toUpperCase()}"]`)
            if (insertionSelect) {
                try {
                    await this.waitForTomSelect(insertionSelect, 10, 100)
                    flowData.insertion_list.forEach(insertion => {
                        insertionSelect.tomselect.addItem(insertion)
                    })
                } catch (error) {
                    this.logImportError('insertion list Tom Select', error)
                }
            }
        }

        // Populate test points for each core in the combination
        if (flowData.test_points && Object.keys(flowData.test_points).length > 0) {
            await this.populateCombinedTestPoints(flowMapping, ipType, flowOrder, flowData.test_points, coreIndices)
        }

        // Populate repetition settings
        if (flowData.repetition_settings && flowData.repetition_settings.length > 0) {
            await this.populateRepetitionSettings(flowMapping, ipType, 'combined', flowOrder, flowData.repetition_settings)
        }
    }

    async populateCombinedTestPoints(flowMapping, ipType, flowOrder, testPointsData, coreIndices) {
        const testPointsContainer = flowMapping.querySelector('[data-test-points-container]')
        if (!testPointsContainer) {
            this.logImportProgress('Test points container not found in combined flow order')
            return
        }

        const specVariables = Object.keys(testPointsData)

        // Assuming each spec variable corresponds to a core
        // Populate test points
        for (let i = 0; i < coreIndices.length && i < specVariables.length; i++) {
            const coreIndex = coreIndices[i]
            const specVar = specVariables[i]
            const testPointsValues = testPointsData[specVar]

            const testPointsSection = testPointsContainer.querySelector(`[data-core-index="${coreIndex}"]`)
            if (!testPointsSection) {
                this.logImportProgress(`Test points section not found for core ${coreIndex}`)
                continue
            }

            // Set spec variable
            const specVarInput = testPointsSection.querySelector('input[name*="spec_variable"]')
            if (specVarInput) {
                specVarInput.value = specVar
            }

            // Extract test point values
            const tpValues = Object.values(testPointsValues).map(tp => tp.value)

            if (tpValues.length > 0) {
                // Use List type
                const listBtn = testPointsSection.querySelector(`[data-test-points-type="list"][data-core="${coreIndex}"]`)
                if (listBtn && !listBtn.classList.contains('active')) {
                    listBtn.click()
                }

                await new Promise(resolve => setTimeout(resolve, 200))

                const listInput = testPointsSection.querySelector(`[data-list-field="${coreIndex}"] input`)
                if (listInput) {
                    listInput.value = tpValues.join(', ')
                }
            }
        }
    }

    setInputValue(container, namePattern, value) {
        const input = container.querySelector(`input[name="${namePattern}"], input[name*="${namePattern}"]`)
        if (input) {
            input.value = value
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            return true
        } else {
            return false
        }
    }

    logImportProgress(message, data = null) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
        console.log(`[${timestamp}] IMPORT:`, message, data || '')
    }

    logImportError(context, error) {
        console.error(`IMPORT ERROR in ${context}:`, error)
        console.error('Stack:', error.stack)
    }
}
