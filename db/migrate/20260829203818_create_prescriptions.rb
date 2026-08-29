class CreatePrescriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :prescriptions do |t|
      t.belongs_to :medication, null: false, foreign_key: true
      t.belongs_to :medication_form, foreign_key: true
      t.string :dosage
      t.string :frequency
      t.string :time_of_day
      t.string :prescribing_doctor
      t.text :purpose
      t.boolean :active
      t.date :start_date
      t.date :stop_date
      t.text :notes

      t.timestamps
    end
  end
end
