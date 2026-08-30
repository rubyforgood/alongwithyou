require "test_helper"

class MedicationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @medication = medications(:one)
  end

  test "should get index" do
    get medications_url
    assert_response :success
  end

  test "should get new" do
    get new_medication_url
    assert_response :success
  end

  test "should create medication" do
    assert_difference("Medication.count") do
      post medications_url, params: { medication: { current: @medication.current, dosage: @medication.dosage, form: @medication.form, frequency: @medication.frequency, medication_type_id: @medication.medication_type_id, name: @medication.name, notes: @medication.notes, purpose: @medication.purpose, refill: @medication.refill, start_date: @medication.start_date, stop_date: @medication.stop_date, time_of_day: @medication.time_of_day } }
    end

    assert_redirected_to medication_url(Medication.last)
  end

  test "should show medication" do
    get medication_url(@medication)
    assert_response :success
  end

  test "should get edit" do
    get edit_medication_url(@medication)
    assert_response :success
  end

  test "should update medication" do
    patch medication_url(@medication), params: { medication: { current: @medication.current, dosage: @medication.dosage, form: @medication.form, frequency: @medication.frequency, medication_type_id: @medication.medication_type_id, name: @medication.name, notes: @medication.notes, purpose: @medication.purpose, refill: @medication.refill, start_date: @medication.start_date, stop_date: @medication.stop_date, time_of_day: @medication.time_of_day } }
    assert_redirected_to medication_url(@medication)
  end

  test "should destroy medication" do
    assert_difference("Medication.count", -1) do
      delete medication_url(@medication)
    end

    assert_redirected_to medications_url
  end
end
