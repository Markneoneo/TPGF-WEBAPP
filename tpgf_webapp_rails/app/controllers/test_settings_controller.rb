class TestSettingsController < ApplicationController
    skip_before_action :verify_authenticity_token, only: [:generate]
    
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
        }, status: :unprocessable_content
        return
      end
  
      # Additional validation for test point ranges
      selected_ip_types.each do |ip_type|
        if params[:ip_configurations] && params[:ip_configurations][ip_type]
          ip_config = ip_configuration_params(ip_type)
          
          # Check production mappings
          if ip_config[:show_production_for_core]
            ip_config[:show_production_for_core].each do |core_idx, enabled|
              next unless enabled == "on"
              
              flow_orders = ip_config.dig(:flow_orders, core_idx) || []
              production_mappings = ip_config.dig(:production_mappings, core_idx) || {}
              
              flow_orders.each do |order|
                mapping = production_mappings[order] || {}
                
                if mapping[:test_points_type] == 'Range'
                  validation = validate_test_point_range(
                    mapping[:test_points_start],
                    mapping[:test_points_stop],
                    mapping[:test_points_step]
                  )
                  
                  unless validation[:valid]
                    validation_errors[ip_type] ||= {}
                    validation_errors[ip_type]["test_points_range_#{order}_core_#{core_idx}"] = validation[:message]
                  end
                end
              end
            end
          end
        end
      end
  
      # Check again for validation errors
      unless validation_errors.empty?
        render json: {
          status: 'error',
          error: 'Validation failed',
          validation_errors: validation_errors
        }, status: :unprocessable_content
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
      
      # Store in cache instead of session
      cache_key = "generated_settings_#{SecureRandom.hex(16)}"
      Rails.cache.write(cache_key, combined_results, expires_in: 1.hour)
      
      # Store only the cache key in session
      session[:settings_cache_key] = cache_key
      
      # Clean up old cache entries periodically
      cleanup_expired_cache_entries
      
      render json: {
        status: 'success',
        message: 'Combined settings generated successfully',
        ip_types_processed: combined_results.keys,
        data: combined_results
      }
    end      
  
    def download
      cache_key = session[:settings_cache_key]
      
      if cache_key.nil?
        redirect_to root_path, alert: "No settings to download. Please generate settings first."
        return
      end
      
      settings = Rails.cache.read(cache_key)
      
      if settings.nil?
        redirect_to root_path, alert: "Settings have expired. Please generate settings again."
        return
      end
      
      send_data JSON.pretty_generate(settings),
                filename: "tsettings_#{Time.current.strftime('%Y%m%d_%H%M%S')}.json",
                type: "application/json",
                disposition: "attachment"
                
      # Clean up after download
      Rails.cache.delete(cache_key)
      session.delete(:settings_cache_key)
    end
    
    private
    
    def cleanup_expired_cache_entries
      # This is a simple cleanup mechanism
      # In production, you might want to use a background job
      # For now, we'll just log that cleanup would happen
      Rails.logger.info "Cache cleanup triggered"
    end
  
    def validate_test_point_range(start, stop, step)
        # Check for empty values
        return { valid: false, message: "Start value cannot be empty" } if start.blank?
        return { valid: false, message: "Stop value cannot be empty" } if stop.blank?
        return { valid: false, message: "Step value cannot be empty" } if step.blank?
        
        start_num = start.to_f
        stop_num = stop.to_f
        step_num = step.to_f
        
        # Check for valid numbers
        return { valid: false, message: "Step cannot be zero" } if step_num == 0
        
        # Special case: if start equals stop, step must be 0 (which we already rejected above)
        if start_num == stop_num
          return { valid: false, message: "When start equals stop, no range exists to traverse" }
        end
        
        # Check step direction
        if (stop_num > start_num && step_num < 0) || (stop_num < start_num && step_num > 0)
          return { valid: false, message: "Step direction must match start-stop direction" }
        end
        
        # Check if range is divisible by step
        range = (stop_num - start_num).abs
        steps = range / step_num.abs
        
        # Use epsilon for floating point comparison
        epsilon = 0.0001
        if (steps - steps.round).abs > epsilon
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
              
                floworder_mapping[order.downcase] = {
                  test_points: parse_test_points(mapping_data),
                  frequency: mapping_data[:use_core_frequency].present? ? mapping[:frequency].to_f : mapping_data[:frequency].to_f,
                  register_size: mapping_data[:register_size].to_i,
                  binnable: mapping_data[:binnable].present?,
                  softsetenable: mapping_data[:softsetenable].present?,
                  fallbackenable: mapping_data[:fallbackenable].present?,
                  insertionlist: parse_insertion_list(mapping_data[:insertion]),
                  readtype: build_read_type(mapping_data),
                  specvariable: mapping_data[:use_power_supply].present? ? mapping[:supply] : (mapping_data[:spec_variable] || ''),
                  use_power_supply: mapping_data[:use_power_supply].present?
                }
              end
              
          end
          
          # Build charztype_mapping if enabled
          charztype_mapping = {}
          if config[:show_charz_for_core] && config[:show_charz_for_core][idx]
            charz_data = config[:charz_data] && config[:charz_data][idx] || {}
            
            if charz_data[:search_granularity].present? && charz_data[:search_types].present?
              charztype_mapping = {
                granularity: charz_data[:search_granularity],
                searchtype: build_search_types(charz_data, supply_value),
                psm_register_size: charz_data[:psm_register_size]
              }
            end
          end
          
            # Build the core mapping entry
            core_mapping[core_name] = {
            count: mapping[:core_count].to_i,
            power_supply: mapping[:supply] || '',
            clock: mapping[:clock] || '',
            freq: mapping[:frequency].to_f,  # Change from hardcoded 1000 to actual frequency
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
        
        # If start equals stop, return empty array (invalid range)
        return [] if start == stop
        
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
        
        # Check if range is evenly divisible by step
        range = (stop - start).abs
        step_abs = step.abs
        expected_steps = (range / step_abs).round(decimal_places + 2)
        
        # Use epsilon for floating point comparison
        epsilon = 10 ** -(decimal_places + 2)
        if (expected_steps - expected_steps.round).abs > epsilon
          Rails.logger.warn "Range not evenly divisible: start=#{start}, stop=#{stop}, step=#{step}"
          return []
        end

      result = []
      current = start
      
      # Generate the range
      if step > 0
        while current <= stop + epsilon
          result << current.round(decimal_places)
          current = (current + step).round(decimal_places + 2)
        end
      else
        while current >= stop - epsilon
          result << current.round(decimal_places)
          current = (current + step).round(decimal_places + 2)
        end
      end
      
      # Ensure we don't overshoot due to floating point precision
      if result.last && ((step > 0 && result.last > stop) || (step < 0 && result.last < stop))
        result.pop
      end
      
      # Ensure stop value is included if it should be
      if result.last && (result.last - stop).abs > epsilon
        result << stop.round(decimal_places)
      end
      
      result
    end      
  
    def parse_insertion_list(insertion_data)
        return [] if insertion_data.blank?
        
        # Handle both string (legacy) and array formats
        if insertion_data.is_a?(Array)
          insertion_data.select(&:present?)
        else
          insertion_data.split(',').map(&:strip).select(&:present?)
        end
    end      
  
    def build_read_type(mapping)
      types = []
      types << 'jtag' if mapping[:read_type_jtag].present?
      types << 'fw' if mapping[:read_type_fw].present?
      types
    end  
  
    def build_search_types(charz_data, supply_value = nil)
        search_types = {}
        
        (charz_data[:search_types] || []).each do |search_type|
            selected_test_types = charz_data.dig(:selected_test_types, search_type) || []
            
            # Handle spec variable with use_power_supply
            spec_variable = if charz_data.dig(:use_power_supply, search_type).present? && supply_value
            supply_value
            else
            charz_data.dig(:spec_variables, search_type) || ''
            end
            
            search_types[search_type] = {
            specvariable: spec_variable,
            testtype: {}
            }
            
            selected_test_types.each do |test_type|
            table = charz_data.dig(:table, search_type, test_type) || {}
            wl_array = charz_data.dig(:workload_table, search_type, test_type) || []
            
            # Parse test points (comma-separated list)
            test_points = if table[:tp].present?
                table[:tp].to_s.split(',').map(&:strip).map(&:to_f)
            else
                []
            end
            
            search_types[search_type][:testtype][test_type.downcase] = {
                wl_count: table[:wl_count].to_i,
                wl: wl_array,
                test_points: test_points,
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
  