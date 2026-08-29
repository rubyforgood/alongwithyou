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
end
