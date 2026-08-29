require "test_helper"

class PrescriptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @prescription = prescriptions(:one)
  end

  test "should get index" do
    get prescriptions_url

    assert_response :success
    assert_select "table#prescriptions thead th", 7
    assert_select "table#prescriptions tbody tr", Prescription.count
    assert_select "##{dom_id(@prescription)} th[scope=row]", text: /#{@prescription.medication.name}/
  end

  test "index lists active prescriptions before stopped ones" do
    get prescriptions_url

    statuses = css_select("table#prescriptions tbody .status").map(&:text)
    assert_equal statuses.sort_by { |status| status == "Active" ? 0 : 1 }, statuses
  end

  test "index shows an empty state when there is nothing to log" do
    Prescription.delete_all

    get prescriptions_url

    assert_response :success
    assert_select "table#prescriptions", false
    assert_select "p", text: "No prescriptions yet."
  end

  test "should get new" do
    get new_prescription_url
    assert_response :success
  end

  test "should create prescription" do
    assert_difference("Prescription.count") do
      post prescriptions_url, params: { prescription: { active: @prescription.active, dosage: @prescription.dosage, frequency: @prescription.frequency, medication_form_id: @prescription.medication_form_id, medication_id: @prescription.medication_id, notes: @prescription.notes, prescribing_doctor: @prescription.prescribing_doctor, purpose: @prescription.purpose, start_date: @prescription.start_date, stop_date: @prescription.stop_date, time_of_day: @prescription.time_of_day } }
    end

    assert_redirected_to prescription_url(Prescription.last)
  end

  test "should show prescription" do
    get prescription_url(@prescription)
    assert_response :success
  end

  test "should get edit" do
    get edit_prescription_url(@prescription)
    assert_response :success
  end

  test "should update prescription" do
    patch prescription_url(@prescription), params: { prescription: { active: @prescription.active, dosage: @prescription.dosage, frequency: @prescription.frequency, medication_form_id: @prescription.medication_form_id, medication_id: @prescription.medication_id, notes: @prescription.notes, prescribing_doctor: @prescription.prescribing_doctor, purpose: @prescription.purpose, start_date: @prescription.start_date, stop_date: @prescription.stop_date, time_of_day: @prescription.time_of_day } }
    assert_redirected_to prescription_url(@prescription)
  end

  test "should destroy prescription" do
    assert_difference("Prescription.count", -1) do
      delete prescription_url(@prescription)
    end

    assert_redirected_to prescriptions_url
  end
end
