class AddPositionToDoctorQuestions < ActiveRecord::Migration[8.1]
  def change
    # Position is per type, not global: the first question of every type is 0.
    # Existing rows all land on the default, and DoctorQuestion.in_order breaks
    # that tie on created_at until someone drags something.
    add_column :doctor_questions, :position, :integer, null: false, default: 0
    add_index :doctor_questions, [ :doctor_question_type_id, :position ]
  end
end
