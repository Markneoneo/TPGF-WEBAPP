# Helper module for shared test logic
module TestHelper
  def tpsettings
    {
      'burst' => pertpburst? ? "" : burst,
      'binnable' => binnable,
      'test_points' => {
        'spec_variable' => spec_variable,
        'values' => gentp
      }
    }
  end

  def regreadsetup(name = nil)
    key = name ? "#{tname}_#{name}" : tname
    {
      'register_setup' => {
        'pattern' => { key => 512 }
      }
    }
  end
end

# Abstract base for test points
class TestPoint
  attr_reader :base_point, :unique_item

  def initialize(base_point, unique_item = nil)
    @base_point = base_point
    @unique_item = unique_item
  end

  def generate
    raise NotImplementedError, "Subclasses must implement the `generate` method"
  end
end

class ParametricTestPoint < TestPoint
  def generate
    { "value" => base_point }
      .tap { |h| h["burst"] = "#{unique_item}_burst" if unique_item }
  end
end

class SearchTestPoint < TestPoint
  def generate
    {
      "override_primaries" => {},
      "softsets" => { 'profile_name' => unique_item }
    }
  end
end

# Abstract base for tests
class Test
  attr_accessor :ip, :coretype, :testtype, :testpoints, :binnable, :softsetenable, :fallbackenable

  def initialize(ip: default_ip, coretype: default_coretype, testtype: default_testtype, tp: default_testpoints, binnable: default_binnable, softsetenable: default_softsetenable, fallbackenable: default_fallbackenable, **options)
    @ip = ip
    @coretype = coretype
    @testtype = testtype
    @testpoints = tp
    @binnable = binnable
    @softsetenable = softsetenable
    @fallbackenable = fallbackenable
    post_initialize(options)
  end

  def default_ip; "ip"; end
  def default_coretype; ""; end
  def default_testtype; "test"; end
  def default_binnable; false; end
  def default_softsetenable; true; end
  def default_fallbackenable; false; end
  def default_testpoints; [0.6]; end

  def gentp
    raise NotImplementedError, "Subclasses must implement the `gentp` method"
  end

  def post_initialize(options); end

  def parameters
    { ip: ip, coretype: coretype, testtype: testtype }.merge(local_parameters)
  end

  def local_parameters; {}; end

  def tname
    "avfs_" + parameters.values.select { |v| v && !v.empty? }.join("_")
  end

  def burst
    "#{tname}_burst"
  end

  def pertpburst?
    testtype.to_sym == :favfs
  end

  def softsetprofile
    components = ["SoftsetProfile_avfs", ip, coretype, testtype]
    components.reject(&:empty?).join("_")
  end

  def testsettings
    settings = {
      testtype => {
        'burst' => burst
      }
    }
    settings[testtype]['softsets'] = softsetprofile if softsetenable
    settings
  end
end

class Parametric < Test
  include TestHelper
  attr_accessor :spec_variable, :insertionlist, :readtype, :frequency 

  def post_initialize(options)
    @spec_variable = options[:spec_variable] || ""
    @insertionlist = options[:insertionlist] || default_insertionlist
    @readtype = options[:readtype] || ['fw']
    @frequency = options[:frequency] || 0  
  end

  def default_insertionlist
    ['ws1', 'ft1']
  end

  def gentp
    @testpoints.each_with_index.each_with_object({}) do |(tp, idx), values|
      tpnum = "tp#{idx}"
      unique_item = pertpburst? ? "#{tname}_#{tpnum}" : nil
      values[tpnum] = ParametricTestPoint.new(tp, unique_item).generate
    end
  end

  def testsettings
    settings = {}
    
    # Start with burst and binnable
    settings['burst'] = burst
    settings['binnable'] = binnable
    
    # Add frequency right after binnable
    settings['frequency'] = @frequency
    
    # Then add test_points
    settings['test_points'] = {
      'spec_variable' => spec_variable,
      'values' => gentp
    }
    
    # Add register_setup
    settings.merge!(regreadsetup)
    
    # Finally add the remaining fields
    settings['softsets'] = softsetprofile if softsetenable
    settings['insertion_list'] = insertionlist
    settings['fallback_enable'] = fallbackenable
    
    settings
  end  
end

class Search < Test
  include TestHelper
  attr_accessor :spec_variable, :wl, :searchsettings

  def post_initialize(options)
    @spec_variable = options[:spec_variable] || ""
    @wl = options[:wl] || default_wl
    @searchsettings = options[:searchsettings] || {}
  end

  def local_parameters
    { wl: wl }
  end

  def default_wl; 'wl'; end

  def gentp
    @testpoints.each_with_object({}) do |tp, values|
      values[tp] = SearchTestPoint.new(tp, "#{softsetprofile}_#{tp}").generate
    end
  end

  def searchsettings
      {
        'search_settings' => @searchsettings
      }
    end
  
    def minpsmsettings
      {
        "minpsm_settings" => {
          "burst" => "",
          "register_setup" => regreadsetup('minPSM')["register_setup"]
        }
      }
    end
  
    def testsettings
      tpsettings.merge(searchsettings).merge(minpsmsettings)
    end
  end
  
  class TestSettingsGenerator
    attr_reader :ip, :core_mapping
  
    def initialize(options)
      @ip = options[:ip]
      @core_mapping = options[:core_mapping]
    end
  
    def generate_settings
      if core_mapping.size == 1
        generate_single_core_settings
      else
        generate_multiple_core_settings
      end
    end
  
    private
  
    def generate_single_core_settings
      coretype, coretype_config = core_mapping.first
      {
        coretype => generate_core_settings("", coretype_config)
      }
    end
  
    def generate_multiple_core_settings
      core_mapping.each_with_object({}) do |(coretype, coretype_config), result|
        result[coretype] = generate_core_settings(coretype, coretype_config)
      end
    end
  
    def generate_core_settings(coretype, coretype_config)
      {
        power_supply: coretype_config[:power_supply], 
        clock: coretype_config[:clock],                 
        frequency: coretype_config[:freq],        
        setup_settings: generate_setup_settings(coretype),
        prod_settings: generate_prod_settings(coretype, coretype_config),
        charz_settings: generate_charz_settings(coretype, coretype_config)
      }
    end     

    # Changed this method name from generate_fwload_settings to generate_setup_settings
    def generate_setup_settings(coretype)
      fwload_test = Test.new(
        ip: ip,
        coretype: coretype,
        testtype: 'fw_load'  # Changed from 'fwload'
      )
      fwload_test.testsettings
    end
  
    def generate_prod_settings(coretype, coretype_config)
      return {} unless coretype_config[:floworder_mapping]
      
      coretype_config[:floworder_mapping].each_with_object({}) do |(testtype, config), result|
        
        param_obj = Parametric.new(
          ip: ip,
          coretype: coretype,
          testtype: testtype.to_s,
          tp: config[:test_points] || [],
          spec_variable: config[:specvariable] || "", 
          binnable: config[:binnable] || false,
          softsetenable: config[:softsetenable] || false,
          fallbackenable: config[:fallbackenable] || false,
          insertionlist: config[:insertionlist] || [],
          readtype: config[:readtype] || ['fw'],
          frequency: config[:frequency] || 0 
        )
        result[testtype.to_s] = param_obj.testsettings
      end
    end
  
    def generate_charz_settings(coretype, coretype_config)
      charztype_mapping = coretype_config[:charztype_mapping]
      return {} unless charztype_mapping && charztype_mapping[:granularity] && charztype_mapping[:searchtype]
      
      result = {}
      
      # Add PSM register size if available
      if charztype_mapping[:psm_register_size]
        result[:psm_register_size] = charztype_mapping[:psm_register_size].to_i
      end
      
      charztype_mapping[:granularity].each_with_object(result) do |gran, gran_hash|
        gran_hash[gran] = {}
        charztype_mapping[:searchtype].each do |stype, stype_config|
          gran_hash[gran][stype] = {}
          next unless stype_config[:testtype]
          
          # Iterate through rm_settings first
          stype_config[:testtype].each do |rm_key, rm_config|
            gran_hash[gran][stype][rm_key] = {}
            
            # Then iterate through test types under each rm_settings
            rm_config.each do |testtype, testtype_config|
              gran_hash[gran][stype][rm_key][testtype] = {}
              
              # Then iterate through workloads
              testtype_config.each do |wl, config|
                search_obj = Search.new(
                  ip: ip,
                  coretype: coretype,
                  testtype: testtype.to_s,
                  tp: config[:test_points] || [],
                  spec_variable: stype_config[:specvariable] || '', 
                  wl: wl,
                  searchsettings: config[:searchsettings] || {}
                )
                offset = calculate_offset(stype)
                
                # Store under rm_settings -> testtype -> workload
                gran_hash[gran][stype][rm_key][testtype][wl] = search_obj.testsettings.merge('offset' => offset)
              end
            end
          end
        end
      end
      
      result
    end    
  
    def calculate_offset(search_type)
      case search_type.to_s.downcase.to_sym
      when :vmin then 0.00625
      when :fmax then 50
      else nil
      end
    end
  end
