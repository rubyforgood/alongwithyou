class MedicationType < ApplicationRecord
  has_many :medications, dependent: :nullify

  validates :name, presence: true
end
