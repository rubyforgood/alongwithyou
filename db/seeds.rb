# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

if Task.none?
  Task.create!([
    { title: "Open mobile/src/app/tasks.tsx and edit this list", completed: false },
    { title: "Point EXPO_PUBLIC_API_URL at the Rails server", completed: true },
    { title: "Replace Task with a real model", completed: false }
  ])
end
