class MedicationForm < ApplicationRecord
  has_many :prescriptions, dependent: :nullify

  validates :name, presence: true
end
