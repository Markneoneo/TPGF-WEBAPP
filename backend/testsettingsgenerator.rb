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
  attr_accessor :ip, :coretype, :testtype, :testpoints, :binnable, :softsetenable

  def initialize(ip: default_ip, coretype: default_coretype, testtype: default_testtype, tp: default_testpoints, binnable: default_binnable, softsetenable: default_softsetenable, **options)
    @ip         = ip
    @coretype   = coretype
    @testtype   = testtype
    @testpoints = tp
    @binnable   = binnable
    @softsetenable = softsetenable
    post_initialize(options)
  end

  def default_ip; "ip"; end
  def default_coretype; ""; end
  def default_testtype; "test"; end
  def default_binnable; false; end
  def default_softsetenable; true; end
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
    "SoftsetProfile_avfs_" + parameters.values.select { |v| v && !v.empty? }.join("_")
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
  attr_accessor :spec_variable
  
  def post_initialize(options)
    @spec_variable  = options[:spec_variable] || ""
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
  attr_reader :ip, :coretypes, :core_mapping, :spec_variable, :floworder_mapping, :search_granularity, :search, :charztype_mapping

  def initialize(options)
    @ip                = options[:ip]
    @coretypes         = options[:coretypes]
    @core_mapping      = options[:core_mapping]
    @spec_variable     = options[:spec_variable]
    @floworder_mapping = options[:floworder_mapping]
    @charztype_mapping = options[:charztype_mapping]
  end

  def generatesettings
    core_result = {}

    core_mapping.each_key do |coretype|
      fwload_result = fwload_settings(coretype)
      prod_result   = generate_prod_settings(coretype)
      charz_result  = generate_charz_settings(coretype)

      core_result[coretype] = {
        fwload_settings: fwload_result,
        prod_settings: prod_result,
        charz_settings: charz_result
      }
    end

    core_result
  end

  private

  def fwload_settings(coretype)
    fwload_test = Test.new(
      ip: ip,
      coretype: coretype,
      testtype: 'fwload')
    fwload_test.testsettings
  end

  def generate_prod_settings(coretype)
    floworder_mapping.each_with_object({}) do |(testtype, config), result|
      param_obj = Parametric.new(
        ip: ip,
        coretype: coretype,
        testtype: testtype,
        tp: config[:test_points],
        binnable: config[:binnable],
        softsetenable: config[:softsetenable],
        spec_variable: spec_variable
      )
      result[testtype] = param_obj.testsettings
    end
  end

  def generate_charz_settings(coretype)
    charztype_mapping[:granularity].each_with_object({}) do |gran, gran_hash|
      gran_hash[gran] = {}
      charztype_mapping[:searchtype].each do |stype, stype_config|
        gran_hash[gran][stype] = {}
        stype_config[:testtype].each do |testtype, config|
          gran_hash[gran][stype][testtype] = {}
          config[:wl].each do |wl|
            search_obj = Search.new(
              ip: ip,
              coretype: coretype,
              testtype: testtype,
              tp: config[:test_points],
              spec_variable: spec_variable,
              wl: wl,
              searchsettings: {
                'offset' => (stype == "vmin" ? 0.00625 : (stype == "fmax" ? 50 : nil)),
                'search_settings' => config[:searchsettings]
              }
            )
            gran_hash[gran][stype][testtype][wl] = (search_obj.testsettings)
          end
        end
      end
    end
  end
end

def core_mapping
  {
  }
end

def floworder_mapping
  {
  }
end

def charztype_mapping
  {
  }
end

tsettings = TestSettingsGenerator.new({
      ip: :cpu,
      coretypes: 2,
      core_mapping: core_mapping,
      spec_variable: 'LEV.36.VDDCR[V]',
      floworder_mapping: floworder_mapping,
      charztype_mapping: charztype_mapping
    }).generatesettings

puts tsettings.inspect

require 'json'

File.open('tsettings.json', 'w') do |file|
  file.write(JSON.pretty_generate(tsettings))
end