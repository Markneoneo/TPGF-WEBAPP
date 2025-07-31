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
  
  begin
    request.body.rewind
    request_data = JSON.parse(request.body.read)
    ip_configurations = request_data['ip_configurations']
    
    puts "Received multiple IP configurations: #{ip_configurations.keys}"
    
    combined_results = {}
    
    # Process each IP configuration
    ip_configurations.each do |ip_name, config|
      puts "Processing IP: #{ip_name}"
      puts "Config: #{config.inspect}"
      
      # Symbolize keys for this configuration
      symbolized_config = {
        'ip' => config['ip'],
        'coretypes' => config['coretypes'],
        'core_mapping' => symbolize_keys(config['core_mapping'] || {}),
        'spec_variable' => config['spec_variable'],
        'floworder_mapping' => symbolize_keys(config['floworder_mapping'] || {}),
        'charztype_mapping' => symbolize_keys(config['charztype_mapping'] || {})
      }
      
      # Generate settings for this IP
      tsettings = TestSettingsGenerator.new({
        ip: symbolized_config['ip'],
        coretypes: symbolized_config['coretypes'],
        core_mapping: symbolized_config['core_mapping'],
        spec_variable: symbolized_config['spec_variable'],
        floworder_mapping: symbolized_config['floworder_mapping'],
        charztype_mapping: symbolized_config['charztype_mapping']
      }).generatesettings
      
      # Add to combined results
      combined_results[ip_name] = tsettings
      puts "Generated settings for #{ip_name}"
    end
    
    # Write combined results to file
    File.open('tsettings.json', 'w') do |file|
      file.write(JSON.pretty_generate(combined_results))
    end
    
    puts "Combined results written to tsettings.json"
    puts "Final structure: #{combined_results.keys}"
    
    # Return success response
    response_data = { 
      status: 'success', 
      message: 'Combined settings generated successfully',
      ip_types_processed: combined_results.keys,
      data: combined_results 
    }
    
    response_data.to_json
    
  rescue JSON::ParserError => e
    puts "JSON parsing error: #{e.message}"
    status 400
    { error: 'Invalid JSON format', details: e.message }.to_json
  rescue => e
    puts "General error: #{e.message}"
    puts e.backtrace
    status 500
    { error: 'Internal server error', details: e.message }.to_json
  end
end

# Updated data processing endpoint
post '/api/process-data' do
  request.body.rewind
  data = JSON.parse(request.body.read)
  data['charztype_mapping'] = symbolize_keys(data['charztype_mapping'])
  data['floworder_mapping'] = symbolize_keys(data['floworder_mapping'])
  data['core_mapping'] = symbolize_keys(data['core_mapping'])
  
  # Log input from frontend
  puts "Received from frontend: #{data.inspect}"

  # Use TestSettingsGenerator instead of AvfsCharz
  tsettings = TestSettingsGenerator.new({
    ip: data['ip'],
    coretypes: data['coretypes'],
    core_mapping: data['core_mapping'],
    spec_variable: data['spec_variable'],
    floworder_mapping: data['floworder_mapping'],
    charztype_mapping: data['charztype_mapping']
  }).generatesettings

  # Write to tsettings.json for frontend download
  File.open('tsettings.json', 'w') do |file|
    file.write(JSON.pretty_generate(tsettings))
  end

  response_data = { result: tsettings }

  # Log output to frontend
  puts "Sending to frontend: #{response_data.inspect}"

  content_type :json
  response_data.to_json
end
