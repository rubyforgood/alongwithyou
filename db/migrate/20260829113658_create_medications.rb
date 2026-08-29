class CreateMedications < ActiveRecord::Migration[8.1]
  def change
    create_table :medications do |t|
      t.string :name
      t.belongs_to :medication_type, null: false, foreign_key: true
      t.boolean :current
      t.string :dosage
      t.string :frequency
      t.string :time_of_day
      t.string :form
      t.text :purpose
      t.date :start_date
      t.date :stop_date
      t.string :refill
      t.text :notes

      t.timestamps
    end
  end
end
