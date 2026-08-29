class RemovePositionFromDoctorQuestions < ActiveRecord::Migration[8.1]
  # up/down rather than change: the index is removed by name, and Rails cannot
  # infer from a name alone how to put it back.
  def up
    # By name, not by column list. Dropping the column on its own leaves SQLite
    # holding this index with position pruned out of it - a duplicate of
    # index_doctor_questions_on_doctor_question_type_id, under a name that still
    # advertises a column that no longer exists.
    remove_index :doctor_questions, name: "index_doctor_questions_on_doctor_question_type_id_and_position"
    remove_column :doctor_questions, :position
  end

  def down
    add_column :doctor_questions, :position, :integer, null: false, default: 0
    add_index :doctor_questions, [ :doctor_question_type_id, :position ]
  end
end
