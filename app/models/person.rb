class Person < ApplicationRecord
  belongs_to :relationship

  has_one :address, dependent: :destroy
end
