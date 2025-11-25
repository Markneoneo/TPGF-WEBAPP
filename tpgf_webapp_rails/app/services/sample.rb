# ===================================
# SPEC VARIABLE CLASS
# Handles spec variable and its test points
# ===================================
class SpecVariable
    attr_reader :name, :test_points
  
    def initialize(name, test_points)
      @name = name
      @test_points = test_points
    end
  
    # Generate the test points hash for this spec variable
    def generate
      test_points.each_with_index.each_with_object({}) do |(tp, idx), values|
        values["tp#{idx}"] = { 'value' => tp }
      end
    end
  end
  
  # ===================================
  # TEST POINT BASE CLASS
  # Simple value object for test points
  # ===================================
  class TestPoint
    attr_reader :base_point
  
    def initialize(base_point)
      @base_point = base_point
    end
  
    def generate
      { "value" => base_point }
    end
  end
  
  # ===================================
  # SEARCH TEST POINT
  # For charz settings with softsets
  # ===================================
  class SearchTestPoint < TestPoint
    attr_reader :softset_profile
  
    def initialize(base_point, softset_profile)
      super(base_point)
      @softset_profile = softset_profile
    end
  
    def generate
      {
        "override_primaries" => {},
        "softsets" => { 'profile_name' => softset_profile }
      }
    end
  end
  
  # ===================================
  # BASE TEST CLASS
  # Common functionality for all tests
  # ===================================
  class Test
    attr_reader :ip, :coretype, :testtype
  
    def initialize(ip:, coretype:, testtype:)
      @ip = ip
      @coretype = coretype
      @testtype = testtype
    end
  
    def tname
      components = ['avfs', ip, coretype, testtype].reject { |c| c.nil? || c.empty? }
      components.join('_')
    end
  
    def burst
      "#{tname}_burst"
    end
  
    def softsetprofile
      components = ['SoftsetProfile_avfs', ip, coretype, testtype].reject(&:empty?)
      components.join('_')
    end
  
    def register_pattern(size = 512)
      { tname => size }
    end
  end
  
  # ===================================
  # PARAMETRIC TEST
  # For production parameters
  # ===================================
  class ParametricTest < Test
    attr_reader :spec_variables, :frequency, :register_size, :binnable, 
                :softsetenable, :insertion_list, :repetition_settings, :fallback_enable
  
    def initialize(ip:, coretype:, testtype:, spec_variables:, frequency:, register_size:,
                   binnable: false, softsetenable: false, insertion_list: [], 
                   repetition_settings: [], fallback_enable: false)
      super(ip: ip, coretype: coretype, testtype: testtype)
      @spec_variables = spec_variables  # Array of SpecVariable objects
      @frequency = frequency
      @register_size = register_size
      @binnable = binnable
      @softsetenable = softsetenable
      @insertion_list = insertion_list
      @repetition_settings = repetition_settings
      @fallback_enable = fallback_enable
    end
  
    # Generate the complete test settings hash
    def generate
      {
        'burst' => burst,
        'binnable' => binnable,
        'frequency' => frequency,
        'test_points' => generate_test_points,
        'register_setup' => { 'pattern' => register_pattern(register_size) }
      }.tap do |settings|
        settings['softsets'] = softsetprofile if softsetenable
        settings['insertion_list'] = insertion_list
        settings['repetition_settings'] = repetition_settings
        settings['fallback_enable'] = fallback_enable
      end
    end
  
    private
  
    def generate_test_points
      spec_variables.each_with_object({}) do |spec_var, hash|
        hash[spec_var.name] = spec_var.generate
      end
    end
  end
  
  # ===================================
  # SEARCH TEST
  # For charz settings
  # ===================================
  class SearchTest < Test
    attr_reader :spec_variable, :wl, :test_points, :search_settings
  
    def initialize(ip:, coretype:, testtype:, spec_variable:, wl:, test_points:, search_settings:)
      super(ip: ip, coretype: coretype, testtype: testtype)
      @spec_variable = spec_variable
      @wl = wl
      @test_points = test_points
      @search_settings = search_settings
    end
  
    def generate
      {
        'burst' => '',
        'binnable' => false,
        'test_points' => {
          'spec_variable' => spec_variable,
          'values' => generate_test_points_values
        },
        'search_settings' => search_settings,
        'minpsm_settings' => {
          'burst' => '',
          'register_setup' => { 'pattern' => register_pattern(512, 'minPSM') }
        }
      }
    end
  
    private
  
    def generate_test_points_values
      test_points.each_with_object({}) do |tp, values|
        profile = "#{softsetprofile}_#{tp}"
        values[tp] = SearchTestPoint.new(tp, profile).generate
      end
    end
  
    def register_pattern(size, suffix = nil)
      key = suffix ? "#{tname}_#{suffix}" : tname
      { key => size }
    end
  end
  
  # ===================================
  # SETUP TEST
  # For fw_load settings
  # ===================================
  class SetupTest < Test
    def initialize(ip:, coretype:)
      super(ip: ip, coretype: coretype, testtype: 'fw_load')
    end
  
    def generate
      {
        'fw_load' => {
          'burst' => burst,
          'softsets' => softsetprofile
        }
      }
    end
  end
  
  # ===================================
  # TEST SETTINGS GENERATOR
  # Orchestrates the generation of all settings
  # Only gets values and generates hashes
  # ===================================
  class TestSettingsGenerator
    attr_reader :ip, :core_mapping
  
    def initialize(options)
      @ip = options[:ip]
      @core_mapping = options[:core_mapping]
    end
  
    def generate_settings
      combined_cores = core_mapping.select { |name, _| name.to_s.include?('_') && name.to_s.split('_').size > 1 }
      regular_cores = core_mapping.reject { |name, _| name.to_s.include?('_') && name.to_s.split('_').size > 1 }
    
      if combined_cores.any?
        generate_combined_structure(combined_cores, regular_cores)
      elsif core_mapping.size == 1
        generate_single_core_structure
      else
        generate_multiple_cores_structure
      end
    end
  
    private
  
    # ===================================
    # STRUCTURE GENERATORS
    # ===================================
  
    def generate_combined_structure(combined_cores, regular_cores)
      result = {}
      
      combined_cores.each do |coretype, config|
        coretype_str = coretype.to_s
        result[coretype_str] = {
          power_supply: config[:power_supply],
          clock: config[:clock],
          frequency: config[:freq],
          setup_settings: generate_setup(coretype_str),
          prod_settings: {
            coretype_str => generate_production(coretype_str, config)
          }.merge(
            regular_cores.transform_keys(&:to_s).transform_values do |regular_config|
              generate_core_structure(regular_config[:power_supply], regular_config[:clock], 
                                     regular_config[:freq], regular_config)
            end
          )
        }
      end
      
      result
    end
  
    def generate_single_core_structure
      coretype, config = core_mapping.first
      { coretype => generate_core_structure(config[:power_supply], config[:clock], config[:freq], config, "") }
    end
  
    def generate_multiple_cores_structure
      core_mapping.transform_keys(&:to_s).transform_values do |config|
        coretype = config[:coretype] || ""
        generate_core_structure(config[:power_supply], config[:clock], config[:freq], config, coretype)
      end
    end
  
    def generate_core_structure(power_supply, clock, freq, config, coretype = nil)
      coretype_str = coretype.to_s
      
      {
        power_supply: power_supply,
        clock: clock,
        frequency: freq,
        setup_settings: generate_setup(coretype_str),
        prod_settings: generate_production(coretype_str, config),
        charz_settings: generate_charz(coretype_str, config)
      }
    end
  
    # ===================================
    # SETTINGS GENERATORS
    # Only orchestrate - don't create values
    # ===================================
  
    def generate_setup(coretype)
      SetupTest.new(ip: ip, coretype: coretype).generate
    end
  
    def generate_production(coretype, config)
      floworder_mapping = config[:floworder_mapping] || {}
      
      floworder_mapping.transform_keys(&:to_s).transform_values do |flow_config|
        generate_parametric_test(coretype, flow_config)
      end
    end
  
    def generate_parametric_test(coretype, config)
      # Build SpecVariable objects from the test_points_by_spec hash
      spec_variables = build_spec_variables(config[:test_points_by_spec] || {})
      
      # Get the testtype from config (it's the key in the floworder_mapping)
      testtype = config[:testtype] || 'unknown'
      
      ParametricTest.new(
        ip: ip,
        coretype: coretype,
        testtype: testtype,
        spec_variables: spec_variables,
        frequency: config[:frequency] || 0,
        register_size: config[:register_size] || 512,
        binnable: config[:binnable] || false,
        softsetenable: config[:softsetenable] || false,
        insertion_list: config[:insertionlist] || [],
        repetition_settings: config[:repetition_settings] || [],
        fallback_enable: config[:fallbackenable] || false
      ).generate
    end
  
    def build_spec_variables(test_points_by_spec)
      test_points_by_spec.map do |spec_name, test_points|
        SpecVariable.new(spec_name, test_points)
      end
    end
  
    def generate_charz(coretype, config)
      charz_mapping = config[:charztype_mapping]
      return {} unless charz_mapping && charz_mapping[:granularity] && charz_mapping[:searchtype]
      
      result = {}
      result[:psm_register_size] = charz_mapping[:psm_register_size].to_i if charz_mapping[:psm_register_size]
      
      charz_mapping[:granularity].each do |granularity|
        result[granularity] = generate_granularity_settings(coretype, charz_mapping[:searchtype])
      end
      
      result
    end
  
    def generate_granularity_settings(coretype, searchtype_mapping)
      searchtype_mapping.transform_keys(&:to_s).transform_values do |stype_config|
        generate_search_type_settings(coretype, stype_config)
      end
    end
  
    def generate_search_type_settings(coretype, stype_config)
      settings = {}
      
      # Add rm_types if present
      settings[:rm_types] = stype_config[:rm_types] if stype_config[:rm_types] && !stype_config[:rm_types].empty?
      
      # Add test types
      testtype_mapping = stype_config[:testtype] || {}
      testtype_mapping.each do |testtype, testtype_config|
        settings[testtype.to_s] = generate_workload_settings(coretype, testtype.to_s, stype_config, testtype_config)
      end
      
      settings
    end
  
    def generate_workload_settings(coretype, testtype, stype_config, testtype_config)
      wl_list = testtype_config[:wl] || []
      
      wl_list.each_with_object({}) do |wl, workload_hash|
        search_test = SearchTest.new(
          ip: ip,
          coretype: coretype,
          testtype: testtype,
          spec_variable: stype_config[:specvariable] || '',
          wl: wl,
          test_points: testtype_config[:test_points] || [],
          search_settings: testtype_config[:searchsettings] || {}
        )
        
        workload_hash[wl] = search_test.generate.merge('offset' => calculate_offset(stype_config))
      end
    end
  
    def calculate_offset(stype_config)
      # Extract search type from config (could be key or value)
      search_type = stype_config[:search_type] || stype_config.keys.first
      
      case search_type.to_s.downcase.to_sym
      when :vmin then 0.00625
      when :fmax then 50
      else nil
      end
    end
    
end
    