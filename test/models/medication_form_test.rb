require "test_helper"

class MedicationFormTest < ActiveSupport::TestCase
  test "requires a name" do
    assert_not MedicationForm.new.valid?
  end

  test "leaves its prescriptions behind when destroyed" do
    prescription = prescriptions(:one)

    prescription.medication_form.destroy

    assert_nil prescription.reload.medication_form_id
  end
end
