class CreateAppointmentRequirements < ActiveRecord::Migration[8.1]
  def change
    create_table :appointment_requirements do |t|
      t.string :name

      t.timestamps
    end
  end
end
