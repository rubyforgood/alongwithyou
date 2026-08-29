json.extract! prescription, :id, :medication_id, :medication_form_id, :dosage, :frequency, :time_of_day, :prescribing_doctor, :purpose, :active, :start_date, :stop_date, :notes, :created_at, :updated_at
json.url prescription_url(prescription, format: :json)
