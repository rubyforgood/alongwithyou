class AppointmentRequirement < ApplicationRecord
  validates :name, presence: true
end
