json.extract! person, :id, :first_name, :last_name, :date_of_birth, :social_security_number, :email, :relationship_id, :created_at, :updated_at
json.url person_url(person, format: :json)
