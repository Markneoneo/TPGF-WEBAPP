require './app'
require 'rack/cors'

use Rack::Cors do
  allow do
    origins 'http://localhost:5173'
    resource '*', headers: :any, methods: [:get, :post, :options]
  end
end

run Sinatra::Application