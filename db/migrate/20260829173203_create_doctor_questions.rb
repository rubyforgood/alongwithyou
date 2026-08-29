class CreateDoctorQuestions < ActiveRecord::Migration[8.1]
  def change
    create_table :doctor_questions do |t|
      t.text :question, null: false
      t.boolean :asked, null: false, default: false
      t.belongs_to :doctor_question_type, null: false, foreign_key: true

      t.timestamps
    end
  end
end
