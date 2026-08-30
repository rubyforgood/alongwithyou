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
      post medications_url, params: { medication: { name: "Metformin", medication_type_id: @medication.medication_type_id, side_effects: "Nausea, diarrhea, stomach upset" } }
    end

    assert_redirected_to medication_url(Medication.last)
  end

  test "should not create medication without a name" do
    assert_no_difference("Medication.count") do
      post medications_url, params: { medication: { name: "", side_effects: "Nausea" } }
    end

    assert_response :unprocessable_content
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
    patch medication_url(@medication), params: { medication: { name: @medication.name, medication_type_id: @medication.medication_type_id, side_effects: @medication.side_effects } }
    assert_redirected_to medication_url(@medication)
  end

  test "should destroy medication" do
    unprescribed = medications(:three)

    assert_difference("Medication.count", -1) do
      delete medication_url(unprescribed)
    end

    assert_redirected_to medications_url
  end

  test "should not destroy medication that a prescription depends on" do
    assert_no_difference("Medication.count") do
      delete medication_url(@medication)
    end

    assert_redirected_to medication_url(@medication)
  end
end
