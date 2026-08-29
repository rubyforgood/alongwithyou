# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# The data itself lives in db/seeds/, one file per concern, loaded in filename
# order - the numeric prefixes are there for when one file depends on another
# having run first.

Dir[Rails.root.join("db/seeds/*.rb")].sort.each do |seed_file|
  puts "Seeding #{File.basename(seed_file)}"
  load seed_file
end
