class FormValidator
  attr_reader :errors

  def initialize(params)
    @params = params
    @errors = {}
  end

  def validate
    validate_num_core_types
    validate_core_mappings
    validate_combined_settings
    validate_production_mappings
    validate_charz_parameters
    @errors.empty?
  end
  
  private
  
  def validate_combined_settings
    return unless @params[:show_combined_settings]
    
    combined_data = @params[:combined_settings]
    return unless combined_data
    
    selected_cores = combined_data[:selected_core_types] || []
    
    if selected_cores.empty?
      @errors[:combined_core_types] = "At least one core type must be selected for combined settings"
      return
    end
    
    # Validate that all selected cores have same clock and frequency
    clocks = []
    frequencies = []
    
    selected_cores.each do |core_idx|
      core_data = @params.dig(:core_mappings, core_idx)
      next unless core_data
      
      clocks << core_data[:clock]
      frequencies << core_data[:frequency]
    end
    
    if clocks.uniq.size > 1
      @errors[:combined_clock] = "All selected core types must have the same clock value"
    end
    
    if frequencies.uniq.size > 1
      @errors[:combined_frequency] = "All selected core types must have the same frequency value"
    end
    
    # Validate flow orders
    flow_orders_data = combined_data[:flow_orders] || {}
    
    flow_orders_data.each do |order, order_data|
    # Validate read type
    has_jtag = order_data[:read_type_jtag] == "on"
    has_fw = order_data[:read_type_fw] == "on"
    
    unless has_jtag || has_fw
      @errors["combined_read_type_#{order}"] = "Combined #{order}: Read type (JTAG or FW) must be selected"
    end
    
    if has_jtag && has_fw
      @errors["combined_read_type_#{order}"] = "Combined #{order}: Only one read type can be selected"
    end
    
    # Validate frequency (no use_core_frequency option in combined settings)
    if order_data[:frequency].blank?
      @errors["combined_frequency_#{order}"] = "Combined #{order}: Frequency is required"
    elsif !order_data[:frequency].match?(/^\d+(\.\d+)?$/)
      @errors["combined_frequency_#{order}"] = "Combined #{order}: Frequency must be a number"
    end
    
    # Validate register size
    if order_data[:register_size].blank?
      @errors["combined_register_size_#{order}"] = "Combined #{order}: Register size is required"
    elsif !order_data[:register_size].match?(/^\d+$/)
      @errors["combined_register_size_#{order}"] = "Combined #{order}: Register size must be a number"
    end
    
    # Validate repetition settings if present
    if order_data[:num_repetitions].present? && order_data[:num_repetitions].to_i > 0
      num_reps = order_data[:num_repetitions].to_i
      repetition_settings = order_data[:repetition_settings] || {}
      
      (0...num_reps).each do |rep_idx|
        rep_data = repetition_settings[rep_idx.to_s] || {}
        
        if rep_data[:name].blank?
          @errors["combined_repetition_name_#{rep_idx}_#{order}"] = 
            "Combined #{order}: Repetition setting name #{rep_idx + 1} is required"
        end
        
        if rep_data[:list].blank?
          @errors["combined_repetition_list_#{rep_idx}_#{order}"] = 
            "Combined #{order}: Repetition setting list #{rep_idx + 1} is required"
        end
    end
  end

    # Validate test points for each selected core
    test_points_data = order_data[:test_points] || {}
    
    selected_cores.each do |core_idx|
      tp_data = test_points_data[core_idx] || {}
      
      # Validate spec variable
      if tp_data[:spec_variable].blank?
        @errors["combined_spec_var_#{order}_core_#{core_idx}"] = 
          "Combined #{order} Core #{core_idx}: Spec variable is required"
      end
      
      # Validate test points based on type
      test_points_type = tp_data[:type] || 'Range'
      
      if test_points_type == "List"
        if tp_data[:list].blank?
          @errors["combined_test_points_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Test points list is required"
        else
          points = tp_data[:list].split(',').map(&:strip)
          if points.any? { |p| !p.match?(/^-?\d*\.?\d+$/) }
            @errors["combined_test_points_#{order}_core_#{core_idx}"] = 
              "Combined #{order} Core #{core_idx}: Test points must be comma-separated numbers"
          end
        end
      else
        # Range validation
        if tp_data[:start].blank?
          @errors["combined_test_points_start_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Start point is required"
        elsif !tp_data[:start].match?(/^-?\d*\.?\d+$/)
          @errors["combined_test_points_start_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Start point must be a number"
        end
        
        if tp_data[:stop].blank?
          @errors["combined_test_points_stop_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Stop point is required"
        elsif !tp_data[:stop].match?(/^-?\d*\.?\d+$/)
          @errors["combined_test_points_stop_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Stop point must be a number"
        end
        
        if tp_data[:step].blank?
          @errors["combined_test_points_step_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Step is required"
        elsif !tp_data[:step].match?(/^-?\d*\.?\d+$/)
          @errors["combined_test_points_step_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Step must be a number"
        elsif tp_data[:step].to_f == 0
          @errors["combined_test_points_step_#{order}_core_#{core_idx}"] = 
            "Combined #{order} Core #{core_idx}: Step cannot be zero"
        end
        
        # Validate range if all values present
        if tp_data[:start].present? && 
           tp_data[:stop].present? && 
           tp_data[:step].present? &&
           tp_data[:start].match?(/^-?\d*\.?\d+$/) &&
           tp_data[:stop].match?(/^-?\d*\.?\d+$/) &&
           tp_data[:step].match?(/^-?\d*\.?\d+$/)
          
          start = tp_data[:start].to_f
          stop = tp_data[:stop].to_f
          step = tp_data[:step].to_f
          
          if start == stop
            @errors["combined_test_points_range_#{order}_core_#{core_idx}"] = 
              "Combined #{order} Core #{core_idx}: When start equals stop, no range exists to traverse"
          elsif (stop > start && step < 0) || (stop < start && step > 0)
            @errors["combined_test_points_range_#{order}_core_#{core_idx}"] = 
              "Combined #{order} Core #{core_idx}: Step direction must match range direction"
          elsif step != 0
            range = (stop - start).abs
            steps = range / step.abs
            
            if (steps - steps.round).abs > 0.0001
              @errors["combined_test_points_range_#{order}_core_#{core_idx}"] = 
                "Combined #{order} Core #{core_idx}: Step #{step} cannot generate steady intervals from #{start} to #{stop}"
            end
          end
        end
      end
    end
  end
end

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
    
    # Validate test points sets
    num_sets = mapping[:num_test_points_sets].to_i
    num_sets = 1 if num_sets < 1 # Default to at least 1 set
    
    test_points_sets = mapping[:test_points_sets] || {}
    
    (0...num_sets).each do |set_idx|
      set_data = test_points_sets[set_idx.to_s] || {}
      
      # Validate spec variable for this set
      if set_data[:use_power_supply] != "on" && set_data[:spec_variable].blank?
        @errors["spec_variable_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
          "#{order} Set #{set_idx + 1}: Spec variable is required"
      end
      
      # Validate test points based on type
      test_points_type = set_data[:type] || 'Range'
      
      if test_points_type == "List"
        if set_data[:list].blank?
          @errors["test_points_list_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Test points list is required"
        else
          points = set_data[:list].split(',').map(&:strip)
          if points.any? { |p| !p.match?(/^-?\d*\.?\d+$/) }
            @errors["test_points_list_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
              "#{order} Set #{set_idx + 1}: Test points must be comma-separated numbers"
          end
        end
      else
        # Range validation
        if set_data[:start].blank?
          @errors["test_points_start_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Start point is required"
        elsif !set_data[:start].match?(/^-?\d*\.?\d+$/)
          @errors["test_points_start_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Start point must be a number"
        end
        
        if set_data[:stop].blank?
          @errors["test_points_stop_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Stop point is required"
        elsif !set_data[:stop].match?(/^-?\d*\.?\d+$/)
          @errors["test_points_stop_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Stop point must be a number"
        end
        
        if set_data[:step].blank?
          @errors["test_points_step_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Step is required"
        elsif !set_data[:step].match?(/^-?\d*\.?\d+$/)
          @errors["test_points_step_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Step must be a number"
        elsif set_data[:step].to_f == 0
          @errors["test_points_step_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
            "#{order} Set #{set_idx + 1}: Step cannot be zero"
        end
        
        # Validate range if all values present
        if set_data[:start].present? && 
           set_data[:stop].present? && 
           set_data[:step].present? &&
           set_data[:start].match?(/^-?\d*\.?\d+$/) &&
           set_data[:stop].match?(/^-?\d*\.?\d+$/) &&
           set_data[:step].match?(/^-?\d*\.?\d+$/)
          
          start = set_data[:start].to_f
          stop = set_data[:stop].to_f
          step = set_data[:step].to_f
          
          if start == stop
            @errors["test_points_range_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
              "#{order} Set #{set_idx + 1}: When start equals stop, no range exists to traverse"
          elsif (stop > start && step < 0) || (stop < start && step > 0)
            @errors["test_points_range_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
              "#{order} Set #{set_idx + 1}: Step direction must match range direction"
          elsif step != 0
            range = (stop - start).abs
            steps = range / step.abs
            
            if (steps - steps.round).abs > 0.0001
              @errors["test_points_range_set_#{set_idx}_#{order}_core_#{core_idx}"] = 
                "#{order} Set #{set_idx + 1}: Step #{step} cannot generate steady intervals from #{start} to #{stop}"
            end
          end
        end
      end
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
      insertions = if mapping[:insertion].is_a?(Array)
        mapping[:insertion].select(&:present?)
      else
        mapping[:insertion].split(',').map(&:strip)
      end
      
      if insertions.any?(&:blank?)
        @errors["insertion_#{order}_core_#{idx}"] = "#{order}: Insertion list has empty values"
      end
    end
    
    # Validate repetition settings if present
    if mapping[:num_repetitions].present? && mapping[:num_repetitions].to_i > 0
      num_reps = mapping[:num_repetitions].to_i
      repetition_settings = mapping[:repetition_settings] || {}
      
      (0...num_reps).each do |rep_idx|
        rep_data = repetition_settings[rep_idx.to_s] || {}
        
        if rep_data[:name].blank?
          @errors["repetition_name_#{rep_idx}_#{order}_core_#{core_idx}"] = 
            "#{order}: Repetition setting name #{rep_idx + 1} is required"
        end
        
        if rep_data[:list].blank?
          @errors["repetition_list_#{rep_idx}_#{order}_core_#{core_idx}"] = 
            "#{order}: Repetition setting list #{rep_idx + 1} is required"
        end
      end
    end
  end # Validate Production Mapping

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
          
          # Validate RM Settings if present
          num_rm_settings = charz_data.dig(:num_rm_settings, search_type).to_i
          if num_rm_settings > 0
            rm_settings = charz_data.dig(:rm_settings, search_type) || {}
            
            (0...num_rm_settings).each do |rm_idx|
              rm_data = rm_settings[rm_idx.to_s] || {}
              
              if rm_data[:name].blank?
                @errors["charz_#{search_type}_rm_name_#{rm_idx}_core_#{idx}"] = 
                  "Charz #{search_type}: RM setting name #{rm_idx + 1} is required"
              end
              
              if rm_data[:fuse_name].blank?
                @errors["charz_#{search_type}_rm_fuse_name_#{rm_idx}_core_#{idx}"] = 
                  "Charz #{search_type}: RM fuse name #{rm_idx + 1} is required"
              end
              
              if rm_data[:fuse_value].blank?
                @errors["charz_#{search_type}_rm_fuse_value_#{rm_idx}_core_#{idx}"] = 
                  "Charz #{search_type}: RM fuse value #{rm_idx + 1} is required"
              end
            end
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
  end # Validate Charz Parameters

end # class FormValidator
