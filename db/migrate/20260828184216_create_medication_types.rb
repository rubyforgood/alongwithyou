class CreateMedicationTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :medication_types do |t|
      t.string :name

      t.timestamps
    end
  end
end
