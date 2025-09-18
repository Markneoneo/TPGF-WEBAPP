Rails.application.routes.draw do
  root "test_settings#new"
  
  resources :test_settings, only: [:new, :create] do
    collection do
      post :generate
      get :download
    end
  end
end
