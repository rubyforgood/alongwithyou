class Medication < ApplicationRecord
  belongs_to :medication_type, optional: true

  has_many :prescriptions, dependent: :restrict_with_error

  validates :name, presence: true
end
