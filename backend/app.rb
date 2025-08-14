require 'sinatra'
require 'sinatra/cross_origin'
require 'json'
require_relative 'testsettingsgenerator'

configure do
  enable :cross_origin
end

set :allow_origin, 'http://localhost:5173'
set :allow_methods, [:get, :post, :options]
set :allow_credentials, true
set :max_age, "1728000"
set :allow_headers, ['*', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']

before do
  response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
end

options "*" do
  response.headers["Allow"] = "GET, POST, OPTIONS"
  response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
  response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  response.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept, Authorization, Cache-Control"
  200
end

def symbolize_keys(hash)
  hash.each_with_object({}) do |(k, v), memo|
    # Convert string keys that start with ':' to symbols
    key = if k.is_a?(String) && k.start_with?(':')
            k[1..-1].to_sym
          elsif k.is_a?(String)
            k.to_sym
          else
            k
          end
    memo[key] = v.is_a?(Hash) ? symbolize_keys(v) : v
  end
end

# Sample API routes
get '/api/hello' do
  content_type :json
  { message: "Hello from Ruby backend!", timestamp: Time.now }.to_json
end

# Add this route to serve the tsettings.json file
get '/tsettings.json' do
  if File.exist?('tsettings.json')
    content_type 'application/json'
    send_file 'tsettings.json', :filename => 'tsettings.json', :type => 'application/json'
  else
    status 404
    content_type :json
    { error: "File not found" }.to_json
  end
end

# NEW: Multiple IP processing endpoint
post '/api/process-multiple-ips' do
  content_type :json
  request.body.rewind

  begin
    request_data = JSON.parse(request.body.read)
  rescue JSON::ParserError => e
    status 400
    return({ error: 'Invalid JSON format', details: e.message }.to_json)
  end

  ip_configurations = request_data['ip_configurations']
  if ip_configurations.nil?
    status 400
    return({ error: "Missing 'ip_configurations' in request body" }.to_json)
  end

  # Normalize to a Hash keyed by ip_name => config
  normalized_map =
    case ip_configurations
    when Array
      # Expect each element has 'ip' key to use as name
      map = {}
      ip_configurations.each_with_index do |cfg, idx|
        ip_name = (cfg['ip'] || "ip_#{idx}").to_s
        map[ip_name] = cfg
      end
      map
    when Hash
      ip_configurations
    else
      status 400
      return({ error: "'ip_configurations' must be an object or array" }.to_json)
    end

  puts "Received multiple IP configurations: #{normalized_map.keys}"

  def snake_keys(obj)
    case obj
    when Array
      obj.map { |v| snake_keys(v) }
    when Hash
      obj.each_with_object({}) do |(k, v), h|
        key = k.to_s.gsub(/([A-Z])/, '_\1').downcase # camelCase/PascalCase -> snake_case
        h[key] = snake_keys(v)
      end
    else
      obj
    end
  end

  def symbolize_keys(hash)
    hash.each_with_object({}) do |(k, v), memo|
      key = k.is_a?(String) ? k.to_sym : k
      memo[key] = v.is_a?(Hash) ? symbolize_keys(v) : v
    end
  end

  combined_results = {}

  normalized_map.each do |ip_name, config|
    begin
      puts "Processing IP: #{ip_name}"
      cfg = snake_keys(config) # accept camelCase inputs

      # Build the exact structure needed by TestSettingsGenerator
      symbolized_config = {
        'ip' => cfg['ip'] || ip_name,
        'coretypes' => cfg['coretypes'],
        'core_mapping' => symbolize_keys(cfg['core_mapping'] || {}),
        'floworder_mapping' => symbolize_keys(cfg['floworder_mapping'] || {}),
        'charztype_mapping' => symbolize_keys(cfg['charztype_mapping'] || {})
      }

      # Validate required fields
      if symbolized_config['coretypes'].nil? || symbolized_config['ip'].nil?
        status 400
        return({ error: "Missing required fields for '#{ip_name}'",
                 details: "ip: #{symbolized_config['ip'].inspect}, coretypes: #{symbolized_config['coretypes'].inspect}" }.to_json)
      end

      tsettings = TestSettingsGenerator.new({
        ip: symbolized_config['ip'],
        coretypes: symbolized_config['coretypes'],
        core_mapping: symbolized_config['core_mapping'],
        floworder_mapping: symbolized_config['floworder_mapping'],
        charztype_mapping: symbolized_config['charztype_mapping']
      }).generatesettings

      combined_results[ip_name] = tsettings
      puts "Generated settings for #{ip_name}"
    rescue => e
      puts "Error generating settings for #{ip_name}: #{e.message}"
      puts e.backtrace
      status 500
      return({ error: 'Internal server error', ip: ip_name, details: e.message }.to_json)
    end
  end

  File.open('tsettings.json', 'w') do |file|
    file.write(JSON.pretty_generate(combined_results))
  end
  puts "Combined results written to tsettings.json"

  {
    status: 'success',
    message: 'Combined settings generated successfully',
    ip_types_processed: combined_results.keys,
    data: combined_results
  }.to_json
end

