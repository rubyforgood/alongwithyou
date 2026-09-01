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

ActiveRecord::Schema[8.1].define(version: 2026_08_29_210653) do
  create_table "addresses", force: :cascade do |t|
    t.string "city"
    t.datetime "created_at", null: false
    t.integer "person_id", null: false
    t.string "state"
    t.datetime "updated_at", null: false
    t.index ["person_id"], name: "index_addresses_on_person_id"
  end

  create_table "appointment_requirements", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "doctor_question_types", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_doctor_question_types_on_name", unique: true
  end

  create_table "doctor_questions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "doctor_question_type_id", null: false
    t.text "question", null: false
    t.datetime "updated_at", null: false
    t.index ["doctor_question_type_id"], name: "index_doctor_questions_on_doctor_question_type_id"
  end

  create_table "medication_forms", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "medication_types", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
  end

  create_table "medications", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "medication_type_id"
    t.string "name"
    t.text "side_effects"
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

  create_table "prescriptions", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "dosage"
    t.string "frequency"
    t.integer "medication_form_id"
    t.integer "medication_id", null: false
    t.text "notes"
    t.string "prescribing_doctor"
    t.text "purpose"
    t.date "start_date"
    t.date "stop_date"
    t.string "time_of_day"
    t.datetime "updated_at", null: false
    t.index ["medication_form_id"], name: "index_prescriptions_on_medication_form_id"
    t.index ["medication_id"], name: "index_prescriptions_on_medication_id"
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

  create_table "users", force: :cascade do |t|
    t.datetime "confirmation_sent_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "current_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "email", null: false
    t.string "encrypted_password", null: false
    t.integer "failed_attempts", default: 0, null: false
    t.datetime "last_sign_in_at"
    t.string "last_sign_in_ip"
    t.datetime "locked_at"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "sign_in_count", default: 0, null: false
    t.string "unconfirmed_email"
    t.string "unlock_token"
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  add_foreign_key "addresses", "people"
  add_foreign_key "doctor_questions", "doctor_question_types"
  add_foreign_key "medications", "medication_types"
  add_foreign_key "people", "relationships"
  add_foreign_key "prescriptions", "medication_forms"
  add_foreign_key "prescriptions", "medications"
end
