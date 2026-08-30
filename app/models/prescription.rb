class Prescription < ApplicationRecord
  belongs_to :medication
  belongs_to :medication_form, optional: true
end
