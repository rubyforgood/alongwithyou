json.extract! doctor_question, :id, :question, :doctor_question_type_id, :created_at, :updated_at
json.url doctor_question_url(doctor_question, format: :json)
