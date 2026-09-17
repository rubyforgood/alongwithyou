require "test_helper"

class AddressesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @address = addresses(:one)
    @person = @address.person
  end

  test "should show address" do
    get person_address_url(@person)
    assert_response :success
  end

  test "should create address" do
    @person.address.destroy
    assert_difference("Address.count") do
      post person_address_url(@person), params: { address: { city: @address.city, state: @address.state } }
    end
    assert_redirected_to person_address_url(@person)
  end

  test "should destroy address" do
    assert_difference("Address.count", -1) do
      delete person_address_url(@person)
    end
    assert_redirected_to person_url(@person)
  end

  test "show is a 404 for a person without an address" do
    @person.address.destroy

    get person_address_url(@person)
    assert_response :not_found
  end

  test "update is a 404 for a person without an address" do
    @person.address.destroy

    patch person_address_url(@person), params: { address: { city: "Springfield" } }
    assert_response :not_found
    assert_equal 0, Address.where(person_id: @person.id).count
  end

  test "destroy is a 404 for a person without an address" do
    @person.address.destroy

    assert_no_difference("Address.count") do
      delete person_address_url(@person)
    end
    assert_response :not_found
  end
end
