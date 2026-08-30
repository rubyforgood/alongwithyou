class AddStreetAddressToAddress < ActiveRecord::Migration[8.1]
  def change
    add_column :addresses, :street_address, :string
  end
end
