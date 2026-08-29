# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_29_113836) do
  create_table "medication_types", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "medications", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "current"
    t.string "dosage"
    t.string "form"
    t.string "frequency"
    t.integer "medication_type_id", null: false
    t.string "name"
    t.text "notes"
    t.text "purpose"
    t.string "refill"
    t.date "start_date"
    t.date "stop_date"
    t.string "time_of_day"
    t.datetime "updated_at", null: false
    t.index ["medication_type_id"], name: "index_medications_on_medication_type_id"
  end

  create_table "people", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date_of_birth"
    t.string "email"
    t.string "first_name"
    t.string "last_name"
    t.integer "relationship_id", null: false
    t.string "social_security_number"
    t.datetime "updated_at", null: false
    t.index ["relationship_id"], name: "index_people_on_relationship_id"
  end

  create_table "relationships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "tasks", force: :cascade do |t|
    t.boolean "completed", default: false, null: false
    t.datetime "created_at", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "medications", "medication_types"
  add_foreign_key "people", "relationships"
end
