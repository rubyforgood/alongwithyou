json.extract! medication, :id, :name, :medication_type_id, :current, :dosage, :frequency, :time_of_day, :form, :purpose, :start_date, :stop_date, :refill, :notes, :created_at, :updated_at
json.url medication_url(medication, format: :json)
