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
    @spec_variable = options[:spec_variable] || ""
    @insertionlist = options[:insertionlist] || default_insertionlist
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
    settings['insertion_list'] = insertionlist
    settings['binnable'] = binnable
    settings['softsets'] = softsetprofile if softsetenable
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
  attr_reader :ip, :core_mapping

  def initialize(options)
    @ip = options[:ip] || options['ip']
    @core_mapping = options[:core_mapping] || options['core_mapping'] || {}
  end

  def generatesettings
    result = {}

    core_mapping.each do |coretype, coretype_config|
      result[coretype] = {
        supply: coretype_config[:supply],
        clk: coretype_config[:clk],
        fwload_settings: generate_fwload_settings(coretype),
        prod_settings: generate_prod_settings(coretype, coretype_config),
        charz_settings: generate_charz_settings(coretype, coretype_config)
      }
    end

    result
  end

  private

  def generate_fwload_settings(coretype)
    fwload_test = Test.new(
      ip: ip,
      coretype: coretype,
      testtype: 'fwload'
    )
    fwload_test.testsettings
  end

  def generate_prod_settings(coretype, coretype_config)
    result = {}
    
    floworder_mapping = coretype_config[:floworder_mapping] || {}
    spec_variable = coretype_config[:specvariable] || ""

    floworder_mapping.each do |testtype, config|
      test_points = config[:test_points] || []
      binnable = config[:binnable] || false
      softsetenable = config[:softsetenable] || false
      fallbackenable = config[:fallbackenable] || false
      insertionlist = config[:insertionlist] || []

      param_obj = Parametric.new(
        ip: ip,
        coretype: coretype,
        testtype: testtype.to_s,
        tp: test_points,
        spec_variable: spec_variable,
        binnable: binnable,
        softsetenable: softsetenable,
        fallbackenable: fallbackenable,
        insertionlist: insertionlist
      )
      result[testtype.to_s] = param_obj.testsettings
    end

    result
  end

  def generate_charz_settings(coretype, coretype_config)
    result = {}

    charz_config = coretype_config[:charztype_mapping]
    return result if charz_config.nil?

    spec_variable = coretype_config[:specvariable] || ""
    granularity_list = charz_config[:granularity] || []
    searchtype_hash = charz_config[:searchtype] || {}

    return result if granularity_list.empty? || searchtype_hash.empty?

    granularity_list.each do |gran|
      result[gran] = {}

      searchtype_hash.each do |stype, stype_config|
        result[gran][stype] = {}

        testtype_hash = stype_config[:testtype] || {}
        testtype_hash.each do |testtype, config|
          result[gran][stype][testtype] = {}

          wl_list = config[:wl] || []
          next if wl_list.empty?

          wl_list.each do |wl|
            search_obj = Search.new(
              ip: ip,
              coretype: coretype,
              testtype: testtype.to_s,
              tp: config[:test_points] || [],
              spec_variable: spec_variable,
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

  def calculate_offset(search_type)
    case search_type.to_sym
    when :vmin then 0.00625
    when :fmax then 50
    else nil
    end
  end
end
