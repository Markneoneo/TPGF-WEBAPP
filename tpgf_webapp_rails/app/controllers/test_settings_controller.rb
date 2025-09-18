class TestSettingsController < ApplicationController
    def new
      @ip_options = ['CPU', 'GFX', 'SOC']
    end
  
    def generate
      ip_configurations = transform_params(params[:ip_configurations])
      
      combined_results = {}
      
      ip_configurations.each do |ip_name, config|
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
    
    config[:core_mappings].each_with_index do |mapping, idx|
      core_name = mapping[:core]
      
      # Build floworder_mapping if production is enabled
      floworder_mapping = {}
      if config[:show_production_for_core][idx]
        flow_orders = config[:flow_orders][idx] || []
        production_mappings = config[:production_mappings][idx] || {}
        
        flow_orders.each do |order|
          mapping_data = production_mappings[order] || {}
          
          floworder_mapping[order.downcase] = {
            test_points: parse_test_points(mapping_data),
            frequency: mapping_data[:frequency].to_f,
            register_size: mapping_data[:register_size].to_i,
            binnable: mapping_data[:binnable] == 'true',
            softsetenable: mapping_data[:softsetenable] == 'true',
            fallbackenable: mapping_data[:fallbackenable] == 'true',
            insertionlist: parse_insertion_list(mapping_data[:insertion]),
            readtype: build_read_type(mapping_data),
            specvariable: mapping_data[:spec_variable] || '',
            use_power_supply: mapping_data[:use_power_supply] == 'true'
          }
        end
      end
      
      # Build charztype_mapping if enabled
      charztype_mapping = {}
      if config[:show_charz_for_core][idx]
        charz_data = config[:charz_data][idx] || {}
        
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
    if mapping[:test_points_type] == 'List'
      mapping[:test_points].to_s.split(',').map(&:strip).map(&:to_f)
    else
      generate_range(
        mapping[:test_points_start].to_f,
        mapping[:test_points_stop].to_f,
        mapping[:test_points_step].to_f
      )
    end
  end
  
  def generate_range(start, stop, step)
    return [] if step == 0
    
    result = []
    current = start
    
    if step > 0
      while current <= stop
        result << current.round(6)
        current += step
      end
    else
      while current >= stop
        result << current.round(6)
        current += step
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
    types << 'jtag' if mapping[:read_type_jtag] == 'true'
    types << 'fw' if mapping[:read_type_fw] == 'true'
    types
  end
  
  def build_search_types(charz_data)
    search_types = {}
    
    (charz_data[:search_types] || []).each do |search_type|
      selected_test_types = charz_data[:selected_test_types][search_type] || []
      
      search_types[search_type] = {
        specvariable: charz_data[:spec_variables][search_type] || '',
        testtype: {}
      }
      
      selected_test_types.each do |test_type|
        table = charz_data[:table][search_type][test_type] || {}
        wl_array = charz_data[:workload_table][search_type][test_type] || []
        
        search_types[search_type][:testtype][test_type.downcase] = {
          wl_count: table[:wl_count].to_i,
          wl: wl_array,
          test_points: table[:tp].to_s.split(',').map(&:strip).map(&:to_f),
          searchsettings: {
            start: table[:search_start],
            stop: table[:search_end],
            mode: 'LinBin',
            res: table[:resolution],
            step: table[:search_step]
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
  