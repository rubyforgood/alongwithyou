class CreateAddresses < ActiveRecord::Migration[8.1]
  def change
    create_table :addresses do |t|
      t.string :city
      t.string :state

      t.timestamps
    end
  end
end
