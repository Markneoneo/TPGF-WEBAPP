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
    key = k.is_a?(String) && k.start_with?(':') ? k[1..-1].to_sym : k
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
