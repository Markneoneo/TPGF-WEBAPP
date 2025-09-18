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
    end
  
    def validate_core_mappings
      return unless @params[:core_mappings]
      
      @params[:core_mappings].each_with_index do |mapping, idx|
        if mapping[:core].blank?
          @errors["core_#{idx}"] = "Core name is required"
        end
        
        if mapping[:core_count].blank? || mapping[:core_count].to_i < 1
          @errors["core_count_#{idx}"] = "Core count must be at least 1"
        end
        
        if mapping[:supply].blank?
          @errors["supply_#{idx}"] = "Supply is required"
        end
        
        if mapping[:clock].blank?
          @errors["clock_#{idx}"] = "Clock is required"
        end
      end
    end
  
    def validate_production_mappings
      return unless @params[:show_production_for_core]
      
      @params[:show_production_for_core].each_with_index do |(idx, enabled), core_idx|
        next unless enabled == "true"
        
        flow_orders = @params[:flow_orders]&.dig(idx) || []
        if flow_orders.empty?
          @errors["flow_orders_core_#{core_idx}"] = "At least one flow order must be selected"
          next
        end
        
        production_mappings = @params[:production_mappings]&.dig(idx) || {}
        
        flow_orders.each do |order|
          mapping = production_mappings[order] || {}
          validate_production_mapping(mapping, order, core_idx)
        end
      end
    end
  
    def validate_production_mapping(mapping, order, core_idx)
      # Validate read type
      has_jtag = mapping[:read_type_jtag] == "true"
      has_fw = mapping[:read_type_fw] == "true"
      
      unless has_jtag || has_fw
        @errors["read_type_#{order}_core_#{core_idx}"] = "One read type must be selected"
      end
      
      if has_jtag && has_fw
        @errors["read_type_#{order}_core_#{core_idx}"] = "Only one read type can be selected"
      end
      
      # Validate test points
      if mapping[:test_points_type] == "List"
        if mapping[:test_points].blank?
          @errors["test_points_#{order}_core_#{core_idx}"] = "Test points list is required"
        end
      else
        validate_test_point_range(mapping, order, core_idx)
      end
      
      # Validate other required fields
      if mapping[:spec_variable].blank?
        @errors["spec_variable_#{order}_core_#{core_idx}"] = "Spec variable is required"
      end
      
      if mapping[:frequency].blank?
        @errors["frequency_#{order}_core_#{core_idx}"] = "Frequency is required"
      end
      
      if mapping[:register_size].blank?
        @errors["register_size_#{order}_core_#{core_idx}"] = "Register size is required"
      end
    end
  
    def validate_test_point_range(mapping, order, core_idx)
      start = mapping[:test_points_start].to_f
      stop = mapping[:test_points_stop].to_f
      step = mapping[:test_points_step].to_f
      
      if mapping[:test_points_start].blank?
        @errors["test_points_start_#{order}_core_#{core_idx}"] = "Start point is required"
      end
      
      if mapping[:test_points_stop].blank?
        @errors["test_points_stop_#{order}_core_#{core_idx}"] = "Stop point is required"
      end
      
      if mapping[:test_points_step].blank? || step == 0
        @errors["test_points_step_#{order}_core_#{core_idx}"] = "Step must be non-zero"
      end
      
      # Validate range divisibility
      if step != 0 && !mapping[:test_points_start].blank? && !mapping[:test_points_stop].blank?
        range = (stop - start).abs
        steps = range / step.abs
        
        if (steps - steps.round).abs > 0.0001
          @errors["test_points_range_#{order}_core_#{core_idx}"] = 
            "Step #{step} cannot generate steady intervals from #{start} to #{stop}"
        end
      end
    end
  
    def validate_charz_parameters
      return unless @params[:show_charz_for_core]
      
      @params[:show_charz_for_core].each_with_index do |(idx, enabled), core_idx|
        next unless enabled == "true"
        
        charz_data = @params[:charz_data]&.dig(idx) || {}
        
        if charz_data[:search_granularity].blank? || charz_data[:search_granularity].empty?
          @errors["charz_search_granularity_core_#{core_idx}"] = "At least one granularity must be selected"
        end
        
        if charz_data[:search_types].blank? || charz_data[:search_types].empty?
          @errors["charz_search_types_core_#{core_idx}"] = "At least one search type must be selected"
        end
        
        if charz_data[:psm_register_size].blank?
          @errors["charz_psm_register_size_core_#{core_idx}"] = "PSM register size is required"
        end
      end
    end
  end
  