class ImportSettingsController < ApplicationController
    skip_before_action :verify_authenticity_token, only: [:parse]
    
    def parse
      uploaded_file = params[:file]
      
      if uploaded_file.nil?
        render json: { error: 'No file uploaded' }, status: :bad_request
        return
      end
      
      begin
        # Read and parse the JSON file
        file_content = uploaded_file.read
        settings_data = JSON.parse(file_content)
        
        # Simple validation - just check it's a hash
        if settings_data.is_a?(Hash) && settings_data.keys.any?
          render json: {
            status: 'success',
            data: settings_data,
            message: 'File parsed successfully'
          }
        else
          render json: {
            status: 'error',
            error: 'Invalid file structure',
            details: ['File must be a non-empty JSON object']
          }, status: :unprocessable_entity
        end
        
      rescue JSON::ParserError => e
        render json: {
          status: 'error',
          error: 'Invalid JSON format',
          details: e.message
        }, status: :unprocessable_entity
      rescue => e
        Rails.logger.error "Import error: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        
        render json: {
          status: 'error',
          error: 'Failed to process file',
          details: e.message
        }, status: :internal_server_error
      end
    end
end
