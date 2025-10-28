class FormValidator
  attr_reader :errors

  def initialize(params)
    @params = params
    @errors = {}
  end

  def validate
    validate_num_core_types
    validate_core_mappings
    validate_production_mappings
    validate_charz_parameters
    @errors.empty?
  end

  private

  def validate_num_core_types
    num = @params[:num_core_types].to_i
    if num < 1
      @errors[:num_core_types] = "Number of core types must be at least 1"
    end
  end # validate_num_core_types

  def validate_core_mappings
    return unless @params[:core_mappings]

    @params[:core_mappings].to_h.each do |idx, mapping|
      # Skip template entries
      next if idx.to_s == "999"

      if mapping[:core].blank?
        @errors["core_#{idx}"] = "Core name is required for Core Type #{idx.to_i + 1}"
      end

      # Validate core count is numeric and >= 1
      if mapping[:core_count].blank?
        @errors["core_count_#{idx}"] = "Core count is required for Core Type #{idx.to_i + 1}"
      elsif !mapping[:core_count].match?(/^\d+$/) || mapping[:core_count].to_i < 1
        @errors["core_count_#{idx}"] = "Core count must be a number at least 1 for Core Type #{idx.to_i + 1}"
      end

      if mapping[:supply].blank?
        @errors["supply_#{idx}"] = "Supply is required for Core Type #{idx.to_i + 1}"
      end

      if mapping[:clock].blank?
        @errors["clock_#{idx}"] = "Clock is required for Core Type #{idx.to_i + 1}"
      end

      if mapping[:frequency].blank?
        @errors["frequency_#{idx}"] = "Frequency is required."
      end
      
    end
  end # validate_core_mappings

  def validate_production_mappings
    return unless @params[:show_production_for_core]

    @params[:show_production_for_core].to_h.each do |idx, enabled|
      next unless enabled == "on"

      flow_orders = @params.dig(:flow_orders, idx) || []
      if flow_orders.empty?
        @errors["flow_orders_core_#{idx}"] =
          "At least one flow order must be selected for Core Type #{idx.to_i + 1}"
        next
      end

      production_mappings = @params.dig(:production_mappings, idx) || {}

      flow_orders.each do |order|
        mapping = production_mappings[order] || {}
        validate_production_mapping(mapping, order, idx)
      end
    end
  end # validate_production_mappings

  def validate_production_mapping(mapping, order, core_idx)
    # Validate read type
    has_jtag = mapping[:read_type_jtag] == "on"
    has_fw = mapping[:read_type_fw] == "on"
    
    unless has_jtag || has_fw
      @errors["read_type_#{order}_core_#{core_idx}"] = "#{order}: Read type (JTAG or FW) must be selected"
    end
    
    if has_jtag && has_fw
      @errors["read_type_#{order}_core_#{core_idx}"] = "#{order}: Only one read type can be selected"
    end
    
    # Validate test points based on type
    test_points_type = mapping[:test_points_type] || 'Range'
    
    if test_points_type == "List"
      if mapping[:test_points].blank?
        @errors["test_points_#{order}_core_#{core_idx}"] = "#{order}: Test points list is required"
      else
        # Validate list format
        points = mapping[:test_points].split(',').map(&:strip)
        if points.any? { |p| !p.match?(/^-?\d*\.?\d+$/) }
          @errors["test_points_#{order}_core_#{core_idx}"] = "#{order}: Test points must be comma-separated numbers"
        end
      end
    else
      # Range validation - only validate if type is Range
      if mapping[:test_points_start].blank?
        @errors["test_points_start_#{order}_core_#{core_idx}"] = "#{order}: Start point is required"
      elsif !mapping[:test_points_start].match?(/^-?\d*\.?\d+$/)
        @errors["test_points_start_#{order}_core_#{core_idx}"] = "#{order}: Start point must be a number"
      end
      
      if mapping[:test_points_stop].blank?
        @errors["test_points_stop_#{order}_core_#{core_idx}"] = "#{order}: Stop point is required"
      elsif !mapping[:test_points_stop].match?(/^-?\d*\.?\d+$/)
        @errors["test_points_stop_#{order}_core_#{core_idx}"] = "#{order}: Stop point must be a number"
      end
      
      if mapping[:test_points_step].blank?
        @errors["test_points_step_#{order}_core_#{core_idx}"] = "#{order}: Step is required"
      elsif !mapping[:test_points_step].match?(/^-?\d*\.?\d+$/)
        @errors["test_points_step_#{order}_core_#{core_idx}"] = "#{order}: Step must be a number"
      elsif mapping[:test_points_step].to_f == 0
        @errors["test_points_step_#{order}_core_#{core_idx}"] = "#{order}: Step cannot be zero"
      end
      
      # Validate range if all values present
      if mapping[:test_points_start].present? && 
         mapping[:test_points_stop].present? && 
         mapping[:test_points_step].present? &&
         mapping[:test_points_start].match?(/^-?\d*\.?\d+$/) &&
         mapping[:test_points_stop].match?(/^-?\d*\.?\d+$/) &&
         mapping[:test_points_step].match?(/^-?\d*\.?\d+$/)
        
        start = mapping[:test_points_start].to_f
        stop = mapping[:test_points_stop].to_f
        step = mapping[:test_points_step].to_f
        
        # Special case: if start equals stop, it's invalid (no range to traverse)
        if start == stop
          @errors["test_points_range_#{order}_core_#{core_idx}"] = 
            "#{order}: When start equals stop, no range exists to traverse"
        elsif (stop > start && step < 0) || (stop < start && step > 0)
          @errors["test_points_range_#{order}_core_#{core_idx}"] = 
            "#{order}: Step direction must match range direction"
        elsif step != 0
          # Check if range is divisible by step
          range = (stop - start).abs
          steps = range / step.abs
          
          if (steps - steps.round).abs > 0.0001
            @errors["test_points_range_#{order}_core_#{core_idx}"] = 
              "#{order}: Step #{step} cannot generate steady intervals from #{start} to #{stop}"
          end
        end
      end
    end

    # Validate spec variable
    if mapping[:use_power_supply] != "on" && mapping[:spec_variable].blank?
      @errors["spec_variable_#{order}_core_#{core_idx}"] =
        "#{order}: Spec variable is required"
    end

    # Validate frequency
    if mapping[:use_core_frequency] != "on" && mapping[:frequency].blank?
      @errors["frequency_#{order}_core_#{core_idx}"] =
        "#{order}: Frequency is required"
    elsif mapping[:use_core_frequency] != "on" && !mapping[:frequency].match?(/^\d+$/)
      @errors["frequency_#{order}_core_#{core_idx}"] =
        "#{order}: Frequency must be a number"
    end

    # Validate register size
    if mapping[:register_size].blank?
      @errors["register_size_#{order}_core_#{core_idx}"] =
        "#{order}: Register size is required"
    elsif !mapping[:register_size].match?(/^\d+$/)
      @errors["register_size_#{order}_core_#{core_idx}"] =
        "#{order}: Register size must be a number"
    end

    # Insertion list is optional but validate format if present
    if mapping[:insertion].present?
      # Handle both array (from multi-select) and string (legacy) formats
      insertions = if mapping[:insertion].is_a?(Array)
        mapping[:insertion].select(&:present?)
      else
        mapping[:insertion].split(',').map(&:strip)
      end
      
      if insertions.any?(&:blank?)
        @errors["insertion_#{order}_core_#{idx}"] = "#{order}: Insertion list has empty values"
      end
    end

  end # validate_production_mapping

  def validate_charz_parameters
    return unless @params[:show_charz_for_core]
    
    @params[:show_charz_for_core].to_h.each do |idx, enabled|
      next unless enabled == "on"
      
      charz_data = @params.dig(:charz_data, idx) || {}
      
      # Validate search granularity
      if charz_data[:search_granularity].blank? || charz_data[:search_granularity].empty?
        @errors["charz_search_granularity_core_#{idx}"] = "Charz: At least one search granularity must be selected"
      end
      
      # Validate search types
      if charz_data[:search_types].blank? || charz_data[:search_types].empty?
        @errors["charz_search_types_core_#{idx}"] = "Charz: At least one search type must be selected"
      end
      
      # Validate search type specific fields
      if charz_data[:search_types].present?
        charz_data[:search_types].each do |search_type|
          # Check spec variable
          if charz_data.dig(:use_power_supply, search_type) != "on" &&
             charz_data.dig(:spec_variables, search_type).blank?
            @errors["charz_#{search_type}_spec_variable_core_#{idx}"] = 
              "Charz #{search_type}: Spec variable is required"
          end
          
          # NEW: Validate RM Settings for this search type
          if charz_data.dig(:rm_settings, search_type).blank?
            @errors["charz_#{search_type}_rm_settings_core_#{idx}"] = 
              "Charz #{search_type}: RM settings is required"
          end
          
          # Check selected test types
          selected_test_types = charz_data.dig(:selected_test_types, search_type) || []
          if selected_test_types.empty?
            @errors["charz_#{search_type}_test_types_core_#{idx}"] = 
              "Charz #{search_type}: At least one test type must be selected"
          end
          
          # Validate table data for each test type
          selected_test_types.each do |test_type|
            table_data = charz_data.dig(:table, search_type, test_type) || {}
            
            # REMOVED: RM settings validation from table_data
            # The RM settings is now validated at the search type level above
  
            # Validate WL count
            if table_data[:wl_count].blank?
              @errors["charz_#{search_type}_#{test_type}_wl_count_core_#{idx}"] = 
                "Charz #{search_type} #{test_type}: WL count is required"
            elsif !table_data[:wl_count].match?(/^\d+$/)
              @errors["charz_#{search_type}_#{test_type}_wl_count_core_#{idx}"] = 
                "Charz #{search_type} #{test_type}: WL count must be a number"
            end
            
            # Validate test points (accepts both decimal and 'p' notation)
            if table_data[:tp].blank?
              @errors["charz_#{search_type}_#{test_type}_tp_core_#{idx}"] = 
                "Charz #{search_type} #{test_type}: Test points are required"
            elsif table_data[:tp].present?
              # Validate comma-separated numbers or 'p' notation (e.g., 1p1, 1.1)
              points = table_data[:tp].split(',').map(&:strip)
              # Accept either decimal format (1.1) or 'p' format (1p1)
              if points.any? { |p| !p.match?(/^-?\d*[p\.]?\d+$/) }
                @errors["charz_#{search_type}_#{test_type}_tp_core_#{idx}"] = 
                  "Charz #{search_type} #{test_type}: Test points must be comma-separated numbers (e.g., 1.1 or 1p1)"
              end
            end
            
            # Validate other required fields
            %w[search_start search_end search_step resolution].each do |field|
              if table_data[field.to_sym].blank?
                @errors["charz_#{search_type}_#{test_type}_#{field}_core_#{idx}"] = 
                  "Charz #{search_type} #{test_type}: #{field.humanize} is required"
              elsif !table_data[field.to_sym].match?(/^-?\d*\.?\d+$/)
                @errors["charz_#{search_type}_#{test_type}_#{field}_core_#{idx}"] = 
                  "Charz #{search_type} #{test_type}: #{field.humanize} must be a number"
              end
            end
            
            # Validate workload entries if wl_count > 0
            wl_count = table_data[:wl_count].to_i
            if wl_count > 0
              workload_data = charz_data.dig(:workload_table, search_type, test_type) || []
              (0...wl_count).each do |wl_idx|
                if workload_data[wl_idx].blank?
                  @errors["charz_#{search_type}_#{test_type}_wl_#{wl_idx}_core_#{idx}"] = 
                    "Charz #{search_type} #{test_type}: Workload ##{wl_idx + 1} is required"
                end
              end
            end
          end
        end
      end
      
      # Validate PSM register size
      if charz_data[:psm_register_size].blank?
        @errors["charz_psm_register_size_core_#{idx}"] = "Charz: PSM register size is required"
      elsif !charz_data[:psm_register_size].match?(/^\d+$/)
        @errors["charz_psm_register_size_core_#{idx}"] = "Charz: PSM register size must be a number"
      end
    end
  end  
  
end # class FormValidator
