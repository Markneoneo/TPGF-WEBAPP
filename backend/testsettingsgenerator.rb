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
    @ip                = options[:ip]
    @coretypes         = options[:coretypes]
    @core_mapping      = options[:core_mapping]
    @floworder_mapping = options[:floworder_mapping]
    @charztype_mapping = options[:charztype_mapping]
  end

  def generatesettings
    core_mapping.each_with_object({}) do |(coretype, coretype_config), core_result|
      core_result[coretype] = {
        supply: coretype_config[:supply],
        clk: coretype_config[:clk],
        fwload_settings: generate_fwload_settings(coretype),
        prod_settings: generate_prod_settings(coretype, coretype_config[:spec_variable]),
        charz_settings: generate_charz_settings(coretype, coretype_config[:spec_variable])
      }
    end
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
    floworder_mapping.each_with_object({}) do |(testtype, config), result|
      param_obj = Parametric.new(
        ip: ip,
        coretype: coretype,
        testtype: testtype,
        tp: config[:test_points],
        spec_variable: spec_variable
      )
      result[testtype] = param_obj.testsettings
    end
  end

  # Single Responsibility: Generate characterization settings for a coretype
  def generate_charz_settings(coretype, spec_variable)
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
              searchsettings: config[:searchsettings]
            )
            offset = calculate_offset(stype)
            gran_hash[gran][stype][testtype][wl] = search_obj.testsettings.merge('offset' => offset)
          end
        end
      end
    end
  end

  # Open/Closed: Easily extendable for new search types
  def calculate_offset(search_type)
    case search_type
    when :vmin then 0.00625
    when :fmax then 50
    else nil
    end
  end
end

def core_mapping
  {
    classic: { count: 4, supply: 'VDDCR_CCX0', clk: 'SMNCLK', freq: 1000, specvariable: 'LEV.36.VDDCR[V]' },
    dense:   { count: 8, supply: 'VDDCR_CCX1', clk: 'SMNCLK', freq: 1000, specvariable: 'LEV.36.VDDPR[V]' }
  }
end

def floworder_mapping
  {
    psm:    { test_points: [0.6, 1.2], frequency: 1000, register_size: 14, binnable: true, softsetenable: false, fallbackenable: true, insertionlist: ['ws1', 'ws2', 'ft1']},
    mafdd:  { test_points: [0.9, 1.1], frequency: 1000, register_size: 14, binnable: true, softsetenable: false, fallbackenable: false, insertionlist: ['ws1', 'ws2', 'ft1'] },
    favfs:  { test_points: [0.6, 1.2], frequency: 1000, register_size: 14, binnable: true, softsetenable: true , fallbackenable: false, insertionlist: ['ws1', 'ws2']  },
    cpo:    { test_points: [0.6, 1.2], frequency: 1000, register_size: 14, binnable: true, softsetenable: true,  fallbackenable: false, insertionlist: ['ws1', 'ft1']  }
  }
end

def charztype_mapping
  {
    granularity: ['allcore'],
    searchtype: { vmin: {
    testtype: {
      crest: { wl_count: 7, wl: %w[a b c d e f g], test_points: [100, 200], searchsettings: { start: '0.9', stop: '0.4', mode: 'LinBin', res: '0.025', step: '0.1' } },
      bist:  { wl_count: 3, wl: %w[a b c], test_points: [100, 200], searchsettings: { start: '0.9', stop: '0.4', mode: 'LinBin', res: '0.025', step: '0.1' } },
      pbist: { wl_count: 1, wl: %w[a], test_points: [100, 200], searchsettings: { start: '0.9', stop: '0.4', mode: 'LinBin', res: '0.025', step: '0.1' } }
        }
      },
      fmax: {
    testtype: {
      crest: { wl_count: 7, wl: %w[a b c d e f g], test_points: [0.9, 1.2], searchsettings: { start: '50', stop: '200', mode: 'Linear', res: '10', step: '10' } },
      bist:  { wl_count: 3, wl: %w[a b c], test_points: [0.9, 1.2], searchsettings: { start: '50', stop: '200', mode: 'Linear', res: '10', step: '10' } },
      pbist: { wl_count: 1, wl: %w[a], test_points: [0.9, 1.2], searchsettings: { start: '50', stop: '200', mode: 'Linear', res: '10', step: '10' } }
        }
      }
    }  
  }
end

tsettings = TestSettingsGenerator.new({
      ip: :cpu,
      coretypes: 2,
      core_mapping: core_mapping,
      floworder_mapping: floworder_mapping,
      charztype_mapping: charztype_mapping
    }).generatesettings

puts tsettings.inspect

require 'json'

File.open('tsettings.json', 'w') do |file|
  file.write(JSON.pretty_generate(tsettings))
end