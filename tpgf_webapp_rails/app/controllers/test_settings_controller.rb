class TestSettingsController < ApplicationController
    skip_before_action :verify_authenticity_token, only: [:generate] # For AJAX requests
    
    def new
      @ip_options = ['CPU', 'GFX', 'SOC']
    end
  
    def generate
        selected_ip_types = params[:selected_ip_types] || []
        
        # Validate each selected IP configuration
        validation_errors = {}
        
        selected_ip_types.each do |ip_type|
          if params[:ip_configurations] && params[:ip_configurations][ip_type]
            ip_config = ip_configuration_params(ip_type)
            validator = FormValidator.new(ip_config)
            
            unless validator.validate
              validation_errors[ip_type] = validator.errors
            end
          end
        end
        
        # If there are validation errors, return them
        unless validation_errors.empty?
            render json: {
            status: 'error',
            error: 'Validation failed',
            validation_errors: validation_errors
            }, status: :unprocessable_content  # Changed from :unprocessable_entity
            return
        end
        
        # Continue with processing if validation passes
        ip_configs_to_process = {}
        selected_ip_types.each do |ip_type|
            if params[:ip_configurations] && params[:ip_configurations][ip_type]
            ip_configs_to_process[ip_type] = ip_configuration_params(ip_type)
            end
        end
        
        transformed_configs = transform_params(ip_configs_to_process)
        
        combined_results = {}
        
        transformed_configs.each do |ip_name, config|
            begin
            Rails.logger.info "Processing IP: #{ip_name}"
            
            # Build the simplified structure needed by TestSettingsGenerator
            symbolized_config = {
                ip: config['ip'] || ip_name,
                core_mapping: symbolize_keys(config['core_mapping'] || {})
            }
            
            # Validate required fields
            if symbolized_config[:ip].nil? || symbolized_config[:core_mapping].empty?
                render json: { 
                error: "Missing required fields for '#{ip_name}'",
                details: "ip: #{symbolized_config[:ip].inspect}, core_mapping: #{symbolized_config[:core_mapping].inspect}" 
                }, status: :bad_request
                return
            end
            
            tsettings = TestSettingsGenerator.new(symbolized_config).generate_settings
            combined_results[ip_name] = tsettings
            
            Rails.logger.info "Generated settings for #{ip_name}"
            rescue => e
            Rails.logger.error "Error generating settings for #{ip_name}: #{e.message}"
            Rails.logger.error e.backtrace.join("\n")
            
            render json: { 
                error: 'Internal server error', 
                ip: ip_name, 
                details: e.message 
            }, status: :internal_server_error
            return
            end
        end
        
        # Store in session for download
        session[:generated_settings] = combined_results
        
        render json: {
            status: 'success',
            message: 'Combined settings generated successfully',
            ip_types_processed: combined_results.keys,
            data: combined_results
        }
        end      
    
    def download
      settings = session[:generated_settings]
      
      if settings.nil?
        redirect_to root_path, alert: "No settings to download. Please generate settings first."
        return
      end
      
      send_data JSON.pretty_generate(settings),
                filename: "tsettings.json",
                type: "application/json",
                disposition: "attachment"
    end
    
    private

    def validate_test_point_range(start, stop, step)
      # Check for empty values
      return { valid: false, message: "Start value cannot be empty" } if start.blank?
      return { valid: false, message: "Stop value cannot be empty" } if stop.blank?
      return { valid: false, message: "Step value cannot be empty" } if step.blank?
      
      start_num = start.to_f
      stop_num = stop.to_f
      step_num = step.to_f
      
      # Check for valid numbers
      return { valid: false, message: "Invalid numeric values" } if step_num == 0
      
      # Check step direction
      if (stop_num > start_num && step_num < 0) || (stop_num < start_num && step_num > 0)
        return { valid: false, message: "Step direction must match start-stop direction" }
      end
      
      # Check if range is divisible by step
      range = (stop_num - start_num).abs
      steps = range / step_num.abs
      
      if (steps - steps.round).abs > 0.0001
        return { valid: false, message: "Range is not evenly divisible by step" }
      end
      
      { valid: true, message: nil }
    end
        
    def ip_configuration_params(ip_type)
      params.require(:ip_configurations).require(ip_type).permit!
    end
    
    def transform_params(ip_configs)
      # Transform frontend params to backend format
      transformed = {}
      
      ip_configs.each do |ip_type, config|
        transformed[ip_type.downcase] = {
          'ip' => ip_type.downcase,
          'core_mapping' => transform_core_mapping(config)
        }
      end
      
      transformed
    end
    
    def transform_core_mapping(config)
        core_mapping = {}
        
        return core_mapping unless config[:core_mappings]
        
        config[:core_mappings].to_h.each do |idx, mapping|
          # Skip template entries (index 999)
          next if idx.to_s == '999'
          
          core_name = mapping[:core]
          next if core_name.blank?
          
          # Get the supply value for this core
          supply_value = mapping[:supply]
          
          # Build floworder_mapping if production is enabled
          floworder_mapping = {}
          if config[:show_production_for_core] && config[:show_production_for_core][idx]
            flow_orders = config[:flow_orders] && config[:flow_orders][idx] || []
            production_mappings = config[:production_mappings] && config[:production_mappings][idx] || {}
            
            flow_orders.each do |order|
                mapping_data = production_mappings[order] || {}
                
                # If use_power_supply is checked, use the supply value for spec_variable
                spec_variable = if mapping_data[:use_power_supply].present?
                  mapping[:supply]  # Use the supply value from the core mapping
                else
                  mapping_data[:spec_variable] || ''
                end
                
                floworder_mapping[order.downcase] = {
                  test_points: parse_test_points(mapping_data),
                  frequency: mapping_data[:frequency].to_f,
                  register_size: mapping_data[:register_size].to_i,
                  binnable: mapping_data[:binnable].present?,
                  softsetenable: mapping_data[:softsetenable].present?,
                  fallbackenable: mapping_data[:fallbackenable].present?,
                  insertionlist: parse_insertion_list(mapping_data[:insertion]),
                  readtype: build_read_type(mapping_data),
                  specvariable: spec_variable,
                  use_power_supply: mapping_data[:use_power_supply].present?
                }
              end              
          end
        
        # Build charztype_mapping if enabled
        charztype_mapping = {}
        if config[:show_charz_for_core] && config[:show_charz_for_core][idx]
          charz_data = config[:charz_data] && config[:charz_data][idx] || {}
          
          Rails.logger.info "Charz data for core #{idx}: #{charz_data.inspect}"

          if charz_data[:search_granularity].present? && charz_data[:search_types].present?
            charztype_mapping = {
              granularity: charz_data[:search_granularity],
              searchtype: build_search_types(charz_data)
            }
          end
        end
        
        core_mapping[core_name] = {
          count: mapping[:core_count].to_i,
          supply: mapping[:supply],
          clk: mapping[:clock],
          freq: 1000,
          floworder_mapping: floworder_mapping,
          charztype_mapping: charztype_mapping
        }
      end
      
      core_mapping
    end
  
    def parse_test_points(mapping)
        return [] unless mapping
        
        if mapping[:test_points_type] == 'List'
          return [] if mapping[:test_points].blank?
          mapping[:test_points].to_s.split(',').map(&:strip).map(&:to_f).reject(&:zero?)
        else
          # Range type
          validation = validate_test_point_range(
            mapping[:test_points_start],
            mapping[:test_points_stop],
            mapping[:test_points_step]
          )
          
          if !validation[:valid]
            Rails.logger.warn "Invalid test point range: #{validation[:message]}"
            return []
          end
          
          generate_range(
            mapping[:test_points_start].to_f,
            mapping[:test_points_stop].to_f,
            mapping[:test_points_step].to_f
          )
        end
    end          
  
    def generate_range(start, stop, step)
        return [] if step == 0
        
        # Determine decimal places for precision
        decimal_places = [
          start.to_s.split('.')[1]&.length || 0,
          stop.to_s.split('.')[1]&.length || 0,
          step.to_s.split('.')[1]&.length || 0
        ].max
        
        # Validate step direction
        if (stop > start && step < 0) || (stop < start && step > 0)
          Rails.logger.warn "Invalid step direction: start=#{start}, stop=#{stop}, step=#{step}"
          return []
        end
        
        # Calculate expected number of steps
        range = (stop - start).abs
        expected_steps = (range / step.abs).round(decimal_places + 2)
        
        # Check if range is evenly divisible by step
        if (expected_steps - expected_steps.round).abs > 0.0001
          Rails.logger.warn "Range not evenly divisible: start=#{start}, stop=#{stop}, step=#{step}"
          return []
        end
        
        result = []
        current = start
        
        if step > 0
          while current <= stop + (10 ** -(decimal_places + 2))
            result << current.round(decimal_places)
            current += step
          end
        else
          while current >= stop - (10 ** -(decimal_places + 2))
            result << current.round(decimal_places)
            current += step
          end
        end
        
        # Ensure the stop value is included if it should be
        last_value = result.last
        if last_value && (last_value - stop).abs > (10 ** -(decimal_places + 2))
          # The stop value should have been included but wasn't
          if (step > 0 && stop > last_value) || (step < 0 && stop < last_value)
            result << stop.round(decimal_places)
          end
        end
        
        result
    end      
  
  def parse_insertion_list(insertion_string)
    return [] if insertion_string.blank?
    insertion_string.split(',').map(&:strip)
  end
  
  def build_read_type(mapping)
    types = []
    types << 'jtag' if mapping[:read_type_jtag].present?
    types << 'fw' if mapping[:read_type_fw].present?
    types
  end  
  
  def build_search_types(charz_data)
    search_types = {}
    
    (charz_data[:search_types] || []).each do |search_type|
      # Safely access nested hashes with defaults
      selected_test_types = charz_data.dig(:selected_test_types, search_type) || []
      spec_variable = charz_data.dig(:spec_variables, search_type) || ''
      
      search_types[search_type] = {
        specvariable: spec_variable,
        testtype: {}
      }
      
      selected_test_types.each do |test_type|
        # Safely access table and workload data
        table = charz_data.dig(:table, search_type, test_type) || {}
        wl_array = charz_data.dig(:workload_table, search_type, test_type) || []
        
        search_types[search_type][:testtype][test_type.downcase] = {
          wl_count: table[:wl_count].to_i,
          wl: wl_array,
          test_points: (table[:tp] || '').to_s.split(',').map(&:strip).map(&:to_f),
          searchsettings: {
            start: table[:search_start] || '',
            stop: table[:search_end] || '',
            mode: 'LinBin',
            res: table[:resolution] || '',
            step: table[:search_step] || ''
          }
        }
      end
    end
    
    search_types
  end  
  
  def symbolize_keys(hash)
    case hash
    when Hash
      hash.each_with_object({}) do |(k, v), memo|
        key = k.is_a?(String) ? k.to_sym : k
        memo[key] = symbolize_keys(v)
      end
    when Array
      hash.map { |v| symbolize_keys(v) }
    else
      hash
    end
  end
end
  