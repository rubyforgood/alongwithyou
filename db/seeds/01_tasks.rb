if Task.none?
  Task.create!([
    { title: "Open mobile/src/app/tasks.tsx and edit this list", completed: false },
    { title: "Point EXPO_PUBLIC_API_URL at the Rails server", completed: true },
    { title: "Replace Task with a real model", completed: false }
  ])
end
