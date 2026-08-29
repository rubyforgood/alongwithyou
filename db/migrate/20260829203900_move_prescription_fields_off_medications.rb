class MovePrescriptionFieldsOffMedications < ActiveRecord::Migration[8.1]
  def change
    # A medication is now the catalog entry (what the drug is); how a patient
    # takes it lives on prescriptions. See issue #164.
    remove_column :medications, :current, :boolean
    remove_column :medications, :dosage, :string
    remove_column :medications, :frequency, :string
    remove_column :medications, :time_of_day, :string
    remove_column :medications, :form, :string
    remove_column :medications, :purpose, :text
    remove_column :medications, :start_date, :date
    remove_column :medications, :stop_date, :date
    remove_column :medications, :refill, :string
    remove_column :medications, :notes, :text

    add_column :medications, :side_effects, :text

    # The seed catalog in #164 lists no type for each medication, so a
    # medication can exist before anyone classifies it.
    change_column_null :medications, :medication_type_id, true
  end
end
