# If this class gets too big you may want to split it up into modules, run the following
# command to add a module to it:
#
#   origen new module my_module_name app/lib/tpgf_strix1/interface/avfscharz.rb
#
require 'forwardable'
class AvfsCharzTestOptions
  extend Forwardable
  def_delegators :@tests, :size, :each
  include Enumerable

  def initialize(tests)
    @tests = tests
  end

  def testlist
    map do |test|
      attributes = test.to_h
      name = attributes.delete(:name)
      { name => attributes }
    end
  end
end

require 'ostruct'
module TestObjFactory
  def self.build(config:,
    test_class: AvfsCharzTestOptions)

    test_class.new(
      config.collect  {|config|
      create_test(config)}
    )
  end

  def self.create_test(test_config)
    OpenStruct.new(
      name:                                 test_config[0],
      test_type:                            test_config[1],
      test_mode:                            test_config[2],
      vdd0:                                 test_config[3],
      supply0:                              test_config[4],
      clk0:                                 test_config[5],
      freq0:                                test_config[6],
      register_read_mode:                   test_config[7],
      register_read_script_name:            test_config[8],
      register_read_script_configuration:   test_config[9],
      register_read_output_variable_prefix: test_config[10],
      vector_variables:                     test_config[11],
      burst:                                test_config[12],
      lev_equ_set:                          test_config[13],
      lev_spec_set:                         test_config[14],
      levset:                               test_config[15],
      tim_spec_set:                         test_config[16],
      timset:                               test_config[17]
    )
  end
end

class AvfsCharz
  include TestObjFactory

  def initialize(options = {})
    puts 'Charz interface'
    @ip           = options[:ip]
    @core_type    = options[:core_type]
    @core         = options[:core]
    @tp           = options[:tp]
    @wl           = options[:wl]
    @search       = options[:search]
    @type         = options[:type]
    desired_keys  = [:ip, :core_type]

    @t_name = 'avfs_' + desired_keys.map { |key| options[key] }.join('_')
  end

  def prefix
    @t_name
  end

  def type
    @type
  end

  def paramref(wl,tp)
    [
      type,
      wl,
      '0.0',
      :VDDCR_CPU,
      :SMNCLK,
      tp
    ]
  end

  def registersetup
    [
      'SCRIPT',
      '../../../../avfs/src/common/scripts/PsmCal.groovy',
      'minpsm',
      'minPSM_'
    ]
  end

  def registerread
    [{  'Cap_avfs_crest_dldo_psmcal_minPSM_read_vddcore_pJtag'  => 56,
        'Cap_avfs_crest_dldo_psmcal_minPSM_read_rvddcore_pJtag' => 56 },
        'avfs_crest_L2_Cx0F_dkern_minPsm_vddcore_rvddcore_burst'
    ]
  end

  def levtimset
    [   36, 1, 1,
        'avfs_func_cfg_20MHz_DigCap', '1,1,1,1,1,1,1,1,1,1'
    ]
  end

  def generate_test
    t_config_list = []
    @tp.each {|tp|
      @wl.each  {|wl|
      puts 'Testpoint: ' + tp + '. Workload: ' + wl.to_s + '. Type: ' + type.to_s
      testname = "#{prefix}_#{wl}_#{tp}_#{type}"
      t_config = [testname] + paramref(wl,tp) + registersetup + registerread + levtimset
      t_config_list << t_config
      }
  }

  tObj = TestObjFactory.build(config: t_config_list)
  tObj.testlist

  end
end

tflowOptions = AvfsCharz.new({ip: :cpu,
                    wl: [:dkern, :maxdidt],
                    core: :allcore,
                    core_type: :classic,
                    search: :vmin,
                    tp: ['1200MHz', '900MHz'],
                    type: :CREST_MINPSM}).generate_test

# tflowOptions.each {|test| puts test.values}
puts tflowOptions.inspect
