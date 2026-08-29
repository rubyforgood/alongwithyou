class RemoveAskedFromDoctorQuestion < ActiveRecord::Migration[8.1]
  def change
    remove_column :doctor_questions, :asked, :boolean
  end
end
