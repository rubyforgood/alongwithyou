class CreateMedicationForms < ActiveRecord::Migration[8.1]
  def change
    create_table :medication_forms do |t|
      t.string :name

      t.timestamps
    end
  end
end
