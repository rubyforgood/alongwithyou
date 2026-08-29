class DoctorQuestionType < ApplicationRecord
  has_many :doctor_questions, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: { case_sensitive: false }
end
