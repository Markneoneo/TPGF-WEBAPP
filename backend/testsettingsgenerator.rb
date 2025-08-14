# Helper module for shared test logic
module TestHelper
  def tpsettings
    {
      'burst' => pertpburst? ? "": burst ,
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
        'vector_variable' => { key => 512 }
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
    @ip         = ip
    @coretype   = coretype
    @testtype   = testtype
    @testpoints = tp
    @binnable   = binnable
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
    # Exclude wl from the profile name
    "SoftsetProfile_avfs_#{ip}_#{coretype}_#{testtype}"
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
  attr_accessor :spec_variable, :insertionlist
  
  def post_initialize(options)
    @spec_variable  = options[:spec_variable] || ""
    @insertionlist  = options[:insertionlist] || default_insertionlist
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
    settings = tpsettings.merge(regreadsetup)
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
    @spec_variable  = options[:spec_variable] || ""
    @wl             = options[:wl] || default_wl
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
    @searchsettings
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
  attr_reader :ip, :coretypes, :core_mapping, :floworder_mapping, :charztype_mapping

  def initialize(options)
    @ip                = options[:ip] || options['ip']
    @coretypes         = options[:coretypes] || options['coretypes']
    @core_mapping      = options[:core_mapping] || options['core_mapping'] || {}
    @floworder_mapping = options[:floworder_mapping] || options['floworder_mapping'] || {}
    @charztype_mapping = options[:charztype_mapping] || options['charztype_mapping'] || {}
    
    puts "TestSettingsGenerator initialized with:"
    puts "  IP: #{@ip}"
    puts "  Coretypes: #{@coretypes}"
    puts "  Core mapping keys: #{@core_mapping.keys}"
    puts "  Floworder mapping keys: #{@floworder_mapping.keys}"
    puts "  Charztype mapping keys: #{@charztype_mapping.keys}"
  end

  def generatesettings
    result = {}
    
    # Iterate through each core in core_mapping
    core_mapping.each do |coretype, coretype_config|
      puts "Processing coretype: #{coretype}"
      puts "Coretype config: #{coretype_config.inspect}"
      
      result[coretype] = {
        supply: coretype_config[:supply],
        clk: coretype_config[:clk],
        fwload_settings: generate_fwload_settings(coretype),
        prod_settings: generate_prod_settings(coretype, coretype_config[:spec_variable]),
        charz_settings: generate_charz_settings(coretype, coretype_config[:spec_variable])
      }
    end
    
    result
  end

  private

  # Single Responsibility: Generate fwload settings for a coretype
  def generate_fwload_settings(coretype)
    fwload_test = Test.new(
      ip: ip,
      coretype: coretype,
      testtype: 'fwload'
    )
    fwload_test.testsettings
  end

  # Single Responsibility: Generate production settings for a coretype
  def generate_prod_settings(coretype, spec_variable)
    result = {}
    
    # Filter floworder_mapping for this specific coretype
    floworder_mapping.each do |flow_key, config|
      # Extract the actual test type from the flow key (remove core info)
      testtype = extract_testtype_from_key(flow_key)
      
      # Check if this flow belongs to the current coretype
      if flow_belongs_to_coretype?(flow_key, coretype)
        puts "Generating prod settings for #{coretype}, testtype: #{testtype}"
        
        param_obj = Parametric.new(
          ip: ip,
          coretype: coretype,
          testtype: testtype,
          tp: config[:test_points] || [],
          spec_variable: spec_variable || "",
          binnable: config[:binnable] || false,
          softsetenable: config[:softsetenable] || false,
          fallbackenable: config[:fallbackenable] || false,
          insertionlist: config[:insertionlist] || []
        )
        result[testtype] = param_obj.testsettings
      end
    end
    
    result
  end

  # Single Responsibility: Generate characterization settings for a coretype
  def generate_charz_settings(coretype, spec_variable)
    result = {}
    
    # Find charz config for this coretype
    charz_config = find_charz_config_for_coretype(coretype)
    return result unless charz_config
    
    puts "Generating charz settings for #{coretype}"
    puts "Charz config: #{charz_config.inspect}"
    
    granularity_list = charz_config[:granularity] || []
    searchtype_hash = charz_config[:searchtype] || {}
    
    granularity_list.each do |gran|
      result[gran] = {}
      
      searchtype_hash.each do |stype, stype_config|
        result[gran][stype] = {}
        
        testtype_hash = stype_config[:testtype] || {}
        testtype_hash.each do |testtype, config|
          result[gran][stype][testtype] = {}
          
          wl_list = config[:wl] || []
          wl_list.each do |wl|
            search_obj = Search.new(
              ip: ip,
              coretype: coretype,
              testtype: testtype,
              tp: config[:test_points] || [],
              spec_variable: spec_variable || "",
              wl: wl,
              searchsettings: config[:searchsettings] || {}
            )
            offset = calculate_offset(stype)
            result[gran][stype][testtype][wl] = search_obj.testsettings.merge('offset' => offset)
          end
        end
      end
    end
    
    result
  end

  # Helper method to extract testtype from flow key
  def extract_testtype_from_key(flow_key)
    # Flow keys are like "psm_core_0", "mafdd_core_1", etc.
    # Extract the first part before "_core_"
    flow_key.to_s.split('_core_').first
  end

  # Helper method to check if a flow belongs to a specific coretype
  def flow_belongs_to_coretype?(flow_key, coretype)
    # Get the core index from the flow key
    match = flow_key.to_s.match(/_core_(\d+)$/)
    return false unless match
    
    core_index = match[1].to_i
    
    # Find the coretype at this index in core_mapping
    core_mapping_array = core_mapping.to_a
    return false if core_index >= core_mapping_array.length
    
    actual_coretype = core_mapping_array[core_index][0]
    actual_coretype.to_s == coretype.to_s
  end

  # Helper method to find charz config for a specific coretype
  def find_charz_config_for_coretype(coretype)
    # Look for charz config by core index
    core_mapping_array = core_mapping.to_a
    core_index = core_mapping_array.find_index { |ct, _| ct.to_s == coretype.to_s }
    
    return nil unless core_index
    
    # Look for charz config with key like "core_0", "core_1", etc.
    core_key = "core_#{core_index}"
    charztype_mapping[core_key.to_sym] || charztype_mapping[core_key]
  end

  # Open/Closed: Easily extendable for new search types
  def calculate_offset(search_type)
    case search_type.to_sym
    when :vmin then 0.00625
    when :fmax then 50
    else nil
    end
  end
end
