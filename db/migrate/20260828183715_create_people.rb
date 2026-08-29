class CreatePeople < ActiveRecord::Migration[8.1]
  def change
    create_table :people do |t|
      t.string :first_name
      t.string :last_name
      t.date :date_of_birth
      t.string :social_security_number
      t.string :email
      t.belongs_to :relationship, null: false, foreign_key: true

      t.timestamps
    end
  end
end
