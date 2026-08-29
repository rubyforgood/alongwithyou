class AddPersonRefToAddress < ActiveRecord::Migration[8.1]
  def change
    add_reference :addresses, :person, null: false, foreign_key: true
  end
end
