Rails.application.routes.draw do
  resources :appointment_requirements
  resources :doctor_questions
  resources :doctor_question_types
  devise_for :users
  resources :medications
  resources :medication_forms
  resources :medication_types
  resources :prescriptions
  resources :people do
    resource :address, only: [ :show, :create, :update, :destroy ]
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # JSON API consumed by the Expo app in mobile/.
  namespace :api do
    namespace :v1 do
      # No new/edit: those serve HTML forms, which this API never renders. They
      # would also shadow the JSON 404 below with a missing action error.
      resources :tasks, except: %i[ new edit ]
    end

    # Everything under /api answers in JSON, including a wrong path. Without
    # this, an unknown route falls through to the HTML 404 page and the phone
    # gets markup where it expected a body it can parse.
    match "*unmatched", to: "base#unmatched_route", via: :all, format: false
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # The administrative area. The reference-data resources it covers keep their
  # own top-level paths - this is only the landing page that gathers them, so
  # the header can carry one Admin link instead of one per lookup table. See
  # ApplicationHelper#admin_sections for the list it shows.
  get "admin" => "admin#index", as: :admin

  # Defines the root path route ("/")
  root "home#index"
  get "world" => "home#world"
end
